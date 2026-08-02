package partieshandler

import (
	"context"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
	"io"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type PartiesService interface {
	CreateParty(ctx context.Context, shortName, name, logo string, displayOrder int32) (queries.Party, error)
	GetPartyByID(ctx context.Context, id int64) (queries.Party, error)
	GetPartyByShortName(ctx context.Context, shortName string) (queries.Party, error)
	ListParties(ctx context.Context) ([]queries.Party, error)
	UpdateParty(ctx context.Context, id int64, shortName, name, logo string, displayOrder int32) (queries.Party, error)
	DeleteParty(ctx context.Context, id int64) error
	// Wallet methods
	GetPartyWallet(ctx context.Context, partyID int16) (queries.PartyWallet, error)
	GetPartyWalletTransactions(ctx context.Context, partyID int16, limit, offset int32) ([]queries.PartyWalletTransaction, error)
	WithdrawFromWallet(ctx context.Context, partyID int16, amountKobo int64, transactionReference, bankAccountNumber, bankCode, narration string) (queries.PartyWalletTransaction, error)
	CreatePartyWallet(ctx context.Context, party queries.Party) (queries.PartyWallet, error)
	GetWalletByAccountReference(ctx context.Context, accountReference string) (queries.PartyWallet, error)
	ProvisionMissingWallets(ctx context.Context) (int, int, error)
	CreditWallet(ctx context.Context, walletID int64, amountKobo int64, transactionReference string, payerName, payerAccountNumber, payerBankCode, narration string, rawPayload []byte) (queries.PartyWalletTransaction, error)
	// Slot methods
	GetGlobalSlotPrice(ctx context.Context) (int64, error)
	UpdateGlobalSlotPrice(ctx context.Context, priceKobo int64) (int64, error)
	GetPartySlotPrice(ctx context.Context, partyID int16) (int64, error)
	BuySlots(ctx context.Context, partyID int16, quantity int32) (queries.Party, error)
	UpdatePartyDiscount(ctx context.Context, partyID int16, discountPercentage float64) (queries.Party, error)
	// Allowance methods
	DepositAllowance(ctx context.Context, partyID int16, amountKobo int64) (queries.Party, error)
	UpdateAgentPaymentAllocation(ctx context.Context, partyID int16, allowancesJSON []byte) (queries.Party, error)
}

type Handler struct {
	partiesService PartiesService
	utils          *utils.Utils
}

func NewHandler(partiesService PartiesService, utils *utils.Utils) *Handler {
	return &Handler{
		partiesService: partiesService,
		utils:          utils,
	}
}

func parsePaginationParams(r *http.Request) (int, int64) {
	limit := 20
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			if l > 100 {
				limit = 100
			} else {
				limit = l
			}
		}
	}

	var cursor int64
	if cursorStr := r.URL.Query().Get("cursor"); cursorStr != "" {
		if c, err := strconv.ParseInt(cursorStr, 10, 64); err == nil {
			cursor = c
		}
	}
	return limit, cursor
}

func parseSortParams(r *http.Request, defaultOrderBy string, defaultOrderDir string) (string, string) {
	orderBy := r.URL.Query().Get("order_by")
	if orderBy == "" {
		orderBy = defaultOrderBy
	}

	orderDir := strings.ToUpper(r.URL.Query().Get("order"))
	if orderDir != "ASC" && orderDir != "DESC" {
		orderDir = defaultOrderDir
	}

	return orderBy, orderDir
}

type CreatePartyRequest struct {
	ShortName    string `json:"short_name"`
	Name         string `json:"name"`
	Logo         string `json:"logo"`
	DisplayOrder int32  `json:"display_order"`
}

type UpdatePartyRequest struct {
	ShortName string `json:"short_name"`
	Name         string `json:"name"`
	Logo         string `json:"logo"`
	DisplayOrder int32  `json:"display_order"`
}

// CreateParty godoc
// @Summary      Create a new political party
// @Description  Creates a political party with a unique short name, full name, and logo
// @Tags         Parties
// @Accept       json
// @Produce      json
// @Param        request body CreatePartyRequest true "Create Party request payload"
// @Success      210  {object} map[string]interface{} "Party created successfully"
// @Failure      400  {object} map[string]interface{} "Invalid request payload or missing fields"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      403  {object} map[string]interface{} "Forbidden (Admin only)"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /parties [post]
func (h *Handler) CreateParty(w http.ResponseWriter, r *http.Request) {
	var req CreatePartyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.ShortName == "" || req.Name == "" {
		h.utils.RespondError(w, http.StatusBadRequest, "short_name and name are required")
		return
	}

	party, err := h.partiesService.CreateParty(r.Context(), req.ShortName, req.Name, req.Logo, req.DisplayOrder)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create party: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusCreated, "Party created successfully", map[string]interface{}{
		"party": party,
	})
}

