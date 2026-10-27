package partieshandler

import (
	"context"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/constants"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	"free9ja/api/internal/service/audit"
	bodiesservice "free9ja/api/internal/service/bodies"
	"free9ja/api/internal/service/files"
	partiesservice "free9ja/api/internal/service/parties"
	permissionsservice "free9ja/api/internal/service/permissions"
	r2service "free9ja/api/internal/service/r2"
	"free9ja/api/internal/utils"
	"io"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"

	partieswallethandler "free9ja/api/internal/handler/parties_wallet"
	notifications "free9ja/api/internal/service/notifications"
)

type PartiesService interface {
	CreateParty(ctx context.Context, shortName, name, logo string, logoFileID *int64, displayOrder int32, colorHex, darkColorHex, coverImage *string, coverImageFileID *int64, coverPositionY *int16, dateFounded *string) (queries.Party, error)
	GetPartyInfo(ctx context.Context, partyID int16) *queries.PartyWithVerifications
	GetPartyBasicInfo(ctx context.Context, partyID int16) *queries.PartyBasicInfoWithVerifications
	ListParties(ctx context.Context) ([]queries.PartyWithVerifications, error)
	GetAcceptingPartyIDs(ctx context.Context) (map[int16]bool, error)
	IsPartyAcceptingApplications(ctx context.Context, partyID int16) (bool, error)
	GetPartyCards(ctx context.Context, userID int64, userPartyID int16) ([]partiesservice.PartyCard, error)
	UpdateParty(ctx context.Context, id int64, shortName, name, logo string, logoFileID *int64, displayOrder int32, colorHex, darkColorHex, coverImage *string, coverImageFileID *int64, coverPositionY *int16, dateFounded *string) (queries.Party, error)
	DeleteParty(ctx context.Context, id int64) error
	UpdatePartyIsVerified(ctx context.Context, partyID int16, isVerified bool) error
	// Allowance methods
	DepositAllowance(ctx context.Context, partyID int16, amountKobo int64) (queries.DepositPartyAllowanceRow, error)
	JoinParty(ctx context.Context, params partiesservice.JoinPartyParams) error
	LeaveParty(ctx context.Context, partyID int16, userID, userFid int64) error
	// Membership methods
	UpdateAgentPaymentAllocationKobo(ctx context.Context, partyID int16, allowancesJSON []byte) (queries.UpdatePartyAgentPaymentAllocationKoboRow, error)
	// Marketing methods
	CreatePartyMarketingCampaign(ctx context.Context, arg queries.CreatePartyMarketingCampaignParams) (queries.PartyMarketingCampaign, error)
	GetPartyMarketingCampaigns(ctx context.Context, partyID int16) ([]queries.GetPartyMarketingCampaignsRow, error)
	ListAllPartyMarketingCampaigns(ctx context.Context, arg queries.ListAllPartyMarketingCampaignsParams) ([]queries.ListAllPartyMarketingCampaignsRow, error)
	UpdateMarketingCampaignStatus(ctx context.Context, id int32, status string) (queries.PartyMarketingCampaign, error)
	DeletePartyMarketingCampaign(ctx context.Context, id int32) error
	// Plan admin methods
	GetPlans(ctx context.Context, typeFilter string, isActiveFilter string) ([]queries.Plan, error)
	CreatePlan(ctx context.Context, arg queries.CreatePlanParams) (queries.Plan, error)
	UpdatePlan(ctx context.Context, arg queries.UpdatePlanParams) (queries.Plan, error)
	DeletePlan(ctx context.Context, id int32) error
	// Agent target methods
	UpdatePartyAgentAcquisitionTargets(ctx context.Context, arg queries.UpdatePartyAgentAcquisitionTargetsParams) (queries.UpdatePartyAgentAcquisitionTargetsRow, error)
	GetPartyAgentAcquisitionTargets(ctx context.Context, partyID int16) (json.RawMessage, error)
	// Positions & Officials methods
	ListPartyPositions(ctx context.Context, partyID int16) (*partiesservice.PartyPositionsResult, error)
	CreatePartyCustomPosition(ctx context.Context, arg queries.CreatePartyCustomPositionParams) (queries.PartyPosition, error)
	UpdatePartyCustomPosition(ctx context.Context, arg queries.UpdatePartyCustomPositionParams) (queries.PartyPosition, error)
	DeletePartyCustomPosition(ctx context.Context, id int32, partyID int16) error
	AssignPartyPosition(ctx context.Context, input partiesservice.AssignPartyPositionInput) (queries.PartyPositionAssignment, error)
	VacatePositionAssignment(ctx context.Context, id int64, partyID int16) (queries.PartyPositionAssignment, error)
	GetPartyChapterByID(ctx context.Context, chapterID int32) (queries.PartyChapter, error)
	GetChapterMemberCount(ctx context.Context, partyID int16, chapterID int32) (int64, error)
	IsPartyChapterMember(ctx context.Context, userID int64, partyID int16, chapterID int32) (bool, error)
	IsPartyMember(ctx context.Context, userID int64, partyID int16) (bool, error)
	GetOrCreateWardChapter(ctx context.Context, partyID int16, wardID int32, createIfMissing ...bool) (int32, error)
	GetOrCreateLGAChapter(ctx context.Context, partyID int16, lgaID int32, createIfMissing ...bool) (int32, error)
	GetOrCreateStateChapter(ctx context.Context, partyID, stateID int16, createIfMissing ...bool) (int32, error)
	GetOrCreateZonalChapter(ctx context.Context, partyID, zonalID int16, createIfMissing ...bool) (int32, error)
	GetOrCreateNationalChapter(ctx context.Context, partyID, countryID int16, createIfMissing ...bool) (int32, error)
	ListPartyOfficials(ctx context.Context, partyID int16, chapterID int32) ([]queries.ListPartyOfficialsRow, error)
	ListMemberPositionAssignments(ctx context.Context, partyID int16, userID int64) ([]queries.ListMemberPositionAssignmentsRow, error)
	SuspendPartyMember(ctx context.Context, input partiesservice.SuspendPartyMemberInput) (*queries.PartyMemberSuspension, error)
	UnsuspendPartyMember(ctx context.Context, input partiesservice.UnsuspendPartyMemberInput) (*queries.PartyMemberSuspension, error)
	BlockUserFromThisParty(ctx context.Context, input partiesservice.BlockPartyUserInput) (*queries.PartyUserBlock, error)
	UnblockPartyUser(ctx context.Context, input partiesservice.UnblockPartyUserInput) error
	ListBlockedPartyMembers(ctx context.Context, partyID int16, limit int32, cursor int64) ([]queries.ListBlockedUsersByPartyRow, error)
	ListSuspendedPartyMembers(ctx context.Context, partyID int16, limit int32, cursor int64) ([]queries.ListSuspendedPartyMembersRow, error)
	ListPartyAdmins(ctx context.Context, partyID int16) ([]partiesservice.PartyAdminItem, error)
	GetPartyHome(ctx context.Context, partyID int16, chapterID *int32) (*partiesservice.PartyHomeData, error)
	GetPartyReadiness(ctx context.Context, partyID int16) (*partiesservice.PartyReadinessData, error)
	ListPartyChapterMembers(ctx context.Context, params partiesservice.ListPartyMembersParams) (*partiesservice.PartyMembersResult, error)
	ListPartyEvents(ctx context.Context, params partiesservice.ListPartyEventsParams) ([]partiesservice.PartyEventItem, error)
	GetPartyEventByID(ctx context.Context, partyID int16, eventID int64) (*partiesservice.PartyEventItem, error)
	CreatePartyEvent(ctx context.Context, input partiesservice.CreatePartyEventInput) (*partiesservice.PartyEventItem, error)
}

// PermissionsService defines methods for checking user permissions
type PermissionsService interface {
	CheckPartyModificationPermission(claims *utils.JWTClaims, partyID int16) (bool, permissionsservice.PartyModificationPermissions, error)
	CheckPartyMemberSuspensionPermission(claims *utils.JWTClaims, partyID int16, targetUserID int64) (bool, permissionsservice.PartyModificationPermissions, error)
}

type BodiesService interface {
	CompletePartyHierarchySelections(ctx context.Context, partyID int64, selections []bodiesservice.PartyHierarchySelection) (bodiesservice.PartyHierarchyResult, error)
	CheckCountry(ctx context.Context, country_id int16) (queries.GetCountryByIDRow, error)
	CheckZone(ctx context.Context, zoneID int16) (queries.CZonesNigerium, error)
	CheckStateByID(ctx context.Context, stateID int16) (queries.CState, error)
	CheckLGA(ctx context.Context, lgaID int32) (queries.Lga, error)
	CheckWard(ctx context.Context, wardID int32) (queries.Ward, error)
}

type FollowsService interface {
	IsFollowingParty(ctx context.Context, userID int64, partyID int16, chapterID int32) (bool, error)
	GetPartyFollowersCount(ctx context.Context, partyID int16, chapterID int32) (int64, error)
}

type NotificationsService interface {
	NotifyPartyAgentsAllowanceDeposited(ctx context.Context, params notifications.NotifyPartyAgentsAllowanceDepositedParams)
	NotifyPartyAgentPaymentAllocationUpdated(ctx context.Context, params notifications.NotifyPartyAgentPaymentAllocationUpdatedParams)
}

type Handler struct {
	bodiesService        BodiesService
	partiesService       PartiesService
	auditService         audit.AuditService
	permissionsService   PermissionsService
	filesService         files.FilesService
	utils                *utils.Utils
	r2Svc                *r2service.R2Service
	followsService       FollowsService
	notificationsService NotificationsService
}

func NewHandler(partiesService PartiesService, bodiesService BodiesService, auditService audit.AuditService, permissionsService PermissionsService, filesService files.FilesService, utils *utils.Utils, r2Svc *r2service.R2Service, followsService FollowsService, notificationsService NotificationsService) *Handler {
	return &Handler{
		bodiesService:        bodiesService,
		partiesService:       partiesService,
		auditService:         auditService,
		permissionsService:   permissionsService,
		filesService:         filesService,
		utils:                utils,
		r2Svc:                r2Svc,
		followsService:       followsService,
		notificationsService: notificationsService,
	}
}

type FilteredPartyResponse struct {
	ID             int16                             `json:"id"`
	ShortName      string                            `json:"short_name"`
	Name           string                            `json:"name"`
	Logo           string                            `json:"logo"`
	CoverImage     *string                           `json:"cover_image"`
	CoverPositionY *int16                            `json:"cover_position_y"`
	IsVerified     bool                              `json:"is_verified"`
	ColorHex       *string                           `json:"color_hex"`
	DarkColorHex   *string                           `json:"dark_color_hex"`
	DateFounded    *string                           `json:"date_founded"`
	Verifications  []queries.GetPageVerificationsRow `json:"verifications"`
}

