package partieswallethandler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	partiesservice "free9ja/api/internal/service/parties"
	"free9ja/api/internal/utils"
)

// PartiesWalletService defines the contract required by PartiesWalletHandler.
type PartiesWalletService interface {
	GetPartyWallet(ctx context.Context, partyID int16) (queries.PartyWallet, error)
	GetOrCreatePartyWallet(ctx context.Context, partyID int16) (queries.PartyWallet, error)
	GetPartyWalletTransactions(ctx context.Context, partyID int16, limit, offset int32) ([]queries.PartyWalletTransaction, error)
	WithdrawFromWallet(ctx context.Context, params partiesservice.WithdrawPartyWalletParams) (queries.PartyWalletTransaction, error)
	CreatePartyWallet(ctx context.Context, party queries.Party) (queries.PartyWallet, error)
	ProvisionMissingWallets(ctx context.Context) (int, int, error)
	CreditWallet(ctx context.Context, params partiesservice.CreditPartyWalletParams) (queries.PartyWalletTransaction, error)
	GetGlobalSlotPrice(ctx context.Context) (int64, error)
	UpdateGlobalSlotPrice(ctx context.Context, priceKobo int64) (int64, error)
	GetPartySlotPrice(ctx context.Context, partyID int16) (int64, error)
	BuySlots(ctx context.Context, partyID int16, quantity int32) (queries.Party, error)
}

// PartiesService provides access to party info.
type PartiesService interface {
	GetPartyInfo(ctx context.Context, partyID int16) *queries.PartyWithVerifications
}

// Handler handles party wallet and slot HTTP endpoints.
type Handler struct {
	partiesWalletService PartiesWalletService
	partiesService       PartiesService
	utils                *utils.Utils
}

// NewHandler creates a new party wallet Handler.
func NewHandler(partiesWalletService PartiesWalletService, partiesService PartiesService, utils *utils.Utils) *Handler {
	return &Handler{
		partiesWalletService: partiesWalletService,
		partiesService:       partiesService,
		utils:                utils,
	}
}

// PartyWalletResponse represents the serialized format of a party's wallet.
type PartyWalletResponse struct {
	ID               int64              `json:"id"`
	PartyID          int16              `json:"party_id"`
	AccountReference string             `json:"account_reference"`
	AccountNumbers   interface{}        `json:"account_numbers"`
	BalanceKobo      int64              `json:"balance_kobo"`
	CurrencyCode     string             `json:"currency_code"`
	Status           string             `json:"status"`
	CreatedAt        pgtype.Timestamptz `json:"created_at"`
	UpdatedAt        pgtype.Timestamptz `json:"updated_at"`
}

// FormatPartyWalletResponse formats a queries.PartyWallet into PartyWalletResponse.
func FormatPartyWalletResponse(wallet queries.PartyWallet) PartyWalletResponse {
	var parsedAccounts interface{}
	if len(wallet.AccountNumbers) > 0 {
		_ = json.Unmarshal(wallet.AccountNumbers, &parsedAccounts)
		if str, ok := parsedAccounts.(string); ok {
			var doubleParsed interface{}
			if err := json.Unmarshal([]byte(str), &doubleParsed); err == nil {
				parsedAccounts = doubleParsed
			}
		}
	} else {
		parsedAccounts = []interface{}{}
	}

	return PartyWalletResponse{
		ID:               wallet.ID,
		PartyID:          wallet.PartyID,
		AccountReference: wallet.AccountReference,
		AccountNumbers:   parsedAccounts,
		BalanceKobo:      wallet.BalanceKobo,
		CurrencyCode:     wallet.CurrencyCode,
		Status:           wallet.Status,
		CreatedAt:        wallet.CreatedAt,
		UpdatedAt:        wallet.UpdatedAt,
	}
}

