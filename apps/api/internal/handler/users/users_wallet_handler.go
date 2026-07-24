package usershandler

import (
	"encoding/json"
	"fmt"
	apimiddleware "free9ja/api/internal/middleware"

	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// GetMyWallet handles GET /api/v1/users/me/wallet
// @Summary      Get current user's wallet
// @Description  Returns the virtual account details and current balance (in Kobo) for the logged-in user.
// @Tags         Users
// @Accept       json
// @Produce      json
// @Success      200  {object} map[string]interface{} "Wallet fetched successfully"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      404  {object} map[string]interface{} "Wallet not found"
// @Security     BearerAuth
// @Router       /users/me/wallet [get]
func (h *Handler) GetMyWallet(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

	user, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "User not found")
		return
	}

	wallet, err := h.usersService.GetUserWallet(r.Context(), user.ID)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Wallet not found for this user")
		return
	}

	var parsedAccounts interface{}
	if len(wallet.AccountNumbers) > 0 {
		_ = json.Unmarshal(wallet.AccountNumbers, &parsedAccounts)
	} else {
		parsedAccounts = []interface{}{}
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Wallet fetched successfully", map[string]interface{}{
		"wallet": map[string]interface{}{
			"id":                wallet.ID,
			"user_id":           wallet.UserID,
			"account_reference": wallet.AccountReference,
			"account_numbers":   parsedAccounts,
			"balance_kobo":      wallet.BalanceKobo,
			"currency_code":     wallet.CurrencyCode,
			"status":            wallet.Status,
			"created_at":        wallet.CreatedAt,
			"updated_at":        wallet.UpdatedAt,
		},
	})
}

// ListMyWalletTransactions handles GET /api/v1/users/me/wallet/transactions
// @Summary      List current user's wallet transactions
// @Description  Returns a paginated list of credit/debit transactions for the logged-in user's wallet, ordered newest first.
// @Tags         Users
// @Accept       json
// @Produce      json
// @Param        limit   query  int  false "Number of results (default 20, max 100)"
// @Param        offset  query  int  false "Offset for pagination (default 0)"
// @Success      200  {object} map[string]interface{} "Transactions fetched successfully"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      404  {object} map[string]interface{} "Wallet not found"
// @Security     BearerAuth
// @Router       /users/me/wallet/transactions [get]
func (h *Handler) ListMyWalletTransactions(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

	user, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "User not found")
		return
	}

	limit, offset := parsePaginationForWallet(r)

	txns, err := h.usersService.GetUserWalletTransactions(r.Context(), user.ID, int32(limit), int32(offset))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Could not fetch transactions: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Transactions fetched successfully", map[string]interface{}{
		"transactions": txns,
	})
}

// WithdrawFromUserWallet handles POST /api/v1/users/me/wallet/withdraw
// @Summary      Withdraw from current user's wallet
// @Description  Debits the user's wallet balance and records a withdrawal transaction.
// @Tags         Users
// @Accept       json
// @Produce      json
// @Param        request body UserWithdrawRequest true "Withdrawal payload"
// @Success      200  {object} map[string]interface{} "Withdrawal recorded"
// @Failure      400  {object} map[string]interface{} "Invalid payload"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      402  {object} map[string]interface{} "Insufficient funds"
// @Failure      404  {object} map[string]interface{} "Wallet not found"
// @Security     BearerAuth
// @Router       /users/me/wallet/withdraw [post]
func (h *Handler) WithdrawFromUserWallet(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

	user, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "User not found")
		return
	}

	var req UserWithdrawRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.AmountKobo <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "amount_kobo must be a positive integer")
		return
	}

	txRef := fmt.Sprintf("user-withdraw-%s", uuid.New().String())

	txn, err := h.usersService.WithdrawFromUserWallet(
		r.Context(),
		user.ID,
		req.AmountKobo,
		txRef,
		req.BankAccountNumber,
		req.BankCode,
		req.Narration,
	)
	if err != nil {
		if containsString(err.Error(), "insufficient") || containsString(err.Error(), "no rows") {
			h.utils.RespondError(w, http.StatusPaymentRequired, "Insufficient wallet balance")
			return
		}
		h.utils.RespondError(w, http.StatusInternalServerError, "Withdrawal failed: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Withdrawal recorded successfully", map[string]interface{}{
		"transaction": txn,
	})
}

