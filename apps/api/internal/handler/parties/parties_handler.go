package partieshandler

import (
	"context"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	"free9ja/api/internal/service/audit"
	"free9ja/api/internal/service/files"
	permissionsservice "free9ja/api/internal/service/permissions"
	"free9ja/api/internal/utils"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type PartiesService interface {
	CreateParty(ctx context.Context, shortName, name, logo string, logoFileID *int64, displayOrder int32) (queries.Party, error)
	GetPartyInfo(ctx context.Context, partyID int16) *queries.PartyWithVerifications
	GetPartyBasicInfo(ctx context.Context, partyID int16) *queries.PartyBasicInfoWithVerifications
	GetPartyByShortName(ctx context.Context, shortName string) (queries.Party, error)
	ListParties(ctx context.Context) ([]queries.PartyWithVerifications, error)
	UpdateParty(ctx context.Context, id int64, shortName, name, logo string, logoFileID *int64, displayOrder int32) (queries.Party, error)
	DeleteParty(ctx context.Context, id int64) error
	UpdatePartyIsVerified(ctx context.Context, partyID int16, isVerified bool) error
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
	JoinParty(ctx context.Context, partyID int16, chapterID int32, userID, userFid int64) error
	LeaveParty(ctx context.Context, partyID int16, userID, userFid int64) error
	UpdateStateAllowances(ctx context.Context, partyID int16, allowancesJSON []byte) (queries.Party, error)
	// Membership methods
	UpdateAgentPaymentAllocation(ctx context.Context, partyID int16, allowancesJSON []byte) (queries.Party, error)
	GetAgentPaymentAllocation(ctx context.Context, partyID int16) (json.RawMessage, error)
	// Marketing methods
	GetMarketingPlansByType(ctx context.Context, campaignType queries.MarketingCampaignType) ([]queries.Plan, error)
	CreatePartyMarketingCampaign(ctx context.Context, arg queries.CreatePartyMarketingCampaignParams) (queries.PartyMarketingCampaign, error)
	GetPartyMarketingCampaigns(ctx context.Context, partyID int32) ([]queries.GetPartyMarketingCampaignsRow, error)
	// Plan admin methods
	GetPlans(ctx context.Context, typeFilter string, isActiveFilter string) ([]queries.Plan, error)
	UpdatePlanDisplayOrder(ctx context.Context, arg queries.UpdatePlanDisplayOrderParams) (queries.Plan, error)
	CreatePlan(ctx context.Context, arg queries.CreatePlanParams) (queries.Plan, error)
	UpdatePlan(ctx context.Context, arg queries.UpdatePlanParams) (queries.Plan, error)
	DeletePlan(ctx context.Context, id int32) error
	// Agent target methods
	UpdatePartyAgentAcquisitionTargets(ctx context.Context, arg queries.UpdatePartyAgentAcquisitionTargetsParams) (queries.Party, error)
	GetPartyAgentAcquisitionTargets(ctx context.Context, partyID int16) (json.RawMessage, error)
}

type Handler struct {
	partiesService PartiesService
	auditService   audit.AuditService
	filesService   files.FilesService
	utils          *utils.Utils
}

func NewHandler(partiesService PartiesService, auditService audit.AuditService, filesService files.FilesService, utils *utils.Utils) *Handler {
	return &Handler{
		partiesService: partiesService,
		auditService:   auditService,
		filesService:   filesService,
		utils:          utils,
	}
}

func parsePaginationParams(r *http.Request) (int, int64) {
	limit := 50
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
	LogoFileID   *int64 `json:"logo_file_id"`
	DisplayOrder int32  `json:"display_order"`
}

type UpdatePartyRequest struct {
	ShortName    string `json:"short_name"`
	Name         string `json:"name"`
	Logo         string `json:"logo"`
	LogoFileID   *int64 `json:"logo_file_id"`
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
	var actorID int64
	var actorRole string
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if ok && claims != nil {
		actorID = claims.UserID
		actorRole = db.ActorRoleAdmin
	}

	// 1. Decode the request payload
	var req CreatePartyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// 2. Validate required fields
	if req.ShortName == "" || req.Name == "" {
		h.utils.RespondError(w, http.StatusBadRequest, "short_name and name are required")
		return
	}

	// 3. If a logo file was uploaded, fetch its details and use the public URL
	if req.LogoFileID != nil {
		file, err := h.filesService.GetFileByID(r.Context(), *req.LogoFileID)
		if err != nil {
			h.utils.RespondError(w, http.StatusBadRequest, "Invalid logo file ID")
			return
		}
		if file.Status != "uploaded" {
			h.utils.RespondError(w, http.StatusBadRequest, "Logo file upload is not complete")
			return
		}

		if file.UploadedBy.Int64 != claims.UserID {
			h.utils.RespondError(w, http.StatusBadRequest, "You are not authorized to use this file")
			return
		}

		// Automatically set the Logo URL from the file record
		req.Logo = file.PublicUrl
	}

	// 4. Create the party in the database and provision a wallet via Monnify
	party, err := h.partiesService.CreateParty(r.Context(), req.ShortName, req.Name, req.Logo, req.LogoFileID, req.DisplayOrder)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create party: "+err.Error())
		return
	}

	// update the file owner to the new partyID
	if req.LogoFileID != nil && *req.LogoFileID > 0 {
		h.filesService.UpdateFileOwner(r.Context(), *req.LogoFileID, int64(party.ID))
	}

	// --- Audit Logging ---
	newValuesJSON, _ := json.Marshal(party)
	h.auditService.LogActionAsync(r.Context(), queries.InsertAuditLogParams{
		Module:     audit.StringToText(db.ModuleAdmin),
		Action:     db.ActionCreateParty,
		ActorID:    actorID,
		ActorRole:  audit.StringToText(actorRole),
		EntityType: db.EntityTypeParty,
		EntityID:   strconv.FormatInt(int64(party.ID), 10),
		NewValues:  newValuesJSON,
	})

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
		switch orderBy {
		case "name":
			less = parties[i].Name < parties[j].Name
		case "short_name":
			less = parties[i].ShortName < parties[j].ShortName
		default:
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

	var paginated []queries.PartyWithVerifications
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
		paginated = []queries.PartyWithVerifications{}
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
		ID                      int16  `json:"id"`
		ShortName               string `json:"short_name"`
		Name                    string `json:"name"`
		Logo                    string `json:"logo"`
		DisplayOrder            int32  `json:"display_order"`
		Status                  string `json:"status"`
		IsVerified              bool   `json:"is_verified"`
		IsAcceptingApplications bool   `json:"is_accepting_applications"`
	}

	var publicParties []PartyPublic
	for _, p := range parties {
		isAccepting := false
		if len(p.AgentAcquisitionTargets) > 0 && string(p.AgentAcquisitionTargets) != "{}" && string(p.AgentAcquisitionTargets) != "null" {
			if len(p.AgentPaymentAllocation) > 0 && string(p.AgentPaymentAllocation) != "{}" && string(p.AgentPaymentAllocation) != "null" {
				var alloc map[string]struct {
					Default *int64 `json:"default"`
				}
				if err := json.Unmarshal(p.AgentPaymentAllocation, &alloc); err == nil {
					roles := []string{"pollingAgent", "wardElectionSupervisor", "lgaElectionSupervisor", "stateElectionSupervisor"}
					var maxDefault int64 = -1
					hasAllDefaults := true
					for _, role := range roles {
						cfg, exists := alloc[role]
						if !exists || cfg.Default == nil {
							hasAllDefaults = false
							break
						}
						if *cfg.Default > maxDefault {
							maxDefault = *cfg.Default
						}
					}
					if hasAllDefaults && maxDefault >= 0 && p.AgentPaymentBalanceKobo >= maxDefault {
						isAccepting = true
					}
				}
			}
		}

		publicParties = append(publicParties, PartyPublic{
			ID:                      p.ID,
			ShortName:               p.ShortName,
			Name:                    p.Name,
			Logo:                    p.Logo,
			DisplayOrder:            p.DisplayOrder,
			Status:                  p.Status,
			IsVerified:              p.IsVerified.Bool,
			IsAcceptingApplications: isAccepting,
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

	party := h.partiesService.GetPartyInfo(r.Context(), int16(id))
	if party == nil {
		h.utils.RespondError(w, http.StatusNotFound, "Party not found")
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Party fetched successfully", map[string]interface{}{
		"party": party,
	})
}

// GetPartyProfile godoc
// @Summary      Get basic party profile
// @Description  Get party details by party ID and short name
// @Tags         Parties
// @Produce      json
// @Param        party_id path int true "Party ID"
// @Param        short_name path string true "Party Short Name"
// @Success      200  {object}  utils.SuccessResponse{data=queries.PartyWithVerifications}
// @Router       /parties/{party_id}/{short_name}/profile [get]
func (h *Handler) GetPartyProfile(w http.ResponseWriter, r *http.Request) {
	partyIDStr := chi.URLParam(r, "party_id")
	// shortName := chi.URLParam(r, "short_name") // can be used later for validation if needed

	partyID, err := strconv.ParseInt(partyIDStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	// get the party basic info
	party := h.partiesService.GetPartyBasicInfo(r.Context(), int16(partyID))
	if party == nil {
		h.utils.RespondError(w, http.StatusNotFound, "Party not found")
		return
	}

	// get the national party chapter

	h.utils.RespondSuccess(w, http.StatusOK, "Party profile retrieved successfully", map[string]interface{}{
		"data": party,
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
	// Extract user claims to verify authorization
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Parse the party ID from the URL path
	idStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	// Decode the JSON request payload
	var req UpdatePartyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Ensure required fields are provided
	if req.ShortName == "" || req.Name == "" {
		h.utils.RespondError(w, http.StatusBadRequest, "short_name and name are required")
		return
	}

	// If a logo is provided, validate the uploaded file
	if req.LogoFileID != nil {
		file, err := h.filesService.GetFileByID(r.Context(), *req.LogoFileID)
		if err != nil {
			h.utils.RespondError(w, http.StatusBadRequest, "Invalid logo file ID")
			return
		}
		if file.Status != "uploaded" {
			h.utils.RespondError(w, http.StatusBadRequest, "Logo file upload is not complete")
			return
		}
		req.Logo = file.PublicUrl

		// Ensure the file belongs to the correct party and was uploaded by the current user
		if file.OwnerID.Int64 != partyID || file.UploadedBy.Int64 != claims.UserID {
			h.utils.RespondError(w, http.StatusBadRequest, "Invalid logo file ID")
			return
		}
	} else {
		h.utils.RespondError(w, http.StatusNotFound, "Party needs a logo")
		return
	}

	// Verify party exists
	party := h.partiesService.GetPartyInfo(r.Context(), int16(partyID))
	if party == nil {
		h.utils.RespondError(w, http.StatusNotFound, "Party not found")
		return
	}

	// check permissions to update this party
	permsSvc := permissionsservice.NewPermissionsService()
	allowed, perms, err := permsSvc.CheckPartyModificationPermission(claims, int16(partyID))
	if !allowed {
		h.utils.RespondError(w, http.StatusForbidden, err.Error())
		return
	}

	// update the party info
	updatedParty, err := h.partiesService.UpdateParty(r.Context(), partyID, req.ShortName, req.Name, req.Logo, req.LogoFileID, req.DisplayOrder)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update party: "+err.Error())
		return
	}

	// --- Audit Logging ---
	// Capture old and new values for audit logging
	oldValuesJSON, _ := json.Marshal(party)
	newValuesJSON, _ := json.Marshal(updatedParty)

	moduleName := db.ModulePartyAdmin
	actorRole := db.ActorRolePartyAdmin
	if perms.IsBothAdmin {
		moduleName = db.ModuleAdmin
		if perms.IsSuperAdmin {
			actorRole = db.ActorRoleSuperAdmin
		} else {
			actorRole = db.ActorRoleAdmin
		}
	}
	h.auditService.LogActionAsync(r.Context(), queries.InsertAuditLogParams{
		Module:     audit.StringToText(moduleName),
		Action:     db.ActionUpdateParty,
		ActorID:    claims.UserID,
		ActorRole:  audit.StringToText(actorRole),
		EntityType: db.EntityTypeParty,
		EntityID:   idStr,
		OldValues:  oldValuesJSON,
		NewValues:  newValuesJSON,
	})

	h.utils.RespondSuccess(w, http.StatusOK, "Party updated successfully", map[string]interface{}{
		"party": updatedParty,
	})
}

// JoinParty handles requests to join a party chapter.
func (h *Handler) JoinParty(w http.ResponseWriter, r *http.Request) {
	partyIDStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(partyIDStr, 10, 16)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	var req struct {
		ChapterID int32 `json:"chapter_id"` // 0 will default to national chapter
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil && err != io.EOF {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	err = h.partiesService.JoinParty(r.Context(), int16(partyID), req.ChapterID, claims.UserID, claims.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Membership request processed successfully", nil)
}

// LeaveParty handles requests to leave a party.
func (h *Handler) LeaveParty(w http.ResponseWriter, r *http.Request) {
	partyIDStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(partyIDStr, 10, 16)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	err = h.partiesService.LeaveParty(r.Context(), int16(partyID), claims.UserID, claims.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Left party successfully", nil)
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
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey, "super_admin")
	if !ok {
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	// Verify party exists
	if party := h.partiesService.GetPartyInfo(r.Context(), int16(id)); party == nil {
		h.utils.RespondError(w, http.StatusNotFound, "Party not found")
		return
	}

	if err := h.partiesService.DeleteParty(r.Context(), id); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to delete party: "+err.Error())
		return
	}

	// --- Audit Logging ---
	oldValuesJSON, _ := json.Marshal(map[string]string{"status": "active"})
	newValuesJSON, _ := json.Marshal(map[string]string{"status": "deleted"})
	h.auditService.LogActionAsync(r.Context(), queries.InsertAuditLogParams{
		Module:     audit.StringToText(db.ModuleAdmin),
		Action:     db.ActionDeleteParty,
		ActorID:    claims.UserID,
		ActorRole:  audit.StringToText(db.ActorRoleSuperAdmin),
		EntityType: db.EntityTypeParty,
		EntityID:   idStr,
		OldValues:  oldValuesJSON,
		NewValues:  newValuesJSON,
	})

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

	party := h.partiesService.GetPartyInfo(r.Context(), int16(id))
	if party == nil {
		h.utils.RespondError(w, http.StatusNotFound, "Party not found")
		return
	}

	wallet, err := h.partiesService.CreatePartyWallet(r.Context(), party.Party)
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

// agentPaymentConfig is the shape of a single role entry in agent_payment_allocation.
type agentPaymentConfig struct {
	Default int64            `json:"default"`
	States  map[string]int64 `json:"states"`
}

// agentPaymentAllocation mirrors the documented shape of the agent_payment_allocation column.
type agentPaymentAllocation struct {
	PollingAgent              agentPaymentConfig `json:"pollingAgent"`
	WardElectionSupervisor    agentPaymentConfig `json:"wardElectionSupervisor"`
	LgaElectionSupervisor     agentPaymentConfig `json:"lgaElectionSupervisor"`
	StateElectionSupervisor   agentPaymentConfig `json:"stateElectionSupervisor"`
}

// UpdateAgentPaymentAllocation godoc
// @Summary      Update agent payment allocation
// @Description  Saves the polling agent allowance budget settings per role and state for a party.
//               Body must be a JSON object with keys: pollingAgent, wardElectionSupervisor,
//               lgaElectionSupervisor, stateElectionSupervisor. Each key holds
//               {"default": <kobo amount>, "states": {"<state_name>": <kobo amount>}}.
// @Tags         Parties
// @Accept       json
// @Produce      json
// @Param        id      path int                      true "Party ID"
// @Param        request body agentPaymentAllocation   true "Agent payment allocation payload"
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

	var payload agentPaymentAllocation
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	// Re-encode to canonical JSON so the stored bytes always match the documented shape.
	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to encode allocation")
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

// GetAgentPaymentAllocation godoc
// @Summary      Get agent payment allocation
// @Description  Returns the current agent_payment_allocation for a party as a parsed JSON object.
// @Tags         Parties
// @Produce      json
// @Param        id path int true "Party ID"
// @Success      200  {object} map[string]interface{} "Allocation fetched successfully"
// @Security     BearerAuth
// @Router       /parties/{id}/allowances/settings [get]
func (h *Handler) GetAgentPaymentAllocation(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	allocation, err := h.partiesService.GetAgentPaymentAllocation(r.Context(), int16(partyID))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Allocation fetched successfully", map[string]interface{}{
		"agent_payment_allocation": allocation,
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

// CreateMarketingCampaignRequest is the request payload for creating a marketing campaign
type CreateMarketingCampaignRequest struct {
	ElectionGroupID int32           `json:"election_group_id"`
	ElectionID      int32           `json:"election_id"`
	PlanID          int32           `json:"plan_id"`
	Type            string          `json:"type"`
	States          json.RawMessage `json:"states" swaggertype:"array,string"`
	DurationInDays  int32           `json:"duration_in_days"`
	Budget          float64         `json:"budget"`
}

// GetMarketingPlansByType godoc
// @Summary      Get plans by type
// @Description  Returns all active marketing plans of the specified type (e.g. agent-campaign)
// @Tags         Marketing
// @Produce      json
// @Param        type query string false "Campaign type" default(agent-campaign)
// @Success      200  {object} map[string]interface{} "Marketing plans retrieved successfully"
// @Security     BearerAuth
// @Router       /agent-marketing-plans [get]
func (h *Handler) GetMarketingPlansByType(w http.ResponseWriter, r *http.Request) {
	campaignTypeStr := r.URL.Query().Get("type")
	if campaignTypeStr == "" {
		campaignTypeStr = "agent-campaign"
	}

	campaignType := queries.MarketingCampaignType(campaignTypeStr)

	plans, err := h.partiesService.GetMarketingPlansByType(r.Context(), campaignType)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to Get plans: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Marketing plans retrieved successfully", map[string]interface{}{
		"plans": plans,
	})
}

// CreatePartyMarketingCampaign godoc
// @Summary      Create a marketing campaign for a party
// @Description  Creates a new agent marketing campaign for the specified party, deducting the budget from their wallet
// @Tags         Marketing
// @Accept       json
// @Produce      json
// @Param        id path int true "Party ID"
// @Param        request body CreateMarketingCampaignRequest true "Create marketing campaign payload"
// @Success      200  {object} map[string]interface{} "Marketing campaign created successfully"
// @Security     BearerAuth
// @Router       /parties/{id}/agent-marketing-campaigns [post]
func (h *Handler) CreatePartyMarketingCampaign(w http.ResponseWriter, r *http.Request) {
	partyIDStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(partyIDStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID: "+err.Error())
		return
	}

	var req CreateMarketingCampaignRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	var budgetNumeric pgtype.Numeric
	if err := budgetNumeric.Scan(fmt.Sprintf("%.2f", req.Budget)); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid budget format: "+err.Error())
		return
	}

	var zeroNumeric pgtype.Numeric
	_ = zeroNumeric.Scan("0.00")

	arg := queries.CreatePartyMarketingCampaignParams{
		PartyID:         int32(partyID),
		ElectionGroupID: req.ElectionGroupID,
		ElectionID:      req.ElectionID,
		PlanID:          req.PlanID,
		Type:            queries.MarketingCampaignType(req.Type),
		States:          req.States,
		DurationInDays:  req.DurationInDays,
		Budget:          budgetNumeric,
		AmountSpent:     zeroNumeric,
		Status:          queries.MarketingCampaignStatusPending,
	}

	campaign, err := h.partiesService.CreatePartyMarketingCampaign(r.Context(), arg)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create marketing campaign: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Marketing campaign created successfully", map[string]interface{}{
		"campaign": campaign,
	})
}

// GetPartyMarketingCampaigns godoc
// @Summary      Get marketing campaigns for a party
// @Description  Returns all marketing campaigns associated with the specified party
// @Tags         Marketing
// @Produce      json
// @Param        id path int true "Party ID"
// @Success      200  {object} map[string]interface{} "Marketing campaigns retrieved successfully"
// @Security     BearerAuth
// @Router       /parties/{id}/agent-marketing-campaigns [get]
func (h *Handler) GetPartyMarketingCampaigns(w http.ResponseWriter, r *http.Request) {
	partyIDStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(partyIDStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID: "+err.Error())
		return
	}

	campaigns, err := h.partiesService.GetPartyMarketingCampaigns(r.Context(), int32(partyID))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to get marketing campaigns: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Marketing campaigns retrieved successfully", map[string]interface{}{
		"campaigns": campaigns,
	})
}

type CreatePlanRequest struct {
	Name                 string   `json:"name"`
	Description          string   `json:"description"`
	Price                float64  `json:"price"`
	Type                 string   `json:"type"`
	Features             []string `json:"features"`
	ScopesRecommendation []string `json:"scopes_recommendation"`
	ColorHex             string   `json:"color_hex"`
}

// CreatePlan godoc
// @Summary      Create a marketing plan
// @Description  Creates a new marketing plan (admin only)
// @Tags         Plans
// @Accept       json
// @Produce      json
// @Param        request body CreatePlanRequest true "Create Plan payload"
// @Success      201  {object} map[string]interface{} "Plan created successfully"
// @Security     BearerAuth
// @Router       /plans [post]
// CreatePlan creates a new marketing plan (admin only).
func (h *Handler) CreatePlan(w http.ResponseWriter, r *http.Request) {
	var req CreatePlanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	var priceNumeric pgtype.Numeric
	if err := priceNumeric.Scan(fmt.Sprintf("%.2f", req.Price)); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid price format: "+err.Error())
		return
	}

	featuresJSON, err := json.Marshal(req.Features)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid features: "+err.Error())
		return
	}
	scopesJSON, err := json.Marshal(req.ScopesRecommendation)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid scopes_recommendation: "+err.Error())
		return
	}

	colorHex := pgtype.Text{}
	if req.ColorHex != "" {
		colorHex = pgtype.Text{String: req.ColorHex, Valid: true}
	}

	plan, err := h.partiesService.CreatePlan(r.Context(), queries.CreatePlanParams{
		Name:                 req.Name,
		Description:          req.Description,
		Price:                priceNumeric,
		Type:                 queries.MarketingCampaignType(req.Type),
		Features:             featuresJSON,
		ScopesRecommendation: scopesJSON,
		ColorHex:             colorHex,
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create plan: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusCreated, "Plan created successfully", map[string]interface{}{
		"plan": plan,
	})
}

