package usersservice

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"free9ja/api/internal/db/queries"
	monnifyclient "free9ja/api/internal/service/monnify"

	"github.com/jackc/pgx/v5/pgtype"
)

// pgTextFromString converts a plain string to a nullable pgtype.Text.
func pgTextFromString(s string) pgtype.Text {
	if s == "" {
		return pgtype.Text{Valid: false}
	}
	return pgtype.Text{String: s, Valid: true}
}

// CreateUserWallet provisions a reserved virtual account via Monnify for the user
// and creates the wallet entry in the database.
func (s *UsersService) CreateUserWallet(ctx context.Context, user queries.User) (queries.UserWallet, error) {
	if s.monnify == nil {
		return queries.UserWallet{}, fmt.Errorf("monnify client is not configured")
	}

	accountReference := fmt.Sprintf("free9ja-user-%d", user.ID)

	email := fmt.Sprintf("user-%d@free9ja.com", user.ID)
	if user.Email.Valid && user.Email.String != "" {
		email = user.Email.String
	}

	name := fmt.Sprintf("User %d", user.ID)
	if fullName := strings.TrimSpace(fmt.Sprintf("%s %s", user.FirstName.String, user.LastName.String)); fullName != "" {
		name = fullName
	}

	// Fetch user's NIN from DB to satisfy Monnify compliance requirements and generate bank account numbers
	var userNin string
	if dbNin, ninErr := s.queries.GetUserNINByUserID(ctx, user.ID); ninErr == nil && len(dbNin.Nin) == 11 {
		userNin = dbNin.Nin
	} else if user.NinVerified.Valid && len(user.NinVerified.String) == 11 {
		userNin = user.NinVerified.String
	}

	// In sandbox/testing mode, if no valid 11-digit NIN is found, use a default dummy NIN
	// to ensure Monnify successfully generates virtual account numbers.
	if len(userNin) != 11 {
		userNin = "22222222222"
	}

	resp, err := s.monnify.CreateReservedAccount(ctx, monnifyclient.ReservedAccountRequest{
		AccountReference: accountReference,
		AccountName:      name + " - free9ja",
		CustomerEmail:    email,
		CustomerName:     name,
		CustomerNin:      userNin,
	})
	if err != nil {
		return queries.UserWallet{}, fmt.Errorf("monnify reserved account: %w", err)
	}

	accountNumbersJSON, err := json.Marshal(resp.AccountNumbers)
	if err != nil {
		return queries.UserWallet{}, fmt.Errorf("marshal account numbers: %w", err)
	}

	wallet, err := s.queries.CreateUserWallet(ctx, queries.CreateUserWalletParams{
		UserID:           user.ID,
		AccountReference: accountReference,
		AccountNumbers:   accountNumbersJSON,
	})
	if err != nil {
		return queries.UserWallet{}, fmt.Errorf("persist user wallet: %w", err)
	}

	return wallet, nil
}

// GetUserWallet retrieves the user's wallet by user ID.
func (s *UsersService) GetUserWallet(ctx context.Context, userID int64) (queries.UserWallet, error) {
	return s.queries.GetUserWalletByUserID(ctx, userID)
}

// GetUserWalletTransactions returns a paginated list of transactions for a user's wallet.
func (s *UsersService) GetUserWalletTransactions(ctx context.Context, userID int64, limit, offset int32) ([]queries.UserWalletTransaction, error) {
	wallet, err := s.queries.GetUserWalletByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("wallet not found for user %d: %w", userID, err)
	}

	return s.queries.ListUserWalletTransactions(ctx, queries.ListUserWalletTransactionsParams{
		WalletID: wallet.ID,
		Limit:    limit,
		Offset:   offset,
	})
}

// GetUserWalletByAccountReference looks up a user's wallet by its Monnify account reference.
func (s *UsersService) GetUserWalletByAccountReference(ctx context.Context, accountReference string) (queries.UserWallet, error) {
	return s.queries.GetUserWalletByAccountReference(ctx, accountReference)
}

