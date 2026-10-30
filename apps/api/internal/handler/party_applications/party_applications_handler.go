package partyapplicationshandler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"free9ja/api/internal/constants"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	"free9ja/api/internal/service/audit"
	campaigngroupsservice "free9ja/api/internal/service/campaign_groups"
	"free9ja/api/internal/service/notifications"
	partyapplications "free9ja/api/internal/service/party_applications"
	permissionsservice "free9ja/api/internal/service/permissions"
	"free9ja/api/internal/utils"
	"free9ja/api/internal/worker"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
)

type PartyApplicationsService interface {
	SubmitApplication(ctx context.Context, input partyapplications.SubmitApplicationInput) (int64, error)
	HasActiveAgentApplication(ctx context.Context, userID int64) (bool, error)
	SubmitSupervisorApplication(ctx context.Context, input partyapplications.SubmitSupervisorApplicationInput) (queries.PartyAgentApplication, error)
	GetApplicationByID(ctx context.Context, id int64) (queries.PartyAgentApplication, error)
	ListApplications(ctx context.Context, userID int64, partyID int16, electionGroupID int32, status string, stateID int16, lgaID, wardID int32, activeElectionOnly bool, limit int32, cursor int64) ([]partyapplications.PartyApplicationListItem, error)
	RejectApplication(ctx context.Context, id int64, reason string) (queries.PartyAgentApplication, error)
	CancelApplication(ctx context.Context, id int64) (queries.PartyAgentApplication, error)
	ApproveApplication(ctx context.Context, input partyapplications.ApproveApplicationInput) (queries.PartyAgentApplication, error)
	GetPollingUnitRecommendations(ctx context.Context, partyID int16, electionGroupID int32, lgaID, wardID, pollingUnitID int32) ([]queries.GetPollingUnitsWithAgentCountsRow, error)
}

type UsersService interface {
	GetUserByFakeID(ctx context.Context, fakeID int64, opts ...queries.GetUserOptions) (queries.UserWithPlaces, error)
	GetUserRoles(ctx context.Context, userID int64) (queries.CachedUserRoles, error)
	GetUserPhoneNumbersByUserID(ctx context.Context, userID int64) ([]queries.UsersPhoneNumber, error)
}

type PartiesService interface {
	GetPartyByID(ctx context.Context, partyID int16) (queries.Party, error)
	GetOrCreateNationalChapter(ctx context.Context, partyID, countryID int16, createIfMissing ...bool) (int32, error)
}

type PermissionsService interface {
	CheckPartyModificationPermission(claims *utils.JWTClaims, partyID int16) (bool, permissionsservice.PartyModificationPermissions, error)
}

type CampaignGroupsService interface {
	EnsureAgentCampaignInGroup(ctx context.Context, input campaigngroupsservice.EnsureAgentCampaignInGroupInput) (*queries.CampaignGroup, error)
}

type Handler struct {
	service               PartyApplicationsService
	usersService          UsersService
	partiesService        PartiesService
	permissionsService    PermissionsService
	campaignGroupsService CampaignGroupsService
	distributor           worker.TaskDistributor
	notificationsService  notifications.NotificationsService
	auditService          audit.AuditService
	validate              *validator.Validate
	utils                 *utils.Utils
}

func NewHandler(service PartyApplicationsService, usersService UsersService, partiesService PartiesService, permissionsService PermissionsService, campaignGroupsService CampaignGroupsService, distributor worker.TaskDistributor, notificationsService notifications.NotificationsService, auditService audit.AuditService, utils *utils.Utils) *Handler {
	return &Handler{
		service:               service,
		usersService:          usersService,
		partiesService:        partiesService,
		permissionsService:    permissionsService,
		campaignGroupsService: campaignGroupsService,
		distributor:           distributor,
		notificationsService:  notificationsService,
		auditService:          auditService,
		validate:              validator.New(),
		utils:                 utils,
	}
}