type UpdatePlanRequest struct {
	Name                 string   `json:"name"`
	Description          string   `json:"description"`
	Price                float64  `json:"price"`
	Type                 string   `json:"type"`
	Features             []string `json:"features"`
	ScopesRecommendation []string `json:"scopes_recommendation"`
	ColorHex             string   `json:"color_hex"`
	IsActive             bool     `json:"is_active"`
}

// UpdatePlan godoc
// @Summary      Update a marketing plan
// @Description  Updates an existing marketing plan (admin only)
// @Tags         Plans
// @Accept       json
// @Produce      json
// @Param        id path int true "Plan ID"
// @Param        request body UpdatePlanRequest true "Update Plan payload"
// @Success      200  {object} map[string]interface{} "Plan updated successfully"
// @Security     BearerAuth
// @Router       /plans/{id} [put]
func (h *Handler) UpdatePlan(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid plan ID: "+err.Error())
		return
	}

	var req UpdatePlanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	var priceNumeric pgtype.Numeric
	if err := priceNumeric.Scan(fmt.Sprintf("%.2f", req.Price)); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid price format: "+err.Error())
		return
	}

	featuresJSON, err := json.Marshal(req.Features)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid features: "+err.Error())
		return
	}
	scopesJSON, err := json.Marshal(req.ScopesRecommendation)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid scopes_recommendation: "+err.Error())
		return
	}

	colorHex := pgtype.Text{}
	if req.ColorHex != "" {
		colorHex = pgtype.Text{String: req.ColorHex, Valid: true}
	}

	plan, err := h.partiesService.UpdatePlan(r.Context(), queries.UpdatePlanParams{
		ID:                   int32(id),
		Name:                 req.Name,
		Description:          req.Description,
		Price:                priceNumeric,
		Type:                 queries.MarketingCampaignType(req.Type),
		Features:             featuresJSON,
		ScopesRecommendation: scopesJSON,
		ColorHex:             colorHex,
		IsActive:             req.IsActive,
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update plan: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Plan updated successfully", map[string]interface{}{
		"plan": plan,
	})
}