// GetPartyWallet godoc
// @Summary      Get a party's wallet
// @Description  Returns the reserved virtual account details and current balance (in Kobo) for a political party. The account_numbers field contains one or more bank account numbers that donors can transfer funds to directly.
// @Tags         Parties
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Party ID"
// @Success      200  {object} map[string]interface{} "Wallet fetched successfully"
// @Failure      400  {object} map[string]interface{} "Invalid ID parameter"
// @Failure      404  {object} map[string]interface{} "Wallet not found"
// @Router       /parties/{id}/wallet [get]
func (h *Handler) GetPartyWallet(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	wallet, err := h.partiesWalletService.GetOrCreatePartyWallet(r.Context(), int16(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Failed to resolve party wallet: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Wallet fetched successfully", map[string]interface{}{
		"wallet": FormatPartyWalletResponse(wallet),
	})
}

// ListPartyWalletTransactions godoc
// @Summary      List a party's wallet transactions
// @Description  Returns a paginated list of credit/debit transactions for a party's wallet, ordered newest first. Accessible by admins only.
// @Tags         Parties
// @Accept       json
// @Produce      json
// @Param        id      path   int  true  "Party ID"
// @Param        limit   query  int  false "Number of results (default 20, max 100)"
// @Param        offset  query  int  false "Offset for pagination (default 0)"
// @Success      200  {object} map[string]interface{} "Transactions fetched successfully"
// @Failure      400  {object} map[string]interface{} "Invalid ID or pagination parameters"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      403  {object} map[string]interface{} "Forbidden (Admin only)"
// @Failure      404  {object} map[string]interface{} "Wallet not found"
// @Router       /parties/{id}/wallet/transactions [get]
func (h *Handler) ListPartyWalletTransactions(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	limit, offset := parsePaginationForWallet(r)

	tx, err := h.partiesWalletService.GetPartyWalletTransactions(r.Context(), int16(id), int32(limit), int32(offset))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Could not fetch transactions: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Transactions fetched successfully", map[string]interface{}{
		"transactions": tx,
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

// WithdrawRequest is the payload for POST /parties/{id}/wallet/withdraw.
type WithdrawRequest struct {
	AmountKobo        int64  `json:"amount_kobo"`
	BankAccountNumber string `json:"bank_account_number"`
	BankCode          string `json:"bank_code"`
	Narration         string `json:"narration"`
}

// WithdrawFromPartyWallet godoc
// @Summary      Withdraw from a party wallet
// @Description  Debits the party wallet balance and records a pending withdrawal transaction. The party member must be authenticated.
// @Tags         Parties
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Party ID"
// @Param        request body WithdrawRequest true "Withdrawal payload"
// @Success      200  {object} map[string]interface{} "Withdrawal recorded"
// @Failure      400  {object} map[string]interface{} "Invalid payload"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      402  {object} map[string]interface{} "Insufficient funds"
// @Failure      404  {object} map[string]interface{} "Party or wallet not found"
// @Router       /parties/{id}/wallet/withdraw [post]
func (h *Handler) WithdrawFromPartyWallet(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	var req WithdrawRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.AmountKobo <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "amount_kobo must be a positive integer")
		return
	}

	// Generate a unique transaction reference for idempotency
	txRef := fmt.Sprintf("withdraw-%s", uuid.New().String())

	txn, err := h.partiesWalletService.WithdrawFromWallet(
		r.Context(),
		partiesservice.WithdrawPartyWalletParams{
			PartyID:              int16(id),
			AmountKobo:           req.AmountKobo,
			TransactionReference: txRef,
			BankAccountNumber:    req.BankAccountNumber,
			BankCode:             req.BankCode,
			Narration:            req.Narration,
		},
	)
	if err != nil {
		if err.Error() == "insufficient funds or debit failed: no rows in result set" ||
			strings.Contains(err.Error(), "insufficient") {
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

// CreatePartyWalletHandler godoc
// @Summary      Create a wallet for a party (admin)
// @Description  Manually provisions a reserved virtual account for a party that does not yet have a wallet. Idempotent — returns an error if the party already has a wallet.
// @Tags         Parties
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Party ID"
// @Success      201  {object} map[string]interface{} "Wallet created"
// @Failure      400  {object} map[string]interface{} "Invalid ID"
// @Failure      404  {object} map[string]interface{} "Party not found"
// @Failure      409  {object} map[string]interface{} "Wallet already exists"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /parties/{id}/wallet [post]
func (h *Handler) CreatePartyWalletHandler(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	party := h.partiesService.GetPartyInfo(r.Context(), int16(id))
	if party == nil {
		h.utils.RespondError(w, http.StatusNotFound, "Party not found")
		return
	}

	wallet, err := h.partiesWalletService.CreatePartyWallet(r.Context(), queries.Party{ID: party.ID, Name: party.Name})
	if err != nil {
		if strings.Contains(err.Error(), "unique") || strings.Contains(err.Error(), "duplicate") {
			h.utils.RespondError(w, http.StatusConflict, "This party already has a wallet")
			return
		}
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create wallet: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusCreated, "Wallet created successfully", map[string]interface{}{
		"wallet": FormatPartyWalletResponse(wallet),
	})
}

// ProvisionMissingPartyWallets godoc
// @Summary      Provision missing wallets for political parties
// @Description  Iterates over all existing political parties and provisions a wallet for any party that currently lacks one. Used primarily for testing and manual recovery.
// @Tags         Parties
// @Accept       json
// @Produce      json
// @Success      200  {object} map[string]interface{} "Provisioning details"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /parties/wallets/provision-missing [post]
func (h *Handler) ProvisionMissingPartyWallets(w http.ResponseWriter, r *http.Request) {
	success, failed, err := h.partiesWalletService.ProvisionMissingWallets(r.Context())
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to provision missing wallets: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Missing party wallets provisioned successfully", map[string]interface{}{
		"success_count": success,
		"failed_count":  failed,
	})
}

