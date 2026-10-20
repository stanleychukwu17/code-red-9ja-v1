package electionsservice

import (
	"context"
	"fmt"
	"testing"
	"time"

	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/service/notifications"
	"free9ja/api/internal/testutil"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"
)

type mockNotifications struct{}

func (mockNotifications) NotifyCandidateNominated(context.Context, notifications.NotifyCandidateNominatedParams) {}
func (mockNotifications) NotifyCandidateWithdrawn(context.Context, notifications.NotifyCandidateWithdrawnParams) {}

func TestCandidacyReplacementRollbackAndRescheduling(t *testing.T) {
	ctx := context.Background()
	pool := testutil.ElectionDB(t)
	rdb := testutil.Redis(t, 3)
	q := queries.New(pool)
	s := &ElectionsService{queries: q, pool: pool, rdb: rdb, notificationsService: mockNotifications{}}
	_, err := pool.Exec(ctx, `
INSERT INTO users (fake_id,password_hash,current_country,current_state,party_id)
VALUES (101,'test',1,1,2),(102,'test',1,1,1),(103,'test',1,1,2);
INSERT INTO election_groups (name,year) VALUES ('Test',2026);
INSERT INTO elections (name,election_date,election_group_id,office_id,scope)
VALUES ('Test election',(CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Lagos')::date+5,1,1,'nationwide');
INSERT INTO election_candidates (election_id,election_group_id,candidate_id,running_mate_id,party_id)
VALUES (1,1,1,3,1);`)
	require.NoError(t, err)
	for _, userID := range []int64{1, 2, 3} {
		_, err := s.GetUserActiveCandidacies(ctx, userID)
		require.NoError(t, err)
	}
	_, err = s.GetElectionByID(ctx, 1)
	require.NoError(t, err)
	ttlElection := rdb.TTL(ctx, db.RedisElectionByID+"1").Val()
	require.Positive(t, ttlElection)
	require.InDelta(t, db.RedisOneEightyDaysTTL.Seconds(), ttlElection.Seconds(), 2)

	ttlCandidacy := rdb.TTL(ctx, db.RedisUserActiveCandidacies+"1").Val()
	require.Positive(t, ttlCandidacy)
	require.InDelta(t, db.RedisThirtyDaysTTL.Seconds(), ttlCandidacy.Seconds(), 2)
	// A failed insert must roll back the deletion and preserve the existing caches.
	err = s.FieldPartyCandidate(ctx, 1, 1, 999999, nil)
	require.Error(t, err)
	require.EqualValues(t, 1, rdb.Exists(ctx, db.RedisUserActiveCandidacies+"1").Val())
	old, err := q.ListElectionCandidatesByElectionID(ctx, 1)
	require.NoError(t, err)
	require.EqualValues(t, 1, old[0].CandidateID)
	// Observe the database from a separate connection at the moment DEL runs.
	// Invalidation before commit would expose the old roster here.
	observed := false
	rdb.AddHook(testutil.RedisObserver{Before: func(ctx context.Context, cmd redis.Cmder) {
		if cmd.Name() != "del" || observed {
			return
		}
		visible, err := q.ListElectionCandidatesByElectionID(ctx, 1)
		require.NoError(t, err)
		require.Len(t, visible, 1)
		require.EqualValues(t, 2, visible[0].CandidateID)
		observed = true
	}})
	require.NoError(t, s.FieldPartyCandidate(ctx, 1, 1, 2, nil))
	require.True(t, observed)
	// The principal's current party differs from the registered ballot party.
	// Replacement still deletes the correct nomination and clears its running mate.
	for _, userID := range []int64{1, 2, 3} {
		key := fmt.Sprintf("%s%d", db.RedisUserActiveCandidacies, userID)
		require.Zero(t, rdb.Exists(ctx, key).Val())
	}
	current, err := s.GetUserActiveCandidacies(ctx, 2)
	require.NoError(t, err)
	require.Len(t, current, 1)
	require.Equal(t, "upcoming", current[0].ElectionStatus)
	removed, err := s.GetUserActiveCandidacies(ctx, 1)
	require.NoError(t, err)
	require.Empty(t, removed)
	runningMate, err := s.GetUserActiveCandidacies(ctx, 3)
	require.NoError(t, err)
	require.Empty(t, runningMate)
	// Editing the date invalidates the candidate list and single-election cache.
	var yesterday time.Time
	require.NoError(t, pool.QueryRow(ctx, "SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Lagos')::date-1").Scan(&yesterday))
	updated, err := s.UpdateElection(ctx, UpdateElectionParams{ID: 1, Name: "Historical", ElectionGroupID: 1, ElectionDate: yesterday})
	require.NoError(t, err)
	require.Equal(t, "ended", updated.Status)
	require.Zero(t, rdb.Exists(ctx, db.RedisUserActiveCandidacies+"2").Val())
	current, err = s.GetUserActiveCandidacies(ctx, 2)
	require.NoError(t, err)
	require.Empty(t, current)
	election, err := s.GetElectionByID(ctx, 1)
	require.NoError(t, err)
	require.Equal(t, "ended", election.Status)
	// Existing mutation guards must consult derived status too.
	group, err := q.CreateElectionGroup(ctx, queries.CreateElectionGroupParams{Name: "Other", Year: 2026})
	require.NoError(t, err)
	err = s.BulkUpdateElectionGroup(ctx, BulkUpdateElectionGroupParams{ElectionIDs: []int32{1}, ElectionGroupID: group.ID})
	require.ErrorContains(t, err, "ended")
	_, err = s.BulkDeleteElections(ctx, BulkDeleteElectionsParams{ElectionIDs: []int32{1}})
	require.ErrorContains(t, err, "ended")
	// Explicit removal also clears the departing nominee's populated cache.
	require.NoError(t, s.FieldPartyCandidate(ctx, 1, 1, 0, nil))
	require.Zero(t, rdb.Exists(ctx, db.RedisUserActiveCandidacies+"2").Val())
	// The public bulk-sync endpoint keeps its pre-existing disabled behavior.
	err = s.SyncElectionCandidates(ctx, 1, []CandidateInput{{CandidateID: 1, PartyID: 1}})
	require.ErrorContains(t, err, "temporarily disabled")
	// Its retained implementation also clears profiles after changing affiliation.
	require.NoError(t, rdb.Set(ctx, db.RedisUserInfo+"101", "old profile", time.Hour).Err())
	require.NoError(t, s.syncElectionCandidates(ctx, 1, []CandidateInput{{CandidateID: 1, PartyID: 1}}))
	require.Zero(t, rdb.Exists(ctx, db.RedisUserInfo+"101").Val())
	user, err := q.GetUserByID(ctx, 1)
	require.NoError(t, err)
	require.Equal(t, pgtype.Int2{Int16: 1, Valid: true}, user.PartyID)
	// Single and bulk group moves must refresh the group exposed on candidacies.
	updated, err = s.UpdateElection(ctx, UpdateElectionParams{
		ID: 1, Name: "Moved", ElectionGroupID: group.ID, ElectionDate: yesterday.AddDate(0, 0, 5),
	})
	require.NoError(t, err)
	require.Equal(t, "upcoming", updated.Status)
	current, err = s.GetUserActiveCandidacies(ctx, 1)
	require.NoError(t, err)
	require.Len(t, current, 1)
	require.Equal(t, group.ID, current[0].ElectionGroupID)
	require.NoError(t, s.BulkUpdateElectionGroup(ctx, BulkUpdateElectionGroupParams{
		ElectionIDs: []int32{1}, ElectionGroupID: 1,
	}))
	require.Zero(t, rdb.Exists(ctx, db.RedisUserActiveCandidacies+"1").Val())
	current, err = s.GetUserActiveCandidacies(ctx, 1)
	require.NoError(t, err)
	require.EqualValues(t, 1, current[0].ElectionGroupID)
}