// DeletePlan godoc
// @Summary      Delete a marketing plan
// @Description  Deletes an existing marketing plan (admin only)
// @Tags         Plans
// @Accept       json
// @Produce      json
// @Param        id path int true "Plan ID"
// @Success      200  {object} map[string]interface{} "Plan deleted successfully"
// @Security     BearerAuth
// @Router       /plans/{id} [delete]
func (h *Handler) DeletePlan(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid plan ID: "+err.Error())
		return
	}

	if err := h.partiesService.DeletePlan(r.Context(), int32(id)); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to delete plan: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Plan deleted successfully", nil)
}

// PlanResponse is the JSON-friendly representation of a Plan with JSONB fields decoded.
type PlanResponse struct {
	ID                   int32                   `json:"id"`
	Name                 string                  `json:"name"`
	Description          string                  `json:"description"`
	Price                pgtype.Numeric          `json:"price"`
	Type                 queries.MarketingCampaignType `json:"type"`
	Features             json.RawMessage         `json:"features"`
	ScopesRecommendation json.RawMessage         `json:"scopes_recommendation"`
	ColorHex             pgtype.Text             `json:"color_hex"`
	IsActive             bool                    `json:"is_active"`
	DisplayOrder         int32                   `json:"display_order"`
	CreatedAt            pgtype.Timestamptz      `json:"created_at"`
	UpdatedAt            pgtype.Timestamptz      `json:"updated_at"`
}