type PartyProfileResponse struct {
	Data                   FilteredPartyResponse `json:"data"`
	Chapter                queries.PartyChapter  `json:"chapter"`
	ChapterType            string                `json:"chapter_type"`
	ChapterGeoName         string                `json:"chapter_geo_name"`
	NationalChapterID      int32                 `json:"national_chapter_id"`
	NationalMemberCount    int64                 `json:"national_member_count"`
	ChapterMemberCount     int64                 `json:"chapter_member_count"`
	NationalFollowersCount int64                 `json:"national_followers_count"`
	IsChapterMember        bool                  `json:"is_chapter_member"`
	IsFollowing            bool                  `json:"is_following"`
}

type PartyReadinessResponse struct {
	Party                queries.Party                             `json:"party"`
	Wallet               *partieswallethandler.PartyWalletResponse `json:"wallet,omitempty"`
	ActiveCampaignsCount int                                       `json:"active_campaigns_count"`
	HasMarketingSetup    bool                                      `json:"has_marketing_setup"`
	HasSlots             bool                                      `json:"has_slots"`
	HasAgentPayment      bool                                      `json:"has_agent_payment"`
	HasPaymentAllocation bool                                      `json:"has_payment_allocation"`
}

type PartyMarketingCampaignResponse struct {
	ID                 int32       `json:"id"`
	PartyID            int16       `json:"party_id"`
	ElectionGroupID    int32       `json:"election_group_id"`
	ElectionID         int32       `json:"election_id"`
	PlanID             int32       `json:"plan_id"`
	Type               string      `json:"type"`
	States             interface{} `json:"states"`
	DurationInDays     int32       `json:"duration_in_days"`
	StartDate          interface{} `json:"start_date"`
	EndDate            interface{} `json:"end_date"`
	Status             string      `json:"status"`
	BudgetPerDayKobo   int64       `json:"budget_per_day_kobo"`
	BudgetKobo         int64       `json:"budget_kobo"`
	ReferralAmountKobo int64       `json:"referral_amount_kobo"`
	AmountSpentKobo    int64       `json:"amount_spent_kobo"`
	BudgetPerDay       float64     `json:"budget_per_day"`
	Budget             float64     `json:"budget"`
	ReferralAmount     float64     `json:"referral_amount"`
	AmountSpent        float64     `json:"amount_spent"`
	CreatedAt          interface{} `json:"created_at"`
	UpdatedAt          interface{} `json:"updated_at"`
	PlanName           string      `json:"plan_name"`
	PlanPriceKobo      int64       `json:"plan_price_kobo"`
	PlanPrice          float64     `json:"plan_price"`
	PlanColor          string      `json:"plan_color"`
	ElectionGroupName  string      `json:"election_group_name"`
	ElectionName       string      `json:"election_name"`
}

type CampaignPartySummary struct {
	ID        int16       `json:"id"`
	Name      string      `json:"name"`
	ShortName string      `json:"short_name"`
	Logo      interface{} `json:"logo"`
}

