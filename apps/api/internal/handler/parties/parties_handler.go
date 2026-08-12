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
	r2service "free9ja/api/internal/service/r2"
	permissionsservice "free9ja/api/internal/service/permissions"
	"free9ja/api/internal/utils"
	"io"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
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
	// Membership methods
	UpdateAgentPaymentAllocationKobo(ctx context.Context, partyID int16, allowancesJSON []byte) (queries.Party, error)
	GetAgentPaymentAllocationKobo(ctx context.Context, partyID int16) (json.RawMessage, error)
	// Marketing methods
	GetMarketingPlansByType(ctx context.Context, campaignType queries.MarketingCampaignType) ([]queries.Plan, error)
	CreatePartyMarketingCampaign(ctx context.Context, arg queries.CreatePartyMarketingCampaignParams) (queries.PartyMarketingCampaign, error)
	GetPartyMarketingCampaigns(ctx context.Context, partyID int32) ([]queries.GetPartyMarketingCampaignsRow, error)
	ListAllPartyMarketingCampaigns(ctx context.Context, arg queries.ListAllPartyMarketingCampaignsParams) ([]queries.ListAllPartyMarketingCampaignsRow, error)
	UpdateMarketingCampaignStatus(ctx context.Context, id int32, status queries.MarketingCampaignStatus) (queries.PartyMarketingCampaign, error)
	DeletePartyMarketingCampaign(ctx context.Context, id int32) error
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
	r2Svc          *r2service.R2Service
}