type SubmitApplicationRequest struct {
	PartyID           int16   `json:"party_id" validate:"required,gt=0"`
	ElectionGroupID   int32   `json:"election_group_id" validate:"required,gt=0"`
	PollingUnitID     int32   `json:"polling_unit_id" validate:"required,gt=0"`
	Avatar            string  `json:"avatar"`
	AvatarFileID      *int64  `json:"avatar_file_id"`
	CurrentState      int16   `json:"current_state" validate:"required,gt=0"`
	CurrentLga        int32   `json:"current_lga" validate:"required,gt=0"`
	CurrentWard       int32   `json:"current_ward" validate:"required,gt=0"`

	EducationalStatus string  `json:"educational_status"`
	HighestDegree     string  `json:"highest_degree"`
	GraduationYear    string  `json:"graduation_year"`
	SchoolName        string  `json:"school_name"`
	Address           string  `json:"address"`
	BankAccountNumber string  `json:"bank_account_number"`
	BankCode          string  `json:"bank_code"`
}

// SubmitApplication godoc
// @Summary      Submit a polling agent application
// @Description  Allows an authenticated user to submit an application to become a polling agent for a party and election group. Updates the user's profile with agent details.
// @Tags         PollingAgentApplications
// @Accept       json
// @Produce      json
// @Param        request body SubmitApplicationRequest true "Submit Application payload"
// @Success      201  {object} map[string]interface{} "Application submitted successfully"
// @Failure      400  {object} map[string]interface{} "Invalid request payload or missing fields"
// @Failure      409  {object} map[string]interface{} "Already applied for this election group"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Security     BearerAuth
// @Router       /party-applications [post]
func (h *Handler) SubmitApplication(w http.ResponseWriter, r *http.Request) {
	// Verify authentication claims
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

	// Fail fast: verify applicant does not already have an active application for an upcoming/active election
	hasActive, err := h.service.HasActiveAgentApplication(r.Context(), claims.UserID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to verify application status")
		return
	}
	if hasActive {
		h.utils.RespondError(w, http.StatusConflict, "You already have an active application for an upcoming election. You cannot apply for another election group until your current assignment concludes")
		return
	}

	// Parse and validate JSON request payload
	var req SubmitApplicationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate required fields
	if err := h.validate.Struct(req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	// In production, applicants must provide an uploaded avatar photo
	if strings.EqualFold(os.Getenv("ENV"), "production") && (req.AvatarFileID == nil || *req.AvatarFileID <= 0) {
		h.utils.RespondError(w, http.StatusBadRequest, "avatar_file_id is required in production")
		return
	}

	// Validate party is active, verified, and has available slots
	party, err := h.partiesService.GetPartyByID(r.Context(), req.PartyID)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "selected political party not found")
		return
	}
	if party.Status != "active" || !party.IsVerified.Bool {
		h.utils.RespondError(w, http.StatusBadRequest, "this political party is not currently verified or accepting applications")
		return
	}
	if party.Slots <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "this political party has no available slots to accept applications")
		return
	}

	// Ensure applicant has at least 1 WhatsApp-enabled phone number
	phones, err := h.usersService.GetUserPhoneNumbersByUserID(r.Context(), claims.UserID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to verify contact phone numbers")
		return
	}

	// Check if any active phone number has WhatsApp enabled
	hasWhatsApp := false
	for _, p := range phones {
		if (!p.IsActive.Valid || p.IsActive.Bool) && (p.OnWhatsapp.Valid && p.OnWhatsapp.Bool) {
			hasWhatsApp = true
			break
		}
	}
	// Reject application if no reachable WhatsApp contact exists
	if !hasWhatsApp {
		h.utils.RespondError(w, http.StatusBadRequest, "At least one WhatsApp-enabled phone number is required before submitting an application")
		return
	}

	// Delegate application submission and profile updates to service layer
	appID, err := h.service.SubmitApplication(r.Context(), partyapplications.SubmitApplicationInput{
		UserID:            claims.UserID,
		UserFakeID:        claims.FakeID,
		PartyID:           req.PartyID,
		ElectionGroupID:   req.ElectionGroupID,
		PollingUnitID:     req.PollingUnitID,
		Avatar:            req.Avatar,
		AvatarFileID:      req.AvatarFileID,
		CurrentState:      req.CurrentState,
		CurrentLga:        req.CurrentLga,
		CurrentWard:       req.CurrentWard,
		EducationalStatus: req.EducationalStatus,
		HighestDegree:     req.HighestDegree,
		GraduationYear:    req.GraduationYear,
		SchoolName:        req.SchoolName,
		Address:           req.Address,
		BankAccountNumber: req.BankAccountNumber,
		BankCode:          req.BankCode,
	})
	if err != nil {
		errStr := err.Error()
		// Check for duplicate application uniqueness constraint violation
		if strings.Contains(errStr, "uq_active_user_app_per_group") || strings.Contains(errStr, "uq_user_application_per_group") || strings.Contains(errStr, "already have an active application") {
			h.utils.RespondError(w, http.StatusConflict, "You already have an active application for this election group")
			return
		}
		if errors.Is(err, partyapplications.ErrPollingUnitNotFound) ||
			errors.Is(err, partyapplications.ErrPollingUnitMismatch) ||
			errors.Is(err, partyapplications.ErrPollingUnitUnavailable) {
			h.utils.RespondError(w, http.StatusBadRequest, err.Error())
			return
		}

		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to submit application: "+errStr)
		return
	}

	// Structure response payload
	respData := map[string]interface{}{
		"application_id": appID,
	}

	h.utils.RespondSuccess(w, http.StatusCreated, "Polling agent application submitted successfully", respData)
}

