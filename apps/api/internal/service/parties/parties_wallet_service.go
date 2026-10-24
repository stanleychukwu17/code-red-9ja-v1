package partiesservice

import (
	"context"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/constants"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// PartiesWalletService manages political party wallets, transactions, and caching.
type PartiesWalletService struct {
	queries        *queries.Queries
	pool           *pgxpool.Pool
	rdb            *redis.Client
	utils          *utils.Utils
	partiesService *PartiesService
}

// NewPartiesWalletService creates a new PartiesWalletService instance.
func NewPartiesWalletService(
	queries *queries.Queries,
	pool *pgxpool.Pool,
	rdb *redis.Client,
	utils *utils.Utils,
	partiesService *PartiesService,
) *PartiesWalletService {
	return &PartiesWalletService{
		queries:        queries,
		pool:           pool,
		rdb:            rdb,
		utils:          utils,
		partiesService: partiesService,
	}
}

// CreatePartyWallet creates a wallet record in party_wallets.
func (s *PartiesWalletService) CreatePartyWallet(ctx context.Context, party queries.Party) (queries.PartyWallet, error) {
	// Check if wallet already exists
	if existingWallet, err := s.queries.GetPartyWalletByPartyID(ctx, party.ID); err == nil && existingWallet.ID > 0 {
		return existingWallet, nil
	}

	// Build a stable, human-readable reference tied to the party ID.
	accountReference := fmt.Sprintf("free9ja-party-%d", party.ID)
	accountNumbersJSON := []byte("[]")

	wallet, err := s.queries.CreatePartyWallet(ctx, queries.CreatePartyWalletParams{
		PartyID:          party.ID,
		AccountReference: accountReference,
		AccountNumbers:   accountNumbersJSON,
	})
	if err != nil {
		return queries.PartyWallet{}, fmt.Errorf("persist party wallet: %w", err)
	}

	return wallet, nil
}

// GetPartyWallet retrieves the wallet associated with a party with Redis caching.
func (s *PartiesWalletService) GetPartyWallet(ctx context.Context, partyID int16) (queries.PartyWallet, error) {
	if partyID <= 0 {
		return queries.PartyWallet{}, fmt.Errorf("invalid party ID")
	}

	redisKey := fmt.Sprintf("%s%d", db.RedisPartyWallet, partyID)

	// Try reading from Redis cache first
	cachedData, err := s.rdb.Get(ctx, redisKey).Result()
	if err == nil {
		var wallet queries.PartyWallet
		if err := json.Unmarshal([]byte(cachedData), &wallet); err == nil && wallet.ID > 0 {
			return wallet, nil
		}
	}

	wallet, err := s.queries.GetPartyWalletByPartyID(ctx, partyID)
	if err != nil {
		return queries.PartyWallet{}, err
	}

	// Cache the wallet in Redis
	if walletJSON, err := json.Marshal(wallet); err == nil {
		_ = s.rdb.Set(ctx, redisKey, walletJSON, db.RedisThirtyDaysTTL).Err()
	}

	return wallet, nil
}

// GetOrCreatePartyWallet retrieves the wallet associated with a party or provisions one if missing.
func (s *PartiesWalletService) GetOrCreatePartyWallet(ctx context.Context, partyID int16) (queries.PartyWallet, error) {
	wallet, err := s.GetPartyWallet(ctx, partyID)
	if err == nil && wallet.ID > 0 {
		return wallet, nil
	}

	party := s.partiesService.GetPartyInfo(ctx, partyID)
	if party == nil {
		return queries.PartyWallet{}, fmt.Errorf("party %d not found", partyID)
	}

	return s.CreatePartyWallet(ctx, queries.Party{ID: party.ID, Name: party.Name})
}

// GetPartyWalletTransactions returns a paginated list of wallet transactions
// for the given party, most recent first.
func (s *PartiesWalletService) GetPartyWalletTransactions(ctx context.Context, partyID int16, limit, offset int32) ([]queries.PartyWalletTransaction, error) {
	wallet, err := s.GetOrCreatePartyWallet(ctx, partyID)
	if err != nil {
		return nil, fmt.Errorf("wallet not found for party %d: %w", partyID, err)
	}

	return s.queries.ListWalletTransactions(ctx, queries.ListWalletTransactionsParams{
		WalletID: wallet.ID,
		Limit:    limit,
		Offset:   offset,
	})
}

// ── Webhook/Deposit-facing methods ──────────────────────────────────────────

// GetWalletByAccountReference looks up a wallet by its account reference.
func (s *PartiesWalletService) GetWalletByAccountReference(ctx context.Context, accountReference string) (queries.PartyWallet, error) {
	return s.queries.GetPartyWalletByAccountReference(ctx, accountReference)
}

// CreditPartyWalletParams holds the parameters required to credit a party's wallet.
type CreditPartyWalletParams struct {
	WalletID             int64
	AmountKobo           int64
	TransactionReference string
	PayerName            string
	PayerAccountNumber   string
	PayerBankCode        string
	Narration            string
	RawPayload           []byte
}

// CreditWallet credits a wallet and records the transaction in a single
// logical operation.
//
// amountKobo must be positive.
// It is idempotent: if transactionReference already exists, it returns the
// existing transaction without crediting again.
func (s *PartiesWalletService) CreditWallet(ctx context.Context, params CreditPartyWalletParams) (queries.PartyWalletTransaction, error) {
	// Idempotency check.
	existing, err := s.queries.GetWalletTransactionByReference(ctx, params.TransactionReference)
	if err == nil {
		// Transaction already processed — return early.
		return existing, nil
	}

	// Credit the balance.
	updatedWallet, err := s.queries.CreditPartyWallet(ctx, queries.CreditPartyWalletParams{
		BalanceKobo: params.AmountKobo,
		ID:          params.WalletID,
	})
	if err != nil {
		return queries.PartyWalletTransaction{}, fmt.Errorf("credit wallet: %w", err)
	}

	// Persist the ledger entry.
	txn, err := s.queries.CreateWalletTransaction(ctx, queries.CreateWalletTransactionParams{
		WalletID:             params.WalletID,
		TransactionReference: params.TransactionReference,
		Type:                 constants.TransactionTypeCredit,
		TransactionCategory:  constants.TxCategoryWalletFunding,
		AmountKobo:           params.AmountKobo,
		BalanceAfterKobo:     updatedWallet.BalanceKobo,
		PayerName:            utils.PgTextFromString(params.PayerName),
		PayerAccountNumber:   utils.PgTextFromString(params.PayerAccountNumber),
		PayerBankCode:        utils.PgTextFromString(params.PayerBankCode),
		Narration:            utils.PgTextFromString(params.Narration),
		RawPayload:           params.RawPayload,
	})
	if err != nil {
		return queries.PartyWalletTransaction{}, fmt.Errorf("record transaction: %w", err)
	}

	// Invalidate wallet cache so fresh balance is immediately reflected
	s.InvalidatePartyWalletCache(ctx, updatedWallet.PartyID)

	return txn, nil
}

// WithdrawPartyWalletParams holds the parameters required for withdrawing from a party's wallet.
type WithdrawPartyWalletParams struct {
	PartyID              int16
	AmountKobo           int64
	TransactionReference string
	BankAccountNumber    string
	BankCode             string
	Narration            string
}

// WithdrawFromWallet debits a party wallet and records the withdrawal as a
// "debit" transaction. If the wallet has insufficient funds, an error is returned.
//
// transactionReference must be unique per withdrawal request (caller generates it).
// bankAccountNumber / bankCode are the destination account for the payout.
func (s *PartiesWalletService) WithdrawFromWallet(
	ctx context.Context,
	params WithdrawPartyWalletParams,
) (queries.PartyWalletTransaction, error) {
	if params.AmountKobo <= 0 {
		return queries.PartyWalletTransaction{}, fmt.Errorf("withdrawal amount must be positive")
	}

	// Get the wallet (cached)
	wallet, err := s.GetPartyWallet(ctx, params.PartyID)
	if err != nil {
		return queries.PartyWalletTransaction{}, fmt.Errorf("wallet not found: %w", err)
	}

	// Idempotency: check for duplicate reference
	existing, err := s.queries.GetWalletTransactionByReference(ctx, params.TransactionReference)
	if err == nil {
		return existing, nil
	}

	// Attempt to debit (query returns error / no rows if balance is insufficient)
	updatedWallet, err := s.queries.DebitPartyWallet(ctx, queries.DebitPartyWalletParams{
		BalanceKobo: params.AmountKobo,
		ID:          wallet.ID,
	})
	if err != nil {
		return queries.PartyWalletTransaction{}, fmt.Errorf("insufficient funds or debit failed: %w", err)
	}

	// Record the ledger entry
	txn, err := s.queries.CreateWalletTransaction(ctx, queries.CreateWalletTransactionParams{
		WalletID:             wallet.ID,
		TransactionReference: params.TransactionReference,
		Type:                 constants.TransactionTypeDebit,
		TransactionCategory:  constants.TxCategoryWalletWithdrawal,
		AmountKobo:           params.AmountKobo,
		BalanceAfterKobo:     updatedWallet.BalanceKobo,
		PayerName:            utils.PgTextFromString(""),
		PayerAccountNumber:   utils.PgTextFromString(params.BankAccountNumber),
		PayerBankCode:        utils.PgTextFromString(params.BankCode),
		Narration:            utils.PgTextFromString(params.Narration),
		RawPayload:           nil,
	})
	if err != nil {
		return queries.PartyWalletTransaction{}, fmt.Errorf("record withdrawal transaction: %w", err)
	}

	// Invalidate wallet cache so fresh balance is immediately reflected
	s.InvalidatePartyWalletCache(ctx, params.PartyID)

	return txn, nil
}

// ProvisionMissingWallets finds all political parties that do not have a wallet
// and provisions a wallet for each.
func (s *PartiesWalletService) ProvisionMissingWallets(ctx context.Context) (int, int, error) {
	PartiesWithNoWallet, err := s.queries.ListPartiesWithoutWallet(ctx)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to fetch parties without wallets: %w", err)
	}

	success := 0
	failed := 0
	for _, party := range PartiesWithNoWallet {
		if _, walletErr := s.CreatePartyWallet(ctx, party); walletErr != nil {
			slog.Warn("failed to provision party wallet",
				"party_id", party.ID,
				"party", party.ShortName,
				"err", walletErr)
			failed++
		} else {
			success++
		}
	}
	return success, failed, nil
}

