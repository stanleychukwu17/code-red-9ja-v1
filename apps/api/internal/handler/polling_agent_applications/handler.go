package paapplicationshandler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	paservice "free9ja/api/internal/service/polling_agent_applications"
	"free9ja/api/internal/utils"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
)

type PollingAgentApplicationsService interface {
	SubmitApplication(ctx context.Context, input paservice.SubmitApplicationInput) ([]queries.PollingAgentApplication, error)
	GetApplicationByID(ctx context.Context, id int64) (queries.PollingAgentApplication, error)
	ListApplications(ctx context.Context, userID, partyID, electionGroupID int64, status string, limit int32, cursor int64) ([]queries.ListApplicationsRow, error)
	RejectApplication(ctx context.Context, id int64, reason string) (queries.PollingAgentApplication, error)
	CancelApplication(ctx context.Context, id int64) (queries.PollingAgentApplication, error)
	ApproveApplication(ctx context.Context, input paservice.ApproveApplicationInput) (queries.PollingAgentApplication, error)
	GetPollingUnitRecommendations(ctx context.Context, partyID, electionGroupID int64, lgaID, wardID, pollingUnitID int32) ([]queries.GetPollingUnitsWithAgentCountsRow, error)
}

type UsersService interface {
	GetUserByID(ctx context.Context, id int64) (queries.User, error)
	GetUserByFakeID(ctx context.Context, fakeID int64) (queries.User, error)
}

type Handler struct {
	service      PollingAgentApplicationsService
	usersService UsersService
	utils        *utils.Utils
}

func NewHandler(service PollingAgentApplicationsService, usersService UsersService, utils *utils.Utils) *Handler {
	return &Handler{
		service:      service,
		usersService: usersService,
		utils:        utils,
	}
}

