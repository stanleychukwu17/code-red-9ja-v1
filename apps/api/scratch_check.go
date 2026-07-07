package main

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
	"free9ja/api/internal/db/queries"
)

func main() {
	dbURL := "postgres://postgres:password@localhost:5432/test_db?sslmode=disable"
	ctx := context.Background()

	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	q := queries.New(pool)

	// Fetch candidates for election 1 before sync
	fmt.Println("Before sync:")
	printCandidates(ctx, pool, 1)
	
	// manually update election_final_result to simulate a new rollup
	_, err = pool.Exec(ctx, `UPDATE election_final_result SET candidate_results = '[{"party_short_name": "APC", "vote_count": 999}]'::jsonb WHERE election_id = 1`)
	if err != nil {
		log.Fatal(err)
	}

	// Simulate sync
	fmt.Println("Running UpdateCandidatesFromNationwideElections...")
	err = q.UpdateCandidatesFromNationwideElections(ctx)
	if err != nil {
		log.Fatal(err)
	}

	// Fetch candidates after sync
	fmt.Println("After sync:")
	printCandidates(ctx, pool, 1)
}

func printCandidates(ctx context.Context, pool *pgxpool.Pool, electionID int64) {
	rows, err := pool.Query(ctx, "SELECT party_short_name, votes_count FROM election_candidates WHERE election_id = $1 ORDER BY party_short_name", electionID)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	for rows.Next() {
		var party string
		var votes int
		if err := rows.Scan(&party, &votes); err != nil {
			log.Fatal(err)
		}
		fmt.Printf("Party: %s, Votes: %d\n", party, votes)
	}
}