type CampaignPlanSummary struct {
	ID          int32   `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	PriceKobo   int64   `json:"price_kobo"`
	Price       float64 `json:"price"`
	ColorHex    string  `json:"color_hex"`
}

type CampaignElectionGroupSummary struct {
	ID   int32  `json:"id"`
	Name string `json:"name"`
}

type CampaignElectionSummary struct {
	ID   int32  `json:"id"`
	Name string `json:"name"`
}

type AdminMarketingCampaignResponse struct {
	PartyMarketingCampaignResponse
	Party         CampaignPartySummary         `json:"party"`
	Plan          CampaignPlanSummary          `json:"plan"`
	ElectionGroup CampaignElectionGroupSummary `json:"election_group"`
	Election      CampaignElectionSummary      `json:"election"`
}

type PartyPositionsResponse struct {
	Default   []queries.PartyPosition `json:"default"`
	Custom    []queries.PartyPosition `json:"custom"`
	Positions []queries.PartyPosition `json:"positions"`
}

type PartyChapterOfficialsResponse struct {
	ChapterID int32                           `json:"chapter_id"`
	Officials []queries.ListPartyOfficialsRow `json:"officials"`
}

type PartyAssignmentWithOfficialsResponse struct {
	Assignment interface{}                     `json:"assignment"`
	ChapterID  int32                           `json:"chapter_id"`
	Officials  []queries.ListPartyOfficialsRow `json:"officials"`
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

// deleteOldAssetAsync delegates asynchronous R2 and DB asset cleanup to filesService.
func (h *Handler) deleteOldAssetAsync(rawURL string, fileID int64) {
	h.filesService.DeleteAssetAsync(rawURL, fileID)
}

type CreatePartyRequest struct {
	ShortName        string  `json:"short_name"`
	Name             string  `json:"name"`
	Logo             string  `json:"logo"`
	LogoFileID       *int64  `json:"logo_file_id"`
	DisplayOrder     int32   `json:"display_order"`
	ColorHex         string  `json:"color_hex"`
	DarkColorHex     string  `json:"dark_color_hex"`
	CoverImage       *string `json:"cover_image"`
	CoverImageFileID *int64  `json:"cover_image_file_id"`
	CoverPositionY   *int16  `json:"cover_position_y"`
	DateFounded      *string `json:"date_founded"`
}

type UpdatePartyRequest struct {
	ShortName        string  `json:"short_name"`
	Name             string  `json:"name"`
	Logo             string  `json:"logo"`
	LogoFileID       *int64  `json:"logo_file_id"`
	DisplayOrder     int32   `json:"display_order"`
	ColorHex         string  `json:"color_hex"`
	DarkColorHex     string  `json:"dark_color_hex"`
	CoverImage       *string `json:"cover_image"`
	CoverImageFileID *int64  `json:"cover_image_file_id"`
	CoverPositionY   *int16  `json:"cover_position_y"`
	DateFounded      *string `json:"date_founded"`
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

	// 3. Create the party in the database and provision a wallet
	var colorHexPtr, darkColorHexPtr *string
	if req.ColorHex != "" {
		colorHexPtr = &req.ColorHex
	}
	if req.DarkColorHex != "" {
		darkColorHexPtr = &req.DarkColorHex
	}
	party, err := h.partiesService.CreateParty(r.Context(), req.ShortName, req.Name, req.Logo, req.LogoFileID, req.DisplayOrder, colorHexPtr, darkColorHexPtr, req.CoverImage, req.CoverImageFileID, req.CoverPositionY, req.DateFounded)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create party: "+err.Error())
		return
	}

	if req.LogoFileID != nil && *req.LogoFileID > 0 {
		_, _ = h.filesService.UpdateFileOwner(r.Context(), *req.LogoFileID, int64(party.ID))
	}
	if req.CoverImageFileID != nil && *req.CoverImageFileID > 0 {
		_, _ = h.filesService.UpdateFileOwner(r.Context(), *req.CoverImageFileID, int64(party.ID))
	}

	// --- Audit Logging ---
	newValuesJSON, _ := json.Marshal(party)
	h.auditService.LogActionAsync(r.Context(), queries.InsertAuditLogParams{
		Module:     audit.StringToText(db.ModuleAdmin),
		Action:     db.ActionCreateParty,
		EntityType: db.EntityTypeParty,
		EntityID:   strconv.FormatInt(int64(party.ID), 10),
		NewValues:  newValuesJSON,
	})

	h.utils.RespondSuccess(w, http.StatusCreated, "Party created successfully", map[string]interface{}{
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
	allowed, _, err := h.permissionsService.CheckPartyModificationPermission(claims, int16(partyID))
	if !allowed {
		h.utils.RespondError(w, http.StatusForbidden, err.Error())
		return
	}

	// If the logo URL is changing, and the party already had a logo, delete the old logo from R2 and clean up the file record
	if party.Logo != req.Logo && party.Logo != "" {
		oldFileID := int64(0)
		if party.LogoFileID.Valid {
			oldFileID = party.LogoFileID.Int64
		}
		h.deleteOldAssetAsync(party.Logo, oldFileID)
	}

	// If the background cover image is changing, delete the old cover from R2 and clean up the file record
	reqCover := ""
	if req.CoverImage != nil {
		reqCover = *req.CoverImage
	}
	if party.CoverImage.String != reqCover && party.CoverImage.String != "" {
		oldCoverFileID := int64(0)
		if party.CoverImageFileID.Valid {
			oldCoverFileID = party.CoverImageFileID.Int64
		}
		h.deleteOldAssetAsync(party.CoverImage.String, oldCoverFileID)
	}

	// update the party info
	var colorHexPtr, darkColorHexPtr *string
	if req.ColorHex != "" {
		colorHexPtr = &req.ColorHex
	}
	if req.DarkColorHex != "" {
		darkColorHexPtr = &req.DarkColorHex
	}
	updatedParty, err := h.partiesService.UpdateParty(r.Context(), partyID, req.ShortName, req.Name, req.Logo, req.LogoFileID, req.DisplayOrder, colorHexPtr, darkColorHexPtr, req.CoverImage, req.CoverImageFileID, req.CoverPositionY, req.DateFounded)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update party: "+err.Error())
		return
	}

	if req.LogoFileID != nil && *req.LogoFileID > 0 {
		_, _ = h.filesService.UpdateFileOwner(r.Context(), *req.LogoFileID, partyID)
	}
	if req.CoverImageFileID != nil && *req.CoverImageFileID > 0 {
		_, _ = h.filesService.UpdateFileOwner(r.Context(), *req.CoverImageFileID, partyID)
	}

	// --- Audit Logging ---
	// Capture old and new values for audit logging
	oldValuesJSON, _ := json.Marshal(party)
	newValuesJSON, _ := json.Marshal(updatedParty)

	h.auditService.LogActionAsync(r.Context(), queries.InsertAuditLogParams{
		Action:     db.ActionUpdateParty,
		EntityType: db.EntityTypeParty,
		EntityID:   idStr,
		OldValues:  oldValuesJSON,
		NewValues:  newValuesJSON,
	})

	h.utils.RespondSuccess(w, http.StatusOK, "Party updated successfully", map[string]interface{}{
		"party": updatedParty,
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
		if orderDir == "DESC" {
			i, j = j, i
		}

		switch orderBy {
		case "name":
			return parties[i].Name < parties[j].Name
		case "short_name":
			return parties[i].ShortName < parties[j].ShortName
		default:
			return parties[i].DisplayOrder < parties[j].DisplayOrder
		}
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

// ListPartyCards godoc
// @Summary      List political party cards with dynamic stats, avatars, and leadership
// @Description  Fetches enriched political party cards including active member counts, sample member avatars, top national positions, and current user membership status.
// @Tags         Parties
// @Accept       json
// @Produce      json
// @Success      200  {object} map[string]interface{} "Party cards fetched successfully"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /parties/cards [get]
func (h *Handler) ListPartyCards(w http.ResponseWriter, r *http.Request) {
	// Extract authenticated user's ID and party ID if session exists (to flag 'is_user_member' and 'is_user_blocked')
	var userID int64
	var userPartyID int16
	if claims, ok := apimiddleware.GetClaims(r); ok && claims != nil {
		userID = claims.UserID
		userPartyID = claims.PartyID
	}

	// Fetch enriched party cards with metrics, sample members, leadership, and block status
	cards, err := h.partiesService.GetPartyCards(r.Context(), userID, userPartyID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch party cards: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Party cards fetched successfully", map[string]interface{}{
		"parties": cards,
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
		if orderDir == "DESC" {
			i, j = j, i
		}

		switch orderBy {
		case "name":
			return parties[i].Name < parties[j].Name
		case "short_name":
			return parties[i].ShortName < parties[j].ShortName
		default:
			return parties[i].DisplayOrder < parties[j].DisplayOrder
		}
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
		ColorHex                string `json:"color_hex,omitempty"`
		DarkColorHex            string `json:"dark_color_hex,omitempty"`
	}

	var publicParties []PartyPublic
	acceptingMap, _ := h.partiesService.GetAcceptingPartyIDs(r.Context())

	for _, p := range parties {
		publicParties = append(publicParties, PartyPublic{
			ID:                      p.ID,
			ShortName:               p.ShortName,
			Name:                    p.Name,
			Logo:                    p.Logo,
			DisplayOrder:            p.DisplayOrder,
			Status:                  p.Status,
			IsVerified:              p.IsVerified.Bool,
			IsAcceptingApplications: acceptingMap[p.ID],
			ColorHex:                p.ColorHex.String,
			DarkColorHex:            p.DarkColorHex.String,
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

// GetPartyAcceptingStatus godoc
// @Summary      Get party application acceptance status
// @Description  Checks if a party currently meets all criteria to accept agent applications.
// @Tags         Parties
// @Produce      json
// @Param        id   path  int  true  "Party ID"
// @Success      200  {object} map[string]interface{} "Status fetched successfully"
// @Failure      400  {object} map[string]interface{} "Invalid ID"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Router       /parties/{id}/accepting-applications [get]
func (h *Handler) GetPartyAcceptingStatus(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	isAccepting, err := h.partiesService.IsPartyAcceptingApplications(r.Context(), int16(partyID))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to check acceptance status: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Acceptance status fetched successfully", map[string]interface{}{
		"party_id":                  partyID,
		"is_accepting_applications": isAccepting,
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
// @Param        chapter_id query int false "Chapter ID (optional, defaults to national chapter)"
// @Success      200  {object}  map[string]interface{} "Party profile retrieved successfully"
// @Router       /parties/{party_id}/{short_name}/profile [get]
func (h *Handler) GetPartyProfile(w http.ResponseWriter, r *http.Request) {
	// get authenticated user
	claims, ok := apimiddleware.GetClaims(r)
	var chapterID *int32

	// Parse party ID parameter from URL route
	partyIDStr := chi.URLParam(r, "party_id")
	partyID, err := strconv.ParseInt(partyIDStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	// Parse optional chapter_id query parameter; fallback to national chapter if missing or invalid
	var chapter queries.PartyChapter
	chapterIDStr := r.URL.Query().Get("chapter_id")
	parsedChapterID, err := strconv.ParseInt(chapterIDStr, 10, 32)
	if err != nil || parsedChapterID <= 0 {
		// Resolve the national chapter as default fallback
		natID, natErr := h.partiesService.GetOrCreateNationalChapter(r.Context(), int16(partyID), constants.NigeriaCountryID)
		if natErr != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, "Failed to resolve national chapter: "+natErr.Error())
			return
		}

		// fetch the chapter details
		ch, chErr := h.partiesService.GetPartyChapterByID(r.Context(), natID)
		if chErr != nil {
			h.utils.RespondError(w, http.StatusNotFound, "National party chapter not found")
			return
		}

		// set the chapter and chapter id
		chapter = ch
		chapterID = &natID
	} else {
		reqChapterID := int32(parsedChapterID)
		ch, chErr := h.partiesService.GetPartyChapterByID(r.Context(), reqChapterID)
		if chErr != nil {
			h.utils.RespondError(w, http.StatusNotFound, "Party chapter not found")
			return
		}
		// Ensure the fetched chapter actually belongs to the specified party
		if ch.PartyID != int16(partyID) {
			h.utils.RespondError(w, http.StatusBadRequest, "Chapter does not belong to the specified party")
			return
		}

		// set the chapter and chapter id
		chapter = ch
		chapterID = &reqChapterID
	}

	// Fetch full party info (including cover_image, cover_position_y, date_founded, and verifications)
	party := h.partiesService.GetPartyInfo(r.Context(), int16(partyID))
	if party == nil {
		h.utils.RespondError(w, http.StatusNotFound, "Party not found")
		return
	}

	// Check if logged in user is a chapter member, and following the party
	var isChapterMember bool
	var isFollowing bool
	if ok && claims != nil {
		if claims.PartyID == int16(partyID) {
			isChapMember, err := h.partiesService.IsPartyChapterMember(r.Context(), claims.UserID, int16(partyID), *chapterID)
			if err == nil && isChapMember {
				isChapterMember = true
			}
		}

		following, err := h.followsService.IsFollowingParty(r.Context(), claims.UserID, int16(partyID), *chapterID)
		if err == nil && following {
			isFollowing = true
		}
	}

	// Fetch total active members in this chapter
	chapterMemberCount, _ := h.partiesService.GetChapterMemberCount(r.Context(), int16(partyID), *chapterID)

	// Determine the national chapter ID for this party
	var nationalChapterID int32
	if chapter.ChapterType == "national" {
		nationalChapterID = chapter.ID
	} else {
		countryID := constants.NigeriaCountryID
		if chapter.CountryID.Valid && chapter.CountryID.Int16 > 0 {
			countryID = chapter.CountryID.Int16
		}

		if natID, err := h.partiesService.GetOrCreateNationalChapter(r.Context(), int16(partyID), countryID); err == nil {
			nationalChapterID = natID
		}
	}

	// Fetch total active members in the national chapter (total party membership)
	var nationalMemberCount int64
	if chapter.ChapterType == "national" {
		nationalMemberCount = chapterMemberCount
	} else if nationalChapterID > 0 {
		nationalMemberCount, _ = h.partiesService.GetChapterMemberCount(r.Context(), int16(partyID), nationalChapterID)
	}

	// Fetch total followers of the national chapter (total party followers)
	var nationalFollowersCount int64
	if nationalChapterID > 0 {
		nationalFollowersCount, _ = h.followsService.GetPartyFollowersCount(r.Context(), int16(partyID), nationalChapterID)
	}

	// Filter party info to only expose public-facing branding and verification details without leaking sensitive internal fields
	verifications := party.Verifications
	if verifications == nil {
		verifications = []queries.GetPageVerificationsRow{}
	}
	filteredParty := FilteredPartyResponse{
		ID:             party.ID,
		ShortName:      party.ShortName,
		Name:           party.Name,
		Logo:           party.Logo,
		CoverImage:     utils.PtrFromPgText(party.CoverImage),
		CoverPositionY: utils.PtrFromPgInt2(party.CoverPositionY),
		IsVerified:     party.IsVerified.Bool,
		ColorHex:       utils.PtrFromPgText(party.ColorHex),
		DarkColorHex:   utils.PtrFromPgText(party.DarkColorHex),
		DateFounded:    utils.PtrFromPgDate(party.DateFounded),
		Verifications:  verifications,
	}

	// Resolve chapter geographic name based on chapter tier
	var chapterGeoName string
	switch chapter.ChapterType {
	case "national":
		countryID := constants.NigeriaCountryID
		if country, err := h.bodiesService.CheckCountry(r.Context(), countryID); err == nil {
			chapterGeoName = country.Name
		}
	case "zonal":
		if chapter.ZonalID.Valid && chapter.ZonalID.Int16 > 0 {
			if zone, err := h.bodiesService.CheckZone(r.Context(), chapter.ZonalID.Int16); err == nil {
				chapterGeoName = zone.Name
			}
		}
	case "state":
		if chapter.StateID.Valid && chapter.StateID.Int16 > 0 {
			if state, err := h.bodiesService.CheckStateByID(r.Context(), chapter.StateID.Int16); err == nil {
				chapterGeoName = state.Name
			}
		}
	case "lga":
		if chapter.LgaID.Valid && chapter.LgaID.Int32 > 0 {
			if lga, err := h.bodiesService.CheckLGA(r.Context(), chapter.LgaID.Int32); err == nil {
				chapterGeoName = lga.Name
			}
		}
	case "ward":
		if chapter.WardID.Valid && chapter.WardID.Int32 > 0 {
			if ward, err := h.bodiesService.CheckWard(r.Context(), chapter.WardID.Int32); err == nil {
				chapterGeoName = ward.Name
			}
		}
	}

	// final response data
	responseData := PartyProfileResponse{
		Data:                   filteredParty,
		Chapter:                chapter,
		ChapterType:            chapter.ChapterType,
		ChapterGeoName:         chapterGeoName,
		NationalChapterID:      nationalChapterID,
		NationalMemberCount:    nationalMemberCount,
		ChapterMemberCount:     chapterMemberCount,
		NationalFollowersCount: nationalFollowersCount,
		IsChapterMember:        isChapterMember,
		IsFollowing:            isFollowing,
	}

	h.utils.RespondSuccessData(w, http.StatusOK, "Party profile retrieved successfully", responseData)
}

// GetPartyHome godoc
// @Summary      Get party home data
// @Description  Fetches primary data for the party home tab including leadership cards (national leaders and dynamic/chapter leaders) and upcoming components.
// @Tags         Parties
// @Produce      json
// @Param        party_id    path      int  true  "Party ID"
// @Param        chapter_id  query     int  false "Optional Chapter ID"
// @Success      200         {object}  map[string]interface{}
// @Router       /parties/{party_id}/home [get]
func (h *Handler) GetPartyHome(w http.ResponseWriter, r *http.Request) {
	// Parse party ID
	partyIDStr := chi.URLParam(r, "party_id")
	partyID, err := strconv.ParseInt(partyIDStr, 10, 16)
	if err != nil || partyID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	// Parse optional active chapter ID
	var chapterID *int32
	if chapStr := r.URL.Query().Get("chapter_id"); chapStr != "" {
		if parsed, err := strconv.ParseInt(chapStr, 10, 32); err == nil && parsed > 0 {
			cid := int32(parsed)
			chapterID = &cid
		}
	}

	// Fetch party home data
	data, err := h.partiesService.GetPartyHome(r.Context(), int16(partyID), chapterID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch party home data: "+err.Error())
		return
	}

	h.utils.RespondSuccessData(w, http.StatusOK, "Party home data retrieved successfully", data)
}

// ListPartyEvents godoc
// @Summary      List party events
// @Description  Fetches party events filtered by chapter, tier, category, status, and search query.
// @Tags         Parties
// @Produce      json
// @Param        party_id    path      int     true  "Party ID"
// @Param        chapter_id  query     int     false "Optional Chapter ID"
// @Param        tier        query     string  false "Optional Tier (national, state, lga, ward)"
// @Param        category    query     string  false "Optional Category"
// @Param        status      query     string  false "Optional Status (upcoming, ongoing, completed, cancelled)"
// @Param        search      query     string  false "Optional Search query"
// @Success      200         {object}  map[string]interface{}
// @Router       /parties/{party_id}/events [get]
func (h *Handler) ListPartyEvents(w http.ResponseWriter, r *http.Request) {
	partyIDStr := chi.URLParam(r, "party_id")
	if partyIDStr == "" {
		partyIDStr = chi.URLParam(r, "id")
	}
	partyID, err := strconv.ParseInt(partyIDStr, 10, 16)
	if err != nil || partyID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	var chapterID *int32
	if chapStr := r.URL.Query().Get("chapter_id"); chapStr != "" {
		if parsed, err := strconv.ParseInt(chapStr, 10, 32); err == nil && parsed > 0 {
			cid := int32(parsed)
			chapterID = &cid
		}
	}

	var tierPtr *string
	if tier := r.URL.Query().Get("tier"); tier != "" && tier != "all" {
		tierPtr = &tier
	}

	var catPtr *string
	if cat := r.URL.Query().Get("category"); cat != "" && cat != "All" {
		catPtr = &cat
	}

	var statusPtr *string
	if status := r.URL.Query().Get("status"); status != "" && status != "all" {
		statusPtr = &status
	}

	var searchPtr *string
	if search := r.URL.Query().Get("search"); search != "" {
		searchPtr = &search
	}

	events, err := h.partiesService.ListPartyEvents(r.Context(), partiesservice.ListPartyEventsParams{
		PartyID:   int16(partyID),
		ChapterID: chapterID,
		Tier:      tierPtr,
		Category:  catPtr,
		Status:    statusPtr,
		Search:    searchPtr,
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch party events: "+err.Error())
		return
	}

	h.utils.RespondSuccessData(w, http.StatusOK, "Party events retrieved successfully", events)
}

// GetPartyEvent godoc
// @Summary      Get party event details
// @Description  Fetches a single party event by ID.
// @Tags         Parties
// @Produce      json
// @Param        party_id    path      int  true  "Party ID"
// @Param        event_id    path      int  true  "Event ID"
// @Success      200         {object}  map[string]interface{}
// @Router       /parties/{party_id}/events/{event_id} [get]
func (h *Handler) GetPartyEvent(w http.ResponseWriter, r *http.Request) {
	partyIDStr := chi.URLParam(r, "party_id")
	if partyIDStr == "" {
		partyIDStr = chi.URLParam(r, "id")
	}
	partyID, err := strconv.ParseInt(partyIDStr, 10, 16)
	if err != nil || partyID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	eventIDStr := chi.URLParam(r, "event_id")
	eventID, err := strconv.ParseInt(eventIDStr, 10, 64)
	if err != nil || eventID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid event ID")
		return
	}

	event, err := h.partiesService.GetPartyEventByID(r.Context(), int16(partyID), eventID)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Event not found: "+err.Error())
		return
	}

	h.utils.RespondSuccessData(w, http.StatusOK, "Party event retrieved successfully", event)
}

// GetPartyReadiness godoc
// @Summary      Get party readiness data
// @Description  Returns party operational readiness status including wallet, slots, payment allocations, and marketing summary.
// @Tags         Parties
// @Produce      json
// @Param        id   path      int  true  "Party ID"
// @Success      200  {object}  map[string]interface{}
// @Router       /parties/{id}/readiness [get]
func (h *Handler) GetPartyReadiness(w http.ResponseWriter, r *http.Request) {
	partyIDStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(partyIDStr, 10, 16)
	if err != nil || partyID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	data, err := h.partiesService.GetPartyReadiness(r.Context(), int16(partyID))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch party readiness data: "+err.Error())
		return
	}

	var walletResp *partieswallethandler.PartyWalletResponse
	if data.Wallet != nil {
		w := partieswallethandler.FormatPartyWalletResponse(*data.Wallet)
		walletResp = &w
	}

	h.utils.RespondSuccessData(w, http.StatusOK, "Party readiness data retrieved successfully", PartyReadinessResponse{
		Party:                data.Party,
		Wallet:               walletResp,
		ActiveCampaignsCount: data.ActiveCampaignsCount,
		HasMarketingSetup:    data.HasMarketingSetup,
		HasSlots:             data.HasSlots,
		HasAgentPayment:      data.HasAgentPayment,
		HasPaymentAllocation: data.HasPaymentAllocation,
	})
}

// JoinPartyHierarchy handles requests to join a party with chapter hierarchy selections.
func (h *Handler) JoinPartyHierarchy(w http.ResponseWriter, r *http.Request) {
	// 1. Extract and validate the target party ID from URL parameters
	partyIDStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(partyIDStr, 10, 16)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	// Extract authenticated user claims from context
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Ensure user is not already affiliated with a different political party
	if claims.PartyID > 0 && claims.PartyID != int16(partyID) {
		h.utils.RespondError(w, http.StatusBadRequest, "You are already a member of a different political party. You must leave your current party before joining another one.")
		return
	}

	// Decode the optional chapter hierarchy selections from the request body
	var req struct {
		Selections []bodiesservice.PartyHierarchySelection `json:"selections"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil && err != io.EOF {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Ensure all parent/ancestor body selections in the hierarchy are present before proceeding
	hierarchy, err := h.bodiesService.CompletePartyHierarchySelections(r.Context(), partyID, req.Selections)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Join each resolved party chapter.
	for _, chapter := range []struct {
		chapterID   int32
		chapterType string
	}{
		{hierarchy.Ward.ChapterID, "ward"},
		{hierarchy.Lga.ChapterID, "lga"},
		{hierarchy.State.ChapterID, "state"},
		{hierarchy.National.ChapterID, "national"},
	} {
		if chapter.chapterID <= 0 {
			continue
		}
		err = h.partiesService.JoinParty(r.Context(), partiesservice.JoinPartyParams{
			PartyID:     int16(partyID),
			ChapterID:   chapter.chapterID,
			ChapterType: chapter.chapterType,
			UserID:      claims.UserID,
			UserFID:     claims.FakeID,
		})
		if err != nil {
			h.utils.RespondError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	// Return success response
	h.utils.RespondSuccess(w, http.StatusOK, "Membership request processed successfully", nil)
}

// LeaveParty handles requests to leave a party.
func (h *Handler) LeaveParty(w http.ResponseWriter, r *http.Request) {
	// Parse target party ID from URL parameter
	partyIDStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(partyIDStr, 10, 16)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	// Extract authenticated user credentials from context
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Remove memberships, revoke party admin roles, and update user party_id
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
	// get claims from the request context
	// only super admin can delete a party
	_, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey, "super_admin")
	if !ok {
		return
	}

	// get party id from the url request
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	// get party information
	party := h.partiesService.GetPartyInfo(r.Context(), int16(id))

	// Verify party exists
	if party == nil {
		h.utils.RespondError(w, http.StatusNotFound, "Party not found")
		return
	}

	// delete the party
	if err := h.partiesService.DeleteParty(r.Context(), id); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to delete party: "+err.Error())
		return
	}

	// Clean up party assets (logo and cover image) from R2 and files table asynchronously
	if party.Logo != "" {
		var oldLogoID int64
		if party.LogoFileID.Valid {
			oldLogoID = party.LogoFileID.Int64
		}
		h.deleteOldAssetAsync(party.Logo, oldLogoID)
	}
	if party.CoverImage.Valid && party.CoverImage.String != "" {
		var oldCoverID int64
		if party.CoverImageFileID.Valid {
			oldCoverID = party.CoverImageFileID.Int64
		}
		h.deleteOldAssetAsync(party.CoverImage.String, oldCoverID)
	}

	// --- Audit Logging ---
	oldValuesJSON, _ := json.Marshal(map[string]string{"status": "active"})
	newValuesJSON, _ := json.Marshal(map[string]string{"status": "deleted"})
	h.auditService.LogActionAsync(r.Context(), queries.InsertAuditLogParams{
		Module:     audit.StringToText(db.ModuleAdmin),
		Action:     db.ActionDeleteParty,
		EntityType: db.EntityTypeParty,
		EntityID:   idStr,
		OldValues:  oldValuesJSON,
		NewValues:  newValuesJSON,
	})

	h.utils.RespondSuccess(w, http.StatusOK, "Party deleted successfully", nil)
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
	// Parse and validate party ID from URL parameter
	idStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	// Decode deposit request payload
	var req DepositAllowanceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate deposit amount
	if req.AmountKobo <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Amount must be greater than zero")
		return
	}

	// Process allowance deposit via parties service
	res, err := h.partiesService.DepositAllowance(r.Context(), int16(partyID), req.AmountKobo)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Record audit log asynchronously
	auditNewValues, _ := json.Marshal(map[string]interface{}{
		"party_id":                       partyID,
		"amount_kobo":                    req.AmountKobo,
		"new_agent_payment_balance_kobo": res.AgentPaymentBalanceKobo,
	})
	h.auditService.LogActionAsync(r.Context(), queries.InsertAuditLogParams{
		Module:     audit.StringToText(db.ModuleAdmin),
		Action:     db.ActionDepositPartyAgentsAllowance,
		EntityType: db.EntityTypeParty,
		EntityID:   strconv.FormatInt(partyID, 10),
		NewValues:  auditNewValues,
	})

	// Dispatch notification to party national chapter
	if natChapterID, err := h.partiesService.GetOrCreateNationalChapter(r.Context(), int16(partyID), constants.NigeriaCountryID); err == nil && natChapterID > 0 {
		h.notificationsService.NotifyPartyAgentsAllowanceDeposited(r.Context(), notifications.NotifyPartyAgentsAllowanceDepositedParams{
			PartyID:                    int16(partyID),
			ChapterID:                  natChapterID,
			AmountKobo:                 req.AmountKobo,
			NewAgentPaymentBalanceKobo: res.AgentPaymentBalanceKobo,
		})
	}

	// Return updated agent payment balance
	h.utils.RespondSuccess(w, http.StatusOK, "Allowance deposited successfully", map[string]interface{}{
		"agent_payment_balance_kobo": res.AgentPaymentBalanceKobo,
	})
}

