// seed_party_wallets provisions Monnify reserved virtual accounts for every
// party that does not yet have a wallet row.
//
// Usage (from apps/api/):
//
//	go run ./scripts/seed_party_wallets/
package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"free9ja/api/internal/config"
	"free9ja/api/internal/db/queries"
	monnifyservice "free9ja/api/internal/service/monnify"
	partiesservice "free9ja/api/internal/service/parties"

	"github.com/jackc/pgx/v5/pgxpool"
)


func main() {
	ctx := context.Background()

	// Load config (reads .env automatically)
	cfg := config.Load()

	// Connect to the database
	pool, err := pgxpool.New(ctx, cfg.Database.URL)
	if err != nil {
		slog.Error("failed to connect to database", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	q := queries.New(pool)

	// Initialise Monnify client
	if cfg.Monnify.APIKey == "" || cfg.Monnify.SecretKey == "" {
		slog.Error("Monnify credentials not set — ensure MONNIFY_API_KEY and MONNIFY_SECRET_KEY are configured in .env")
		os.Exit(1)
	}
	monnifyClient := monnifyservice.New(monnifyservice.Config{
		BaseURL:      cfg.Monnify.BaseURL,
		APIKey:       cfg.Monnify.APIKey,
		SecretKey:    cfg.Monnify.SecretKey,
		ContractCode: cfg.Monnify.ContractCode,
	})

	// Build a parties service (no redis needed for this script)
	partiesSvc := partiesservice.NewPartiesService(q, nil, nil, monnifyClient)

	// Fetch all parties that don't yet have a wallet
	unwalletedParties, err := q.ListPartiesWithoutWallet(ctx)
	if err != nil {
		slog.Error("failed to fetch parties without wallets", "err", err)
		os.Exit(1)
	}

	if len(unwalletedParties) == 0 {
		slog.Info("all parties already have wallets — nothing to do")
		return
	}

	slog.Info("parties to wallet", "count", len(unwalletedParties))

	success := 0
	failed := 0
	for _, party := range unwalletedParties {
		wallet, err := partiesSvc.CreatePartyWallet(ctx, party)
		if err != nil {
			slog.Error("failed to create wallet",
				"party_id", party.ID,
				"party", party.ShortName,
				"err", err)
			failed++
			continue
		}
		slog.Info("wallet created",
			"party_id", party.ID,
			"party", party.ShortName,
			"wallet_id", wallet.ID,
			"account_reference", wallet.AccountReference,
		)
		fmt.Printf("  ✓ Party %-6s  wallet_id=%-4d  ref=%s\n",
			party.ShortName, wallet.ID, wallet.AccountReference)
		success++
	}

	fmt.Printf("\nDone: %d created, %d failed\n", success, failed)
	if failed > 0 {
		os.Exit(1)
	}
}