// ListParties godoc
// @Summary      List all political parties
// @Description  Fetches a paginated list of political parties ordered by ID using cursor pagination
// @Tags         Parties
// @Accept       json
// @Produce      json
// @Param        limit    query int    false "Limit (default 20, max 100)"
// @Param        cursor   query string false "Cursor (ID of last record)"
// @Param        order_by query string false "Order by field (default: display_order, enum: display_order, name, short_name)"
// @Param        order    query string false "Order direction (default: ASC, enum: ASC, DESC)"
// @Success      200  {object} map[string]interface{} "Parties fetched successfully"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /parties [get]
func (h *Handler) ListParties(w http.ResponseWriter, r *http.Request) {
	limit, cursor := parsePaginationParams(r)

	parties, err := h.partiesService.ListParties(r.Context())
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch parties: "+err.Error())
		return
	}

	orderBy, orderDir := parseSortParams(r, "display_order", "ASC")

	sort.SliceStable(parties, func(i, j int) bool {
		var less bool
		if orderBy == "name" {
			less = parties[i].Name < parties[j].Name
		} else if orderBy == "short_name" {
			less = parties[i].ShortName < parties[j].ShortName
		} else {
			less = parties[i].DisplayOrder < parties[j].DisplayOrder
		}
		if orderDir == "DESC" {
			return !less
		}
		return less
	})

	startIndex := 0
	if cursor > 0 {
		for i, p := range parties {
			if int64(p.ID) == cursor {
				startIndex = i + 1
				break
			}
		}
	}

	var paginated []queries.Party
	hasMore := false
	nextCursor := ""

	if startIndex < len(parties) {
		endIndex := startIndex + limit
		if endIndex >= len(parties) {
			endIndex = len(parties)
			paginated = parties[startIndex:endIndex]
		} else {
			paginated = parties[startIndex:endIndex]
			hasMore = true
			nextCursor = strconv.FormatInt(int64(paginated[len(paginated)-1].ID), 10)
		}
	} else {
		paginated = []queries.Party{}
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Parties fetched successfully", map[string]interface{}{
		"parties": paginated,
		"meta": map[string]interface{}{
			"next_cursor": nextCursor,
			"has_more":    hasMore,
		},
	})
}

// ListPartiesPublic godoc
// @Summary      List public political parties
// @Description  Fetches a list of political parties ordered by ID, returns only basic fields.
// @Tags         Parties
// @Accept       json
// @Produce      json
// @Param        order_by query string false "Order by field (default: display_order, enum: display_order, name, short_name)"
// @Param        order    query string false "Order direction (default: ASC, enum: ASC, DESC)"
// @Success      200  {object} map[string]interface{} "Parties fetched successfully"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /parties/public [get]
func (h *Handler) ListPartiesPublic(w http.ResponseWriter, r *http.Request) {
	parties, err := h.partiesService.ListParties(r.Context())
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch parties: "+err.Error())
		return
	}

	orderBy, orderDir := parseSortParams(r, "display_order", "ASC")

	sort.SliceStable(parties, func(i, j int) bool {
		var less bool
		if orderBy == "name" {
			less = parties[i].Name < parties[j].Name
		} else if orderBy == "short_name" {
			less = parties[i].ShortName < parties[j].ShortName
		} else {
			less = parties[i].DisplayOrder < parties[j].DisplayOrder
		}
		if orderDir == "DESC" {
			return !less
		}
		return less
	})

	type PartyPublic struct {
		ID           int16  `json:"id"`
		ShortName    string `json:"short_name"`
		Name         string `json:"name"`
		Logo         string `json:"logo"`
		DisplayOrder int32  `json:"display_order"`
		Status       string `json:"status"`
		IsVerified   bool   `json:"is_verified"`
	}

	var publicParties []PartyPublic
	for _, p := range parties {
		publicParties = append(publicParties, PartyPublic{
			ID:           p.ID,
			ShortName:    p.ShortName,
			Name:         p.Name,
			Logo:         p.Logo,
			DisplayOrder: p.DisplayOrder,
			Status:       p.Status,
			IsVerified:   p.IsVerified.Bool,
		})
	}

	h.utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Public parties fetched successfully",
		"data": map[string]interface{}{
			"parties": publicParties,
		},
	})
}

// GetParty godoc
// @Summary      Get a political party by ID
// @Description  Retrieves details of a single political party using its unique database ID
// @Tags         Parties
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Party ID"
// @Success      200  {object} map[string]interface{} "Party fetched successfully"
// @Failure      400  {object} map[string]interface{} "Invalid ID parameter"
// @Failure      404  {object} map[string]interface{} "Party not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /parties/{id} [get]
func (h *Handler) GetParty(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	party, err := h.partiesService.GetPartyByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Party not found")
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Party fetched successfully", map[string]interface{}{
		"party": party,
	})
}