// mapPlanToResponse converts a queries.Plan to PlanResponse, decoding the JSONB []byte fields.
func mapPlanToResponse(p queries.Plan) PlanResponse {
	features := json.RawMessage(p.Features)
	if len(features) == 0 {
		features = json.RawMessage("[]")
	}
	scopes := json.RawMessage(p.ScopesRecommendation)
	if len(scopes) == 0 {
		scopes = json.RawMessage("[]")
	}
	return PlanResponse{
		ID:                   p.ID,
		Name:                 p.Name,
		Description:          p.Description,
		Price:                p.Price,
		Type:                 p.Type,
		Features:             features,
		ScopesRecommendation: scopes,
		ColorHex:             p.ColorHex,
		IsActive:             p.IsActive,
		DisplayOrder:         p.DisplayOrder,
		CreatedAt:            p.CreatedAt,
		UpdatedAt:            p.UpdatedAt,
	}
}

// GetPlans godoc
// @Summary      Get plans
// @Description  Retrieves marketing plans. Optionally filter by ?type= (e.g. agent-campaign) and ?is_active= (true/false).
// @Tags         Plans
// @Produce      json
// @Param        type      query string  false "Campaign type filter (e.g. agent-campaign)"
// @Param        is_active query boolean false "Filter by active status"
// @Success      200  {object} map[string]interface{} "Plans retrieved successfully"
// @Router       /plans [get]
func (h *Handler) GetPlans(w http.ResponseWriter, r *http.Request) {
	typeFilter := r.URL.Query().Get("type")
	isActiveFilter := r.URL.Query().Get("is_active")

	plans, err := h.partiesService.GetPlans(r.Context(), typeFilter, isActiveFilter)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to get plans: "+err.Error())
		return
	}

	resp := make([]PlanResponse, len(plans))
	for i, p := range plans {
		resp[i] = mapPlanToResponse(p)
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Plans retrieved successfully", map[string]interface{}{
		"plans": resp,
	})
}

