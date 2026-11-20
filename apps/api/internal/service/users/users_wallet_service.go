package usersservice

import (
	"context"
	"fmt"
	"free9ja/api/internal/constants"
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

// GetOrCreateUserWallet retrieves an existing wallet or provisions a new one for the user.
func (s *UsersService) GetOrCreateUserWallet(ctx context.Context, userID int64) (queries.UserWallet, error) {
	wallet, err := s.queries.GetUserWalletByUserID(ctx, userID)
	if err == nil && wallet.ID > 0 {
		return wallet, nil
	}

	accountReference := fmt.Sprintf("free9ja-user-%d", userID)
	return s.queries.CreateUserWallet(ctx, queries.CreateUserWalletParams{
		UserID:           userID,
		AccountReference: accountReference,
		AccountNumbers:   []byte("[]"),
	})
}

// CreditUserWalletParams contains the parameters for crediting a user's wallet.
type CreditUserWalletParams struct {
	UserID               int64
	AmountKobo           int64
	TransactionReference string
	PayerName            string
	PayerAccountNumber   string
	PayerBankCode        string
	Narration            string
	RawPayload           []byte
}

// CreditUserWallet credits a user's wallet by user ID and records the credit transaction (idempotent).
func (s *UsersService) CreditUserWallet(ctx context.Context, params CreditUserWalletParams) (queries.UserWalletTransaction, error) {
	if params.AmountKobo <= 0 {
		return queries.UserWalletTransaction{}, fmt.Errorf("credit amount must be positive")
	}

	// Idempotency check.
	existing, err := s.queries.GetUserWalletTransactionByReference(ctx, params.TransactionReference)
	if err == nil {
		return existing, nil
	}

	// Retrieve or auto-provision wallet.
	wallet, err := s.GetOrCreateUserWallet(ctx, params.UserID)
	if err != nil {
		return queries.UserWalletTransaction{}, fmt.Errorf("get or create wallet for user %d: %w", params.UserID, err)
	}

	// Credit the balance.
	updatedWallet, err := s.queries.CreditUserWallet(ctx, queries.CreditUserWalletParams{
		BalanceKobo: params.AmountKobo,
		ID:          wallet.ID,
	})
	if err != nil {
		return queries.UserWalletTransaction{}, fmt.Errorf("credit user wallet: %w", err)
	}

	// Persist transaction ledger entry.
	txn, err := s.queries.CreateUserWalletTransaction(ctx, queries.CreateUserWalletTransactionParams{
		WalletID:             wallet.ID,
		TransactionReference: params.TransactionReference,
		Type:                 constants.TransactionTypeCredit,
		AmountKobo:           params.AmountKobo,
		BalanceAfterKobo:     updatedWallet.BalanceKobo,
		PayerName:            utils.PgTextFromString(params.PayerName),
		PayerAccountNumber:   utils.PgTextFromString(params.PayerAccountNumber),
		PayerBankCode:        utils.PgTextFromString(params.PayerBankCode),
		Narration:            utils.PgTextFromString(params.Narration),
		RawPayload:           params.RawPayload,
	})
	if err != nil {
		return queries.UserWalletTransaction{}, fmt.Errorf("record user credit transaction: %w", err)
	}

	return txn, nil
}

// WithdrawFromUserWalletParams contains the parameters for debiting/withdrawing from a user's wallet.
type WithdrawFromUserWalletParams struct {
	UserID               int64
	AmountKobo           int64
	TransactionReference string
	BankAccountNumber   string
	BankCode             string
	Narration            string
}

// WithdrawFromUserWallet debits a user's wallet and records the debit transaction (idempotent).
func (s *UsersService) WithdrawFromUserWallet(ctx context.Context, params WithdrawFromUserWalletParams) (queries.UserWalletTransaction, error) {
	if params.AmountKobo <= 0 {
		return queries.UserWalletTransaction{}, fmt.Errorf("withdrawal amount must be positive")
	}

	// Get wallet.
	wallet, err := s.queries.GetUserWalletByUserID(ctx, params.UserID)
	if err != nil {
		return queries.UserWalletTransaction{}, fmt.Errorf("wallet not found: %w", err)
	}

	// Idempotency check.
	existing, err := s.queries.GetUserWalletTransactionByReference(ctx, params.TransactionReference)
	if err == nil {
		return existing, nil
	}

	// Attempt debit.
	updatedWallet, err := s.queries.DebitUserWallet(ctx, queries.DebitUserWalletParams{
		BalanceKobo: params.AmountKobo,
		ID:          wallet.ID,
	})
	if err != nil {
		return queries.UserWalletTransaction{}, fmt.Errorf("insufficient funds or debit failed: %w", err)
	}

	// Record transaction ledger entry.
	txn, err := s.queries.CreateUserWalletTransaction(ctx, queries.CreateUserWalletTransactionParams{
		WalletID:             wallet.ID,
		TransactionReference: params.TransactionReference,
		Type:                 constants.TransactionTypeDebit,
		AmountKobo:           params.AmountKobo,
		BalanceAfterKobo:     updatedWallet.BalanceKobo,
		PayerName:            utils.PgTextFromString(""),
		PayerAccountNumber:   utils.PgTextFromString(params.BankAccountNumber),
		PayerBankCode:        utils.PgTextFromString(params.BankCode),
		Narration:            utils.PgTextFromString(params.Narration),
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