func NewHandler(partiesService PartiesService, auditService audit.AuditService, filesService files.FilesService, utils *utils.Utils, r2Svc *r2service.R2Service) *Handler {
	return &Handler{
		partiesService: partiesService,
		auditService:   auditService,
		filesService:   filesService,
		utils:          utils,
		r2Svc:          r2Svc,
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
	DisplayOrder int32  `json:"display_order"`
}

type UpdatePartyRequest struct {
	ShortName    string `json:"short_name"`
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

	// 3. Create the party in the database and provision a wallet via Monnify
	party, err := h.partiesService.CreateParty(r.Context(), req.ShortName, req.Name, req.Logo, nil, req.DisplayOrder)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create party: "+err.Error())
		return
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
			if len(p.AgentPaymentAllocationKobo) > 0 && string(p.AgentPaymentAllocationKobo) != "{}" && string(p.AgentPaymentAllocationKobo) != "null" {
				var alloc map[string]struct {
					Default *int64 `json:"default"`
				}
				if err := json.Unmarshal(p.AgentPaymentAllocationKobo, &alloc); err == nil {
					roles := []struct {
						camel string
						snake string
					}{
						{camel: "pollingAgent", snake: "polling_agent"},
						{camel: "wardElectionSupervisor", snake: "ward_election_supervisor"},
						{camel: "lgaElectionSupervisor", snake: "lga_election_supervisor"},
						{camel: "stateElectionSupervisor", snake: "state_election_supervisor"},
					}
					var maxDefault int64 = -1
					hasAllDefaults := true
					for _, rolePair := range roles {
						cfg, exists := alloc[rolePair.camel]
						if !exists {
							cfg, exists = alloc[rolePair.snake]
						}
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

	// If the logo URL is changing, and the party already had a logo, delete the old logo from R2
	if party.Logo != req.Logo && party.Logo != "" {
		// Example URL: https://pub-xxx.r2.dev/parties/2026-07-13/A.webp
		// We can extract the key by stripping the domain prefix. We'll find ".dev/" or ".com/" and take the rest.
		var key string
		if idx := strings.Index(party.Logo, ".dev/"); idx != -1 {
			key = party.Logo[idx+5:]
		} else if idx := strings.Index(party.Logo, ".com/"); idx != -1 {
			key = party.Logo[idx+5:]
		}
		
		if key != "" && h.r2Svc != nil {
			go func(k string) {
				ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				defer cancel()
				if delErr := h.r2Svc.DeleteObject(ctx, k); delErr == nil {
					_ = h.r2Svc.PurgeCloudflareCache(ctx, k)
				}
			}(key)
		}
	}

	// update the party info
	updatedParty, err := h.partiesService.UpdateParty(r.Context(), partyID, req.ShortName, req.Name, req.Logo, nil, req.DisplayOrder)
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
		// If wallet not found, attempt to create it automatically
		party := h.partiesService.GetPartyInfo(r.Context(), int16(id))
		if party == nil {
			h.utils.RespondError(w, http.StatusNotFound, "Party not found")
			return
		}

		wallet, err = h.partiesService.CreatePartyWallet(r.Context(), party.Party)
		if err != nil {
			if containsString(err.Error(), "unique") || containsString(err.Error(), "duplicate") {
				// Edge case: someone just created it, try fetching one last time
				wallet, err = h.partiesService.GetPartyWallet(r.Context(), int16(id))
				if err != nil {
					h.utils.RespondError(w, http.StatusNotFound, "Wallet not found for this party")
					return
				}
			} else {
				h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create party wallet automatically: "+err.Error())
				return
			}
		}
	}

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
		if str, ok := parsedAccounts.(string); ok {
			var doubleParsed interface{}
			if err := json.Unmarshal([]byte(str), &doubleParsed); err == nil {
				parsedAccounts = doubleParsed
			}
		}
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

type ToggleVerificationRequest struct {
	IsVerified bool `json:"is_verified"`
}

// TogglePartyVerification godoc
// @Summary      Toggle party verification
// @Description  Allows an admin to toggle the verification status of a political party.
// @Tags         Parties
// @Accept       json
// @Produce      json
// @Param        id path int true "Party ID"
// @Param        request body ToggleVerificationRequest true "Toggle Verification request payload"
// @Success      200  {object} map[string]interface{} "Party verification updated"
// @Failure      400  {object} map[string]interface{} "Bad request"
// @Failure      401  {object} map[string]interface{} "Unauthorized"
// @Failure      403  {object} map[string]interface{} "Forbidden (Admin only)"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Security     BearerAuth
// @Router       /admin/parties/{id}/verify [put]
func (h *Handler) TogglePartyVerification(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	var req ToggleVerificationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	err = h.partiesService.UpdatePartyIsVerified(r.Context(), int16(partyID), req.IsVerified)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to toggle verification: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Party verification toggled successfully", nil)
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

// agentPaymentConfig is the shape of a single role entry in agent_payment_allocation_kobo.
type agentPaymentConfig struct {
	Default int64            `json:"default"`
	States  map[string]int64 `json:"states"`
}

// agentPaymentAllocation mirrors the documented shape of the agent_payment_allocation_kobo column.
type agentPaymentAllocation struct {
	PollingAgent            agentPaymentConfig `json:"polling_agent"`
	WardElectionSupervisor  agentPaymentConfig `json:"ward_election_supervisor"`
	LgaElectionSupervisor   agentPaymentConfig `json:"lga_election_supervisor"`
	StateElectionSupervisor agentPaymentConfig `json:"state_election_supervisor"`
}

// UpdateAgentPaymentAllocationKobo godoc
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
func (h *Handler) UpdateAgentPaymentAllocationKobo(w http.ResponseWriter, r *http.Request) {
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

	party, err := h.partiesService.UpdateAgentPaymentAllocationKobo(r.Context(), int16(partyID), bodyBytes)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Allowances configuration updated successfully", map[string]interface{}{
		"party": party,
	})
}

// GetAgentPaymentAllocationKobo godoc
// @Summary      Get agent payment allocation
// @Description  Returns the current agent_payment_allocation_kobo for a party as a parsed JSON object.
// @Tags         Parties
// @Produce      json
// @Param        id path int true "Party ID"
// @Success      200  {object} map[string]interface{} "Allocation fetched successfully"
// @Security     BearerAuth
// @Router       /parties/{id}/allowances/settings [get]
func (h *Handler) GetAgentPaymentAllocationKobo(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	allocation, err := h.partiesService.GetAgentPaymentAllocationKobo(r.Context(), int16(partyID))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Allocation fetched successfully", map[string]interface{}{
		"agent_payment_allocation_kobo": allocation,
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
	ElectionGroupID  int32           `json:"election_group_id"`
	ElectionID       int32           `json:"election_id"`
	PlanID           int32           `json:"plan_id"`
	Type             string          `json:"type"`
	States           json.RawMessage `json:"states" swaggertype:"array,string"`
	DurationInDays   int32           `json:"duration_in_days"`
	BudgetPerDayKobo int64           `json:"budget_per_day_kobo"`
	BudgetKobo       int64           `json:"budget_kobo"`
	// Support legacy naira fields as fallback if passed
	BudgetPerDay float64 `json:"budget_per_day"`
	Budget       float64 `json:"budget"`
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

	budgetKobo := req.BudgetKobo
	if budgetKobo <= 0 && req.Budget > 0 {
		budgetKobo = int64(req.Budget * 100)
	}

	budgetPerDayKobo := req.BudgetPerDayKobo
	if budgetPerDayKobo <= 0 && req.BudgetPerDay > 0 {
		budgetPerDayKobo = int64(req.BudgetPerDay * 100)
	}
	if budgetPerDayKobo <= 0 && req.DurationInDays > 0 {
		budgetPerDayKobo = budgetKobo / int64(req.DurationInDays)
	}

	arg := queries.CreatePartyMarketingCampaignParams{
		PartyID:            int32(partyID),
		ElectionGroupID:    req.ElectionGroupID,
		ElectionID:         req.ElectionID,
		PlanID:             req.PlanID,
		Type:               queries.MarketingCampaignType(req.Type),
		States:             req.States,
		DurationInDays:     req.DurationInDays,
		BudgetPerDayKobo:   budgetPerDayKobo,
		BudgetKobo:         budgetKobo,
		ReferralAmountKobo: 0,
		AmountSpentKobo:    0,
		Status:             queries.MarketingCampaignStatusPending,
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

	var formatted []map[string]interface{}
	for _, c := range campaigns {
		var statesJSON interface{}
		if len(c.States) > 0 {
			if err := json.Unmarshal(c.States, &statesJSON); err == nil {
				if str, ok := statesJSON.(string); ok {
					var inner interface{}
					if err := json.Unmarshal([]byte(str), &inner); err == nil {
						statesJSON = inner
					}
				}
			}
		}

		item := map[string]interface{}{
			"id":                   c.ID,
			"party_id":             c.PartyID,
			"election_group_id":    c.ElectionGroupID,
			"election_id":          c.ElectionID,
			"plan_id":              c.PlanID,
			"type":                 c.Type,
			"states":               statesJSON,
			"duration_in_days":     c.DurationInDays,
			"start_date":           c.StartDate,
			"end_date":             c.EndDate,
			"status":               c.Status,
			"budget_per_day_kobo":  c.BudgetPerDayKobo,
			"budget_kobo":          c.BudgetKobo,
			"referral_amount_kobo": c.ReferralAmountKobo,
			"amount_spent_kobo":    c.AmountSpentKobo,
			"budget_per_day":       float64(c.BudgetPerDayKobo) / 100.0,
			"budget":               float64(c.BudgetKobo) / 100.0,
			"referral_amount":      float64(c.ReferralAmountKobo) / 100.0,
			"amount_spent":         float64(c.AmountSpentKobo) / 100.0,
			"created_at":           c.CreatedAt,
			"updated_at":           c.UpdatedAt,
			"plan_name":            c.PlanName,
			"plan_price_kobo":      c.PlanPriceKobo,
			"plan_price":           float64(c.PlanPriceKobo) / 100.0,
			"plan_color":           c.PlanColor.String,
			"election_group_name":  c.ElectionGroupName,
			"election_name":        c.ElectionName,
		}
		formatted = append(formatted, item)
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Marketing campaigns retrieved successfully", map[string]interface{}{
		"campaigns": formatted,
	})
}

// ListAllPartyMarketingCampaigns godoc
// @Summary      List all party marketing campaigns (Admin)
// @Description  Returns a paginated list of all party marketing campaigns with party, plan, election_group, and election details
// @Tags         Marketing
// @Produce      json
// @Param        party_id query int false "Party ID filter"
// @Param        election_group_id query int false "Election Group ID filter"
// @Param        status query string false "Status filter"
// @Param        limit query int false "Limit" default(20)
// @Param        cursor query int false "Cursor (ID)"
// @Success      200  {object} map[string]interface{} "Marketing campaigns retrieved successfully"
// @Security     BearerAuth
// @Router       /admin/agent-marketing-campaigns [get]
func (h *Handler) ListAllPartyMarketingCampaigns(w http.ResponseWriter, r *http.Request) {
	var partyID int32
	var electionGroupID int32
	status := r.URL.Query().Get("status")

	if val := r.URL.Query().Get("party_id"); val != "" {
		if pID, err := strconv.ParseInt(val, 10, 32); err == nil {
			partyID = int32(pID)
		}
	}
	if val := r.URL.Query().Get("election_group_id"); val != "" {
		if egID, err := strconv.ParseInt(val, 10, 32); err == nil {
			electionGroupID = int32(egID)
		}
	}

	limit := int32(20)
	if val := r.URL.Query().Get("limit"); val != "" {
		if l, err := strconv.Atoi(val); err == nil && l > 0 {
			limit = int32(l)
		}
	}
	var cursor int32
	if val := r.URL.Query().Get("cursor"); val != "" {
		if c, err := strconv.ParseInt(val, 10, 32); err == nil && c > 0 {
			cursor = int32(c)
		}
	}

	arg := queries.ListAllPartyMarketingCampaignsParams{
		PartyID:         partyID,
		ElectionGroupID: electionGroupID,
		StatusFilter:    status,
		Cursor:          cursor,
		LimitVal:        limit,
	}

	rows, err := h.partiesService.ListAllPartyMarketingCampaigns(r.Context(), arg)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch marketing campaigns: "+err.Error())
		return
	}

	var formatted []map[string]interface{}
	for _, row := range rows {
		var statesJSON interface{}
		if len(row.States) > 0 {
			if err := json.Unmarshal(row.States, &statesJSON); err == nil {
				if str, ok := statesJSON.(string); ok {
					var inner interface{}
					if err := json.Unmarshal([]byte(str), &inner); err == nil {
						statesJSON = inner
					}
				}
			}
		}

		item := map[string]interface{}{
			"id":                   row.ID,
			"party_id":             row.PartyID,
			"election_group_id":    row.ElectionGroupID,
			"election_id":          row.ElectionID,
			"plan_id":              row.PlanID,
			"type":                 row.Type,
			"states":               statesJSON,
			"duration_in_days":     row.DurationInDays,
			"start_date":           row.StartDate,
			"end_date":             row.EndDate,
			"status":               row.Status,
			"budget_per_day_kobo":  row.BudgetPerDayKobo,
			"budget_kobo":          row.BudgetKobo,
			"referral_amount_kobo": row.ReferralAmountKobo,
			"amount_spent_kobo":    row.AmountSpentKobo,
			"budget_per_day":       float64(row.BudgetPerDayKobo) / 100.0,
			"budget":               float64(row.BudgetKobo) / 100.0,
			"referral_amount":      float64(row.ReferralAmountKobo) / 100.0,
			"amount_spent":         float64(row.AmountSpentKobo) / 100.0,
			"created_at":           row.CreatedAt,
			"updated_at":           row.UpdatedAt,
			"party": map[string]interface{}{
				"id":         row.PartyID,
				"name":       row.PartyName,
				"short_name": row.PartyShortName,
				"logo":       row.PartyLogo,
			},
			"plan": map[string]interface{}{
				"id":               row.PlanID,
				"name":             row.PlanName,
				"description":      row.PlanDescription,
				"price_kobo":       row.PlanPriceKobo,
				"price":            float64(row.PlanPriceKobo) / 100.0,
				"color_hex":        row.PlanColorHex.String,
			},
			"election_group": map[string]interface{}{
				"id":   row.ElectionGroupID,
				"name": row.ElectionGroupName,
			},
			"election": map[string]interface{}{
				"id":   row.ElectionID,
				"name": row.ElectionName,
			},
		}
		formatted = append(formatted, item)
	}

	var nextCursor int32
	hasMore := false
	if int32(len(rows)) == limit && len(rows) > 0 {
		nextCursor = rows[len(rows)-1].ID
		hasMore = true
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Marketing campaigns retrieved successfully", map[string]interface{}{
		"campaigns": formatted,
		"meta": map[string]interface{}{
			"limit":       limit,
			"next_cursor": nextCursor,
			"has_more":    hasMore,
		},
	})
}

// UpdatePartyMarketingCampaignStatus godoc
// @Summary      Update marketing campaign status (Admin)
// @Description  Updates a marketing campaign status (e.g. active, inactive, completed). When set to active, sets start_date to today, end_date to start_date + duration, and deducts budget_per_day to amount_spent.
// @Tags         Marketing
// @Accept       json
// @Produce      json
// @Param        id path int true "Campaign ID"
// @Param        request body map[string]string true "Status payload e.g. {\"status\": \"active\"}"
// @Success      200  {object} map[string]interface{} "Marketing campaign status updated successfully"
// @Security     BearerAuth
// @Router       /admin/agent-marketing-campaigns/{id}/status [patch]
func (h *Handler) UpdatePartyMarketingCampaignStatus(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	campaignID, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid campaign ID: "+err.Error())
		return
	}

	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	if req.Status == "" {
		h.utils.RespondError(w, http.StatusBadRequest, "Status is required")
		return
	}

	updated, err := h.partiesService.UpdateMarketingCampaignStatus(r.Context(), int32(campaignID), queries.MarketingCampaignStatus(req.Status))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update campaign status: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Marketing campaign status updated successfully", map[string]interface{}{
		"campaign": updated,
	})
}