type SubmitSupervisorApplicationRequest struct {
	ElectionGroupID      int32  `json:"election_group_id"`
	Role                 string `json:"role"`
	StateID              int16  `json:"state_id"`
	LgaID                int32  `json:"lga_id"`
	WardID               int32  `json:"ward_id"`
	DegreeCertificateURL string `json:"degree_certificate_url"`
}

// SubmitSupervisorApplication godoc
// @Summary      Submit a supervisor application
// @Description  Allows an accepted polling agent to submit an application to become a ward, LGA, or state supervisor. Requires higher education degree.
// @Tags         PollingAgentApplications
// @Accept       json
// @Produce      json
// @Param        request body SubmitSupervisorApplicationRequest true "Submit Supervisor Application payload"
// @Success      201  {object} map[string]interface{} "Supervisor application submitted successfully"
// @Failure      400  {object} map[string]interface{} "Invalid request payload or eligibility failure"
// @Failure      409  {object} map[string]interface{} "Already applied for this election group"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Security     BearerAuth
// @Router       /party-applications/supervisor [post]
// func (h *Handler) SubmitSupervisorApplication(w http.ResponseWriter, r *http.Request) {
func (h *Handler) SubmitSupervisorApplication(w http.ResponseWriter, r *http.Request) {
	// Authenticate and extract claims
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

	// Fetch requester user details
	requester, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "User not found")
		return
	}

	// Decode request payload
	var req SubmitSupervisorApplicationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate required fields
	if req.ElectionGroupID <= 0 || strings.TrimSpace(req.Role) == "" {
		h.utils.RespondError(w, http.StatusBadRequest, "election_group_id and role are required")
		return
	}

	// Submit supervisor application
	app, err := h.service.SubmitSupervisorApplication(r.Context(), partyapplications.SubmitSupervisorApplicationInput{
		UserID:               requester.ID,
		ElectionGroupID:      req.ElectionGroupID,
		Role:                 req.Role,
		StateID:              req.StateID,
		LgaID:                req.LgaID,
		WardID:               req.WardID,
		DegreeCertificateURL: req.DegreeCertificateURL,
	})
	if err != nil {
		errStr := err.Error()
		if strings.Contains(errStr, "already have an active application") {
			h.utils.RespondError(w, http.StatusConflict, errStr)
			return
		}
		if strings.Contains(errStr, "required") || strings.Contains(errStr, "higher education degree") || strings.Contains(errStr, "accepted polling agent") || strings.Contains(errStr, "complete your educational details") {
			h.utils.RespondError(w, http.StatusBadRequest, errStr)
			return
		}

		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to submit supervisor application: "+errStr)
		return
	}

	// Return created application
	h.utils.RespondSuccess(w, http.StatusCreated, "Supervisor application submitted successfully", map[string]interface{}{
		"application": app,
	})
}