// UpdateAgentPaymentAllocationKobo godoc
// @Summary      Update agent payment allocation
// @Description  Saves the polling agent allowance budget settings per role and state for a party.
//
//	Body must be a JSON object with keys: polling_agent, ward_election_supervisor,
//	lga_election_supervisor, state_election_supervisor. Each key holds
//	{"default": <kobo amount>, "states": {"<state_name>": <kobo amount>}}.
//
// @Tags         Parties
// @Accept       json
// @Produce      json
// @Param        id      path int                      true "Party ID"
// @Param        request body map[string]interface{}   true "Agent payment allocation payload"
// @Success      200  {object} map[string]interface{} "Allowances configuration updated successfully"
// @Security     BearerAuth
// @Router       /parties/{id}/allowances/settings [put]
func (h *Handler) UpdateAgentPaymentAllocationKobo(w http.ResponseWriter, r *http.Request) {
	// Extract and validate party ID from the URL path parameter
	idStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	// Read raw request body containing role/state payment allocation rates
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Failed to read request body")
		return
	}

	// Delegate harmonization, persistence, and cache invalidation to service layer
	res, err := h.partiesService.UpdateAgentPaymentAllocationKobo(r.Context(), int16(partyID), bodyBytes)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Record audit log asynchronously
	auditNewValues, _ := json.Marshal(map[string]interface{}{
		"party_id":                      partyID,
		"agent_payment_allocation_kobo": json.RawMessage(res.AgentPaymentAllocationKobo),
	})
	h.auditService.LogActionAsync(r.Context(), queries.InsertAuditLogParams{
		Module:     audit.StringToText(db.ModuleAdmin),
		Action:     db.ActionUpdatePartyAgentPaymentAllocation,
		EntityType: db.EntityTypeParty,
		EntityID:   strconv.FormatInt(partyID, 10),
		NewValues:  auditNewValues,
	})

	// Dispatch notification to party national chapter
	if natChapterID, err := h.partiesService.GetOrCreateNationalChapter(r.Context(), int16(partyID), constants.NigeriaCountryID); err == nil && natChapterID > 0 {
		h.notificationsService.NotifyPartyAgentPaymentAllocationUpdated(r.Context(), notifications.NotifyPartyAgentPaymentAllocationUpdatedParams{
			PartyID:                    int16(partyID),
			ChapterID:                  natChapterID,
			AgentPaymentAllocationKobo: json.RawMessage(res.AgentPaymentAllocationKobo),
		})
	}

	// Respond with the newly persisted canonical payment allocations
	h.utils.RespondSuccess(w, http.StatusOK, "Allowances configuration updated successfully", map[string]interface{}{
		"agent_payment_allocation_kobo": json.RawMessage(res.AgentPaymentAllocationKobo),
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
	partyID, err := strconv.ParseInt(partyIDStr, 10, 16)
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
		PartyID:            int16(partyID),
		ElectionGroupID:    req.ElectionGroupID,
		ElectionID:         req.ElectionID,
		PlanID:             req.PlanID,
		Type:               req.Type,
		States:             req.States,
		DurationInDays:     req.DurationInDays,
		BudgetPerDayKobo:   budgetPerDayKobo,
		BudgetKobo:         budgetKobo,
		ReferralAmountKobo: 0,
		AmountSpentKobo:    0,
		Status:             "pending",
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
	partyID, err := strconv.ParseInt(partyIDStr, 10, 16)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID: "+err.Error())
		return
	}

	campaigns, err := h.partiesService.GetPartyMarketingCampaigns(r.Context(), int16(partyID))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to get marketing campaigns: "+err.Error())
		return
	}

	var formatted []PartyMarketingCampaignResponse
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

		item := PartyMarketingCampaignResponse{
			ID:                 c.ID,
			PartyID:            c.PartyID,
			ElectionGroupID:    c.ElectionGroupID,
			ElectionID:         c.ElectionID,
			PlanID:             c.PlanID,
			Type:               c.Type,
			States:             statesJSON,
			DurationInDays:     c.DurationInDays,
			StartDate:          c.StartDate,
			EndDate:            c.EndDate,
			Status:             c.Status,
			BudgetPerDayKobo:   c.BudgetPerDayKobo,
			BudgetKobo:         c.BudgetKobo,
			ReferralAmountKobo: c.ReferralAmountKobo,
			AmountSpentKobo:    c.AmountSpentKobo,
			BudgetPerDay:       float64(c.BudgetPerDayKobo) / 100.0,
			Budget:             float64(c.BudgetKobo) / 100.0,
			ReferralAmount:     float64(c.ReferralAmountKobo) / 100.0,
			AmountSpent:        float64(c.AmountSpentKobo) / 100.0,
			CreatedAt:          c.CreatedAt,
			UpdatedAt:          c.UpdatedAt,
			PlanName:           c.PlanName,
			PlanPriceKobo:      c.PlanPriceKobo,
			PlanPrice:          float64(c.PlanPriceKobo) / 100.0,
			PlanColor:          c.PlanColor.String,
			ElectionGroupName:  c.ElectionGroupName,
			ElectionName:       c.ElectionName,
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

	var formatted []AdminMarketingCampaignResponse
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

		planPrice := float64(row.PlanPriceKobo) / 100.0

		item := AdminMarketingCampaignResponse{
			PartyMarketingCampaignResponse: PartyMarketingCampaignResponse{
				ID:                 row.ID,
				PartyID:            row.PartyID,
				ElectionGroupID:    row.ElectionGroupID,
				ElectionID:         row.ElectionID,
				PlanID:             row.PlanID,
				Type:               row.Type,
				States:             statesJSON,
				DurationInDays:     row.DurationInDays,
				StartDate:          row.StartDate,
				EndDate:            row.EndDate,
				Status:             row.Status,
				BudgetPerDayKobo:   row.BudgetPerDayKobo,
				BudgetKobo:         row.BudgetKobo,
				ReferralAmountKobo: row.ReferralAmountKobo,
				AmountSpentKobo:    row.AmountSpentKobo,
				BudgetPerDay:       float64(row.BudgetPerDayKobo) / 100.0,
				Budget:             float64(row.BudgetKobo) / 100.0,
				ReferralAmount:     float64(row.ReferralAmountKobo) / 100.0,
				AmountSpent:        float64(row.AmountSpentKobo) / 100.0,
				CreatedAt:          row.CreatedAt,
				UpdatedAt:          row.UpdatedAt,
				PlanName:           row.PlanName,
				PlanPriceKobo:      row.PlanPriceKobo,
				PlanPrice:          planPrice,
				PlanColor:          row.PlanColorHex.String,
				ElectionGroupName:  row.ElectionGroupName,
				ElectionName:       row.ElectionName,
			},
			Party: CampaignPartySummary{
				ID:        row.PartyID,
				Name:      row.PartyName,
				ShortName: row.PartyShortName,
				Logo:      row.PartyLogo,
			},
			Plan: CampaignPlanSummary{
				ID:          row.PlanID,
				Name:        row.PlanName,
				Description: row.PlanDescription,
				PriceKobo:   row.PlanPriceKobo,
				Price:       planPrice,
				ColorHex:    row.PlanColorHex.String,
			},
			ElectionGroup: CampaignElectionGroupSummary{
				ID:   row.ElectionGroupID,
				Name: row.ElectionGroupName,
			},
			Election: CampaignElectionSummary{
				ID:   row.ElectionID,
				Name: row.ElectionName,
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

	updated, err := h.partiesService.UpdateMarketingCampaignStatus(r.Context(), int32(campaignID), req.Status)
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
		Type:                 req.Type,
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
		Type:                 req.Type,
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
	ID                   int32              `json:"id"`
	Name                 string             `json:"name"`
	Description          string             `json:"description"`
	PriceKobo            int64              `json:"price_kobo"`
	Price                float64            `json:"price"`
	ReferralAmountKobo   int64              `json:"referral_amount_kobo"`
	ReferralAmount       float64            `json:"referral_amount"`
	Type                 string             `json:"type"`
	Features             json.RawMessage    `json:"features"`
	ScopesRecommendation json.RawMessage    `json:"scopes_recommendation"`
	ColorHex             pgtype.Text        `json:"color_hex"`
	IsActive             bool               `json:"is_active"`
	DisplayOrder         int32              `json:"display_order"`
	CreatedAt            pgtype.Timestamptz `json:"created_at"`
	UpdatedAt            pgtype.Timestamptz `json:"updated_at"`
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
	// Parse and validate party ID from URL parameter
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 16)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID: "+err.Error())
		return
	}

	// Decode request payload
	var req UpdateAgentTargetsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	// Enforce default minimum target values of at least 1 per agent level
	if req.PollingAgent <= 0 {
		req.PollingAgent = 1
	}
	if req.WardElectionSupervisor <= 0 {
		req.WardElectionSupervisor = 1
	}
	if req.LgaElectionSupervisor <= 0 {
		req.LgaElectionSupervisor = 1
	}
	if req.StateElectionSupervisor <= 0 {
		req.StateElectionSupervisor = 1
	}

	// Serialize targets payload to JSON for storage
	targetsJSON, err := json.Marshal(req)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to marshal targets: "+err.Error())
		return
	}

	// Persist updated acquisition targets to the database
	res, err := h.partiesService.UpdatePartyAgentAcquisitionTargets(r.Context(), queries.UpdatePartyAgentAcquisitionTargetsParams{
		ID:                      int16(id),
		AgentAcquisitionTargets: targetsJSON,
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update agent targets: "+err.Error())
		return
	}

	// Return success response with updated agent acquisition targets
	h.utils.RespondSuccess(w, http.StatusOK, "Agent targets updated successfully", map[string]interface{}{
		"agent_acquisition_targets": json.RawMessage(res.AgentAcquisitionTargets),
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
	// Parse and validate party ID from URL parameter
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 16)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID: "+err.Error())
		return
	}

	// Fetch targets JSON stored for this party
	targetsJSON, err := h.partiesService.GetPartyAgentAcquisitionTargets(r.Context(), int16(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to get agent targets: "+err.Error())
		return
	}

	// Parse targets JSON directly into UpdateAgentTargetsRequest
	targets := UpdateAgentTargetsRequest{
		PollingAgent:            1,
		WardElectionSupervisor:  1,
		LgaElectionSupervisor:   1,
		StateElectionSupervisor: 1,
	}
	if len(targetsJSON) > 0 {
		_ = json.Unmarshal(targetsJSON, &targets)
	}

	// Return normalized targets
	h.utils.RespondSuccess(w, http.StatusOK, "Agent targets retrieved successfully", map[string]interface{}{
		"targets": targets,
	})
}

// --START-- Party Positions & Officials Handlers
// ListPartyPositions returns all positions (default and custom)
func (h *Handler) ListPartyPositions(w http.ResponseWriter, r *http.Request) {
	// 1. Extract and validate party ID from URL parameters
	idStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(idStr, 10, 16)
	if err != nil || partyID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	// 2. Fetch both pre-seeded default positions and party custom positions via service
	res, err := h.partiesService.ListPartyPositions(r.Context(), int16(partyID))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to list positions: "+err.Error())
		return
	}

	// 3. Merge default and custom positions into a single unified list
	allPositions := make([]queries.PartyPosition, 0, len(res.Default)+len(res.Custom))
	allPositions = append(allPositions, res.Default...)
	allPositions = append(allPositions, res.Custom...)

	// 4. Stable sort by RankOrder ASC (higher priority first), tie-breaking by ID ASC
	sort.SliceStable(allPositions, func(i, j int) bool {
		if allPositions[i].RankOrder != allPositions[j].RankOrder {
			return allPositions[i].RankOrder < allPositions[j].RankOrder
		}

		return allPositions[i].ID < allPositions[j].ID
	})

	h.utils.RespondSuccessData(w, http.StatusOK, "Positions retrieved successfully", PartyPositionsResponse{
		Default:   res.Default,
		Custom:    res.Custom,
		Positions: allPositions,
	})
}