// UpdateParty godoc
// @Summary      Update a political party
// @Description  Modifies the short name, full name, or logo URL of an existing political party
// @Tags         Parties
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Party ID"
// @Param        request body UpdatePartyRequest true "Update Party request payload"
// @Success      200  {object} map[string]interface{} "Party updated successfully"
// @Failure      400  {object} map[string]interface{} "Invalid payload or ID parameter"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      403  {object} map[string]interface{} "Forbidden (Admin only)"
// @Failure      404  {object} map[string]interface{} "Party not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /parties/{id} [put]
func (h *Handler) UpdateParty(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	var req UpdatePartyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.ShortName == "" || req.Name == "" {
		h.utils.RespondError(w, http.StatusBadRequest, "short_name and name are required")
		return
	}

	// Verify party exists
	_, err = h.partiesService.GetPartyByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Party not found")
		return
	}

	updatedParty, err := h.partiesService.UpdateParty(r.Context(), id, req.ShortName, req.Name, req.Logo, req.DisplayOrder)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update party: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Party updated successfully", map[string]interface{}{
		"party": updatedParty,
	})
}

// DeleteParty godoc
// @Summary      Delete a political party
// @Description  Removes a political party from the database by its ID
// @Tags         Parties
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Party ID"
// @Success      200  {object} map[string]interface{} "Party deleted successfully"
// @Failure      400  {object} map[string]interface{} "Invalid ID parameter"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      403  {object} map[string]interface{} "Forbidden (Admin only)"
// @Failure      404  {object} map[string]interface{} "Party not found"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /parties/{id} [delete]
func (h *Handler) DeleteParty(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	// Verify party exists
	_, err = h.partiesService.GetPartyByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Party not found")
		return
	}

	if err := h.partiesService.DeleteParty(r.Context(), id); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to delete party: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Party deleted successfully", nil)
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

	wallet, err := h.partiesService.GetPartyWallet(r.Context(), int16(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Wallet not found for this party")
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
			"party_id":          wallet.PartyID,
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

	txns, err := h.partiesService.GetPartyWalletTransactions(r.Context(), int16(id), int32(limit), int32(offset))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Could not fetch transactions: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Transactions fetched successfully", map[string]interface{}{
		"transactions": txns,
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

	txn, err := h.partiesService.WithdrawFromWallet(
		r.Context(),
		int16(id),
		req.AmountKobo,
		txRef,
		req.BankAccountNumber,
		req.BankCode,
		req.Narration,
	)
	if err != nil {
		if err.Error() == "insufficient funds or debit failed: no rows in result set" ||
			containsString(err.Error(), "insufficient") {
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

// WithdrawRequest is the payload for POST /parties/{id}/wallet/withdraw.
type WithdrawRequest struct {
	// AmountKobo is the withdrawal amount in Kobo (1 NGN = 100 Kobo).
	AmountKobo        int64  `json:"amount_kobo"`
	BankAccountNumber string `json:"bank_account_number"`
	BankCode          string `json:"bank_code"`
	Narration         string `json:"narration"`
}

// CreatePartyWalletHandler godoc
// @Summary      Create a wallet for a party (admin)
// @Description  Manually provisions a Monnify reserved virtual account for a party that does not yet have a wallet. Idempotent — returns an error if the party already has a wallet.
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

	party, err := h.partiesService.GetPartyByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Party not found")
		return
	}

	wallet, err := h.partiesService.CreatePartyWallet(r.Context(), party)
	if err != nil {
		if containsString(err.Error(), "unique") || containsString(err.Error(), "duplicate") {
			h.utils.RespondError(w, http.StatusConflict, "This party already has a wallet")
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
			"party_id":          wallet.PartyID,
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

// ProvisionMissingPartyWallets godoc
// @Summary      Provision missing wallets for political parties
// @Description  Iterates over all existing political parties and provisions a Monnify reserved account wallet for any party that currently lacks one. Used primarily for testing and manual recovery.
// @Tags         Parties
// @Accept       json
// @Produce      json
// @Success      200  {object} map[string]interface{} "Provisioning details"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /parties/wallets/provision-missing [post]
func (h *Handler) ProvisionMissingPartyWallets(w http.ResponseWriter, r *http.Request) {
	success, failed, err := h.partiesService.ProvisionMissingWallets(r.Context())
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to provision missing wallets: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Missing party wallets provisioned successfully", map[string]interface{}{
		"success_count": success,
		"failed_count":  failed,
	})
}

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
	price, err := h.partiesService.GetGlobalSlotPrice(r.Context())
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

	price, err := h.partiesService.UpdateGlobalSlotPrice(r.Context(), req.PriceKobo)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update slot price: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Global slot price updated successfully", map[string]interface{}{
		"price_kobo": price,
	})
}