// ListApplications godoc
// @Summary      List polling agent applications
// @Description  Fetches a list of polling agent applications. Scoped: Party admins can only view applications for their own party; regular users can only view their own applications.
// @Tags         PollingAgentApplications
// @Accept       json
// @Produce      json
// @Param        user_id              query int    false "Filter by User ID (Platform admin or Party admin only)"
// @Param        party_id             query int    false "Filter by Party ID (Platform admin only or scoped to own party)"
// @Param        election_group_id    query int    false "Filter by Election Group ID"
// @Param        status               query string false "Filter by Status (pending, accepted, rejected)"
// @Param        active_election_only query bool   false "Filter only active and upcoming elections"
// @Param        state_id             query int    false "Filter by State ID"
// @Param        lga_id               query int    false "Filter by LGA ID"
// @Param        ward_id              query int    false "Filter by Ward ID"
// @Param        cursor               query int    false "Pagination Cursor ID"
// @Param        limit                query int    false "Pagination Limit (default 20)"
// @Success      200  {object} map[string]interface{} "Applications fetched successfully"
// @Failure      403  {object} map[string]interface{} "Permission denied"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Security     BearerAuth
// @Router       /party-applications [get]
func (h *Handler) ListApplications(w http.ResponseWriter, r *http.Request) {
	// Authenticate and extract claims
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

	// Fetch requester user details
	requester, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "User not found")
		return
	}

	// Parse query parameters
	var requestedPartyID int16
	var electionGroupID int32
	status := r.URL.Query().Get("status")

	if val := r.URL.Query().Get("party_id"); val != "" {
		if pID, _ := strconv.ParseInt(val, 10, 16); pID > 0 {
			requestedPartyID = int16(pID)
		}
	}
	if val := r.URL.Query().Get("election_group_id"); val != "" {
		if egID, _ := strconv.ParseInt(val, 10, 32); egID > 0 {
			electionGroupID = int32(egID)
		}
	}

	// Parse optional user filter
	var requestedUserID int64
	if val := r.URL.Query().Get("user_id"); val != "" {
		if uID, _ := strconv.ParseInt(val, 10, 64); uID > 0 {
			requestedUserID = uID
		}
	}

	// Parse pagination parameters
	limit := int32(20)
	if val := r.URL.Query().Get("limit"); val != "" {
		if l, err := strconv.Atoi(val); err == nil && l > 0 {
			limit = int32(l)
		}
	}
	var cursor int64
	if val := r.URL.Query().Get("cursor"); val != "" {
		if c, err := strconv.ParseInt(val, 10, 64); err == nil && c > 0 {
			cursor = c
		}
	}

	// Enforce visibility scoping & explicit RBAC checks
	rolesData, _ := h.usersService.GetUserRoles(r.Context(), requester.ID)
	isPlatformAdmin := false
	isPartyAdmin := false
	for _, rCode := range rolesData.RolesCode {
		if rCode == "admin" || rCode == "super_admin" {
			isPlatformAdmin = true
		}
		if rCode == "party_admin" || rCode == "super_party_admin" {
			isPartyAdmin = true
		}
	}

	var partyID int16
	var filterUserID int64

	if isPlatformAdmin {
		// Platform admin can query across all parties or filter by any party / user
		partyID = requestedPartyID
		filterUserID = requestedUserID
	} else if isPartyAdmin {
		if !requester.PartyID.Valid {
			h.utils.RespondError(w, http.StatusForbidden, "Admin user is not associated with a party")
			return
		}
		adminPartyID := requester.PartyID.Int16
		if requestedPartyID > 0 && requestedPartyID != adminPartyID {
			h.utils.RespondError(w, http.StatusForbidden, "You do not have permission to view applications for another party")
			return
		}
		partyID = adminPartyID
		filterUserID = requestedUserID
	} else {
		// Regular citizen/agent
		if requestedPartyID > 0 {
			partyID = requestedPartyID
		}
		if requestedUserID > 0 && requestedUserID != requester.ID {
			h.utils.RespondError(w, http.StatusForbidden, "You do not have permission to view applications for other users")
			return
		}
		filterUserID = requester.ID
	}

	// Parse optional geographic filters
	var stateID int16
	var lgaID, wardID int32

	if val := r.URL.Query().Get("state_id"); val != "" {
		if v, _ := strconv.ParseInt(val, 10, 16); v > 0 {
			stateID = int16(v)
		}
	}
	if val := r.URL.Query().Get("lga_id"); val != "" {
		if v, _ := strconv.ParseInt(val, 10, 32); v > 0 {
			lgaID = int32(v)
		}
	}
	if val := r.URL.Query().Get("ward_id"); val != "" {
		if v, _ := strconv.ParseInt(val, 10, 32); v > 0 {
			wardID = int32(v)
		}
	}

	// Filter for active election groups only
	activeElectionOnly := r.URL.Query().Get("active_election_only") == "true"

	// Fetch filtered applications list
	apps, err := h.service.ListApplications(r.Context(), filterUserID, partyID, electionGroupID, status, stateID, lgaID, wardID, activeElectionOnly, limit, cursor)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to list applications: "+err.Error())
		return
	}

	// Compute keyset pagination cursor
	var nextCursor int64
	hasMore := false
	if int32(len(apps)) == limit {
		hasMore = true
		nextCursor = apps[len(apps)-1].ID
	}

	// Return paginated applications
	h.utils.RespondSuccess(w, http.StatusOK, "Applications retrieved successfully", map[string]interface{}{
		"applications": apps,
		"meta": map[string]interface{}{
			"next_cursor": nextCursor,
			"has_more":    hasMore,
		},
	})
}