// CreatePartyCustomPositionRequest represents payload to create a custom position
type CreatePartyCustomPositionRequest struct {
	Name          string   `json:"name"`
	Description   string   `json:"description"`
	AllowedLevels []string `json:"allowed_levels"`
	RankOrder     int16    `json:"rank_order"`
	MaxOccupants  int16    `json:"max_occupants"`
}

// Valid party chapter levels constants
var validPartyChapterLevels = map[string]struct{}{
	"national": {},
	"zonal":    {},
	"state":    {},
	"lga":      {},
	"ward":     {},
}

// sanitizePartyAllowedLevels validates and normalizes chapter administrative levels.
func sanitizePartyAllowedLevels(levels []string) ([]string, error) {
	if len(levels) == 0 {
		return []string{"national", "zonal", "state", "lga", "ward"}, nil
	}

	seen := make(map[string]bool)
	var cleaned []string
	for _, lvl := range levels {
		normalized := strings.ToLower(strings.TrimSpace(lvl))
		if normalized == "" {
			continue
		}
		if _, ok := validPartyChapterLevels[normalized]; !ok {
			return nil, fmt.Errorf("invalid chapter level: '%s'. Allowed levels are: national, zonal, state, lga, ward", lvl)
		}
		if !seen[normalized] {
			seen[normalized] = true
			cleaned = append(cleaned, normalized)
		}
	}
	if len(cleaned) == 0 {
		return nil, fmt.Errorf("at least one valid chapter level must be provided")
	}
	return cleaned, nil
}

