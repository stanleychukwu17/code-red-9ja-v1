package partiesservice

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	monnifyclient "free9ja/api/internal/service/monnify"
	"log/slog"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// pgTextFromString converts a plain string to a nullable pgtype.Text.
func pgTextFromString(s string) pgtype.Text {
	if s == "" {
		return pgtype.Text{Valid: false}
	}
	return pgtype.Text{String: s, Valid: true}
}

// PartiesService manages political parties and their Monnify-backed wallets.
type PartiesService struct {
	queries                  *queries.Queries
	pool                     *pgxpool.Pool
	rdb                      *redis.Client
	monnify                  *monnifyclient.Client
	pageVerificationsService PageVerificationsService
	usersService             UsersService
}

// UsersService interface defines the methods needed from the users service
type UsersService interface {
	GetUserByFakeID(ctx context.Context, fakeID int64) (queries.UserWithPlaces, error)
	UpdateUserParty(ctx context.Context, userID int64, partyID *int16, fakeID int64) error
}

// PageVerificationsService interface defines the methods needed from the page verifications service
type PageVerificationsService interface {
	GetPageVerifications(ctx context.Context, pageType string, pageID int64) ([]queries.GetPageVerificationsRow, error)
}

// NewPartiesService creates a new PartiesService.
// monnify may be nil in test environments — wallet creation will be skipped.
func NewPartiesService(q *queries.Queries, pool *pgxpool.Pool, rdb *redis.Client, monnify *monnifyclient.Client) *PartiesService {
	return &PartiesService{
		queries: q,
		pool:    pool,
		rdb:     rdb,
		monnify: monnify,
	}
}

// SetPageVerificationsService sets the PageVerificationsService to avoid circular dependency in constructor.
func (s *PartiesService) SetPageVerificationsService(pvs PageVerificationsService) {
	s.pageVerificationsService = pvs
}

// SetUsersService sets the UsersService to avoid circular dependency in constructor.
func (s *PartiesService) SetUsersService(us UsersService) {
	s.usersService = us
}

// CreateParty inserts a party into the database and, if a Monnify client is
// configured, immediately provisions a reserved virtual account (wallet) for it.
func (s *PartiesService) CreateParty(ctx context.Context, shortName, name, logo string, logoFileID *int64, displayOrder int32) (queries.Party, error) {
	var logoFileIDPg pgtype.Int8
	if logoFileID != nil {
		logoFileIDPg = pgtype.Int8{Int64: *logoFileID, Valid: true}
	}

	party, err := s.queries.CreateParty(ctx, queries.CreatePartyParams{
		ShortName:    shortName,
		Name:         name,
		Logo:         logo,
		LogoFileID:   logoFileIDPg,
		DisplayOrder: displayOrder,
	})
	if err != nil {
		return queries.Party{}, err
	}

	// Provision wallet asynchronously via Monnify (best-effort).
	// Wallet creation failure does NOT roll back the party insert — the admin
	// can retry wallet creation later via a dedicated endpoint.
	if s.monnify != nil {
		if _, walletErr := s.CreatePartyWallet(ctx, party); walletErr != nil {
			// Log but don't fail — party creation must succeed either way.
			_ = walletErr
		}
	}

	// Invalidate parties listings cache
	s.InvalidatePartyCache(ctx, party.ID)

	return party, nil
}