// DepositRequest is the payload for direct deposit to party wallet.
type DepositRequest struct {
	AmountKobo int64 `json:"amount_kobo"`
}

// Deposit godoc
// @Summary      Direct deposit to party wallet
// @Description  Directly credits a party's wallet balance
// @Tags         Parties
// @Accept       json
// @Produce      json
// @Param        id path int true "Party ID"
// @Param        request body DepositRequest true "Deposit request payload"
// @Success      200  {object} map[string]interface{} "Wallet funded successfully"
// @Security     BearerAuth
// @Router       /parties/{id}/wallet/deposit-test [post]
func (h *Handler) Deposit(w http.ResponseWriter, r *http.Request) {
	// Extract and validate target party ID from URL parameter
	idStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	// Verify authenticated caller claims from context
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Only platform admin or super_admin can directly credit/deposit funds for now.
	// Party administrators receive an informative error until their deposit submission flow is implemented.
	if !claims.HasAnyRole("admin", "super_admin") {
		if claims.HasAnyRole("party_admin", "super_party_admin") {
			h.utils.RespondError(w, http.StatusForbidden, "Party administrators cannot directly deposit funds yet. Please transfer your funds to Free9ja and contact a platform administrator with proof of payment.")
			return
		}
		h.utils.RespondError(w, http.StatusForbidden, "Forbidden: insufficient permissions")
		return
	}

	// Parse and validate deposit request payload
	var req DepositRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.AmountKobo <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Amount must be greater than zero")
		return
	}

	// Retrieve or auto-provision party wallet
	wallet, err := h.partiesWalletService.GetOrCreatePartyWallet(r.Context(), int16(partyID))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Failed to resolve party wallet: "+err.Error())
		return
	}

	// Prepare audit metadata and unique transaction reference
	txRef := fmt.Sprintf("deposit-%d-%d", partyID, time.Now().UnixNano())
	payerName := fmt.Sprintf("Admin %s", claims.Username)
	narration := fmt.Sprintf("Direct deposit to party wallet confirmed by %s", claims.Username)

	// Credit wallet balance with transaction record
	_, err = h.partiesWalletService.CreditWallet(r.Context(),
		partiesservice.CreditPartyWalletParams{
			WalletID:             wallet.ID,
			AmountKobo:           req.AmountKobo,
			TransactionReference: txRef,
			PayerName:            payerName,
			PayerAccountNumber:   "",
			PayerBankCode:        "",
			Narration:            narration,
			RawPayload:           []byte("{}"),
		},
	)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to credit wallet: "+err.Error())
		return
	}

	// Return success response with wallet ID
	h.utils.RespondSuccess(w, http.StatusOK, "Wallet funded successfully", map[string]interface{}{
		"wallet_id": wallet.ID,
	})
}

