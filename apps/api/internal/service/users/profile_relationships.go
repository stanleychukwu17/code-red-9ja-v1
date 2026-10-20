package usersservice

import (
	"context"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"sync"

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

type userPartyPair struct {
	userID  int64
	partyID int16
}

// hydrateUserRelationships resolves candidacies, party info, and party chapters.
// It batches Redis lookups into a single MGET, deduplicates shared party requests,
// and fetches any cache misses concurrently directly from the respective services.
func (s *UsersService) hydrateUserRelationships(ctx context.Context, users []queries.UserWithPlaces) error {
	if len(users) == 0 {
		return nil
	}

	// 1. Initialize empty states and collect keys to look up
	type keyKind int // identifies the relationship type for dispatching cache parsing or loading
	const (
		kindCandidacy keyKind = iota
		kindPartyBasic
		kindChapters
	)

	// keyMeta associates each cache key with its lookup parameters
	type keyMeta struct {
		kind    keyKind
		userID  int64
		partyID int16
	}

	keyIndex := make(map[string]int)
	var keys []string
	var metas []keyMeta

	// trackKey deduplicates Redis keys while maintaining indexed metadata
	trackKey := func(key string, meta keyMeta) {
		if _, exists := keyIndex[key]; !exists {
			keyIndex[key] = len(keys)
			keys = append(keys, key)
			metas = append(metas, meta)
		}
	}

	// Register relationship keys for each user
	for i := range users {
		u := &users[i]
		u.PartyBasicInfo = nil
		u.Chapters = []queries.GetUserPartyChaptersRow{}
		u.Candidacies = []queries.UserActiveCandidacy{}

		candKey := fmt.Sprintf("%s%d", db.RedisUserActiveCandidacies, u.ID)
		trackKey(candKey, keyMeta{kind: kindCandidacy, userID: u.ID})

		if u.PartyID.Valid && u.PartyID.Int16 > 0 {
			pID := u.PartyID.Int16
			partyKey := fmt.Sprintf("%s%d", db.RedisPartyBasicInfo, pID)
			trackKey(partyKey, keyMeta{kind: kindPartyBasic, partyID: pID})

			chapKey := fmt.Sprintf("%s%d:%d", db.RedisUserPartyChapters, pID, u.ID)
			trackKey(chapKey, keyMeta{kind: kindChapters, userID: u.ID, partyID: pID})
		}
	}

	if len(keys) == 0 {
		return nil
	}

	// 2. Batch read from Redis
	values, err := s.rdb.MGet(ctx, keys...).Result()
	if err != nil {
		values = make([]interface{}, len(keys))
	}

	// 3. Parse cached results and identify misses
	candidaciesByUserID := make(map[int64][]queries.UserActiveCandidacy)
	partyBasicByID := make(map[int16]*queries.PartyBasicInfoWithVerifications)
	chaptersByKey := make(map[userPartyPair][]queries.GetUserPartyChaptersRow)

	var missingMetas []keyMeta

	for i, rawVal := range values {
		meta := metas[i]
		parsed := false

		if str, ok := rawVal.(string); ok && str != "" && str != "null" {
			data := []byte(str)
			switch meta.kind {
			case kindCandidacy:
				var c []queries.UserActiveCandidacy
				if json.Unmarshal(data, &c) == nil {
					candidaciesByUserID[meta.userID] = c
					parsed = true
				}
			case kindPartyBasic:
				var p queries.PartyBasicInfoWithVerifications
				if json.Unmarshal(data, &p) == nil {
					partyBasicByID[meta.partyID] = &p
					parsed = true
				}
			case kindChapters:
				var ch []queries.GetUserPartyChaptersRow
				if json.Unmarshal(data, &ch) == nil {
					chaptersByKey[userPartyPair{userID: meta.userID, partyID: meta.partyID}] = ch
					parsed = true
				}
			}
		}

		if !parsed {
			missingMetas = append(missingMetas, meta)
		}
	}

	// 4. Fetch misses from services concurrently (without JSON serialization roundtrip)
	if len(missingMetas) > 0 {
		var mu sync.Mutex
		var group errgroup.Group
		group.SetLimit(16)

		for _, m := range missingMetas {
			meta := m
			group.Go(func() error {
				switch meta.kind {
				case kindCandidacy:
					rows, err := s.electionsService.GetUserActiveCandidacies(ctx, meta.userID)
					if err != nil {
						return fmt.Errorf("load candidacies: %w", err)
					}
					if rows == nil {
						rows = []queries.UserActiveCandidacy{}
					}
					mu.Lock()
					candidaciesByUserID[meta.userID] = rows
					mu.Unlock()

				case kindPartyBasic:
					info := s.partyService.GetPartyBasicInfo(ctx, meta.partyID)
					mu.Lock()
					partyBasicByID[meta.partyID] = info
					mu.Unlock()

				case kindChapters:
					rows, err := s.partyService.GetUserPartyChapters(ctx, meta.userID, meta.partyID)
					if err != nil {
						return fmt.Errorf("load party chapters: %w", err)
					}
					if rows == nil {
						rows = []queries.GetUserPartyChaptersRow{}
					}
					mu.Lock()
					chaptersByKey[userPartyPair{userID: meta.userID, partyID: meta.partyID}] = rows
					mu.Unlock()
				}
				return nil
			})
		}

		if err := group.Wait(); err != nil {
			return err
		}
	}

	// 5. Populate user structs directly
	for i := range users {
		u := &users[i]

		if c, ok := candidaciesByUserID[u.ID]; ok {
			u.Candidacies = c
		}

		if u.PartyID.Valid && u.PartyID.Int16 > 0 {
			pID := u.PartyID.Int16
			if p, ok := partyBasicByID[pID]; ok {
				u.PartyBasicInfo = p
			}
			if ch, ok := chaptersByKey[userPartyPair{userID: u.ID, partyID: pID}]; ok {
				u.Chapters = ch
			}
		}
	}

	return nil
}