// UpdatePlanDisplayOrderRequest is the request payload for reordering a plan
type UpdatePlanDisplayOrderRequest struct {
	DisplayOrder int32 `json:"display_order"`
}

// UpdatePlanDisplayOrder godoc
// @Summary      Update a plan's display order
// @Description  Updates the display_order of a specific plan (admin only)
// @Tags         Plans
// @Accept       json
// @Produce      json
// @Param        id      path int                          true "Plan ID"
// @Param        request body UpdatePlanDisplayOrderRequest true "Display order payload"
// @Success      200  {object} map[string]interface{} "Plan display order updated"
// @Security     BearerAuth
// @Router       /plans/{id}/display-order [patch]
func (h *Handler) UpdatePlanDisplayOrder(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid plan ID: "+err.Error())
		return
	}

	var req UpdatePlanDisplayOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	plan, err := h.partiesService.UpdatePlanDisplayOrder(r.Context(), queries.UpdatePlanDisplayOrderParams{
		ID:           int32(id),
		DisplayOrder: req.DisplayOrder,
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update plan display order: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Plan display order updated successfully", map[string]interface{}{
		"plan": plan,
	})
}

// UpdateAgentTargetsRequest is the request payload for updating agent acquisition targets
type UpdateAgentTargetsRequest struct {
	PollingUnitAgent        int32 `json:"pollingUnitAgent"`
	WardElectionSupervisor  int32 `json:"wardElectionSupervisor"`
	LgaElectionSupervisor   int32 `json:"lgaElectionSupervisor"`
	StateElectionSupervisor int32 `json:"stateElectionSupervisor"`
}