type SetPartyDiscountRequest struct {
	DiscountPercentage float64 `json:"discount_percentage"`
}

// UpdatePartyDiscount godoc
// @Summary      Set customized slot discount for a party
// @Description  Sets the slot discount percentage for a political party (Admin only)
// @Tags         Admin Parties
// @Accept       json
// @Produce      json
// @Param        id path int true "Party ID"
// @Param        request body SetPartyDiscountRequest true "Discount request payload"
// @Success      200  {object} map[string]interface{} "Party discount updated"
// @Security     BearerAuth
// @Router       /admin/parties/{id}/discount [put]
func (h *Handler) UpdatePartyDiscount(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	var req SetPartyDiscountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.DiscountPercentage < 0.0 || req.DiscountPercentage > 100.0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Discount percentage must be between 0.00 and 100.00")
		return
	}

	party, err := h.partiesService.UpdatePartyDiscount(r.Context(), int16(partyID), req.DiscountPercentage)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update discount: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Party discount updated successfully", map[string]interface{}{
		"party": party,
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

	price, err := h.partiesService.GetPartySlotPrice(r.Context(), int16(partyID))
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

	party, err := h.partiesService.BuySlots(r.Context(), int16(partyID), req.Quantity)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, fmt.Sprintf("Successfully purchased %d slots", req.Quantity), map[string]interface{}{
		"party": party,
	})
}

type DepositAllowanceRequest struct {
	AmountKobo int64 `json:"amount_kobo"`
}

// DepositAllowance godoc
// @Summary      Deposit money to polling agent allowance budget
// @Description  Debits a party's main wallet balance and deposits it to their polling agent allowance budget
// @Tags         Parties
// @Accept       json
// @Produce      json
// @Param        id path int true "Party ID"
// @Param        request body DepositAllowanceRequest true "Deposit Allowance request payload"
// @Success      200  {object} map[string]interface{} "Allowance deposited successfully"
// @Security     BearerAuth
// @Router       /parties/{id}/allowances/deposit [post]
func (h *Handler) DepositAllowance(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	var req DepositAllowanceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.AmountKobo <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Amount must be greater than zero")
		return
	}

	party, err := h.partiesService.DepositAllowance(r.Context(), int16(partyID), req.AmountKobo)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Allowance deposited successfully", map[string]interface{}{
		"party": party,
	})
}

// UpdateAgentPaymentAllocation godoc
// @Summary      Update polling agent payment settings per state
// @Description  Saves the polling agent allowance budget settings per state (Same pay or Custom per state) for a party
// @Tags         Parties
// @Accept       json
// @Produce      json
// @Param        id path int true "Party ID"
// @Param        request body string true "JSON mapping of state names to kobo payment amounts"
// @Success      200  {object} map[string]interface{} "Allowances configuration updated successfully"
// @Security     BearerAuth
// @Router       /parties/{id}/allowances/settings [put]
func (h *Handler) UpdateAgentPaymentAllocation(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Failed to read request body")
		return
	}

	party, err := h.partiesService.UpdateAgentPaymentAllocation(r.Context(), int16(partyID), bodyBytes)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Allowances configuration updated successfully", map[string]interface{}{
		"party": party,
	})
}

// DepositTest godoc
// @Summary      Simulate deposit to party wallet
// @Description  Directly credits a party's wallet balance (useful in sandbox/testing)
// @Tags         Parties
// @Accept       json
// @Produce      json
// @Param        id path int true "Party ID"
// @Param        request body DepositAllowanceRequest true "Deposit request payload"
// @Success      200  {object} map[string]interface{} "Wallet funded successfully"
// @Security     BearerAuth
// @Router       /parties/{id}/wallet/deposit-test [post]
func (h *Handler) DepositTest(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	var req DepositAllowanceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.AmountKobo <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Amount must be greater than zero")
		return
	}

	wallet, err := h.partiesService.GetPartyWallet(r.Context(), int16(partyID))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Wallet not found for party: "+err.Error())
		return
	}

	txRef := fmt.Sprintf("test-deposit-%d-%d", partyID, time.Now().UnixNano())
	_, err = h.partiesService.CreditWallet(
		r.Context(),
		wallet.ID,
		req.AmountKobo,
		txRef,
		"Manual Simulation Payer",
		"1234567890",
		"011",
		"Simulated virtual transfer deposit to party wallet",
		[]byte("{}"),
	)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to credit wallet: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Wallet funded successfully", map[string]interface{}{
		"wallet_id": wallet.ID,
	})
}