// InvalidatePartyWalletCache invalidates the Redis cache for a party's wallet.
func (s *PartiesWalletService) InvalidatePartyWalletCache(ctx context.Context, partyID int16) {
	if partyID <= 0 {
		return
	}

	redisKey := fmt.Sprintf("%s%d", db.RedisPartyWallet, partyID)
	_ = s.rdb.Del(ctx, redisKey).Err()
}

// ── Slot pricing and purchasing methods ──────────────────────────────────────

// GetGlobalSlotPrice retrieves the app-wide slot price in Kobo.
// Defaults to 100,000 Kobo (1,000 NGN) if not set.
func (s *PartiesWalletService) GetGlobalSlotPrice(ctx context.Context) (int64, error) {
	setting, err := s.queries.GetSystemSetting(ctx, "slot_cost_kobo")
	if err != nil {
		// Fallback to default of 1000 NGN (100,000 Kobo) if the record is missing.
		return 100000, nil
	}

	var price int64
	if err := json.Unmarshal(setting.Value, &price); err != nil {
		return 0, fmt.Errorf("failed to unmarshal slot price setting: %w", err)
	}

	return price, nil
}

// UpdateGlobalSlotPrice sets the app-wide slot price in Kobo.
func (s *PartiesWalletService) UpdateGlobalSlotPrice(ctx context.Context, priceKobo int64) (int64, error) {
	if priceKobo < 0 {
		return 0, fmt.Errorf("slot price cannot be negative")
	}

	valBytes, err := json.Marshal(priceKobo)
	if err != nil {
		return 0, fmt.Errorf("failed to marshal slot price: %w", err)
	}

	_, err = s.queries.UpdateSystemSetting(ctx, queries.UpdateSystemSettingParams{
		Key:   "slot_cost_kobo",
		Value: valBytes,
	})
	if err != nil {
		return 0, fmt.Errorf("failed to update slot price setting: %w", err)
	}

	return priceKobo, nil
}