// CreatePartyCustomPosition creates a new custom position for the party
func (h *Handler) CreatePartyCustomPosition(w http.ResponseWriter, r *http.Request) {
	// Parse and validate party ID from URL parameters
	idStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(idStr, 10, 16)
	if err != nil || partyID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	// Decode request payload
	var req CreatePartyCustomPositionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	// Validate required position name
	name := strings.TrimSpace(req.Name)
	if name == "" {
		h.utils.RespondError(w, http.StatusBadRequest, "Position name is required")
		return
	}

	// Trim description; leave null/invalid if empty
	desc := strings.TrimSpace(req.Description)
	var descParam pgtype.Text
	if desc != "" {
		descParam = pgtype.Text{String: desc, Valid: true}
	}

	// Validate allowed levels against supported chapter levels
	allowedLevels, err := sanitizePartyAllowedLevels(req.AllowedLevels)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Apply sensible defaults for rank and occupancy
	if req.RankOrder <= 0 {
		req.RankOrder = 100
	}
	if req.MaxOccupants <= 0 {
		req.MaxOccupants = 1
	}

	// Persist the custom position in the database
	pos, err := h.partiesService.CreatePartyCustomPosition(r.Context(), queries.CreatePartyCustomPositionParams{
		PartyID:       pgtype.Int2{Int16: int16(partyID), Valid: true},
		Name:          name,
		Description:   descParam,
		AllowedLevels: allowedLevels,
		RankOrder:     req.RankOrder,
		MaxOccupants:  req.MaxOccupants,
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Failed to create position: "+err.Error())
		return
	}

	// Return successful creation response
	h.utils.RespondSuccess(w, http.StatusCreated, "Custom position created successfully", map[string]interface{}{
		"position": pos,
	})
}

// UpdatePartyCustomPosition updates a custom position
func (h *Handler) UpdatePartyCustomPosition(w http.ResponseWriter, r *http.Request) {
	// Parse and validate party ID from URL parameters
	idStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(idStr, 10, 16)
	if err != nil || partyID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	// Parse and validate position ID from URL parameters
	posIDStr := chi.URLParam(r, "position_id")
	posID, err := strconv.ParseInt(posIDStr, 10, 32)
	if err != nil || posID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid position ID")
		return
	}

	// Decode request payload
	var req CreatePartyCustomPositionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	// Validate required position name
	name := strings.TrimSpace(req.Name)
	if name == "" {
		h.utils.RespondError(w, http.StatusBadRequest, "Position name is required")
		return
	}

	// Trim description; leave null/invalid if empty
	desc := strings.TrimSpace(req.Description)
	var descParam pgtype.Text
	if desc != "" {
		descParam = pgtype.Text{String: desc, Valid: true}
	}

	// Validate allowed levels against supported chapter levels
	allowedLevels, err := sanitizePartyAllowedLevels(req.AllowedLevels)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Apply sensible defaults for rank and occupancy
	if req.RankOrder <= 0 {
		req.RankOrder = 100
	}
	if req.MaxOccupants <= 0 {
		req.MaxOccupants = 1
	}

	// Persist updated custom position in database and cache
	pos, err := h.partiesService.UpdatePartyCustomPosition(r.Context(), queries.UpdatePartyCustomPositionParams{
		ID:            int32(posID),
		PartyID:       pgtype.Int2{Int16: int16(partyID), Valid: true},
		Name:          name,
		Description:   descParam,
		AllowedLevels: allowedLevels,
		RankOrder:     req.RankOrder,
		MaxOccupants:  req.MaxOccupants,
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update position: "+err.Error())
		return
	}

	// Return successful update response
	h.utils.RespondSuccess(w, http.StatusOK, "Custom position updated successfully", map[string]interface{}{
		"position": pos,
	})
}

// DeletePartyCustomPosition deletes a custom position
func (h *Handler) DeletePartyCustomPosition(w http.ResponseWriter, r *http.Request) {
	// Parse and validate party ID from URL parameters
	idStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(idStr, 10, 16)
	if err != nil || partyID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	// Parse and validate position ID from URL parameters
	posIDStr := chi.URLParam(r, "position_id")
	posID, err := strconv.ParseInt(posIDStr, 10, 32)
	if err != nil || posID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid position ID")
		return
	}

	// Delete the custom position via service layer
	if err := h.partiesService.DeletePartyCustomPosition(r.Context(), int32(posID), int16(partyID)); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to delete position: "+err.Error())
		return
	}

	// Return successful deletion response
	h.utils.RespondSuccess(w, http.StatusOK, "Custom position deleted successfully", nil)
}

// ListPartyOfficials lists officials for a specific chapter
func (h *Handler) ListPartyOfficials(w http.ResponseWriter, r *http.Request) {
	// 1. Extract and validate party ID from URL parameters
	idStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(idStr, 10, 16)
	if err != nil || partyID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	// 2. Parse query parameters
	q := r.URL.Query()

	var directChapterID int64
	if chapStr := q.Get("chapter_id"); chapStr != "" {
		directChapterID, _ = strconv.ParseInt(chapStr, 10, 32)
	}

	var wardID int64
	if widStr := q.Get("ward_id"); widStr != "" {
		wardID, _ = strconv.ParseInt(widStr, 10, 32)
	}
	var lgaID int64
	if lidStr := q.Get("lga_id"); lidStr != "" {
		lgaID, _ = strconv.ParseInt(lidStr, 10, 32)
	}
	var stateID int64
	if sidStr := q.Get("state_id"); sidStr != "" {
		stateID, _ = strconv.ParseInt(sidStr, 10, 16)
	}
	var zonalID int64
	if zidStr := q.Get("zonal_id"); zidStr != "" {
		zonalID, _ = strconv.ParseInt(zidStr, 10, 16)
	}
	var countryID int64
	if cidStr := q.Get("country_id"); cidStr != "" {
		countryID, _ = strconv.ParseInt(cidStr, 10, 16)
	}

	// 3. Resolve chapter ID in order of specificity without creating missing chapters
	var chapterID int32
	ctx := r.Context()

	switch {
	case directChapterID > 0:
		chapterID = int32(directChapterID)
	case wardID > 0:
		chapterID, err = h.partiesService.GetOrCreateWardChapter(ctx, int16(partyID), int32(wardID), false)
	case lgaID > 0:
		chapterID, err = h.partiesService.GetOrCreateLGAChapter(ctx, int16(partyID), int32(lgaID), false)
	case stateID > 0:
		chapterID, err = h.partiesService.GetOrCreateStateChapter(ctx, int16(partyID), int16(stateID), false)
	case zonalID > 0:
		chapterID, err = h.partiesService.GetOrCreateZonalChapter(ctx, int16(partyID), int16(zonalID), false)
	default:
		cID := constants.NigeriaCountryID
		if countryID > 0 {
			cID = int16(countryID)
		}
		chapterID, err = h.partiesService.GetOrCreateNationalChapter(ctx, int16(partyID), cID, false)
	}

	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to resolve party chapter: "+err.Error())
		return
	}

	// If chapter does not exist yet or no jurisdiction selected, return empty list immediately
	if chapterID <= 0 {
		h.utils.RespondSuccessData(w, http.StatusOK, "Party chapter has not been established yet", PartyChapterOfficialsResponse{
			ChapterID: 0,
			Officials: []queries.ListPartyOfficialsRow{},
		})
		return
	}

	// 4. Query officials directly by chapter_id using idx_pos_assign_chapter
	officials, err := h.partiesService.ListPartyOfficials(ctx, int16(partyID), chapterID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to list officials: "+err.Error())
		return
	}

	// 5. Return successful response containing matching officials
	h.utils.RespondSuccess(w, http.StatusOK, "Party officials retrieved successfully", map[string]interface{}{
		"chapter_id": chapterID,
		"officials":  officials,
	})
}