// CreatePartyWallet calls Monnify to create a reserved virtual account for the
// given party, then persists the wallet record in party_wallets.
//
// It is safe to call this more than once — subsequent calls will return an error
// because account_reference is UNIQUE and Monnify rejects duplicate references.
func (s *PartiesService) CreatePartyWallet(ctx context.Context, party queries.Party) (queries.PartyWallet, error) {
	if s.monnify == nil {
		return queries.PartyWallet{}, fmt.Errorf("monnify client is not configured")
	}

	// Build a stable, human-readable reference tied to the party ID.
	accountReference := fmt.Sprintf("free9ja-party-%d", party.ID)

	resp, err := s.monnify.CreateReservedAccount(ctx, monnifyclient.ReservedAccountRequest{
		AccountReference: accountReference,
		AccountName:      party.Name + " - free9ja",
		CustomerEmail:    fmt.Sprintf("party-%d@free9ja.com", party.ID),
		CustomerName:     party.Name,
		CustomerBvn:      "22222222222", // Default dummy BVN to ensure accounts are generated in sandbox/testing
	})
	if err != nil {
		return queries.PartyWallet{}, fmt.Errorf("monnify reserved account: %w", err)
	}

	// Serialize the account numbers slice to JSONB.
	accountNumbersJSON, err := json.Marshal(resp.AccountNumbers)
	if err != nil {
		return queries.PartyWallet{}, fmt.Errorf("marshal account numbers: %w", err)
	}

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

// GetPartyBasicInfo retrieves basic party info.
func (s *PartiesService) GetPartyBasicInfo(ctx context.Context, partyID int16) *queries.PartyBasicInfoWithVerifications {
	redisKey := fmt.Sprintf("%s%d", db.RedisPartyBasicInfo, partyID)

	// Try to get from Redis
	cachedData, err := s.rdb.Get(ctx, redisKey).Result()
	if err == nil {
		var party queries.PartyBasicInfoWithVerifications
		if err := json.Unmarshal([]byte(cachedData), &party); err == nil {
			return &party
		}
	}

	partyRow, err := s.queries.GetPartyBasicInfo(ctx, partyID)
	if err != nil {
		return nil
	}

	party := queries.PartyBasicInfoWithVerifications{
		GetPartyBasicInfoRow: partyRow,
	}

	// Only fetch verifications if the party is flagged as verified
	if partyRow.IsVerified.Bool && s.pageVerificationsService != nil {
		verifications, _ := s.pageVerificationsService.GetPageVerifications(ctx, db.PageTypeParty, int64(partyID))
		if verifications != nil {
			party.Verifications = verifications
		}
	}

	// Save to Redis
	if partyData, err := json.Marshal(party); err == nil {
		s.rdb.Set(ctx, redisKey, partyData, db.RedisOneYearTTL)
	}

	return &party
}

// GetPartyInfo returns a party if the provided optional partyID is valid.
func (s *PartiesService) GetPartyInfo(ctx context.Context, partyID int16) *queries.PartyWithVerifications {
	redisKey := fmt.Sprintf("%s%d", db.RedisPartyInfo, partyID)

	// Try to get from Redis
	cachedData, err := s.rdb.Get(ctx, redisKey).Result()
	if err == nil {
		var party queries.PartyWithVerifications
		if err := json.Unmarshal([]byte(cachedData), &party); err == nil {
			return &party
		}
	}

	partyRow, err := s.queries.GetPartyByID(ctx, int16(partyID))
	if err == nil {
		party := queries.PartyWithVerifications{
			Party: partyRow,
		}

		if partyRow.IsVerified.Bool && s.pageVerificationsService != nil {
			verifications, _ := s.pageVerificationsService.GetPageVerifications(ctx, db.PageTypeParty, int64(partyID))
			if verifications != nil {
				party.Verifications = verifications
			}
		}

		// Save to Redis
		if partyData, err := json.Marshal(party); err == nil {
			s.rdb.Set(ctx, redisKey, partyData, db.RedisOneYearTTL)
		}
		return &party
	}
	return nil
}

// GetPartyByShortName returns a party by its short name (e.g. "APC").
func (s *PartiesService) GetPartyByShortName(ctx context.Context, shortName string) (queries.Party, error) {
	return s.queries.GetPartyByShortName(ctx, shortName)
}

// ListParties returns all parties ordered by ID ascending.
func (s *PartiesService) ListParties(ctx context.Context) ([]queries.PartyWithVerifications, error) {
	redisKey := db.RedisPartiesList

	// Try to get from Redis
	cachedData, err := s.rdb.Get(ctx, redisKey).Result()
	if err == nil {
		var parties []queries.PartyWithVerifications
		if err := json.Unmarshal([]byte(cachedData), &parties); err == nil {
			return parties, nil
		}
	}

	// fetch from db using the status and display order
	partyRows, err := s.queries.ListParties(ctx)
	if err != nil {
		return nil, err
	}

	var parties []queries.PartyWithVerifications
	for _, p := range partyRows {
		party := queries.PartyWithVerifications{
			Party: p,
		}

		if p.IsVerified.Bool && s.pageVerificationsService != nil {
			verifications, _ := s.pageVerificationsService.GetPageVerifications(ctx, db.PageTypeParty, int64(p.ID))
			if verifications != nil {
				party.Verifications = verifications
			}
		}
		parties = append(parties, party)
	}

	// Save to Redis
	if partyData, err := json.Marshal(parties); err == nil {
		s.rdb.Set(ctx, redisKey, partyData, db.RedisTwoYearsTTL)
	}

	return parties, nil
}

// UpdateParty modifies the short name, name, and logo of an existing party.
func (s *PartiesService) UpdateParty(ctx context.Context, id int64, shortName, name, logo string, logoFileID *int64, displayOrder int32) (queries.Party, error) {
	defer s.InvalidatePartyCache(ctx, int16(id))
	var logoFileIDPg pgtype.Int8
	if logoFileID != nil {
		logoFileIDPg = pgtype.Int8{Int64: *logoFileID, Valid: true}
	}

	party, err := s.queries.UpdateParty(ctx, queries.UpdatePartyParams{
		ID:           int16(id),
		ShortName:    shortName,
		Name:         name,
		Logo:         logo,
		LogoFileID:   logoFileIDPg,
		DisplayOrder: displayOrder,
	})

	s.InvalidatePartyCache(ctx, int16(id))
	return party, err
}

// DeleteParty removes a party from the database (cascades to party_wallets).
func (s *PartiesService) DeleteParty(ctx context.Context, id int64) error {
	s.InvalidatePartyCache(ctx, int16(id))
	return s.queries.DeleteParty(ctx, int16(id))
}

// GetPartyWallet retrieves the wallet associated with a party.
func (s *PartiesService) GetPartyWallet(ctx context.Context, partyID int16) (queries.PartyWallet, error) {
	return s.queries.GetPartyWalletByPartyID(ctx, partyID)
}

// GetPartyWalletTransactions returns a paginated list of wallet transactions
// for the given party, most recent first.
func (s *PartiesService) GetPartyWalletTransactions(ctx context.Context, partyID int16, limit, offset int32) ([]queries.PartyWalletTransaction, error) {
	wallet, err := s.queries.GetPartyWalletByPartyID(ctx, partyID)
	if err != nil {
		return nil, fmt.Errorf("wallet not found for party %d: %w", partyID, err)
	}

	return s.queries.ListWalletTransactions(ctx, queries.ListWalletTransactionsParams{
		WalletID: wallet.ID,
		Limit:    limit,
		Offset:   offset,
	})
}

// ── Webhook-facing methods (called by the webhook handler) ───────────────────

// GetWalletByAccountReference looks up a wallet by the Monnify account reference.
func (s *PartiesService) GetWalletByAccountReference(ctx context.Context, accountReference string) (queries.PartyWallet, error) {
	return s.queries.GetPartyWalletByAccountReference(ctx, accountReference)
}

// CreditWallet credits a wallet and records the transaction in a single
// logical operation (two sequential statements — production code should wrap
// these in a DB transaction if you want full ACID guarantees).
//
// amountKobo must be positive.
// It is idempotent: if transactionReference already exists, it returns the
// existing transaction without crediting again.
func (s *PartiesService) CreditWallet(
	ctx context.Context,
	walletID int64,
	amountKobo int64,
	transactionReference string,
	payerName, payerAccountNumber, payerBankCode, narration string,
	rawPayload []byte,
) (queries.PartyWalletTransaction, error) {
	// Idempotency check.
	existing, err := s.queries.GetWalletTransactionByReference(ctx, transactionReference)
	if err == nil {
		// Transaction already processed — return early.
		return existing, nil
	}

	// Credit the balance.
	updatedWallet, err := s.queries.CreditPartyWallet(ctx, queries.CreditPartyWalletParams{
		BalanceKobo: amountKobo,
		ID:          walletID,
	})
	if err != nil {
		return queries.PartyWalletTransaction{}, fmt.Errorf("credit wallet: %w", err)
	}

	// Persist the ledger entry.
	txn, err := s.queries.CreateWalletTransaction(ctx, queries.CreateWalletTransactionParams{
		WalletID:             walletID,
		TransactionReference: transactionReference,
		Type:                 "credit",
		TransactionCategory:  "wallet_funding",
		AmountKobo:           amountKobo,
		BalanceAfterKobo:     updatedWallet.BalanceKobo,
		PayerName:            pgTextFromString(payerName),
		PayerAccountNumber:   pgTextFromString(payerAccountNumber),
		PayerBankCode:        pgTextFromString(payerBankCode),
		Narration:            pgTextFromString(narration),
		RawPayload:           rawPayload,
	})
	if err != nil {
		return queries.PartyWalletTransaction{}, fmt.Errorf("record transaction: %w", err)
	}

	return txn, nil
}

// WithdrawFromWallet debits a party wallet and records the withdrawal as a
// "debit" transaction. If the wallet has insufficient funds, an error is returned.
//
// transactionReference must be unique per withdrawal request (caller generates it).
// bankAccountNumber / bankCode are the destination account for the payout.
func (s *PartiesService) WithdrawFromWallet(
	ctx context.Context,
	partyID int16,
	amountKobo int64,
	transactionReference string,
	bankAccountNumber, bankCode, narration string,
) (queries.PartyWalletTransaction, error) {
	if amountKobo <= 0 {
		return queries.PartyWalletTransaction{}, fmt.Errorf("withdrawal amount must be positive")
	}

	// Get the wallet
	wallet, err := s.queries.GetPartyWalletByPartyID(ctx, partyID)
	if err != nil {
		return queries.PartyWalletTransaction{}, fmt.Errorf("wallet not found: %w", err)
	}

	// Idempotency: check for duplicate reference
	existing, err := s.queries.GetWalletTransactionByReference(ctx, transactionReference)
	if err == nil {
		return existing, nil
	}

	// Attempt to debit (query returns error / no rows if balance is insufficient)
	updatedWallet, err := s.queries.DebitPartyWallet(ctx, queries.DebitPartyWalletParams{
		BalanceKobo: amountKobo,
		ID:          wallet.ID,
	})
	if err != nil {
		return queries.PartyWalletTransaction{}, fmt.Errorf("insufficient funds or debit failed: %w", err)
	}

	// Record the ledger entry
	txn, err := s.queries.CreateWalletTransaction(ctx, queries.CreateWalletTransactionParams{
		WalletID:             wallet.ID,
		TransactionReference: transactionReference,
		Type:                 "debit",
		TransactionCategory:  "wallet_withdrawal",
		AmountKobo:           amountKobo,
		BalanceAfterKobo:     updatedWallet.BalanceKobo,
		PayerName:            pgTextFromString(""),
		PayerAccountNumber:   pgTextFromString(bankAccountNumber),
		PayerBankCode:        pgTextFromString(bankCode),
		Narration:            pgTextFromString(narration),
		RawPayload:           nil,
	})
	if err != nil {
		return queries.PartyWalletTransaction{}, fmt.Errorf("record withdrawal transaction: %w", err)
	}

	return txn, nil
}

// ProvisionMissingWallets finds all political parties that do not have a wallet
// and provisions a Monnify reserved virtual account for each.
func (s *PartiesService) ProvisionMissingWallets(ctx context.Context) (int, int, error) {
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

// GetGlobalSlotPrice retrieves the app-wide slot price in Kobo.
// Defaults to 100,000 Kobo (1,000 NGN) if not set.
func (s *PartiesService) GetGlobalSlotPrice(ctx context.Context) (int64, error) {
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
func (s *PartiesService) UpdateGlobalSlotPrice(ctx context.Context, priceKobo int64) (int64, error) {
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
func (s *PartiesService) GetPartySlotPrice(ctx context.Context, partyID int16) (int64, error) {
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
func (s *PartiesService) BuySlots(ctx context.Context, partyID int16, quantity int32) (queries.Party, error) {
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
		Type:                 "debit",
		TransactionCategory:  "slot_purchase",
		AmountKobo:           totalCost,
		BalanceAfterKobo:     updatedWallet.BalanceKobo,
		PayerName:            pgTextFromString(""),
		PayerAccountNumber:   pgTextFromString(""),
		PayerBankCode:        pgTextFromString(""),
		Narration:            pgTextFromString(fmt.Sprintf("Purchased %d polling agent slots", quantity)),
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

	// Invalidate the cache for the party since their slots have changed
	s.InvalidatePartyCache(ctx, partyID)

	return updatedParty, nil
}

// UpdatePartyDiscount sets custom discount percentage for a political party.
func (s *PartiesService) UpdatePartyDiscount(ctx context.Context, partyID int16, discountPercentage float64) (queries.Party, error) {
	if discountPercentage < 0.0 || discountPercentage > 100.0 {
		return queries.Party{}, fmt.Errorf("discount percentage must be between 0 and 100")
	}

	var numericDiscount pgtype.Numeric
	if err := numericDiscount.Scan(fmt.Sprintf("%.2f", discountPercentage)); err != nil {
		return queries.Party{}, fmt.Errorf("failed to parse discount percentage: %w", err)
	}

	defer s.InvalidatePartyCache(ctx, partyID)
	return s.queries.UpdatePartyDiscount(ctx, queries.UpdatePartyDiscountParams{
		DiscountPercentage: numericDiscount,
		ID:                 partyID,
	})
}

// DepositAllowance debits the party wallet and adds it to the party's dedicated polling agent allowance balance.
// This is executed as a database transaction.
func (s *PartiesService) DepositAllowance(ctx context.Context, partyID int16, amountKobo int64) (queries.Party, error) {
	if amountKobo <= 0 {
		return queries.Party{}, fmt.Errorf("amount must be positive")
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

	// Get wallet details
	wallet, err := txQueries.GetPartyWalletByPartyID(ctx, partyID)
	if err != nil {
		return queries.Party{}, fmt.Errorf("wallet not found for party: %w", err)
	}

	if wallet.BalanceKobo < amountKobo {
		return queries.Party{}, fmt.Errorf("insufficient wallet balance: required %d kobo, have %d kobo", amountKobo, wallet.BalanceKobo)
	}

	// Debit the wallet
	updatedWallet, err := txQueries.DebitPartyWallet(ctx, queries.DebitPartyWalletParams{
		BalanceKobo: amountKobo,
		ID:          wallet.ID,
	})
	if err != nil {
		return queries.Party{}, fmt.Errorf("wallet debit failed: %w", err)
	}

	// Log financial transaction in party_wallet_transactions
	txRef := fmt.Sprintf("allowance-deposit-%d-%d", partyID, time.Now().UnixNano())
	_, err = txQueries.CreateWalletTransaction(ctx, queries.CreateWalletTransactionParams{
		WalletID:             wallet.ID,
		TransactionReference: txRef,
		Type:                 "debit",
		TransactionCategory:  "allowance_deposit",
		AmountKobo:           amountKobo,
		BalanceAfterKobo:     updatedWallet.BalanceKobo,
		PayerName:            pgTextFromString(""),
		PayerAccountNumber:   pgTextFromString(""),
		PayerBankCode:        pgTextFromString(""),
		Narration:            pgTextFromString(fmt.Sprintf("Deposited NGN %.2f to polling agent allowance budget", float64(amountKobo)/100.0)),
		RawPayload:           []byte("{}"),
	})
	if err != nil {
		return queries.Party{}, fmt.Errorf("failed to log allowance deposit transaction: %w", err)
	}

	// Add to allowance balance directly in parties table
	updatedParty, err := txQueries.DepositPartyAllowance(ctx, queries.DepositPartyAllowanceParams{
		AgentPaymentBalanceKobo: amountKobo,
		ID:                   partyID,
	})
	if err != nil {
		return queries.Party{}, fmt.Errorf("failed to deposit allowance: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return queries.Party{}, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Invalidate the cache for the party
	s.InvalidatePartyCache(ctx, partyID)

	return updatedParty, nil
}

// UpdateAgentPaymentAllocationKobo updates the state-by-state polling agent payment settings for a party.
func (s *PartiesService) UpdateAgentPaymentAllocationKobo(ctx context.Context, partyID int16, allowancesJSON []byte) (queries.Party, error) {
	// Simple validation to ensure valid JSON is supplied
	var temp map[string]any
	if err := json.Unmarshal(allowancesJSON, &temp); err != nil {
		return queries.Party{}, fmt.Errorf("invalid allowances configuration: %w", err)
	}

	defer s.InvalidatePartyCache(ctx, partyID)
	return s.queries.UpdatePartyAgentPaymentAllocationKobo(ctx, queries.UpdatePartyAgentPaymentAllocationKoboParams{
		AgentPaymentAllocationKobo: allowancesJSON,
		ID:              partyID,
	})
}

// GetAgentPaymentAllocationKobo returns the agent_payment_allocation JSON for a party.
func (s *PartiesService) GetAgentPaymentAllocationKobo(ctx context.Context, partyID int16) (json.RawMessage, error) {
	party, err := s.queries.GetPartyByID(ctx, partyID)
	if err != nil {
		return nil, fmt.Errorf("party not found: %w", err)
	}
	if len(party.AgentPaymentAllocationKobo) == 0 {
		return json.RawMessage("{}"), nil
	}
	return json.RawMessage(party.AgentPaymentAllocationKobo), nil
}

// UpdatePartyIsVerified updates the is_verified flag of a party.
// It also invalidates the cache for the party.
func (s *PartiesService) UpdatePartyIsVerified(ctx context.Context, partyID int16, isVerified bool) error {
	err := s.queries.UpdatePartyIsVerified(ctx, queries.UpdatePartyIsVerifiedParams{
		ID:         partyID,
		IsVerified: pgtype.Bool{Bool: isVerified, Valid: true},
	})
	if err != nil {
		return err
	}

	// Invalidate cache
	s.InvalidatePartyCache(ctx, partyID)

	return nil
}

// InvalidatePartyCache invalidates the Redis cache for a given party and the global parties list.
func (s *PartiesService) InvalidatePartyCache(ctx context.Context, partyID int16) {
	redisPartyInfo := fmt.Sprintf("%s%d", db.RedisPartyInfo, partyID)
	redisPartyBasicInfo := fmt.Sprintf("%s%d", db.RedisPartyBasicInfo, partyID)

	s.rdb.Del(ctx, redisPartyInfo)
	s.rdb.Del(ctx, redisPartyBasicInfo)
	s.rdb.Del(ctx, db.RedisPartiesList)
}

// --start-- party chapters
// GetOrCreateNationalChapter retrieves the national chapter for a party in a specific country,
// and creates one if it doesn't already exist.
func (s *PartiesService) GetOrCreateNationalChapter(ctx context.Context, partyID, countryID int16) (int32, error) {
	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisNationalChapter, partyID, countryID)

	// Try to get from Redis
	if valStr, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		if val, err := strconv.ParseInt(valStr, 10, 32); err == nil {
			return int32(val), nil
		}
	}

	natChapterID, err := s.queries.GetNationalChapter(ctx, queries.GetNationalChapterParams{
		PartyID:   partyID,
		CountryID: pgtype.Int2{Int16: countryID, Valid: true},
	})

	if err == nil {
		// Cache and return
		_ = s.rdb.Set(ctx, cacheKey, natChapterID, db.RedisTwoYearsTTL).Err()
		return natChapterID, nil
	}

	// If not found, create it
	natChapterID, err = s.queries.CreateNationalChapter(ctx, queries.CreateNationalChapterParams{
		PartyID:   partyID,
		CountryID: pgtype.Int2{Int16: countryID, Valid: true},
	})
	if err != nil {
		// If creation failed (likely due to a concurrent duplicate key insert), try fetching it again.
		// when we called this function as we seeded, it failed with duplicate key insert error
		if existingChapterID, fetchErr := s.queries.GetNationalChapter(ctx, queries.GetNationalChapterParams{
			PartyID:   partyID,
			CountryID: pgtype.Int2{Int16: countryID, Valid: true},
		}); fetchErr == nil {
			return existingChapterID, nil
		}
		return 0, fmt.Errorf("failed to create national chapter: %w", err)
	}
	// Cache and return
	_ = s.rdb.Set(ctx, cacheKey, natChapterID, db.RedisTwoYearsTTL).Err()
	return natChapterID, nil
}

const defaultPartyChapterSettings = `{
	"join_policy": {
		"title": "Join policy",
		"options": [
			{"display": "auto approve", "value": "auto_approve"},
			{"display": "manual approve", "value": "manual_approve"}
		],
		"default_value": "auto_approve",
		"value": "auto_approve"
	}
}`

// GetOrCreateChapterSettings retrieves the settings for a specific chapter.
// If the settings do not exist, it creates and returns a default configuration.
func (s *PartiesService) GetOrCreateChapterSettings(ctx context.Context, partyID int16, chapterID int32) ([]byte, error) {
	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisChapterSettings, partyID, chapterID)

	// Try to get from Redis
	if val, err := s.rdb.Get(ctx, cacheKey).Bytes(); err == nil {
		return val, nil
	}

	settings, err := s.queries.GetChapterSettings(ctx, queries.GetChapterSettingsParams{
		PartyID:   partyID,
		ChapterID: chapterID,
	})
	if err == nil {
		_ = s.rdb.Set(ctx, cacheKey, settings, db.RedisTwoYearsTTL).Err()
		return settings, nil
	}

	// Create default settings if they don't exist
	settings, err = s.queries.CreateChapterSettings(ctx, queries.CreateChapterSettingsParams{
		PartyID:   partyID,
		ChapterID: chapterID,
		Settings:  []byte(defaultPartyChapterSettings),
	})
	if err != nil {
		// If creation failed (likely due to a concurrent duplicate key insert), try fetching it again.
		// when we called this function as we seeded, it failed with duplicate key insert error
		if existingSettings, fetchErr := s.queries.GetChapterSettings(ctx, queries.GetChapterSettingsParams{
			PartyID:   partyID,
			ChapterID: chapterID,
		}); fetchErr == nil {
			return existingSettings, nil
		}
		return nil, fmt.Errorf("failed to create default chapter settings: %w", err)
	}

	_ = s.rdb.Set(ctx, cacheKey, settings, db.RedisTwoYearsTTL).Err()
	return settings, nil
}

// GetChapterMemberCount retrieves the number of active members in a chapter.
// It checks Redis first and falls back to the database if not found.
func (s *PartiesService) GetChapterMemberCount(ctx context.Context, chapterID int32) (int64, error) {
	cacheKey := fmt.Sprintf("%s%d", db.RedisChapterMemberCount, chapterID)

	// 1. Try to get count from Redis
	countStr, err := s.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		if count, parseErr := strconv.ParseInt(countStr, 10, 64); parseErr == nil {
			return count, nil
		}
	} else if !errors.Is(err, redis.Nil) {
		slog.Error("Failed to fetch chapter member count from redis", "error", err, "chapterID", chapterID)
	}

	// 2. Fallback to database
	count, err := s.queries.GetChapterMemberCount(ctx, chapterID)
	if err != nil {
		return 0, fmt.Errorf("failed to get chapter member count from db: %w", err)
	}

	// 3. Cache in Redis
	err = s.rdb.Set(ctx, cacheKey, count, db.RedisTwoYearsTTL).Err()
	if err != nil {
		slog.Error("Failed to cache chapter member count in redis", "error", err, "chapterID", chapterID)
	}

	return count, nil
}

// InvalidateChapterMemberCount removes the cached member count for a chapter.
func (s *PartiesService) InvalidateChapterMemberCount(ctx context.Context, chapterID int32) {
	cacheKey := fmt.Sprintf("%s%d", db.RedisChapterMemberCount, chapterID)
	err := s.rdb.Del(ctx, cacheKey).Err()
	if err != nil {
		slog.Error("Failed to invalidate chapter member count in redis", "error", err, "chapterID", chapterID)
	}
}

//--end-- party chapters

// LeaveParty allows a user to leave their current party.
func (s *PartiesService) LeaveParty(ctx context.Context, partyID int16, userID, userFid int64) error {
	chapterIDs, err := s.queries.DeletePartyMembership(ctx, queries.DeletePartyMembershipParams{
		UserID:  userID,
		PartyID: int32(partyID),
	})
	if err != nil {
		return fmt.Errorf("failed to remove user from party_membership: %w", err)
	}

	for _, chapterID := range chapterIDs {
		_ = s.queries.RecordPartyMembershipHistory(ctx, queries.RecordPartyMembershipHistoryParams{
			UserID:    userID,
			PartyID:   partyID,
			ChapterID: chapterID,
			Action:    "left",
		})
		s.InvalidateChapterMemberCount(ctx, chapterID)
	}

	// Remove the user's active party affiliation from the users table
	err = s.usersService.UpdateUserParty(ctx, userID, nil, userFid)
	if err != nil {
		return fmt.Errorf("failed to clear user party_id: %w", err)
	}

	return nil
}

// JoinParty allows a user to become a new party member.
func (s *PartiesService) JoinParty(ctx context.Context, partyID int16, chapterID int32, userID, userFid int64) error {
	// 1. Fetch the user details to check their current party affiliation.
	user, err := s.usersService.GetUserByFakeID(ctx, userFid)
	if err != nil {
		return fmt.Errorf("failed to fetch user details: %w", err)
	}

	// 2. If the user is already in a party, enforce they leave it first.
	// This ensures a user can only belong to one party at a time.
	if user.PartyID.Valid {
		if err := s.LeaveParty(ctx, user.PartyID.Int16, userID, userFid); err != nil {
			return fmt.Errorf("failed to leave current party: %w", err)
		}
	}

	// 3. Resolve the chapter the user is joining.
	// If no specific chapter was provided, default to joining the National chapter.
	var finalChapterID int32 = chapterID
	if finalChapterID == 0 {
		countryID := int16(161) // default national chapter should be nigeria
		natChapterID, err := s.GetOrCreateNationalChapter(ctx, partyID, countryID)
		if err != nil {
			return fmt.Errorf("failed to resolve national chapter: %w", err)
		}
		finalChapterID = natChapterID
	}

	// 3a. Retrieve chapter settings. If none exist, create default settings.
	settings, err := s.GetOrCreateChapterSettings(ctx, partyID, finalChapterID)
	if err != nil {
		return fmt.Errorf("failed to retrieve or create chapter settings: %w", err)
	}

	// 4. Parse settings to determine the join policy.
	var settingsData struct {
		JoinPolicy struct {
			Value string `json:"value"`
		} `json:"join_policy"`
	}
	// Ignore unmarshal errors and fallback to auto_approve if parsing fails
	_ = json.Unmarshal(settings, &settingsData)

	// if the join policy is manual_approve, create a membership request
	if settingsData.JoinPolicy.Value == "manual_approve" {
		_, err = s.queries.AddPartyMembershipRequest(ctx, queries.AddPartyMembershipRequestParams{
			UserID:    userID,
			PartyID:   partyID,
			ChapterID: finalChapterID,
		})

		if err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == "23505" && pgErr.ConstraintName == "idx_unique_pending_party_req" {
				return fmt.Errorf("you already have a pending membership request for this chapter")
			}
			return fmt.Errorf("failed to create membership request: %w", err)
		}

		return nil
	}

	// 5. If auto-approve, insert the new membership record directly.
	err = s.queries.AddPartyMembership(ctx, queries.AddPartyMembershipParams{
		UserID:    userID,
		PartyID:   int32(partyID),
		ChapterID: finalChapterID,
	})
	if err != nil {
		return fmt.Errorf("failed to add party membership: %w", err)
	}

	s.InvalidateChapterMemberCount(ctx, finalChapterID)

	// 6. Log the action in the membership history table for audit trails.
	_ = s.queries.RecordPartyMembershipHistory(ctx, queries.RecordPartyMembershipHistoryParams{
		UserID:    userID,
		PartyID:   partyID,
		ChapterID: finalChapterID,
		Action:    "joined",
	})

	// 7. Update the user's active party affiliation in the users table
	err = s.usersService.UpdateUserParty(ctx, userID, &partyID, userFid)
	if err != nil {
		return fmt.Errorf("failed to update user party_id: %w", err)
	}

	return nil
}

// GetMarketingPlansByType returns marketing plans of a specific type
func (s *PartiesService) GetMarketingPlansByType(ctx context.Context, campaignType string) ([]queries.Plan, error) {
	return s.queries.GetMarketingPlansByType(ctx, campaignType)
}

// CreatePartyMarketingCampaign creates a marketing campaign and deducts the budget from the party wallet
func (s *PartiesService) CreatePartyMarketingCampaign(ctx context.Context, arg queries.CreatePartyMarketingCampaignParams) (queries.PartyMarketingCampaign, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return queries.PartyMarketingCampaign{}, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	qtx := s.queries.WithTx(tx)

	// 1. Get the party wallet to check balance
	wallet, err := qtx.GetPartyWalletByPartyID(ctx, int16(arg.PartyID))
	if err != nil {
		return queries.PartyMarketingCampaign{}, fmt.Errorf("failed to get party wallet: %w", err)
	}

	// Convert pgtype.Numeric budget to int64 kobo (budget is in NGN, multiply by 100)
	budgetFloat, err := arg.Budget.Float64Value()
	if err != nil || !budgetFloat.Valid {
		return queries.PartyMarketingCampaign{}, fmt.Errorf("invalid budget value")
	}
	budgetKobo := int64(budgetFloat.Float64 * 100)

	if wallet.BalanceKobo < budgetKobo {
		return queries.PartyMarketingCampaign{}, fmt.Errorf("insufficient wallet balance: have %d kobo, need %d kobo", wallet.BalanceKobo, budgetKobo)
	}

	// 2. Debit the wallet balance
	updatedWallet, err := qtx.DebitPartyWallet(ctx, queries.DebitPartyWalletParams{
		BalanceKobo: budgetKobo,
		ID:          wallet.ID,
	})
	if err != nil {
		return queries.PartyMarketingCampaign{}, fmt.Errorf("failed to debit wallet: %w", err)
	}

	// 3. Record the debit transaction
	txRef := fmt.Sprintf("MC-%d-%s", arg.PartyID, time.Now().Format("20060102150405"))
	_, err = qtx.CreateWalletTransaction(ctx, queries.CreateWalletTransactionParams{
		WalletID:             wallet.ID,
		TransactionReference: txRef,
		Type:                 "debit",
		TransactionCategory:  "marketing_campaign",
		AmountKobo:           budgetKobo,
		BalanceAfterKobo:     updatedWallet.BalanceKobo,
		PayerName:            pgTextFromString(""),
		PayerAccountNumber:   pgTextFromString(""),
		PayerBankCode:        pgTextFromString(""),
		Narration:            pgTextFromString("Payment for marketing campaign"),
		RawPayload:           nil,
	})
	if err != nil {
		return queries.PartyMarketingCampaign{}, fmt.Errorf("failed to record wallet transaction: %w", err)
	}

	// 4. Get the plan to snapshot referral amount
	plan, err := qtx.GetPlanByID(ctx, arg.PlanID)
	if err != nil {
		return queries.PartyMarketingCampaign{}, fmt.Errorf("failed to get plan: %w", err)
	}
	arg.ReferralAmount = plan.ReferralAmount

	// 5. Create the marketing campaign record
	campaign, err := qtx.CreatePartyMarketingCampaign(ctx, arg)
	if err != nil {
		return queries.PartyMarketingCampaign{}, fmt.Errorf("failed to create marketing campaign: %w", err)
	}

	if err = tx.Commit(ctx); err != nil {
		return queries.PartyMarketingCampaign{}, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return campaign, nil
}

// GetPartyMarketingCampaigns retrieves all marketing campaigns for a party
func (s *PartiesService) GetPartyMarketingCampaigns(ctx context.Context, partyID int32) ([]queries.GetPartyMarketingCampaignsRow, error) {
	return s.queries.GetPartyMarketingCampaigns(ctx, partyID)
}

// CreatePlan creates a new marketing plan (admin only).
func (s *PartiesService) CreatePlan(ctx context.Context, arg queries.CreatePlanParams) (queries.Plan, error) {
	return s.queries.CreatePlan(ctx, arg)
}

// UpdatePlan updates an existing marketing plan (admin only).
func (s *PartiesService) UpdatePlan(ctx context.Context, arg queries.UpdatePlanParams) (queries.Plan, error) {
	return s.queries.UpdatePlan(ctx, arg)
}

// DeletePlan deletes a marketing plan by ID (admin only).
func (s *PartiesService) DeletePlan(ctx context.Context, id int32) error {
	return s.queries.DeletePlan(ctx, id)
}

// GetPlans retrieves marketing plans with optional filters.
func (s *PartiesService) GetPlans(ctx context.Context, typeFilter string, isActiveFilter string) ([]queries.Plan, error) {
	arg := queries.GetPlansParams{
		Column1: typeFilter,
		Column2: isActiveFilter,
	}
	return s.queries.GetPlans(ctx, arg)
}

// UpdatePlanDisplayOrder updates a plan's display order (admin only).
func (s *PartiesService) UpdatePlanDisplayOrder(ctx context.Context, arg queries.UpdatePlanDisplayOrderParams) (queries.Plan, error) {
	return s.queries.UpdatePlanDisplayOrder(ctx, arg)
}

// UpdatePartyAgentAcquisitionTargets updates the agent acquisition targets of a party.
func (s *PartiesService) UpdatePartyAgentAcquisitionTargets(ctx context.Context, arg queries.UpdatePartyAgentAcquisitionTargetsParams) (queries.Party, error) {
	defer s.InvalidatePartyCache(ctx, arg.ID)
	return s.queries.UpdatePartyAgentAcquisitionTargets(ctx, arg)
}

// GetPartyAgentAcquisitionTargets returns the agent_acquisition_targets JSON for a party.
func (s *PartiesService) GetPartyAgentAcquisitionTargets(ctx context.Context, partyID int16) (json.RawMessage, error) {
	party, err := s.queries.GetPartyByID(ctx, partyID)
	if err != nil {
		return nil, fmt.Errorf("party not found: %w", err)
	}
	if len(party.AgentAcquisitionTargets) == 0 {
		return json.RawMessage("{}"), nil
	}
	return json.RawMessage(party.AgentAcquisitionTargets), nil
}