// GetPartySlotPrice calculates the customized slot price for a given party,
// applying their discount percentage to the global slot price.
func (s *PartiesWalletService) GetPartySlotPrice(ctx context.Context, partyID int16) (int64, error) {
	globalPrice, err := s.GetGlobalSlotPrice(ctx)
	if err != nil {
		return 0, err
	}

	party, err := s.queries.GetPartyByID(ctx, partyID)
	if err != nil {
		return 0, fmt.Errorf("failed to get party: %w", err)
	}

	var discount float64
	if party.DiscountPercentage.Valid {
		if err := party.DiscountPercentage.Scan(&discount); err != nil {
			discount = 0.0
		}
	}

	if discount <= 0.0 {
		return globalPrice, nil
	}

	if discount >= 100.0 {
		return 0, nil
	}

	finalPrice := float64(globalPrice) * (1.0 - (discount / 100.0))
	return int64(finalPrice), nil
}

// BuySlots debits the party wallet and adds slots directly to the party's balance.
// This is executed as a database transaction.
func (s *PartiesWalletService) BuySlots(ctx context.Context, partyID int16, quantity int32) (queries.Party, error) {
	if quantity <= 0 {
		return queries.Party{}, fmt.Errorf("quantity must be positive")
	}

	if s.pool == nil {
		return queries.Party{}, fmt.Errorf("db pool is not configured")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return queries.Party{}, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	// Fetch custom slot cost for the party inside transaction
	globalPriceSetting, err := txQueries.GetSystemSetting(ctx, "slot_cost_kobo")
	globalPrice := int64(100000)
	if err == nil {
		_ = json.Unmarshal(globalPriceSetting.Value, &globalPrice)
	}

	party, err := txQueries.GetPartyByID(ctx, partyID)
	if err != nil {
		return queries.Party{}, fmt.Errorf("failed to get party: %w", err)
	}

	var discount float64
	if party.DiscountPercentage.Valid {
		_ = party.DiscountPercentage.Scan(&discount)
	}

	unitPrice := globalPrice
	if discount > 0.0 && discount < 100.0 {
		unitPrice = int64(float64(globalPrice) * (1.0 - (discount / 100.0)))
	} else if discount >= 100.0 {
		unitPrice = 0
	}

	totalCost := unitPrice * int64(quantity)

	// Get wallet details
	wallet, err := txQueries.GetPartyWalletByPartyID(ctx, partyID)
	if err != nil {
		return queries.Party{}, fmt.Errorf("wallet not found for party: %w", err)
	}

	if wallet.BalanceKobo < totalCost {
		return queries.Party{}, fmt.Errorf("insufficient wallet balance: required %d kobo, have %d kobo", totalCost, wallet.BalanceKobo)
	}

	// Debit the wallet
	updatedWallet, err := txQueries.DebitPartyWallet(ctx, queries.DebitPartyWalletParams{
		BalanceKobo: totalCost,
		ID:          wallet.ID,
	})
	if err != nil {
		return queries.Party{}, fmt.Errorf("wallet debit failed: %w", err)
	}

	// Log financial transaction in party_wallet_transactions
	txRef := fmt.Sprintf("slot-purchase-%d-%d", partyID, time.Now().UnixNano())
	_, err = txQueries.CreateWalletTransaction(ctx, queries.CreateWalletTransactionParams{
		WalletID:             wallet.ID,
		TransactionReference: txRef,
		Type:                 constants.TransactionTypeDebit,
		TransactionCategory:  constants.TxCategorySlotPurchase,
		AmountKobo:           totalCost,
		BalanceAfterKobo:     updatedWallet.BalanceKobo,
		PayerName:            utils.PgTextFromString(""),
		PayerAccountNumber:   utils.PgTextFromString(""),
		PayerBankCode:        utils.PgTextFromString(""),
		Narration:            utils.PgTextFromString(fmt.Sprintf("Purchased %d polling agent slots", quantity)),
		RawPayload:           []byte("{}"),
	})
	if err != nil {
		return queries.Party{}, fmt.Errorf("failed to log slot purchase transaction: %w", err)
	}

	// Add slots directly to parties table
	updatedParty, err := txQueries.AddPartySlots(ctx, queries.AddPartySlotsParams{
		Slots: quantity,
		ID:    partyID,
	})
	if err != nil {
		return queries.Party{}, fmt.Errorf("failed to increment party slots: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return queries.Party{}, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Invalidate both wallet cache and party cache
	s.InvalidatePartyWalletCache(ctx, partyID)
	s.partiesService.InvalidatePartyCache(ctx, partyID)

	return updatedParty, nil
}