// ListPartyAdmins lists the administrators for a given party.
// Enforces authorization: only super_admin, admin, party_admin, super_party_admin,
// or users holding an active leadership position in the party are permitted.
// ListPartyMembers retrieves active members for a given party chapter.
func (h *Handler) ListPartyMembers(w http.ResponseWriter, r *http.Request) {
	// 1. Extract and validate party ID from URL parameters
	idStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(idStr, 10, 16)
	if err != nil || partyID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	// 2. Parse query parameters
	q := r.URL.Query()

	var directChapterID int64
	if chapStr := q.Get("chapter_id"); chapStr != "" {
		directChapterID, _ = strconv.ParseInt(chapStr, 10, 32)
	}

	var wardID int64
	if widStr := q.Get("ward_id"); widStr != "" {
		wardID, _ = strconv.ParseInt(widStr, 10, 32)
	}
	var lgaID int64
	if lidStr := q.Get("lga_id"); lidStr != "" {
		lgaID, _ = strconv.ParseInt(lidStr, 10, 32)
	}
	var stateID int64
	if sidStr := q.Get("state_id"); sidStr != "" {
		stateID, _ = strconv.ParseInt(sidStr, 10, 16)
	}
	var zonalID int64
	if zidStr := q.Get("zonal_id"); zidStr != "" {
		zonalID, _ = strconv.ParseInt(zidStr, 10, 16)
	}
	var countryID int64
	if cidStr := q.Get("country_id"); cidStr != "" {
		countryID, _ = strconv.ParseInt(cidStr, 10, 16)
	}

	// 3. Resolve chapter ID in order of specificity without creating missing chapters
	var chapterID int32
	ctx := r.Context()

	switch {
	case directChapterID > 0:
		chapterID = int32(directChapterID)
	case wardID > 0:
		chapterID, err = h.partiesService.GetOrCreateWardChapter(ctx, int16(partyID), int32(wardID), false)
	case lgaID > 0:
		chapterID, err = h.partiesService.GetOrCreateLGAChapter(ctx, int16(partyID), int32(lgaID), false)
	case stateID > 0:
		chapterID, err = h.partiesService.GetOrCreateStateChapter(ctx, int16(partyID), int16(stateID), false)
	case zonalID > 0:
		chapterID, err = h.partiesService.GetOrCreateZonalChapter(ctx, int16(partyID), int16(zonalID), false)
	default:
		cID := constants.NigeriaCountryID
		if countryID > 0 {
			cID = int16(countryID)
		}
		chapterID, err = h.partiesService.GetOrCreateNationalChapter(ctx, int16(partyID), cID, false)
	}

	if err != nil || chapterID <= 0 {
		h.utils.RespondSuccessData(w, http.StatusOK, "No members found for non-existent chapter", partiesservice.PartyMembersResult{
			PartyID:    int16(partyID),
			ChapterID:  chapterID,
			TotalCount: 0,
			Members:    []partiesservice.PartyMemberItem{},
			Meta: partiesservice.PartyMembersMeta{
				NextCursor: nil,
				HasMore:    false,
			},
		})
		return
	}

	search := strings.TrimSpace(q.Get("search"))
	if search == "" {
		search = strings.TrimSpace(q.Get("q"))
	}

	var cursor int64
	if curStr := q.Get("cursor"); curStr != "" {
		cursor, _ = strconv.ParseInt(curStr, 10, 64)
	}

	limit := 30
	if limStr := q.Get("limit"); limStr != "" {
		if l, err := strconv.Atoi(limStr); err == nil && l > 0 {
			limit = l
		}
	}

	result, err := h.partiesService.ListPartyChapterMembers(ctx, partiesservice.ListPartyMembersParams{
		PartyID:   int16(partyID),
		ChapterID: chapterID,
		Search:    search,
		Cursor:    cursor,
		Limit:     int32(limit),
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to list party chapter members: "+err.Error())
		return
	}

	h.utils.RespondSuccessData(w, http.StatusOK, "Party chapter members retrieved successfully", result)
}

func (h *Handler) ListPartyAdmins(w http.ResponseWriter, r *http.Request) {
	// Parse and validate the party ID from the URL path
	idStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(idStr, 10, 16)
	if err != nil || partyID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	// Extract authenticated caller claims from request context
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// 1. Fast path: Check if caller is a platform admin (super_admin, admin) or an admin for this specific party
	hasAccess, _, _ := h.permissionsService.CheckPartyModificationPermission(claims, int16(partyID))

	// 2. Official path: If not an admin, verify caller belongs to this party and holds at least one active official position
	// (ListMemberPositionAssignments leverages Redis caching to keep this check lightweight)
	if !hasAccess && claims.PartyID == int16(partyID) {
		positions, err := h.partiesService.ListMemberPositionAssignments(r.Context(), int16(partyID), claims.UserID)
		if err == nil {
			for _, pos := range positions {
				if pos.AssignmentStatus == "active" {
					hasAccess = true
					break
				}
			}
		}
	}

	// no access
	if !hasAccess {
		h.utils.RespondError(w, http.StatusForbidden, "Forbidden: only platform admins, party admins, and appointed officials can view party administrators")
		return
	}

	// 3. Fetch and return list of party administrators
	admins, err := h.partiesService.ListPartyAdmins(r.Context(), int16(partyID))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to list party admins: "+err.Error())
		return
	}

	// 4. Return response with JSON array (even if empty), not "null"
	h.utils.RespondSuccess(w, http.StatusOK, "Party admins retrieved successfully", map[string]interface{}{
		"admins": admins,
	})
}

// AssignPartyOfficialRequest payload to assign a member to a position in a chapter
type AssignPartyOfficialRequest struct {
	UserID          int64  `json:"user_id"`
	PositionID      int32  `json:"position_id"`
	AppointmentType string `json:"appointment_type"` // substantive, acting, caretaker, interim
	ChapterType     string `json:"chapter_type"`     // national, zonal, state, lga, ward
	TierID          int64  `json:"tier_id"`
}

// AssignPartyOfficial assigns a member to a position within a chapter
func (h *Handler) AssignPartyOfficial(w http.ResponseWriter, r *http.Request) {
	// Extract and validate party ID from URL parameter
	idStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(idStr, 10, 16)
	if err != nil || partyID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	// Capture administrator performing the appointment from JWT claims
	claims := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	appointedBy := pgtype.Int8{Int64: claims.UserID, Valid: true}

	// Verify caller has permissions to modify this party
	allowed, _, err := h.permissionsService.CheckPartyModificationPermission(claims, int16(partyID))
	if !allowed {
		h.utils.RespondError(w, http.StatusForbidden, err.Error())
		return
	}

	// Decode appointment request payload
	var req AssignPartyOfficialRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	// Ensure target member user_id and position_id are provided
	if req.UserID <= 0 || req.PositionID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "user_id and position_id are required")
		return
	}

	// Verify target user is an active member of this party
	ctx := r.Context()
	isMember, err := h.partiesService.IsPartyMember(ctx, req.UserID, int16(partyID))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to verify membership: "+err.Error())
		return
	}
	if !isMember {
		h.utils.RespondError(w, http.StatusBadRequest, "User is not an active member of this party")
		return
	}

	// Resolve chapter dynamically using chapter_type and tier_id
	// tier_id could be the national_id, the zonal_id, the state_id, the lga_id, or the ward_id
	var chapID int32
	chapterType := strings.ToLower(strings.TrimSpace(req.ChapterType))

	if chapterType != "national" && req.TierID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "tier_id is required")
		return
	}

	switch chapterType {
	case "national":
		countryID := constants.NigeriaCountryID
		// we allow only Nigeria for now
		// if req.TierID > 0 { countryID = int16(req.TierID) }
		chapID, err = h.partiesService.GetOrCreateNationalChapter(ctx, int16(partyID), countryID, true)
	case "zonal":
		chapID, err = h.partiesService.GetOrCreateZonalChapter(ctx, int16(partyID), int16(req.TierID), true)
	case "state":
		chapID, err = h.partiesService.GetOrCreateStateChapter(ctx, int16(partyID), int16(req.TierID), true)
	case "lga":
		chapID, err = h.partiesService.GetOrCreateLGAChapter(ctx, int16(partyID), int32(req.TierID), true)
	case "ward":
		chapID, err = h.partiesService.GetOrCreateWardChapter(ctx, int16(partyID), int32(req.TierID), true)
	default:
		h.utils.RespondError(w, http.StatusBadRequest, "Valid chapter_type with tier_id is required")
		return
	}

	// Verify chapter resolution was successful
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to resolve chapter: "+err.Error())
		return
	}
	if chapID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid chapter ID")
		return
	}

	// Normalize and validate appointment type (defaults to 'substantive')
	appointmentType := strings.ToLower(strings.TrimSpace(req.AppointmentType))
	switch appointmentType {
	case "substantive", "acting", "caretaker", "interim":
		// valid
	default:
		appointmentType = "substantive"
	}

	// Initialize tenure period: starts today with a standard 4-year term
	now := time.Now()
	tenureStart := pgtype.Date{Time: now, Valid: true}
	tenureEnd := pgtype.Date{Time: now.AddDate(4, 0, 0), Valid: true}

	// Assign the position to the member in the party
	assignment, err := h.partiesService.AssignPartyPosition(r.Context(), partiesservice.AssignPartyPositionInput{
		AssignPartyPositionParams: queries.AssignPartyPositionParams{
			PartyID:         int16(partyID),
			ChapterID:       int32(chapID),
			PositionID:      req.PositionID,
			UserID:          req.UserID,
			AppointmentType: appointmentType,
			Status:          "active",
			TenureStart:     tenureStart,
			TenureEnd:       tenureEnd,
			AppointedBy:     appointedBy,
		},
		ChapterType: chapterType,
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Failed to assign position: "+err.Error())
		return
	}

	// Fetch updated officials roster for this chapter so the client can update its cache directly
	officials, _ := h.partiesService.ListPartyOfficials(r.Context(), int16(partyID), chapID)

	// Respond to client with the assignment details and updated officials roster
	h.utils.RespondSuccessData(w, http.StatusCreated, "Position assigned successfully", PartyAssignmentWithOfficialsResponse{
		Assignment: assignment,
		ChapterID:  chapID,
		Officials:  officials,
	})
}

