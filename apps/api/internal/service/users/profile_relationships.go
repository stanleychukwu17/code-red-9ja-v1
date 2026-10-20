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

	CountryName string `json:"country_name"`
	StateName   string `json:"state_name"`
	CityName    string `json:"city_name"`

	Verifications []queries.GetPageVerificationsRow `json:"verifications"`
	Roles         queries.CachedUserRoles           `json:"roles"`
}

// coreProfile extracts base profile fields for caching.
func coreProfile(user queries.UserWithPlaces) cachedCoreProfile {
	return cachedCoreProfile{
		GetUserByFakeIDRow: user.GetUserByFakeIDRow,
		CountryName:        user.CountryName,
		StateName:          user.StateName,
		CityName:           user.CityName,
		Verifications:      user.Verifications,
		Roles:              user.Roles,
	}
}

// profileRelation manages parsing cached bytes and fallback database fetching.
type profileRelation struct {
	apply []func([]byte) error  // assigns unmarshaled data to user structs
	load  func() ([]byte, error) // database fallback when cache misses
}

// hydrateUserRelationships performs one MGET across the whole result set.
// Shared parties and duplicate users are read/loaded once. Only misses invoke
// their owning services; responses are never written back into the core cache.
func (s *UsersService) hydrateUserRelationships(ctx context.Context, users []queries.UserWithPlaces) error {
	// Deduplicate relationship fetches by cache key
	relations := make(map[string]*profileRelation)

	// add registers a relationship loader and its target assignment callback
	add := func(key string, apply func([]byte) error, load func() ([]byte, error)) {
		if r, ok := relations[key]; ok {
			r.apply = append(r.apply, apply) // share same key across users
		} else {
			relations[key] = &profileRelation{
				apply: []func([]byte) error{apply},
				load:  load,
			}
		}
	}

	// Build relationship keys and targets for every user
	for i := range users {
		user := &users[i]

		// Set default empty states
		user.PartyBasicInfo = nil
		user.Chapters = []queries.GetUserPartyChaptersRow{}
		user.Candidacies = []queries.UserActiveCandidacy{}

		// Candidacy belongs to its registered party, independently of a user's
		// current party affiliation (and includes running mates).
		if s.electionsService != nil {
			add(
				fmt.Sprintf("%s%d", db.RedisUserActiveCandidacies, user.ID),
				func(raw []byte) error {
					return json.Unmarshal(raw, &user.Candidacies) // parse candidacy JSON
				},
				func() ([]byte, error) {
					// Fallback to elections database query
					rows, err := s.electionsService.GetUserActiveCandidacies(ctx, user.ID)
					if err != nil {
						return nil, err
					}
					if rows == nil {
						rows = []queries.UserActiveCandidacy{}
					}
					return json.Marshal(rows)
				},
			)
		}

		// Skip party data if user is unaffiliated or party service is disabled
		if !user.PartyID.Valid || user.PartyID.Int16 <= 0 || s.partyService == nil {
			continue
		}

		partyID := user.PartyID.Int16

		// Party basic info
		add(
			fmt.Sprintf("%s%d", db.RedisPartyBasicInfo, partyID),
			func(raw []byte) error {
				return json.Unmarshal(raw, &user.PartyBasicInfo) // parse party info JSON
			},
			func() ([]byte, error) {
				// Fallback to party service
				return json.Marshal(s.partyService.GetPartyBasicInfo(ctx, partyID))
			},
		)

		// User chapter affiliations within the party
		add(
			fmt.Sprintf("%s%d:%d", db.RedisUserPartyChapters, partyID, user.ID),
			func(raw []byte) error {
				return json.Unmarshal(raw, &user.Chapters) // parse chapters JSON
			},
			func() ([]byte, error) {
				// Fallback to chapter database query
				rows, err := s.partyService.GetUserPartyChapters(ctx, user.ID, partyID)
				if err != nil {
					return nil, err
				}
				if rows == nil {
					rows = []queries.GetUserPartyChaptersRow{}
				}
				return json.Marshal(rows)
			},
		)
	}

	// Nothing to fetch
	if len(relations) == 0 {
		return nil
	}

	// Collect unique cache keys
	keys := make([]string, 0, len(relations))
	for key := range relations {
		keys = append(keys, key)
	}

	// Batch fetch all keys in one Redis command
	values, err := s.rdb.MGet(ctx, keys...).Result()
	if err != nil {
		// Redis is a cache: owning services can still load from the database.
		values = make([]interface{}, len(keys))
	}

	// Concurrently resolve any cache misses
	var group errgroup.Group
	group.SetLimit(16) // cap parallel database lookups

	for i, key := range keys {
		relation := relations[key]

		// Check if Redis returned valid cached data
		if raw, ok := values[i].(string); ok && raw != "null" {
			valid := true

			// Apply cached data to all mapped users
			for _, apply := range relation.apply {
				if err := apply([]byte(raw)); err != nil {
					valid = false
					break
				}
			}

			// If unmarshaling succeeded, skip database load
			if valid {
				continue
			}
		}

		// Cache miss or invalid payload: fetch from source database concurrently
		group.Go(func() error {
			raw, err := relation.load() // fetch fresh bytes
			if err != nil {
				return fmt.Errorf("load profile relationship: %w", err)
			}

			// Apply freshly loaded data to all mapped users
			for _, apply := range relation.apply {
				if err := apply(raw); err != nil {
					return err
				}
			}

			return nil
		})
	}

	// Wait for all missing loads to complete
	return group.Wait()
}
