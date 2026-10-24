package usersservice

import (
	"context"
	"fmt"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
	"log/slog"
)

// CreateUserWallet creates a wallet entry in the database for the user.
func (s *UsersService) CreateUserWallet(ctx context.Context, user queries.User) (queries.UserWallet, error) {
	// Check if wallet already exists
	if existingWallet, err := s.queries.GetUserWalletByUserID(ctx, user.ID); err == nil && existingWallet.ID > 0 {
		return existingWallet, nil
	}

	accountReference := fmt.Sprintf("free9ja-user-%d", user.ID)
	accountNumbersJSON := []byte("[]")

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

// GetUserWalletByAccountReference looks up a user's wallet by its account reference.
func (s *UsersService) GetUserWalletByAccountReference(ctx context.Context, accountReference string) (queries.UserWallet, error) {
	return s.queries.GetUserWalletByAccountReference(ctx, accountReference)
}

// CreditUserWallet credits a user's wallet and records the credit transaction (idempotent).
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
		PayerName:            utils.PgTextFromString(payerName),
		PayerAccountNumber:   utils.PgTextFromString(payerAccountNumber),
		PayerBankCode:        utils.PgTextFromString(payerBankCode),
		Narration:            utils.PgTextFromString(narration),
		RawPayload:           rawPayload,
	})
	if err != nil {
		return queries.UserWalletTransaction{}, fmt.Errorf("record user credit transaction: %w", err)
	}

	return txn, nil
}

// WithdrawFromUserWallet debits a user's wallet and records the debit transaction (idempotent).
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
		PayerName:            utils.PgTextFromString(""),
		PayerAccountNumber:   utils.PgTextFromString(bankAccountNumber),
		PayerBankCode:        utils.PgTextFromString(bankCode),
		Narration:            utils.PgTextFromString(narration),
		RawPayload:           nil,
	})
	if err != nil {
		return queries.UserWalletTransaction{}, fmt.Errorf("record user withdrawal transaction: %w", err)
	}

	return txn, nil
}

// ProvisionMissingWallets finds all users that do not have a wallet
// and provisions a wallet for each.
func (s *UsersService) ProvisionMissingWallets(ctx context.Context) (int, int, error) {
	unWalletUsers, err := s.queries.ListUsersWithoutWallet(ctx)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to fetch users without wallets: %w", err)
	}

	success := 0
	failed := 0
	for _, user := range unWalletUsers {
		u := queries.User{
			ID:        user.ID,
			Email:     user.Email,
			FirstName: user.FirstName,
			LastName:  user.LastName,
		}
		if _, walletErr := s.CreateUserWallet(ctx, u); walletErr != nil {
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
