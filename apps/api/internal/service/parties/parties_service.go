package partiesservice

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"
	"free9ja/api/internal/db/queries"
	monnifyclient "free9ja/api/internal/service/monnify"

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
	queries *queries.Queries
	pool    *pgxpool.Pool
	rdb     *redis.Client
	monnify *monnifyclient.Client
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

// CreateParty inserts a party into the database and, if a Monnify client is
// configured, immediately provisions a reserved virtual account (wallet) for it.
func (s *PartiesService) CreateParty(ctx context.Context, shortName, name, logo string) (queries.Party, error) {
	party, err := s.queries.CreateParty(ctx, queries.CreatePartyParams{
		ShortName: shortName,
		Name:      name,
		Logo:      logo,
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

	// Serialise the account numbers slice to JSONB.
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

// GetPartyByID returns a party by its database ID.
func (s *PartiesService) GetPartyByID(ctx context.Context, id int64) (queries.Party, error) {
	return s.queries.GetPartyByID(ctx, id)
}

// GetPartyByShortName returns a party by its short name (e.g. "APC").
func (s *PartiesService) GetPartyByShortName(ctx context.Context, shortName string) (queries.Party, error) {
	return s.queries.GetPartyByShortName(ctx, shortName)
}

// ListParties returns all parties ordered by ID ascending.
func (s *PartiesService) ListParties(ctx context.Context) ([]queries.Party, error) {
	return s.queries.ListParties(ctx)
}

// UpdateParty modifies the short name, name, and logo of an existing party.
func (s *PartiesService) UpdateParty(ctx context.Context, id int64, shortName, name, logo string) (queries.Party, error) {
	return s.queries.UpdateParty(ctx, queries.UpdatePartyParams{
		ID:        id,
		ShortName: shortName,
		Name:      name,
		Logo:      logo,
	})
}

// DeleteParty removes a party from the database (cascades to party_wallets).
func (s *PartiesService) DeleteParty(ctx context.Context, id int64) error {
	return s.queries.DeleteParty(ctx, id)
}

// GetPartyWallet retrieves the wallet associated with a party.
func (s *PartiesService) GetPartyWallet(ctx context.Context, partyID int64) (queries.PartyWallet, error) {
	return s.queries.GetPartyWalletByPartyID(ctx, partyID)
}

// GetPartyWalletTransactions returns a paginated list of wallet transactions
// for the given party, most recent first.
func (s *PartiesService) GetPartyWalletTransactions(ctx context.Context, partyID int64, limit, offset int32) ([]queries.PartyWalletTransaction, error) {
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
	partyID int64,
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
	unwalletedParties, err := s.queries.ListPartiesWithoutWallet(ctx)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to fetch parties without wallets: %w", err)
	}

	success := 0
	failed := 0
	for _, party := range unwalletedParties {
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
func (s *PartiesService) GetPartySlotPrice(ctx context.Context, partyID int64) (int64, error) {
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
func (s *PartiesService) BuySlots(ctx context.Context, partyID int64, quantity int32) (queries.Party, error) {
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

	return updatedParty, nil
}

// UpdatePartyDiscount sets custom discount percentage for a political party.
func (s *PartiesService) UpdatePartyDiscount(ctx context.Context, partyID int64, discountPercentage float64) (queries.Party, error) {
	if discountPercentage < 0.0 || discountPercentage > 100.0 {
		return queries.Party{}, fmt.Errorf("discount percentage must be between 0 and 100")
	}

	var numericDiscount pgtype.Numeric
	if err := numericDiscount.Scan(fmt.Sprintf("%.2f", discountPercentage)); err != nil {
		return queries.Party{}, fmt.Errorf("failed to parse discount percentage: %w", err)
	}

	return s.queries.UpdatePartyDiscount(ctx, queries.UpdatePartyDiscountParams{
		DiscountPercentage: numericDiscount,
		ID:                 partyID,
	})
}

// DepositAllowance debits the party wallet and adds it to the party's dedicated polling agent allowance balance.
// This is executed as a database transaction.
func (s *PartiesService) DepositAllowance(ctx context.Context, partyID int64, amountKobo int64) (queries.Party, error) {
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
		AllowanceBalanceKobo: amountKobo,
		ID:                   partyID,
	})
	if err != nil {
		return queries.Party{}, fmt.Errorf("failed to deposit allowance: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return queries.Party{}, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return updatedParty, nil
}

// UpdateStateAllowances updates the state-by-state polling agent payment settings for a party.
func (s *PartiesService) UpdateStateAllowances(ctx context.Context, partyID int64, allowancesJSON []byte) (queries.Party, error) {
	// Simple validation to ensure valid JSON is supplied
	var temp map[string]any
	if err := json.Unmarshal(allowancesJSON, &temp); err != nil {
		return queries.Party{}, fmt.Errorf("invalid allowances configuration: %w", err)
	}

	return s.queries.UpdatePartyStateAllowances(ctx, queries.UpdatePartyStateAllowancesParams{
		StateAllowances: allowancesJSON,
		ID:              partyID,
	})
}

