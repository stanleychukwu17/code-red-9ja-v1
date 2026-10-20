package queries_test

import (
	"context"
	"strconv"
	"testing"
	"time"

	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/testutil"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/require"
)

func TestElectionDateFilters(t *testing.T) {
	pool := testutil.ElectionDB(t)
	ctx := context.Background()
	q := queries.New(pool)
	today := time.Date(2026, 10, 20, 0, 0, 0, 0, time.UTC)
	date := pgtype.Date{Time: today, Valid: true}
	_, err := pool.Exec(ctx, `INSERT INTO users (fake_id,password_hash,current_country,current_state,party_id)
VALUES (101,'test',1,1,1),(102,'test',1,1,1)`)
	require.NoError(t, err)
	for _, offset := range []int{-2, -1, 0, 1, 2, 7} {
		name := strconv.Itoa(offset)
		group, err := q.CreateElectionGroup(ctx, queries.CreateElectionGroupParams{Name: name, Year: 2026})
		require.NoError(t, err)
		row, err := q.CreateElectionInstance(ctx, queries.CreateElectionInstanceParams{
			Name: name, ElectionGroupID: group.ID, OfficeID: 1, Scope: "nationwide",
			ElectionDate: pgtype.Date{Time: today.AddDate(0, 0, offset), Valid: true},
		})
		require.NoError(t, err)
		read, err := q.GetElectionInstanceByID(ctx, row.ID)
		require.NoError(t, err)
		require.Equal(t, row.ElectionDate, read.ElectionDate)
		_, err = pool.Exec(ctx, `INSERT INTO election_candidates
(election_id,election_group_id,candidate_id,running_mate_id,party_id) VALUES ($1,$2,1,2,1)`, row.ID, group.ID)
		require.NoError(t, err)
	}
	for _, tc := range []struct {
		name     string
		statuses []string
		want     []string
	}{
		{"all", nil, []string{"7", "2", "1", "0", "-1", "-2"}},
		{"upcoming", []string{"upcoming"}, []string{"7", "2"}},
		{"ongoing", []string{"ongoing"}, []string{"1", "0"}},
		{"ended", []string{"ended"}, []string{"-1", "-2"}},
		{"active", []string{"upcoming", "ongoing"}, []string{"7", "2", "1", "0"}},
		{"noncontiguous", []string{"upcoming", "ended"}, []string{"7", "2", "-1", "-2"}},
		{"unknown", []string{"unknown"}, []string{}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			rows, err := q.ListElectionInstances(ctx, queries.ListElectionInstancesParams{Today: date, Statuses: tc.statuses, LimitCount: 20})
			require.NoError(t, err)
			names := make([]string, 0, len(rows))
			for _, row := range rows {
				names = append(names, row.Name)
			}
			require.Equal(t, tc.want, names)
		})
	}
	// Principal and running-mate lookups use the same indexed active date range.
	for userID, kind := range map[int64]string{1: "principal", 2: "running_mate"} {
		rows, err := q.GetUserActiveCandidacies(ctx, userID)
		require.NoError(t, err)
		names := make([]string, 0, len(rows))
		for _, row := range rows {
			names = append(names, row.ElectionName)
			require.Equal(t, kind, row.CandidacyType)
		}
		require.Equal(t, []string{"0", "1", "2", "7"}, names)
	}
	// Explicit date bounds still intersect correctly with named status filters.
	rows, err := q.ListElectionInstances(ctx, queries.ListElectionInstancesParams{
		Today: date, Statuses: []string{"upcoming"}, LimitCount: 20,
		DateFrom: pgtype.Date{Time: today.AddDate(0, 0, 5), Valid: true},
	})
	require.NoError(t, err)
	require.Len(t, rows, 1)
	require.Equal(t, "7", rows[0].Name)
}

func TestElectionsSchemaMigrationRoundTrip(t *testing.T) {
	pool := testutil.ElectionDB(t)
	ctx := context.Background()
	up, down := testutil.Migration(t, "20260607120000_elections_schema.sql")
	_, err := pool.Exec(ctx, down)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, up)
	require.NoError(t, err)
	var storedStatus bool
	err = pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM information_schema.columns
WHERE table_schema=current_schema() AND table_name='elections' AND column_name='status')`).Scan(&storedStatus)
	require.NoError(t, err)
	require.False(t, storedStatus)
	var views int
	err = pool.QueryRow(ctx, `SELECT count(*) FROM information_schema.views WHERE table_schema=current_schema()`).Scan(&views)
	require.NoError(t, err)
	require.Zero(t, views)
}