// UpdateAgentAcquisitionTargets godoc
// @Summary      Update party agent acquisition targets
// @Description  Updates the agent acquisition targets for a party
// @Tags         Parties
// @Accept       json
// @Produce      json
// @Param        id      path int                       true "Party ID"
// @Param        request body UpdateAgentTargetsRequest true "Targets payload"
// @Success      200  {object} map[string]interface{} "Agent targets updated successfully"
// @Security     BearerAuth
// @Router       /parties/{id}/agent-targets [patch]
func (h *Handler) UpdateAgentAcquisitionTargets(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 16)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID: "+err.Error())
		return
	}

	var req UpdateAgentTargetsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	targetsJSON, err := json.Marshal(req)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to marshal targets: "+err.Error())
		return
	}

	party, err := h.partiesService.UpdatePartyAgentAcquisitionTargets(r.Context(), queries.UpdatePartyAgentAcquisitionTargetsParams{
		ID:                      int16(id),
		AgentAcquisitionTargets: targetsJSON,
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update agent targets: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Agent targets updated successfully", map[string]interface{}{
		"party": party,
	})
}

// GetAgentAcquisitionTargets godoc
// @Summary      Get party agent acquisition targets
// @Description  Retrieves the agent acquisition targets for a party
// @Tags         Parties
// @Produce      json
// @Param        id      path int true "Party ID"
// @Success      200  {object} UpdateAgentTargetsRequest "Agent targets retrieved successfully"
// @Security     BearerAuth
// @Router       /parties/{id}/agent-targets [get]
func (h *Handler) GetAgentAcquisitionTargets(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 16)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID: "+err.Error())
		return
	}

	targetsJSON, err := h.partiesService.GetPartyAgentAcquisitionTargets(r.Context(), int16(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to get agent targets: "+err.Error())
		return
	}
	
	// Unmarshal to struct to match expected shape
	var targets UpdateAgentTargetsRequest
	if err := json.Unmarshal(targetsJSON, &targets); err != nil {
        h.utils.RespondError(w, http.StatusInternalServerError, "Failed to parse targets")
        return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Agent targets retrieved successfully", map[string]interface{}{
		"targets": targets,
	})
}
