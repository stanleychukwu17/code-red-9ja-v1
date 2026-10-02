package blocksservice

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// BlocksService handles user-to-user and party-to-user blocking functionality,
// caching, and invalidation.
type BlocksService struct {
	queries *queries.Queries
	pool    *pgxpool.Pool
	rdb     *redis.Client
}

// NewBlocksService creates a new BlocksService.
func NewBlocksService(q *queries.Queries, pool *pgxpool.Pool, rdb *redis.Client) *BlocksService {
	return &BlocksService{
		queries: q,
		pool:    pool,
		rdb:     rdb,
	}
}

// GetUserBlockedPartyIDs returns a set (as map[int16]bool) of party IDs that have blocked the user.
// Results are cached in Redis with a 7-day TTL (RedisSevenDaysTTL) to prevent database connection
// pool exhaustion during high concurrency or traffic spikes.
func (s *BlocksService) GetUserBlockedPartyIDs(ctx context.Context, userID int64) map[int16]bool {
	if userID <= 0 {
		return make(map[int16]bool)
	}

	cacheKey := fmt.Sprintf("%s%d", db.RedisUserBlockedPartyIDs, userID)

	// 1. Try to read from Redis cache directly as map[int16]bool
	if cachedData, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		var result map[int16]bool
		if err := json.Unmarshal([]byte(cachedData), &result); err == nil {
			if result == nil {
				return make(map[int16]bool)
			}
			return result
		}
	}

	// 2. Fallback to Database (fast index-only scan)
	blockedPartyIDs, err := s.queries.GetBlockedPartyIDsForUser(ctx, userID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return make(map[int16]bool)
	}

	// 3. Build lookup map (empty map if no rows / no blocks)
	result := make(map[int16]bool, len(blockedPartyIDs))
	for _, pid := range blockedPartyIDs {
		result[pid] = true
	}

	// 4. Cache map directly in Redis with 7-day TTL (caches "{}" when empty to prevent DB stampede)
	if data, err := json.Marshal(result); err == nil {
		_ = s.rdb.Set(ctx, cacheKey, data, db.RedisSevenDaysTTL).Err()
	}

	return result
}

// InvalidateUserBlockedPartiesCache purges the cached party block list for a specific user.
func (s *BlocksService) InvalidateUserBlockedPartiesCache(ctx context.Context, userID int64) {
	if userID <= 0 {
		return
	}
	cacheKey := fmt.Sprintf("%s%d", db.RedisUserBlockedPartyIDs, userID)
	_ = s.rdb.Del(ctx, cacheKey).Err()
}

// BlockUserByParty creates or updates a party block on a user and invalidates the user's cache.
func (s *BlocksService) BlockUserByParty(ctx context.Context, partyID int16, blockedUserID int64, blockedByUserID *int64) (queries.PartyUserBlock, error) {
	defer s.InvalidateUserBlockedPartiesCache(ctx, blockedUserID)

	return s.queries.BlockUserByParty(ctx, queries.BlockUserByPartyParams{
		PartyID:         partyID,
		BlockedUserID:   blockedUserID,
		BlockedByUserID: utils.PgInt8FromPtr(blockedByUserID),
	})
}

// UnblockUserByParty removes a party block and invalidates the user's cache.
func (s *BlocksService) UnblockUserByParty(ctx context.Context, partyID int16, blockedUserID int64) error {
	defer s.InvalidateUserBlockedPartiesCache(ctx, blockedUserID)

	return s.queries.UnblockUserByParty(ctx, queries.UnblockUserByPartyParams{
		PartyID:       partyID,
		BlockedUserID: blockedUserID,
	})
}

// IsUserBlockedByParty checks if a user is blocked by a specific party.
func (s *BlocksService) IsUserBlockedByParty(ctx context.Context, partyID int16, blockedUserID int64) (bool, error) {
	blockedParties := s.GetUserBlockedPartyIDs(ctx, blockedUserID)
	return blockedParties[partyID], nil
}

// ListBlockedUsersByParty lists blocked users for a party.
func (s *BlocksService) ListBlockedUsersByParty(ctx context.Context, partyID int16, limit int32, offset int32) ([]queries.ListBlockedUsersByPartyRow, error) {
	return s.queries.ListBlockedUsersByParty(ctx, queries.ListBlockedUsersByPartyParams{
		PartyID: partyID,
		Limit:   limit,
		Offset:  offset,
	})
}