// GetPollingUnitRecommendations godoc
// @Summary      Get polling unit recommendations for an application
// @Description  Returns the applicant's submitted polling unit plus the 2 lowest-agent-count polling units in the same LGA for the party/election group.
// @Tags         PollingAgentApplications
// @Produce      json
// @Param        party_id          query int true "Party ID"
// @Param        election_group_id query int true "Election Group ID"
// @Param        lga_id            query int true "LGA ID of the applicant"
// @Param        polling_unit_id   query int true "The polling unit the applicant originally applied for"
// @Success      200  {object} map[string]interface{}
// @Security     BearerAuth
// @Router       /party-applications/recommendations [get]
func (h *Handler) GetPollingUnitRecommendations(w http.ResponseWriter, r *http.Request) {
	partyID, _ := strconv.ParseInt(r.URL.Query().Get("party_id"), 10, 16)
	electionGroupID, _ := strconv.ParseInt(r.URL.Query().Get("election_group_id"), 10, 32)
	lgaID, _ := strconv.ParseInt(r.URL.Query().Get("lga_id"), 10, 32)
	wardID, _ := strconv.ParseInt(r.URL.Query().Get("ward_id"), 10, 32)
	pollingUnitID, _ := strconv.ParseInt(r.URL.Query().Get("polling_unit_id"), 10, 32)

	if partyID == 0 || electionGroupID == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "party_id and election_group_id are required")
		return
	}

	units, err := h.service.GetPollingUnitRecommendations(r.Context(), int16(partyID), int32(electionGroupID), int32(lgaID), int32(wardID), int32(pollingUnitID))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch recommendations: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Recommendations fetched successfully", map[string]interface{}{
		"polling_units": units,
	})
}

// GetApplication godoc
// @Summary      Get a specific polling agent application
// @Description  Retrieves detailed info of an application by ID. Scoped: Party admins can only view if it belongs to their own party.
// @Tags         PollingAgentApplications
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Application ID"
// @Success      200  {object} map[string]interface{} "Application retrieved successfully"
// @Failure      403  {object} map[string]interface{} "Permission denied"
// @Failure      404  {object} map[string]interface{} "Application not found"
// @Security     BearerAuth
// @Router       /party-applications/{id} [get]
func (h *Handler) GetApplication(w http.ResponseWriter, r *http.Request) {
	// Authenticate and extract claims
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

	// Parse application ID
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid application ID")
		return
	}

	// Fetch application details
	app, err := h.service.GetApplicationByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Application not found")
		return
	}

	// Restrict access to applicant or authorized party administrators
	if app.UserID != claims.UserID {
		if allowed, _, err := h.permissionsService.CheckPartyModificationPermission(claims, app.PartyID); !allowed || err != nil {
			h.utils.RespondError(w, http.StatusForbidden, "Permission denied")
			return
		}
	}

	// Return application details
	h.utils.RespondSuccess(w, http.StatusOK, "Application retrieved successfully", map[string]interface{}{
		"application": app,
	})
}