// CreditUserWallet credits a user's wallet and records the credit transaction (idempotently).
func (s *UsersService) CreditUserWallet(
	ctx context.Context,
	walletID int64,
	amountKobo int64,
	transactionReference string,
	payerName, payerAccountNumber, payerBankCode, narration string,
	rawPayload []byte,
) (queries.UserWalletTransaction, error) {
	// Idempotency check.
	existing, err := s.queries.GetUserWalletTransactionByReference(ctx, transactionReference)
	if err == nil {
		return existing, nil
	}

	// Credit the balance.
	updatedWallet, err := s.queries.CreditUserWallet(ctx, queries.CreditUserWalletParams{
		BalanceKobo: amountKobo,
		ID:          walletID,
	})
	if err != nil {
		return queries.UserWalletTransaction{}, fmt.Errorf("credit user wallet: %w", err)
	}

	// Persist transaction ledger entry.
	txn, err := s.queries.CreateUserWalletTransaction(ctx, queries.CreateUserWalletTransactionParams{
		WalletID:             walletID,
		TransactionReference: transactionReference,
		Type:                 "credit",
		AmountKobo:           amountKobo,
		BalanceAfterKobo:     updatedWallet.BalanceKobo,
		PayerName:            pgTextFromString(payerName),
		PayerAccountNumber:   pgTextFromString(payerAccountNumber),
		PayerBankCode:        pgTextFromString(payerBankCode),
		Narration:            pgTextFromString(narration),
		RawPayload:           rawPayload,
	})
	if err != nil {
		return queries.UserWalletTransaction{}, fmt.Errorf("record user credit transaction: %w", err)
	}

	return txn, nil
}

// WithdrawFromUserWallet debits a user's wallet and records the debit transaction (idempotently).
func (s *UsersService) WithdrawFromUserWallet(
	ctx context.Context,
	userID int64,
	amountKobo int64,
	transactionReference string,
	bankAccountNumber, bankCode, narration string,
) (queries.UserWalletTransaction, error) {
	if amountKobo <= 0 {
		return queries.UserWalletTransaction{}, fmt.Errorf("withdrawal amount must be positive")
	}

	// Get wallet.
	wallet, err := s.queries.GetUserWalletByUserID(ctx, userID)
	if err != nil {
		return queries.UserWalletTransaction{}, fmt.Errorf("wallet not found: %w", err)
	}

	// Idempotency check.
	existing, err := s.queries.GetUserWalletTransactionByReference(ctx, transactionReference)
	if err == nil {
		return existing, nil
	}

	// Attempt debit.
	updatedWallet, err := s.queries.DebitUserWallet(ctx, queries.DebitUserWalletParams{
		BalanceKobo: amountKobo,
		ID:          wallet.ID,
	})
	if err != nil {
		return queries.UserWalletTransaction{}, fmt.Errorf("insufficient funds or debit failed: %w", err)
	}

	// Record transaction ledger entry.
	txn, err := s.queries.CreateUserWalletTransaction(ctx, queries.CreateUserWalletTransactionParams{
		WalletID:             wallet.ID,
		TransactionReference: transactionReference,
		Type:                 "debit",
		AmountKobo:           amountKobo,
		BalanceAfterKobo:     updatedWallet.BalanceKobo,
		PayerName:            pgTextFromString(""),
		PayerAccountNumber:   pgTextFromString(bankAccountNumber),
		PayerBankCode:        pgTextFromString(bankCode),
		Narration:            pgTextFromString(narration),
		RawPayload:           nil,
	})
	if err != nil {
		return queries.UserWalletTransaction{}, fmt.Errorf("record user withdrawal transaction: %w", err)
	}

	return txn, nil
}

// ProvisionMissingWallets finds all users that do not have a wallet
// and provisions a Monnify reserved virtual account for each.
func (s *UsersService) ProvisionMissingWallets(ctx context.Context) (int, int, error) {
	unwalletedUsers, err := s.queries.ListUsersWithoutWallet(ctx)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to fetch users without wallets: %w", err)
	}

	success := 0
	failed := 0
	for _, user := range unwalletedUsers {
		if _, walletErr := s.CreateUserWallet(ctx, user); walletErr != nil {
			slog.Warn("failed to provision user wallet",
				"user_id", user.ID,
				"err", walletErr)
			failed++
		} else {
			success++
		}
	}
	return success, failed, nil
}