// VacatePositionAssignment vacates an active official assignment
func (h *Handler) VacatePositionAssignment(w http.ResponseWriter, r *http.Request) {
	// Parse and validate party ID from URL parameter
	idStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(idStr, 10, 16)
	if err != nil || partyID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	// Verify user authentication claims
	claims, _ := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)

	// Verify caller has permissions to modify this party
	allowed, _, err := h.permissionsService.CheckPartyModificationPermission(claims, int16(partyID))
	if !allowed {
		h.utils.RespondError(w, http.StatusForbidden, err.Error())
		return
	}

	// Parse and validate assignment ID from URL parameter
	assignIDStr := chi.URLParam(r, "assignment_id")
	assignID, err := strconv.ParseInt(assignIDStr, 10, 64)
	if err != nil || assignID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid assignment ID")
		return
	}

	// Vacate position assignment and invalidate member and chapter official caches
	assignment, err := h.partiesService.VacatePositionAssignment(r.Context(), assignID, int16(partyID))
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Failed to vacate position: "+err.Error())
		return
	}

	// Fetch updated officials roster for this chapter so the client can update its cache directly
	officials, _ := h.partiesService.ListPartyOfficials(r.Context(), int16(partyID), assignment.ChapterID)

	// Return updated assignment details and officials roster to the client
	h.utils.RespondSuccessData(w, http.StatusOK, "Position assignment vacated successfully", PartyAssignmentWithOfficialsResponse{
		Assignment: assignment,
		ChapterID:  assignment.ChapterID,
		Officials:  officials,
	})
}

// ListMemberPositions returns all positions held by a specific member in the party
func (h *Handler) ListMemberPositions(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(idStr, 10, 16)
	if err != nil || partyID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID")
		return
	}

	userIDStr := chi.URLParam(r, "user_id")
	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil || userID <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	positions, err := h.partiesService.ListMemberPositionAssignments(r.Context(), int16(partyID), userID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to list member positions: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Member positions retrieved successfully", map[string]interface{}{
		"positions": positions,
	})
}

// --END-- Party Positions & Officials Handlers

// SuspendPartyMemberRequest payload for suspending a party member
type SuspendPartyMemberRequest struct {
	Reason *string `json:"reason"`
}

// SuspendPartyMember handles POST /api/v1/parties/{id}/members/{user_id}/suspend
func (h *Handler) SuspendPartyMember(w http.ResponseWriter, r *http.Request) {
	// 1. Extract and validate party ID URL parameter
	idStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(idStr, 10, 16)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID: "+err.Error())
		return
	}

	// 2. Extract and validate target user ID URL parameter
	userIDStr := chi.URLParam(r, "user_id")
	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid user ID: "+err.Error())
		return
	}

	// 3. Verify user authentication claims
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// 4. Verify caller's administrative permission to suspend target member
	allowed, _, err := h.permissionsService.CheckPartyMemberSuspensionPermission(claims, int16(partyID), userID)
	if !allowed {
		h.utils.RespondError(w, http.StatusForbidden, err.Error())
		return
	}

	// 5. Decode optional request payload (e.g. reason)
	var req SuspendPartyMemberRequest
	if r.Body != nil && r.ContentLength > 0 {
		_ = json.NewDecoder(r.Body).Decode(&req)
	}

	// 6. Execute member suspension via service
	suspension, err := h.partiesService.SuspendPartyMember(r.Context(), partiesservice.SuspendPartyMemberInput{
		PartyID:     int16(partyID),
		UserID:      userID,
		SuspendedBy: &claims.UserID,
		Reason:      req.Reason,
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// 7. Return success response with suspension record
	h.utils.RespondSuccess(w, http.StatusOK, "Member suspended successfully", map[string]interface{}{
		"suspension": suspension,
	})
}

// UnsuspendPartyMemberRequest payload for lifting suspension
type UnsuspendPartyMemberRequest struct {
	Reason *string `json:"reason"`
}

// UnsuspendPartyMember handles POST /api/v1/parties/{id}/members/{user_id}/unsuspend
func (h *Handler) UnsuspendPartyMember(w http.ResponseWriter, r *http.Request) {
	// 1. Extract and validate party ID URL parameter
	idStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(idStr, 10, 16)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID: "+err.Error())
		return
	}

	// 2. Extract and validate target user ID URL parameter
	userIDStr := chi.URLParam(r, "user_id")
	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid user ID: "+err.Error())
		return
	}

	// 3. Verify user authentication claims
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// 4. Verify caller's administrative permission to unsuspend target member
	allowed, _, err := h.permissionsService.CheckPartyMemberSuspensionPermission(claims, int16(partyID), userID)
	if !allowed {
		h.utils.RespondError(w, http.StatusForbidden, err.Error())
		return
	}

	// 5. Decode optional request payload (e.g. reason)
	var req UnsuspendPartyMemberRequest
	if r.Body != nil && r.ContentLength > 0 {
		_ = json.NewDecoder(r.Body).Decode(&req)
	}

	// 6. Execute member un-suspension via service
	suspension, err := h.partiesService.UnsuspendPartyMember(r.Context(), partiesservice.UnsuspendPartyMemberInput{
		PartyID:    int16(partyID),
		UserID:     userID,
		LiftedBy:   &claims.UserID,
		LiftReason: req.Reason,
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// 7. Return success response with suspension record
	h.utils.RespondSuccess(w, http.StatusOK, "Member suspension lifted successfully", map[string]interface{}{
		"suspension": suspension,
	})
}

// BlockPartyUserRequest defines the JSON payload for blocking a user from a party.
type BlockPartyUserRequest struct {
	Reason *string `json:"reason"`
}

// BlockPartyUser handles POST /api/v1/parties/{id}/members/{user_id}/block
func (h *Handler) BlockPartyUser(w http.ResponseWriter, r *http.Request) {
	// 1. Extract and validate party ID URL parameter
	idStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(idStr, 10, 16)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID: "+err.Error())
		return
	}

	// 2. Extract and validate target user ID URL parameter
	userIDStr := chi.URLParam(r, "user_id")
	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid user ID: "+err.Error())
		return
	}

	// 3. Verify user authentication claims
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// 4. Verify caller's administrative permission to block target member
	allowed, _, err := h.permissionsService.CheckPartyMemberSuspensionPermission(claims, int16(partyID), userID)
	if !allowed {
		h.utils.RespondError(w, http.StatusForbidden, err.Error())
		return
	}

	// 5. Decode optional request payload (e.g. reason)
	var req BlockPartyUserRequest
	if r.Body != nil && r.ContentLength > 0 {
		_ = json.NewDecoder(r.Body).Decode(&req)
	}

	// 6. Execute member block via service
	block, err := h.partiesService.BlockUserFromThisParty(r.Context(), partiesservice.BlockPartyUserInput{
		PartyID:       int16(partyID),
		BlockedUserID: userID,
		BlockedBy:     &claims.UserID,
		Reason:        req.Reason,
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// 7. Return success response with block record
	h.utils.RespondSuccess(w, http.StatusOK, "User blocked from party successfully", map[string]interface{}{
		"block": block,
	})
}

// UnblockPartyUser handles POST /api/v1/parties/{id}/members/{user_id}/unblock
func (h *Handler) UnblockPartyUser(w http.ResponseWriter, r *http.Request) {
	// 1. Extract and validate party ID URL parameter
	idStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(idStr, 10, 16)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID: "+err.Error())
		return
	}

	// 2. Extract and validate target user ID URL parameter
	userIDStr := chi.URLParam(r, "user_id")
	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid user ID: "+err.Error())
		return
	}

	// 3. Verify user authentication claims
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// 4. Verify caller's administrative permission to unblock target member
	allowed, _, err := h.permissionsService.CheckPartyMemberSuspensionPermission(claims, int16(partyID), userID)
	if !allowed {
		h.utils.RespondError(w, http.StatusForbidden, err.Error())
		return
	}

	// 5. Decode optional request payload (e.g. reason)
	var req struct {
		Reason *string `json:"reason"`
	}
	if r.Body != nil && r.ContentLength > 0 {
		_ = json.NewDecoder(r.Body).Decode(&req)
	}

	// 6. Execute member unblock via service
	err = h.partiesService.UnblockPartyUser(r.Context(), partiesservice.UnblockPartyUserInput{
		PartyID:     int16(partyID),
		UserID:      userID,
		UnblockedBy: &claims.UserID,
		Reason:      req.Reason,
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// 7. Return success response
	h.utils.RespondSuccess(w, http.StatusOK, "User unblocked from party successfully", nil)
}

// ListBlockedPartyMembers handles GET /api/v1/parties/{id}/members/blocked
func (h *Handler) ListBlockedPartyMembers(w http.ResponseWriter, r *http.Request) {
	// Extract and validate the party ID from the URL path parameter
	idStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(idStr, 10, 16)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID: "+err.Error())
		return
	}

	// Parse pagination parameters (limit and cursor) from query params
	limit, cursor := parsePaginationParams(r)

	// Fetch blocked party members using pagination
	blockedUsers, err := h.partiesService.ListBlockedPartyMembers(r.Context(), int16(partyID), int32(limit), cursor)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to list blocked users: "+err.Error())
		return
	}

	// Determine pagination metadata and cursor for the next page
	hasMore := false
	nextCursor := ""
	if len(blockedUsers) == limit && len(blockedUsers) > 0 {
		hasMore = true
		lastUser := blockedUsers[len(blockedUsers)-1]
		nextCursor = fmt.Sprintf("%d", lastUser.ID)
	}

	// Return successful response with the list of blocked users and pagination metadata
	h.utils.RespondSuccess(w, http.StatusOK, "Blocked users retrieved successfully", map[string]interface{}{
		"blocked_users": blockedUsers,
		"meta": map[string]interface{}{
			"limit":       limit,
			"has_more":    hasMore,
			"next_cursor": nextCursor,
		},
	})
}

// ListSuspendedPartyMembers handles GET /api/v1/parties/{id}/members/suspended
func (h *Handler) ListSuspendedPartyMembers(w http.ResponseWriter, r *http.Request) {
	// Extract and validate the party ID from the URL path parameter
	idStr := chi.URLParam(r, "id")
	partyID, err := strconv.ParseInt(idStr, 10, 16)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid party ID: "+err.Error())
		return
	}

	// Parse pagination parameters (limit and cursor) from query params
	limit, cursor := parsePaginationParams(r)

	// Fetch suspended party members using pagination
	suspendedUsers, err := h.partiesService.ListSuspendedPartyMembers(r.Context(), int16(partyID), int32(limit), cursor)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to list suspended users: "+err.Error())
		return
	}

	// Determine pagination metadata and cursor for the next page
	hasMore := false
	nextCursor := ""
	if len(suspendedUsers) == limit && len(suspendedUsers) > 0 {
		hasMore = true
		lastUser := suspendedUsers[len(suspendedUsers)-1]
		nextCursor = fmt.Sprintf("%d", lastUser.ID)
	}

	// Return successful response with the list of suspended users and pagination metadata
	h.utils.RespondSuccess(w, http.StatusOK, "Suspended users retrieved successfully", map[string]interface{}{
		"suspended_users": suspendedUsers,
		"meta": map[string]interface{}{
			"limit":       limit,
			"has_more":    hasMore,
			"next_cursor": nextCursor,
		},
	})
}