type ApproveApplicationRequest struct {
	PollingUnitID int32  `json:"polling_unit_id"`
	RoleType      string `json:"role_type"`
	StateID       int16  `json:"state_id"`
	LgaID         int32  `json:"lga_id"`
	WardID        int32  `json:"ward_id"`
}

// ApproveApplication godoc
// @Summary      Approve a polling agent application
// @Description  Accepts the application, assigns the applicant to the specified polling unit, and elevates the user's role to polling agent. Scoped: Party admins can only approve for their own party.
// @Tags         PollingAgentApplications
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Application ID"
// @Param        request body ApproveApplicationRequest true "Approval payload"
// @Success      200  {object} map[string]interface{} "Application approved successfully"
// @Failure      400  {object} map[string]interface{} "Invalid request payload or missing fields"
// @Failure      403  {object} map[string]interface{} "Permission denied"
// @Failure      409  {object} map[string]interface{} "Constraint conflict (already assigned/processed)"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Security     BearerAuth
// @Router       /party-applications/{id}/approve [post]
func (h *Handler) ApproveApplication(w http.ResponseWriter, r *http.Request) {
	// Authenticate and extract claims
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

	// Parse application ID
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid application ID")
		return
	}

	// Decode approval payload
	var req ApproveApplicationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Fetch application details
	app, err := h.service.GetApplicationByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Application not found")
		return
	}

	// Verify caller has party modification permissions
	if allowed, _, err := h.permissionsService.CheckPartyModificationPermission(claims, app.PartyID); !allowed || err != nil {
		h.utils.RespondError(w, http.StatusForbidden, "Cannot approve applications of a different party")
		return
	}

	// Exit early if application is not pending
	if app.Status != "pending" {
		h.utils.RespondError(w, http.StatusConflict, fmt.Sprintf("Application has already been %s", app.Status))
		return
	}

	// Validate required role type
	roleType := strings.TrimSpace(req.RoleType)
	if roleType == "" {
		h.utils.RespondError(w, http.StatusBadRequest, "role_type is required")
		return
	}

	// Approve application
	updatedApp, err := h.service.ApproveApplication(r.Context(), partyapplications.ApproveApplicationInput{
		ApplicationID: id,
		PollingUnitID: req.PollingUnitID,
		RoleType:      roleType,
		StateID:       req.StateID,
		LgaID:         req.LgaID,
		WardID:        req.WardID,
		AssignedBy:    claims.UserID,
	})
	if err != nil {
		// Handle specific business rule errors
		errStr := err.Error()
		if strings.Contains(errStr, "cancelled_past_election") {
			h.utils.RespondSuccess(w, http.StatusOK, "Application cancelled: Please apply for an upcoming election (not in the past)", map[string]interface{}{
				"application": updatedApp,
			})
			return
		}
		if strings.Contains(errStr, "has already passed") {
			h.utils.RespondError(w, http.StatusBadRequest, errStr)
			return
		}
		if strings.Contains(errStr, "already processed") {
			h.utils.RespondError(w, http.StatusConflict, "Application has already been processed")
			return
		}
		if strings.Contains(errStr, "insufficient slots") {
			h.utils.RespondError(w, http.StatusPaymentRequired, errStr)
			return
		}
		if strings.Contains(errStr, "uq_agent_per_election_day") {
			h.utils.RespondError(w, http.StatusConflict, "Applicant is already assigned to a polling unit for this election group")
			return
		}
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to approve application: "+errStr)
		return
	}
	// Resolve party national chapter ID (best-effort)
	var natChapterID *int32
	if chapID, chErr := h.partiesService.GetOrCreateNationalChapter(r.Context(), app.PartyID, constants.NigeriaCountryID); chErr == nil && chapID > 0 {
		natChapterID = &chapID
	}

	puIDPtr := utils.PtrFromPgInt4(updatedApp.PollingUnitID)

	// Asynchronously send notifications to applicant and party national chapter
	h.notificationsService.NotifyAgentApplicationApproved(r.Context(), notifications.NotifyAgentApplicationApprovedParams{
		ApplicationID:     app.ID,
		RecipientUserID:   app.UserID,
		PartyID:           app.PartyID,
		NationalChapterID: natChapterID,
		ElectionGroupID:   app.ElectionGroupID,
		PollingUnitID:     puIDPtr,
		Role:              roleType,
	})

	// Asynchronously record the audit log for the action
	auditOldValues, _ := json.Marshal(map[string]interface{}{
		"status": app.Status,
	})
	auditNewValues, _ := json.Marshal(map[string]interface{}{
		"status":          updatedApp.Status,
		"role":            roleType,
		"polling_unit_id": puIDPtr,
	})
	h.auditService.LogActionAsync(r.Context(), queries.InsertAuditLogParams{
		Module:     audit.StringToText(db.ModulePartyAdmin),
		Action:     db.ActionApproveApplication,
		EntityType: db.EntityTypePartyApplication,
		EntityID:   strconv.FormatInt(id, 10),
		OldValues:  auditOldValues,
		NewValues:  auditNewValues,
	})

	// Enqueue campaign group enrollment and chapter officials sync task
	if distErr := h.distributor.DistributeTaskEnrollAgentInCampaignGroup(r.Context(), &worker.EnrollAgentInCampaignGroupPayload{
		PartyID:         app.PartyID,
		ElectionGroupID: app.ElectionGroupID,
		UserID:          app.UserID,
		Role:            roleType,
		StateID:         updatedApp.StateID,
		LgaID:           updatedApp.LgaID.Int32,
		WardID:          updatedApp.WardID.Int32,
		PollingUnitID:   updatedApp.PollingUnitID.Int32,
	}); distErr != nil {
		slog.Error("failed to enqueue enroll agent in campaign group task", "userID", app.UserID, "role", roleType, "error", distErr)
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Polling agent application approved and assigned successfully", map[string]interface{}{
		"application": updatedApp,
	})
}

