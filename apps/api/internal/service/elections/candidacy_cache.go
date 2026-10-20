package electionsservice

import (
	"context"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"log/slog"
)

// Include both the old and new roster, and running mates. Core profiles only
// need eviction when a mutation also changes the stored user party affiliation.
func (s *ElectionsService) invalidateCandidacyUsers(ctx context.Context, users []queries.ListElectionCandidacyUsersRow, includeProfile bool) {
	keys := make([]string, 0, len(users)*2)
	seen := make(map[int64]bool)

	for _, user := range users {
		// Deduplicate and skip empty user records
		if user.ID == 0 || seen[user.ID] {
			continue
		}
		seen[user.ID] = true

		// Invalidate user's active candidacies cache
		keys = append(keys, fmt.Sprintf("%s%d", db.RedisUserActiveCandidacies, user.ID))

		// Invalidate user profile cache if affiliation changed
		if includeProfile && user.FakeID.Valid {
			keys = append(keys, fmt.Sprintf("%s%d", db.RedisUserInfo, user.FakeID.Int64))
		}
	}

	// Purge collected keys from Redis in a single call
	if len(keys) > 0 {
		if err := s.rdb.Del(ctx, keys...).Err(); err != nil {
			slog.Error("failed to invalidate candidacy caches", "error", err)
		}
	}
}