// UserWithdrawRequest is the payload for POST /users/me/wallet/withdraw.
type UserWithdrawRequest struct {
	AmountKobo        int64  `json:"amount_kobo"`
	BankAccountNumber string `json:"bank_account_number"`
	BankCode          string `json:"bank_code"`
	Narration         string `json:"narration"`
}

// CreateUserWalletHandler handles POST /api/v1/users/{id}/wallet
// @Summary      Create a wallet for a user (admin / recovery)
// @Description  Manually provisions a Monnify reserved virtual account for a user that does not yet have a wallet.
// @Tags         Users
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "User Fake ID"
// @Success      201  {object} map[string]interface{} "Wallet created"
// @Failure      400  {object} map[string]interface{} "Invalid ID"
// @Failure      404  {object} map[string]interface{} "User not found"
// @Failure      409  {object} map[string]interface{} "Wallet already exists"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /users/{id}/wallet [post]
func (h *Handler) CreateUserWalletHandler(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	fakeID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid user fake ID")
		return
	}

	user, err := h.usersService.GetUserByFakeID(r.Context(), fakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "User not found")
		return
	}

	wallet, err := h.usersService.CreateUserWallet(r.Context(), user.User)
	if err != nil {
		if containsString(err.Error(), "unique") || containsString(err.Error(), "duplicate") {
			h.utils.RespondError(w, http.StatusConflict, "This user already has a wallet")
			return
		}
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create wallet: "+err.Error())
		return
	}

	var parsedAccounts interface{}
	if len(wallet.AccountNumbers) > 0 {
		_ = json.Unmarshal(wallet.AccountNumbers, &parsedAccounts)
	} else {
		parsedAccounts = []interface{}{}
	}

	h.utils.RespondSuccess(w, http.StatusCreated, "Wallet created successfully", map[string]interface{}{
		"wallet": map[string]interface{}{
			"id":                wallet.ID,
			"user_id":           wallet.UserID,
			"account_reference": wallet.AccountReference,
			"account_numbers":   parsedAccounts,
			"balance_kobo":      wallet.BalanceKobo,
			"currency_code":     wallet.CurrencyCode,
			"status":            wallet.Status,
			"created_at":        wallet.CreatedAt,
			"updated_at":        wallet.UpdatedAt,
		},
	})
}

// parsePaginationForWallet parses limit + offset query params for wallet transactions.
func parsePaginationForWallet(r *http.Request) (limit int, offset int) {
	limit = 20
	if l, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && l > 0 {
		if l > 100 {
			limit = 100
		} else {
			limit = l
		}
	}
	if o, err := strconv.Atoi(r.URL.Query().Get("offset")); err == nil && o >= 0 {
		offset = o
	}
	return limit, offset
}

func containsString(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsStringHelper(s, substr))
}

func containsStringHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// ProvisionMissingUserWallets godoc
// @Summary      Provision missing wallets for users
// @Description  Iterates over all existing users and provisions a Monnify reserved account wallet for any user that currently lacks one. Used primarily for testing and manual recovery.
// @Tags         Users
// @Accept       json
// @Produce      json
// @Success      200  {object} map[string]interface{} "Provisioning details"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /users/wallets/provision-missing [post]
func (h *Handler) ProvisionMissingUserWallets(w http.ResponseWriter, r *http.Request) {
	success, failed, err := h.usersService.ProvisionMissingWallets(r.Context())
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to provision missing wallets: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Missing user wallets provisioned successfully", map[string]interface{}{
		"success_count": success,
		"failed_count":  failed,
	})
}