type SubmitApplicationRequest struct {
	PartyID           int64   `json:"party_id"`
	ElectionGroupID   int64   `json:"election_group_id"`
	ElectionGroupIDs  []int64 `json:"election_group_ids"`
	PollingUnitID     int32   `json:"polling_unit_id"`
	Avatar            string  `json:"avatar"`
	Vin               string  `json:"vin"`
	VotersCardImage   string  `json:"voters_card_image"`
	CurrentCountry    int16   `json:"current_country"`
	CurrentState      int16   `json:"current_state"`
	CurrentLga        int32   `json:"current_lga"`
	CurrentWard       int32   `json:"current_ward"`
	CurrentCity       int32   `json:"current_city"`
	BankAccountNumber string  `json:"bank_account_number"`
	BankCode          string  `json:"bank_code"`
	WhatsappPhone     string  `json:"whatsapp_phone"`
	DataPhone         string  `json:"data_phone"`
	EducationalStatus string  `json:"educational_status"`
	HighestDegree     string  `json:"highest_degree"`
	GraduationYear    string  `json:"graduation_year"`
	SchoolName        string  `json:"school_name"`
	Phone             string  `json:"phone"`
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
// @Router       /polling-agent-applications [post]
func (h *Handler) SubmitApplication(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	requester, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
	if err != nil {
		fmt.Printf("SubmitApplication: GetUserByFakeID failed for fake_id: %v, error: %v\n", claims.FakeID, err)
		h.utils.RespondError(w, http.StatusUnauthorized, "User not found")
		return
	}

	var req SubmitApplicationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	electionGroupIDs := req.ElectionGroupIDs
	if len(electionGroupIDs) == 0 && req.ElectionGroupID > 0 {
		electionGroupIDs = []int64{req.ElectionGroupID}
	}

	if req.PartyID <= 0 || len(electionGroupIDs) == 0 || req.PollingUnitID <= 0 || req.CurrentCountry <= 0 || req.CurrentState <= 0 || req.CurrentLga <= 0 || req.BankAccountNumber == "" || req.BankCode == "" {
		h.utils.RespondError(w, http.StatusBadRequest, "party_id, election_group_ids (or election_group_id), polling_unit_id, current_country, current_state, current_lga, bank_account_number, and bank_code are required")
		return
	}

	apps, err := h.service.SubmitApplication(r.Context(), paservice.SubmitApplicationInput{
		UserID:            requester.ID,
		PartyID:           req.PartyID,
		ElectionGroupIDs:  electionGroupIDs,
		PollingUnitID:     req.PollingUnitID,
		Avatar:            req.Avatar,
		Vin:               req.Vin,
		VotersCardImage:   req.VotersCardImage,
		CurrentCountry:    req.CurrentCountry,
		CurrentState:      req.CurrentState,
		CurrentLga:        req.CurrentLga,
		CurrentWard:       req.CurrentWard,
		CurrentCity:       req.CurrentCity,
		BankAccountNumber: req.BankAccountNumber,
		BankCode:          req.BankCode,
		WhatsappPhone:     req.WhatsappPhone,
		DataPhone:         req.DataPhone,
		EducationalStatus: req.EducationalStatus,
		HighestDegree:     req.HighestDegree,
		GraduationYear:    req.GraduationYear,
		SchoolName:        req.SchoolName,
		Phone:             req.Phone,
	})
	if err != nil {
		errStr := err.Error()
		if strings.Contains(errStr, "uq_active_user_app_per_group") || strings.Contains(errStr, "uq_user_application_per_group") {
			h.utils.RespondError(w, http.StatusConflict, "You already have an active application for this election group")
			return
		}
		if strings.Contains(errStr, "users_vin_key") {
			h.utils.RespondError(w, http.StatusConflict, "This Voter ID (VIN) is already registered by another user")
			return
		}
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to submit application: "+errStr)
		return
	}

	respData := map[string]interface{}{
		"applications": apps,
	}
	if len(apps) > 0 {
		respData["application"] = apps[0]
	}

	h.utils.RespondSuccess(w, http.StatusCreated, "Polling agent application submitted successfully", respData)
}

// ListApplications godoc
// @Summary      List polling agent applications
// @Description  Fetches a list of polling agent applications. Scoped: Party admins can only view applications for their own party.
// @Tags         PollingAgentApplications
// @Accept       json
// @Produce      json
// @Param        party_id          query int    false "Filter by Party ID"
// @Param        election_group_id query int    false "Filter by Election Group ID"
// @Param        status            query string false "Filter by Status (pending, accepted, rejected)"
// @Param        limit             query int    false "Pagination Limit (default 20)"
// @Param        offset            query int    false "Pagination Offset (default 0)"
// @Success      200  {object} map[string]interface{} "Applications fetched successfully"
// @Failure      403  {object} map[string]interface{} "Permission denied"
// @Failure      500  {object} map[string]interface{} "Internal server error"
// @Security     BearerAuth
// @Router       /polling-agent-applications [get]
func (h *Handler) ListApplications(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	requester, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "User not found")
		return
	}

	var partyID, electionGroupID int64
	status := r.URL.Query().Get("status")

	if val := r.URL.Query().Get("party_id"); val != "" {
		partyID, _ = strconv.ParseInt(val, 10, 64)
	}
	if val := r.URL.Query().Get("election_group_id"); val != "" {
		electionGroupID, _ = strconv.ParseInt(val, 10, 64)
	}

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

	// Enforce visibility scoping
	isPlatformAdmin := requester.Role.Valid && requester.Role.String == "admin"
	var filterUserID int64
	if !isPlatformAdmin {
		isPartyAdmin := requester.Role.Valid && requester.Role.String == "partymember" && requester.RoleLevel.Valid && requester.RoleLevel.String == "admin"
		if !isPartyAdmin {
			// A regular user can only view their own applications
			filterUserID = requester.ID
		} else {
			if !requester.PartyID.Valid {
				h.utils.RespondError(w, http.StatusForbidden, "Admin user is not associated with a party")
				return
			}
			// Force the query to filter by the admin's party ID only
			partyID = requester.PartyID.Int64
		}
	}

	apps, err := h.service.ListApplications(r.Context(), filterUserID, partyID, electionGroupID, status, limit, cursor)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to list applications: "+err.Error())
		return
	}

	var nextCursor int64
	hasMore := false
	if int32(len(apps)) == limit {
		hasMore = true
		nextCursor = apps[len(apps)-1].ID
	}

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
// @Router       /polling-agent-applications/recommendations [get]
func (h *Handler) GetPollingUnitRecommendations(w http.ResponseWriter, r *http.Request) {
	partyID, _ := strconv.ParseInt(r.URL.Query().Get("party_id"), 10, 64)
	electionGroupID, _ := strconv.ParseInt(r.URL.Query().Get("election_group_id"), 10, 64)
	lgaID, _ := strconv.ParseInt(r.URL.Query().Get("lga_id"), 10, 32)
	wardID, _ := strconv.ParseInt(r.URL.Query().Get("ward_id"), 10, 32)
	pollingUnitID, _ := strconv.ParseInt(r.URL.Query().Get("polling_unit_id"), 10, 32)

	if partyID == 0 || electionGroupID == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "party_id and election_group_id are required")
		return
	}

	units, err := h.service.GetPollingUnitRecommendations(r.Context(), partyID, electionGroupID, int32(lgaID), int32(wardID), int32(pollingUnitID))
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
// @Router       /polling-agent-applications/{id} [get]
func (h *Handler) GetApplication(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	requester, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "User not found")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid application ID")
		return
	}

	app, err := h.service.GetApplicationByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Application not found")
		return
	}

	// Enforce visibility restriction
	isPlatformAdmin := requester.Role.Valid && requester.Role.String == "admin"
	if !isPlatformAdmin {
		isPartyAdmin := requester.Role.Valid && requester.Role.String == "partymember" && requester.RoleLevel.Valid && requester.RoleLevel.String == "admin"
		if !isPartyAdmin || !requester.PartyID.Valid || app.PartyID != requester.PartyID.Int64 {
			h.utils.RespondError(w, http.StatusForbidden, "Permission denied")
			return
		}
	}

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
// @Router       /polling-agent-applications/{id}/approve [post]
func (h *Handler) ApproveApplication(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	requester, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "User not found")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid application ID")
		return
	}

	var req ApproveApplicationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	app, err := h.service.GetApplicationByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Application not found")
		return
	}

	// Enforce role levels
	isPlatformAdmin := requester.Role.Valid && requester.Role.String == "admin"
	if !isPlatformAdmin {
		isPartyAdmin := requester.Role.Valid && requester.Role.String == "partymember" && requester.RoleLevel.Valid && requester.RoleLevel.String == "admin"
		if !isPartyAdmin {
			h.utils.RespondError(w, http.StatusForbidden, "Only administrators can approve applications")
			return
		}
		if !requester.PartyID.Valid || app.PartyID != requester.PartyID.Int64 {
			h.utils.RespondError(w, http.StatusForbidden, "Cannot approve applications of a different party")
			return
		}
	}

	roleType := req.RoleType
	if roleType == "" {
		roleType = "polling_agent"
	}

	updatedApp, err := h.service.ApproveApplication(r.Context(), paservice.ApproveApplicationInput{
		ApplicationID: id,
		PollingUnitID: req.PollingUnitID,
		RoleType:      roleType,
		StateID:       req.StateID,
		LgaID:         req.LgaID,
		WardID:        req.WardID,
		AssignedBy:    requester.ID,
	})
	if err != nil {
		errStr := err.Error()
		if strings.Contains(errStr, "already processed") {
			h.utils.RespondError(w, http.StatusConflict, "Application has already been processed")
			return
		}
		if strings.Contains(errStr, "uq_agent_per_election_day") {
			h.utils.RespondError(w, http.StatusConflict, "Applicant is already assigned to a polling unit for this election group")
			return
		}
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to approve application: "+errStr)
		return
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
// @Router       /polling-agent-applications/{id}/reject [post]
func (h *Handler) RejectApplication(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	requester, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "User not found")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid application ID")
		return
	}

	var req RejectApplicationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Reason == "" {
		h.utils.RespondError(w, http.StatusBadRequest, "reason is required")
		return
	}

	app, err := h.service.GetApplicationByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Application not found")
		return
	}

	// Enforce role levels
	isPlatformAdmin := requester.Role.Valid && requester.Role.String == "admin"
	if !isPlatformAdmin {
		isPartyAdmin := requester.Role.Valid && requester.Role.String == "partymember" && requester.RoleLevel.Valid && requester.RoleLevel.String == "admin"
		if !isPartyAdmin {
			h.utils.RespondError(w, http.StatusForbidden, "Only administrators can reject applications")
			return
		}
		if !requester.PartyID.Valid || app.PartyID != requester.PartyID.Int64 {
			h.utils.RespondError(w, http.StatusForbidden, "Cannot reject applications of a different party")
			return
		}
	}

	updatedApp, err := h.service.RejectApplication(r.Context(), id, req.Reason)
	if err != nil {
		if errors.Is(err, errors.New("application is already processed")) || strings.Contains(err.Error(), "already processed") {
			h.utils.RespondError(w, http.StatusConflict, "Application has already been processed")
			return
		}
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to reject application: "+err.Error())
		return
	}

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
// @Router       /polling-agent-applications/{id}/cancel [post]
func (h *Handler) CancelApplication(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	requester, err := h.usersService.GetUserByFakeID(r.Context(), claims.FakeID)
	if err != nil {
		h.utils.RespondError(w, http.StatusUnauthorized, "User not found")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid application ID")
		return
	}

	app, err := h.service.GetApplicationByID(r.Context(), id)
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "Application not found")
		return
	}

	// Enforce visibility restriction: Only the applicant can cancel their own application
	if app.UserID != requester.ID {
		h.utils.RespondError(w, http.StatusForbidden, "Only the applicant can cancel this application")
		return
	}

	updatedApp, err := h.service.CancelApplication(r.Context(), id)
	if err != nil {
		if errors.Is(err, errors.New("application is already processed")) || strings.Contains(err.Error(), "already processed") {
			h.utils.RespondError(w, http.StatusConflict, "Application has already been processed")
			return
		}
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to cancel application: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Polling agent application cancelled successfully", map[string]interface{}{
		"application": updatedApp,
	})
}