// ── Slot pricing and purchasing handlers ────────────────────────────────────

type SetSlotPriceRequest struct {
	PriceKobo int64 `json:"price_kobo"`
}

// GetGlobalSlotPrice godoc
// @Summary      Get global slot price
// @Description  Retrieves the global, app-wide price of a single polling unit slot in Kobo
// @Tags         Admin Settings
// @Produce      json
// @Success      200  {object} map[string]interface{} "Global slot price retrieved"
// @Router       /admin/settings/slot-price [get]
func (h *Handler) GetGlobalSlotPrice(w http.ResponseWriter, r *http.Request) {
	price, err := h.partiesWalletService.GetGlobalSlotPrice(r.Context())
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to retrieve slot price: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Global slot price retrieved", map[string]interface{}{
		"price_kobo": price,
	})
}

// UpdateGlobalSlotPrice godoc
// @Summary      Update global slot price
// @Description  Updates the global, app-wide price of a single polling unit slot in Kobo (Admin only)
// @Tags         Admin Settings
// @Accept       json
// @Produce      json
// @Param        request body SetSlotPriceRequest true "Slot Price request payload"
// @Success      200  {object} map[string]interface{} "Global slot price updated"
// @Router       /admin/settings/slot-price [put]
func (h *Handler) UpdateGlobalSlotPrice(w http.ResponseWriter, r *http.Request) {
	var req SetSlotPriceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.PriceKobo <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Price must be greater than zero")
		return
	}

	price, err := h.partiesWalletService.UpdateGlobalSlotPrice(r.Context(), req.PriceKobo)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update slot price: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Global slot price updated successfully", map[string]interface{}{
		"price_kobo": price,
	})
}

// GetPartySlotPrice godoc
// @Summary      Get party slot price
// @Description  Calculates the customized price of a single slot for a political party, accounting for their discount
// @Tags         Parties
// @Produce      json
// @Param        id path int true "Party ID"
// @Success      200  {object} map[string]interface{} "Party slot price retrieved"
// @Security     BearerAuth
// @Router       /parties/{id}/slots/price [get]
func (h *Handler) GetPartySlotPrice(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	price, err := h.partiesWalletService.GetPartySlotPrice(r.Context(), int16(partyID))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to retrieve slot price: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Party slot price calculated", map[string]interface{}{
		"party_id":        partyID,
		"unit_price_kobo": price,
	})
}

type BuySlotsRequest struct {
	Quantity int32 `json:"quantity"`
}

// BuySlots godoc
// @Summary      Buy slots for a party
// @Description  Deducts from a party's wallet and increases their polling unit assignment slot balance
// @Tags         Parties
// @Accept       json
// @Produce      json
// @Param        id path int true "Party ID"
// @Param        request body BuySlotsRequest true "Buy Slots request payload"
// @Success      200  {object} map[string]interface{} "Slots purchased successfully"
// @Security     BearerAuth
// @Router       /parties/{id}/slots/buy [post]
func (h *Handler) BuySlots(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	var req BuySlotsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Quantity <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Quantity must be greater than zero")
		return
	}

	party, err := h.partiesWalletService.BuySlots(r.Context(), int16(partyID), req.Quantity)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, fmt.Sprintf("Successfully purchased %d slots", req.Quantity), map[string]interface{}{
		"party": party,
	})
}