type RejectApplicationRequest struct {
	Reason string `json:"reason"`
}

// RejectApplication godoc
// @Summary      Reject a polling agent application
// @Description  Rejects the application with a reason. Scoped: Party admins can only reject for their own party.
// @Tags         PollingAgentApplications
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "Application ID"
// @Param        request body RejectApplicationRequest true "Rejection payload"
// @Success      200  {object} map[string]interface{} "Application rejected successfully"
// @Failure      400  {object} map[string]interface{} "Invalid request payload or missing fields"
// @Failure      403  {object} map[string]interface{} "Permission denied"
// @Failure      409  {object} map[string]interface{} "Application already processed"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Security     BearerAuth
// @Router       /party-applications/{id}/reject [post]
func (h *Handler) RejectApplication(w http.ResponseWriter, r *http.Request) {
	// Authenticate and extract claims
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

	// Parse application ID
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid application ID")
		return
	}

	// Decode rejection payload
	var req RejectApplicationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Reason == "" {
		h.utils.RespondError(w, http.StatusBadRequest, "reason is required")
		return
	}

	// Fetch application details
	app, err := h.service.GetApplicationByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Application not found")
		return
	}

	// Verify caller has party modification permissions
	if allowed, _, err := h.permissionsService.CheckPartyModificationPermission(claims, app.PartyID); !allowed || err != nil {
		h.utils.RespondError(w, http.StatusForbidden, "Cannot reject applications of a different party")
		return
	}

	// Exit early if application is not pending
	if app.Status != "pending" {
		h.utils.RespondError(w, http.StatusConflict, fmt.Sprintf("Application has already been %s", app.Status))
		return
	}

	// Reject application
	updatedApp, err := h.service.RejectApplication(r.Context(), id, req.Reason)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Asynchronously send notification to the applicant
	h.notificationsService.NotifyAgentApplicationRejected(r.Context(), notifications.NotifyAgentApplicationRejectedParams{
		ApplicationID:   app.ID,
		RecipientUserID: app.UserID,
		PartyID:         app.PartyID,
		ElectionGroupID: app.ElectionGroupID,
		Role:            app.Role,
		Reason:          req.Reason,
	})

	// Asynchronously record the audit log for the action
	auditOldValues, _ := json.Marshal(map[string]interface{}{
		"status": app.Status,
	})
	auditNewValues, _ := json.Marshal(map[string]interface{}{
		"status": updatedApp.Status,
		"reason": req.Reason,
	})
	h.auditService.LogActionAsync(r.Context(), queries.InsertAuditLogParams{
		Module:     audit.StringToText(db.ModulePartyAdmin),
		Action:     db.ActionRejectApplication,
		EntityType: db.EntityTypePartyApplication,
		EntityID:   strconv.FormatInt(id, 10),
		OldValues:  auditOldValues,
		NewValues:  auditNewValues,
	})

	h.utils.RespondSuccess(w, http.StatusOK, "Polling agent application rejected successfully", map[string]interface{}{
		"application": updatedApp,
	})
}

