package electionsservice

import (
	"context"
	"encoding/json"
	"strconv"
	"testing"
	"time"

	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	electiongroups "free9ja/api/internal/service/election_groups"
	"free9ja/api/internal/testutil"
	"free9ja/api/internal/utils"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/require"
)

func TestElectionResponseJSON(t *testing.T) {
	date := time.Date(2026, 10, 20, 0, 0, 0, 0, time.UTC)
	response := ElectionWithCandidates{ElectionDetails: electionDetails(queries.Election{
		ID: 42, ElectionDate: pgtype.Date{Time: date, Valid: true},
	}, date)}
	raw, err := json.Marshal(response)
	require.NoError(t, err)
	var fields map[string]interface{}
	require.NoError(t, json.Unmarshal(raw, &fields))
	require.EqualValues(t, 42, fields["id"])
	require.Equal(t, "ongoing", fields["status"])
	require.Equal(t, "2026-10-20", fields["election_date"])
	require.Contains(t, fields, "candidates")
	require.NotContains(t, fields, "Election")
	require.NotContains(t, fields, "ElectionDetails")
}

func TestElectionAPIStatusResponses(t *testing.T) {
	ctx := context.Background()
	pool := testutil.ElectionDB(t)
	rdb := testutil.Redis(t, 3)
	q := queries.New(pool)
	s := &ElectionsService{queries: q, pool: pool, rdb: rdb}
	group, err := q.CreateElectionGroup(ctx, queries.CreateElectionGroupParams{Name: "Statuses", Year: 2026})
	require.NoError(t, err)
	today := utils.LagosDate(time.Now())
	var ended queries.Election
	for _, offset := range []int{-1, 0, 1, 2} {
		row, err := q.CreateElectionInstance(ctx, queries.CreateElectionInstanceParams{
			Name: strconv.Itoa(offset), ElectionGroupID: group.ID, OfficeID: 1, Scope: "nationwide",
			ElectionDate: pgtype.Date{Time: today.AddDate(0, 0, offset), Valid: true},
		})
		require.NoError(t, err)
		if offset == -1 {
			ended = row
		}
	}
	for status, count := range map[string]int{"upcoming": 1, "ongoing": 2, "ended": 1} {
		rows, err := s.ListElections(ctx, ListElectionsFilter{Statuses: []string{status}})
		require.NoError(t, err)
		require.Len(t, rows, count)
		for _, row := range rows {
			require.Equal(t, status, row.Status)
		}
	}
	groups := electiongroups.NewElectionGroupsService(q, rdb, nil)
	rows, err := groups.ListGroupElections(ctx, group.ID)
	require.NoError(t, err)
	require.Len(t, rows, 4)
	want := map[string]string{"-1": "ended", "0": "ongoing", "1": "ongoing", "2": "upcoming"}
	for _, row := range rows {
		require.Equal(t, want[row.Name], row.Status)
	}
	// Both cache misses and cache hits must construct labels in Go.
	read, err := s.GetElectionByID(ctx, ended.ID)
	require.NoError(t, err)
	require.Equal(t, "ended", read.Status)
	key := db.RedisElectionByID + strconv.Itoa(int(ended.ID))
	var cached map[string]interface{}
	require.NoError(t, json.Unmarshal([]byte(rdb.Get(ctx, key).Val()), &cached))
	require.NotContains(t, cached, "status")
	read, err = s.GetElectionByID(ctx, ended.ID)
	require.NoError(t, err)
	require.Equal(t, "ended", read.Status)
	updated, err := s.UpdateElection(ctx, UpdateElectionParams{
		ID: ended.ID, Name: "Rescheduled", ElectionGroupID: group.ID, ElectionDate: today.AddDate(0, 0, 2),
	})
	require.NoError(t, err)
	require.Equal(t, "upcoming", updated.Status)
}