// DeletePartyMarketingCampaign godoc
// @Summary      Delete marketing campaign (Admin)
// @Description  Deletes a marketing campaign by ID
// @Tags         Marketing
// @Produce      json
// @Param        id path int true "Campaign ID"
// @Success      200  {object} map[string]interface{} "Marketing campaign deleted successfully"
// @Security     BearerAuth
// @Router       /admin/agent-marketing-campaigns/{id} [delete]
func (h *Handler) DeletePartyMarketingCampaign(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	campaignID, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid campaign ID: "+err.Error())
		return
	}

	if err := h.partiesService.DeletePartyMarketingCampaign(r.Context(), int32(campaignID)); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to delete marketing campaign: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Marketing campaign deleted successfully", nil)
}

type CreatePlanRequest struct {
	Name                 string   `json:"name"`
	Description          string   `json:"description"`
	PriceKobo            int64    `json:"price_kobo"`
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

	priceKobo := req.PriceKobo
	if priceKobo <= 0 && req.Price > 0 {
		priceKobo = int64(req.Price * 100)
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
		PriceKobo:            priceKobo,
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
		"plan": mapPlanToResponse(plan),
	})
}

type UpdatePlanRequest struct {
	Name                 string   `json:"name"`
	Description          string   `json:"description"`
	PriceKobo            int64    `json:"price_kobo"`
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

	priceKobo := req.PriceKobo
	if priceKobo <= 0 && req.Price > 0 {
		priceKobo = int64(req.Price * 100)
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
		PriceKobo:            priceKobo,
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
		"plan": mapPlanToResponse(plan),
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
	ID                   int32                         `json:"id"`
	Name                 string                        `json:"name"`
	Description          string                        `json:"description"`
	PriceKobo            int64                         `json:"price_kobo"`
	Price                float64                       `json:"price"`
	ReferralAmountKobo   int64                         `json:"referral_amount_kobo"`
	ReferralAmount       float64                       `json:"referral_amount"`
	Type                 queries.MarketingCampaignType `json:"type"`
	Features             json.RawMessage               `json:"features"`
	ScopesRecommendation json.RawMessage               `json:"scopes_recommendation"`
	ColorHex             pgtype.Text                   `json:"color_hex"`
	IsActive             bool                          `json:"is_active"`
	DisplayOrder         int32                         `json:"display_order"`
	CreatedAt            pgtype.Timestamptz            `json:"created_at"`
	UpdatedAt            pgtype.Timestamptz            `json:"updated_at"`
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
		PriceKobo:            p.PriceKobo,
		Price:                float64(p.PriceKobo) / 100.0,
		ReferralAmountKobo:   p.ReferralAmountKobo,
		ReferralAmount:       float64(p.ReferralAmountKobo) / 100.0,
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
	PollingAgent            int32 `json:"polling_agent"`
	WardElectionSupervisor  int32 `json:"ward_election_supervisor"`
	LgaElectionSupervisor   int32 `json:"lga_election_supervisor"`
	StateElectionSupervisor int32 `json:"state_election_supervisor"`
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

	var rawMap map[string]int32
	if err := json.NewDecoder(r.Body).Decode(&rawMap); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	getVal := func(keys ...string) int32 {
		for _, k := range keys {
			if v, ok := rawMap[k]; ok {
				return v
			}
		}
		return 1
	}

	req := UpdateAgentTargetsRequest{
		PollingAgent:            getVal("polling_agent", "pollingAgent", "pollingUnitAgent"),
		WardElectionSupervisor:  getVal("ward_election_supervisor", "wardElectionSupervisor", "ward-election-supervisor"),
		LgaElectionSupervisor:   getVal("lga_election_supervisor", "lgaElectionSupervisor", "lga-election-supervisor"),
		StateElectionSupervisor: getVal("state_election_supervisor", "stateElectionSupervisor", "state-election-supervisor"),
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
	
	var rawMap map[string]int32
	if len(targetsJSON) > 0 {
		_ = json.Unmarshal(targetsJSON, &rawMap)
	}

	getVal := func(keys ...string) int32 {
		for _, k := range keys {
			if v, ok := rawMap[k]; ok {
				return v
			}
		}
		return 1
	}

	resp := map[string]int32{
		"polling_agent":            getVal("polling_agent", "pollingAgent", "pollingUnitAgent"),
		"ward_election_supervisor": getVal("ward_election_supervisor", "wardElectionSupervisor", "ward-election-supervisor"),
		"lga_election_supervisor":  getVal("lga_election_supervisor", "lgaElectionSupervisor", "lga-election-supervisor"),
		"state_election_supervisor": getVal("state_election_supervisor", "stateElectionSupervisor", "state-election-supervisor"),
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Agent targets retrieved successfully", map[string]interface{}{
		"targets": resp,
	})
}