// CancelApplication godoc
// @Summary      Cancel a polling agent application
// @Description  Cancels the application. Only the owner of the application can cancel it.
// @Tags         PollingAgentApplications
// @Produce      json
// @Param        id   path  int  true  "Application ID"
// @Success      200  {object} map[string]interface{} "Application cancelled successfully"
// @Failure      400  {object} map[string]interface{} "Invalid request"
// @Failure      403  {object} map[string]interface{} "Permission denied"
// @Failure      409  {object} map[string]interface{} "Application already processed"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Security     BearerAuth
// @Router       /party-applications/{id}/cancel [post]
func (h *Handler) CancelApplication(w http.ResponseWriter, r *http.Request) {
	// Authenticate and extract claims
	claims, ok := h.utils.CheckRoles(r, w, apimiddleware.ClaimsKey)
	if !ok {
		return
	}

	// Parse application ID
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid application ID")
		return
	}

	// Fetch application details
	app, err := h.service.GetApplicationByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Application not found")
		return
	}

	// Allow cancellation by application owner or authorized party administrators
	if app.UserID != claims.UserID {
		if allowed, _, err := h.permissionsService.CheckPartyModificationPermission(claims, app.PartyID); !allowed || err != nil {
			h.utils.RespondError(w, http.StatusForbidden, "Only the applicant or authorized party administrators can cancel this application")
			return
		}
	}

	// Exit early if application is not pending
	if app.Status != "pending" {
		h.utils.RespondError(w, http.StatusConflict, fmt.Sprintf("Application has already been %s", app.Status))
		return
	}

	// Cancel application
	updatedApp, err := h.service.CancelApplication(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// If cancelled by an administrator rather than the applicant, notify user and audit log
	if app.UserID != claims.UserID {
		h.notificationsService.NotifyAgentApplicationCancelled(r.Context(), notifications.NotifyAgentApplicationCancelledParams{
			ApplicationID:   app.ID,
			RecipientUserID: app.UserID,
			PartyID:         app.PartyID,
			ElectionGroupID: app.ElectionGroupID,
			Role:            app.Role,
		})

		auditOldValues, _ := json.Marshal(map[string]interface{}{
			"status": app.Status,
		})
		auditNewValues, _ := json.Marshal(map[string]interface{}{
			"status": updatedApp.Status,
		})
		h.auditService.LogActionAsync(r.Context(), queries.InsertAuditLogParams{
			Module:     audit.StringToText(db.ModulePartyAdmin),
			Action:     db.ActionCancelAgentApplication,
			EntityType: db.EntityTypePartyApplication,
			EntityID:   strconv.FormatInt(id, 10),
			OldValues:  auditOldValues,
			NewValues:  auditNewValues,
		})
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Polling agent application cancelled successfully", map[string]interface{}{
		"application": updatedApp,
	})
}
