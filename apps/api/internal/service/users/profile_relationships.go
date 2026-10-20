package usersservice

import (
	"context"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"

	"golang.org/x/sync/errgroup"
)

// This storage type deliberately excludes independently cached relationships.
// The public response keeps its existing shape.
type cachedCoreProfile struct {
	queries.GetUserByFakeIDRow
	CountryName   string                            `json:"country_name"`
	StateName     string                            `json:"state_name"`
	CityName      string                            `json:"city_name"`
	Verifications []queries.GetPageVerificationsRow `json:"verifications"`
	Roles         queries.CachedUserRoles           `json:"roles"`
}

func coreProfile(user queries.UserWithPlaces) cachedCoreProfile {
	return cachedCoreProfile{
		GetUserByFakeIDRow: user.GetUserByFakeIDRow,
		CountryName:        user.CountryName, StateName: user.StateName, CityName: user.CityName,
		Verifications: user.Verifications, Roles: user.Roles,
	}
}

type profileRelation struct {
	apply []func([]byte) error
	load  func() ([]byte, error)
}

// hydrateUserRelationships performs one MGET across the whole result set.
// Shared parties and duplicate users are read/loaded once. Only misses invoke
// their owning services; responses are never written back into the core cache.
func (s *UsersService) hydrateUserRelationships(ctx context.Context, users []queries.UserWithPlaces) error {
	relations := make(map[string]*profileRelation)
	add := func(key string, apply func([]byte) error, load func() ([]byte, error)) {
		if r, ok := relations[key]; ok {
			r.apply = append(r.apply, apply)
		} else {
			relations[key] = &profileRelation{apply: []func([]byte) error{apply}, load: load}
		}
	}
	for i := range users {
		user := &users[i]
		user.PartyBasicInfo = nil
		user.Chapters = []queries.GetUserPartyChaptersRow{}
		user.Candidacies = []queries.UserActiveCandidacy{}
		// Candidacy belongs to its registered party, independently of a user's
		// current party affiliation (and includes running mates).
		if s.electionsService != nil {
			add(fmt.Sprintf("%s%d", db.RedisUserActiveCandidacies, user.ID), func(raw []byte) error {
				return json.Unmarshal(raw, &user.Candidacies)
			}, func() ([]byte, error) {
				rows, err := s.electionsService.GetUserActiveCandidacies(ctx, user.ID)
				if err != nil {
					return nil, err
				}
				if rows == nil {
					rows = []queries.UserActiveCandidacy{}
				}
				return json.Marshal(rows)
			})
		}
		if !user.PartyID.Valid || user.PartyID.Int16 <= 0 || s.partyService == nil {
			continue
		}
		partyID := user.PartyID.Int16
		add(fmt.Sprintf("%s%d", db.RedisPartyBasicInfo, partyID), func(raw []byte) error {
			return json.Unmarshal(raw, &user.PartyBasicInfo)
		}, func() ([]byte, error) {
			return json.Marshal(s.partyService.GetPartyBasicInfo(ctx, partyID))
		})
		add(fmt.Sprintf("%s%d:%d", db.RedisUserPartyChapters, partyID, user.ID), func(raw []byte) error {
			return json.Unmarshal(raw, &user.Chapters)
		}, func() ([]byte, error) {
			rows, err := s.partyService.GetUserPartyChapters(ctx, user.ID, partyID)
			if err != nil {
				return nil, err
			}
			if rows == nil {
				rows = []queries.GetUserPartyChaptersRow{}
			}
			return json.Marshal(rows)
		})
	}
	if len(relations) == 0 {
		return nil
	}
	keys := make([]string, 0, len(relations))
	for key := range relations {
		keys = append(keys, key)
	}
	values, err := s.rdb.MGet(ctx, keys...).Result()
	if err != nil {
		// Redis is a cache: owning services can still load from the database.
		values = make([]interface{}, len(keys))
	}
	var group errgroup.Group
	group.SetLimit(16)
	for i, key := range keys {
		relation := relations[key]
		if raw, ok := values[i].(string); ok && raw != "null" {
			valid := true
			for _, apply := range relation.apply {
				if err := apply([]byte(raw)); err != nil {
					valid = false
					break
				}
			}
			if valid {
				continue
			}
		}
		group.Go(func() error {
			raw, err := relation.load()
			if err != nil {
				return fmt.Errorf("load profile relationship: %w", err)
			}
			for _, apply := range relation.apply {
				if err := apply(raw); err != nil {
					return err
				}
			}
			return nil
		})
	}
	return group.Wait()
}
