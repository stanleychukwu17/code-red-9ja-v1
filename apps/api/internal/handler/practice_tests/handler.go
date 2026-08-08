package practicetestshandler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	earningsservice "free9ja/api/internal/service/earnings"
	partyapplications "free9ja/api/internal/service/party_applications"
	"free9ja/api/internal/utils"
	"log/slog"
)

type PartyApplicationsService interface {
	ApproveApplication(ctx context.Context, input partyapplications.ApproveApplicationInput) (queries.PartyApplication, error)
}

type Handler struct {
	q         *queries.Queries
	u         *utils.Utils
	earnings  *earningsservice.Service
	partyApps PartyApplicationsService
}

func NewHandler(q *queries.Queries, u *utils.Utils, earningsSvc *earningsservice.Service, partyApps PartyApplicationsService) *Handler {
	return &Handler{q: q, u: u, earnings: earningsSvc, partyApps: partyApps}
}

// ─── response mapper ──────────────────────────────────────────────────────────

type PracticeTestResponse struct {
	ID              int64              `json:"id"`
	UserID          int64              `json:"user_id"`
	ElectionGroupID pgtype.Int8        `json:"election_group_id"`
	Role            string             `json:"role"`
	TestAttempts    json.RawMessage    `json:"test_attempts"`
	OverallScore    pgtype.Numeric     `json:"overall_score"`
	Status          string             `json:"status"`
	CreatedAt       pgtype.Timestamptz `json:"created_at"`
	UpdatedAt       pgtype.Timestamptz `json:"updated_at"`
}

type PracticeTestWithUserResponse struct {
	PracticeTestResponse
	FirstName *string `json:"first_name,omitempty"`
	LastName  *string `json:"last_name,omitempty"`
	Username  *string `json:"username,omitempty"`
}

func mapPracticeTest(t queries.UserPracticeTest) PracticeTestResponse {
	attempts := json.RawMessage(t.TestAttempts)
	if len(attempts) == 0 {
		attempts = json.RawMessage("[]")
	}
	return PracticeTestResponse{
		ID:              t.ID,
		UserID:          t.UserID,
		ElectionGroupID: t.ElectionGroupID,
		Role:            t.Role,
		TestAttempts:    attempts,
		OverallScore:    t.OverallScore,
		Status:          t.Status,
		CreatedAt:       t.CreatedAt,
		UpdatedAt:       t.UpdatedAt,
	}
}

func mapPracticeTestRow(t queries.ListUserPracticeTestsRow) PracticeTestWithUserResponse {
	attempts := json.RawMessage(t.TestAttempts)
	if len(attempts) == 0 {
		attempts = json.RawMessage("[]")
	}
	resp := PracticeTestWithUserResponse{
		PracticeTestResponse: PracticeTestResponse{
			ID:              t.ID,
			UserID:          t.UserID,
			ElectionGroupID: t.ElectionGroupID,
			Role:            t.Role,
			TestAttempts:    attempts,
			OverallScore:    t.OverallScore,
			Status:          t.Status,
			CreatedAt:       t.CreatedAt,
			UpdatedAt:       t.UpdatedAt,
		},
	}
	if t.FirstName.Valid {
		resp.FirstName = &t.FirstName.String
	}
	if t.LastName.Valid {
		resp.LastName = &t.LastName.String
	}
	if t.Username.Valid {
		resp.Username = &t.Username.String
	}
	return resp
}

func getCallerID(r *http.Request) (int64, bool) {
	claims, ok := r.Context().Value(apimiddleware.ClaimsKey).(*utils.JWTClaims)
	if !ok || claims == nil {
		return 0, false
	}
	return claims.UserID, true
}

type TaskStat struct {
	TaskID         int     `json:"task_id"`
	Score          float64 `json:"score"`
	FailedAttempts int     `json:"failed_attempts"`
	Completed      bool    `json:"completed"`
}

type SubmitPracticeTestRequest struct {
	ElectionGroupID int64      `json:"election_group_id"`
	Role            string     `json:"role"`
	FinalScore      float64    `json:"final_score"`
	TaskStats       []TaskStat `json:"task_stats"`
}

// SubmitPracticeTest godoc
// @Summary      Submit a completed practice test session
// @Description  Saves the practice test attempt and recalculates the user's overall score
// @Tags         Practice Tests
// @Accept       json
// @Produce      json
// @Param        request body SubmitPracticeTestRequest true "Submit Practice Test"
// @Success      201 {object} utils.SuccessResponse{data=PracticeTestResponse}
// @Failure      400 {object} utils.ErrorResponse
// @Failure      401 {object} utils.ErrorResponse
// @Failure      500 {object} utils.ErrorResponse
// @Security     BearerAuth
// @Router       /practice-tests [post]
func (h *Handler) SubmitPracticeTest(w http.ResponseWriter, r *http.Request) {
	userID, ok := getCallerID(r)
	if !ok {
		h.u.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req SubmitPracticeTestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.u.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	role := req.Role
	if role == "" {
		role = "pollingagent"
	}

	var electionGroupID pgtype.Int8
	if req.ElectionGroupID != 0 {
		electionGroupID = pgtype.Int8{Int64: req.ElectionGroupID, Valid: true}
	}

	attemptMap := map[string]interface{}{
		"final_score":  req.FinalScore,
		"tasks":        req.TaskStats,
		"been_paid":    false,
		"completed_at": time.Now().Format(time.RFC3339),
	}
	attemptBytes, err := json.Marshal(attemptMap)
	if err != nil {
		h.u.RespondError(w, http.StatusInternalServerError, "Failed to serialize attempt")
		return
	}

	scoreStr := fmt.Sprintf("%.2f", req.FinalScore)
	var numericScore pgtype.Numeric
	if scanErr := numericScore.Scan(scoreStr); scanErr != nil {
		h.u.RespondError(w, http.StatusBadRequest, "Invalid final_score value")
		return
	}

	test, err := h.q.SubmitPracticeTest(r.Context(), queries.SubmitPracticeTestParams{
		UserID:          userID,
		ElectionGroupID: electionGroupID,
		Role:            role,
		Attempt:         attemptBytes,
		OverallScore:    numericScore,
	})
	if err != nil {
		h.u.RespondError(w, http.StatusInternalServerError, "Failed to submit practice test")
		return
	}

	// Process earnings in background: update readiness, upsert agent_earnings,
	// credit wallet delta, and mark all been_paid:false attempts as paid.
	if test.ElectionGroupID.Valid && test.ElectionGroupID.Int64 > 0 && h.earnings != nil {
		egID := test.ElectionGroupID.Int64
		uID := userID
		testRecordID := test.ID
		earningsSvc := h.earnings
		finalScore := req.FinalScore // 0–100 scale
		go func() {
			bgCtx := context.Background()
			assignmentID, err := h.q.GetAssignmentIDByUserAndElectionGroup(bgCtx, queries.GetAssignmentIDByUserAndElectionGroupParams{
				UserID:          uID,
				ElectionGroupID: egID,
			})
			if err != nil {
				// Agent may not have an assignment yet — this is fine, just skip
				return
			}
			earningsSvc.ProcessPracticeTestEarnings(bgCtx, assignmentID, testRecordID, finalScore)
		}()
	}

	// Background task for auto-accepting party applications
	if req.ElectionGroupID != 0 {
		go func(uid int64, groupID int64) {
			ctx := context.Background()

			// 1. Check if user has a pending application for this election group
			app, err := h.q.GetPendingApplicationForAutoAccept(ctx, queries.GetPendingApplicationForAutoAcceptParams{
				UserID:          uid,
				ElectionGroupID: groupID,
			})
			if err != nil {
				// No pending application found or error (e.g. pgx.ErrNoRows)
				return
			}

			// 2. Parse the auto_accept_applications JSONB
			var autoAcceptConfig map[string]bool
			if len(app.AutoAcceptApplications) > 0 {
				if err := json.Unmarshal(app.AutoAcceptApplications, &autoAcceptConfig); err != nil {
					slog.Error("Failed to parse auto_accept_applications config", "error", err, "partyID", app.PartyID)
					return
				}
			}

			// 3. Check if auto-accept is enabled for this role
			roleKey := ""
			switch app.Role {
			case "pollingagent":
				roleKey = "pollingAgent"
			case "ward-election-supervisor":
				roleKey = "wardElectionSupervisor"
			case "lga-election-supervisor":
				roleKey = "lgaElectionSupervisor"
			case "state-election-supervisor":
				roleKey = "stateElectionSupervisor"
			}

			if roleKey != "" && autoAcceptConfig[roleKey] {
				// Auto-accept the application
				slog.Info("Auto-accepting party application", "applicationID", app.ID, "userID", uid)
				
				_, err = h.partyApps.ApproveApplication(ctx, partyapplications.ApproveApplicationInput{
					ApplicationID: app.ID,
					PollingUnitID: app.PollingUnitID.Int32,
					RoleType:      app.Role,
					StateID:       app.StateID.Int16,
					LgaID:         app.LgaID.Int32,
					WardID:        app.WardID.Int32,
					AssignedBy:    uid,
				})
				if err != nil {
					slog.Error("Failed to auto-accept party application", "error", err, "applicationID", app.ID)
				}
			}
		}(userID, req.ElectionGroupID)
	}

	h.u.RespondSuccess(w, http.StatusCreated, "Practice test submitted", map[string]interface{}{
		"practice_test": mapPracticeTest(test),
	})
}

// ─── GET /api/v1/practice-tests/payout-preview ───────────────────────────────

// GetPayoutPreview godoc
// @Summary      Get practice test payout preview
// @Description  Returns the potential payout for the next practice test the user takes, based on their role, party payment allocation, and how many tests they have already taken in the active time window.
// @Tags         Practice Tests
// @Produce      json
// @Param        election_group_id query int    true  "The election group to preview payout for"
// @Param        role              query string false "Role override (default: pollingagent)"
// @Success      200 {object} utils.SuccessResponse
// @Failure      400 {object} utils.ErrorResponse
// @Failure      401 {object} utils.ErrorResponse
// @Security     BearerAuth
// @Router       /practice-tests/payout-preview [get]
func (h *Handler) GetPayoutPreview(w http.ResponseWriter, r *http.Request) {
	userID, ok := getCallerID(r)
	if !ok {
		h.u.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	q := r.URL.Query()

	electionGroupID, _ := strconv.ParseInt(q.Get("election_group_id"), 10, 64)
	if electionGroupID == 0 {
		h.u.RespondError(w, http.StatusBadRequest, "election_group_id is required")
		return
	}

	role := q.Get("role")
	if role == "" {
		role = "pollingagent"
	}

	// Optional: election_date in RFC3339 or YYYY-MM-DD format from the frontend
	electionDateStr := q.Get("election_date")
	// Optional: party_id override (used as applicant fallback when no assignment exists)
	partyIDParam, _ := strconv.ParseInt(q.Get("party_id"), 10, 16)

	ctx := r.Context()

	// ── 1. Determine the party and role for this user ─────────────────────────
	var partyID int16
	var roleType = role

	assignmentID, aErr := h.q.GetAssignmentIDByUserAndElectionGroup(ctx, queries.GetAssignmentIDByUserAndElectionGroupParams{
		UserID:          userID,
		ElectionGroupID: electionGroupID,
	})
	if aErr == nil && assignmentID > 0 {
		asgn, aErr2 := h.q.GetAssignmentForEarnings(ctx, assignmentID)
		if aErr2 == nil {
			partyID = asgn.PartyID
			if asgn.RoleType.Valid && asgn.RoleType.String != "" {
				roleType = asgn.RoleType.String
			}
		}
	}

	// Fallback: use party_id passed from the frontend (applicants)
	if partyID == 0 && partyIDParam > 0 {
		partyID = int16(partyIDParam)
	}
	slog.Info("resolved party and role for practice test preview", "userID", userID, "electionGroupID", electionGroupID, "partyID", partyID, "roleType", roleType, "assignmentID", assignmentID)

	if partyID == 0 {
		h.u.RespondSuccess(w, http.StatusOK, "Payout preview", map[string]interface{}{
			"potential_window_payout":            0,
			"potential_test_payout":              0,
			"quota_remaining":                    0,
			"tests_taken_in_window":              0,
			"readiness_budget":                   0,
			"active_window_days_before_election": 0,
		})
		return
	}

	// ── 2. Fetch party base payment ───────────────────────────────────────────
	party, err := h.q.GetPartyByID(ctx, partyID)
	if err != nil {
		h.u.RespondError(w, http.StatusInternalServerError, "Failed to fetch party")
		return
	}

	// resolveBasePayment uses the same logic as the earnings service
	basePayment := resolveBasePaymentNaira(party.AgentPaymentAllocation, roleType)
	slog.Info("resolved base payment for practice test preview", "roleType", roleType, "basePaymentNaira", basePayment, "partyID", partyID)

	// ── 3. Fetch earnings allocation for readiness % ──────────────────────────
	allocationKey := "earnings_allocation_" + strings.ReplaceAll(roleType, " ", "_")
	allocSetting, err := h.q.GetSystemSetting(ctx, allocationKey)
	if err != nil {
		h.u.RespondError(w, http.StatusInternalServerError, "Failed to fetch earnings allocation")
		return
	}
	var alloc struct {
		Readiness float64 `json:"readiness"`
	}
	if jErr := json.Unmarshal(allocSetting.Value, &alloc); jErr != nil {
		alloc.Readiness = 20 // safe default
	}
	readinessBudget := int64(float64(basePayment) * (alloc.Readiness / 100.0))
	slog.Info("resolved readiness budget for practice test preview", "readinessPercentage", alloc.Readiness, "readinessBudgetNaira", readinessBudget)

	// ── 4. Fetch test requirements (windows + total_required) ─────────────────
	reqKey := "test_requirements_" + strings.ReplaceAll(roleType, " ", "_")
	reqSetting, err := h.q.GetSystemSetting(ctx, reqKey)
	if err != nil {
		h.u.RespondError(w, http.StatusInternalServerError, "Failed to fetch test requirements")
		return
	}
	var testReq struct {
		TotalRequired int `json:"total_required"`
		Windows       []struct {
			DaysBeforeElection int `json:"days_before_election"`
			Quota              int `json:"quota"`
		} `json:"windows"`
	}
	if jErr := json.Unmarshal(reqSetting.Value, &testReq); jErr != nil || testReq.TotalRequired == 0 {
		testReq.TotalRequired = 10
	}

	perTestValue := int64(0)
	if testReq.TotalRequired > 0 {
		perTestValue = readinessBudget / int64(testReq.TotalRequired)
	}
	slog.Info("resolved test requirements for practice test preview", "totalRequired", testReq.TotalRequired, "perTestValueNaira", perTestValue, "windowsCount", len(testReq.Windows))

	// ── 5. Determine active window from election_date query param ─────────────
	var electionDate time.Time
	hasElectionDate := false
	if electionDateStr != "" {
		for _, layout := range []string{"2006-01-02", time.RFC3339} {
			if t, parseErr := time.Parse(layout, electionDateStr); parseErr == nil {
				electionDate = t
				hasElectionDate = true
				break
			}
		}
	}

	daysUntilElection := 99999
	if hasElectionDate {
		daysUntilElection = int(time.Until(electionDate).Hours() / 24)
	}

	// Find the active window and accumulate quotas for all passed windows
	activeWindowDays := 0
	accumulatedQuota := 0
	for _, w := range testReq.Windows {
		if daysUntilElection <= w.DaysBeforeElection {
			if activeWindowDays == 0 || w.DaysBeforeElection < activeWindowDays {
				activeWindowDays = w.DaysBeforeElection // The closest window to the election that we have reached
			}
			accumulatedQuota += w.Quota // Accumulate quota for all past and current windows
		}
	}
	// fallback: if no window matched, use the first (furthest) window
	if accumulatedQuota == 0 && len(testReq.Windows) > 0 {
		activeWindowDays = testReq.Windows[0].DaysBeforeElection
		accumulatedQuota = testReq.Windows[0].Quota
	}
	slog.Info("resolved active window for practice test preview", "daysUntilElection", daysUntilElection, "activeWindowDays", activeWindowDays, "accumulatedQuota", accumulatedQuota, "hasElectionDate", hasElectionDate)

	// ── 6. Count tests already taken in the active window ────────────────────
	testsTakenInWindow := 0
	existingRecord, ptErr := h.q.GetPracticeTest(ctx, queries.GetPracticeTestParams{
		UserID:          userID,
		ElectionGroupID: pgtype.Int8{Int64: electionGroupID, Valid: true},
		Role:            roleType,
	})
	if ptErr == nil && len(existingRecord.TestAttempts) > 0 {
		var attempts []struct {
			CompletedAt string `json:"completed_at"`
		}
		if jErr := json.Unmarshal(existingRecord.TestAttempts, &attempts); jErr == nil {
			var windowEnd time.Time
			if hasElectionDate {
				windowEnd = electionDate
			}
			for _, a := range attempts {
				if a.CompletedAt == "" {
					continue
				}
				t, tErr := time.Parse(time.RFC3339, a.CompletedAt)
				if tErr != nil {
					continue
				}
				// Count all tests up to the election date (if known)
				if hasElectionDate {
					if t.Before(windowEnd) {
						testsTakenInWindow++
					}
				} else {
					testsTakenInWindow++
				}
			}
		}
	}
	slog.Info("resolved tests taken for practice test preview", "testsTakenInWindow", testsTakenInWindow, "hasExistingRecord", ptErr == nil)

	// ── 7. Compute remaining quota and final payout ───────────────────────────
	quotaRemaining := accumulatedQuota - testsTakenInWindow
	if quotaRemaining < 0 {
		quotaRemaining = 0
	}

	potentialWindowPayout := perTestValue * int64(quotaRemaining)
	slog.Info("resolved final payout for practice test preview", "quotaRemaining", quotaRemaining, "potentialWindowPayoutNaira", potentialWindowPayout)

	h.u.RespondSuccess(w, http.StatusOK, "Payout preview", map[string]interface{}{
		"potential_window_payout":            potentialWindowPayout,
		"potential_test_payout":              perTestValue,
		"quota_remaining":                    quotaRemaining,
		"tests_taken_in_window":              testsTakenInWindow,
		"readiness_budget":                   readinessBudget,
		"active_window_days_before_election": activeWindowDays,
	})
}

// resolveBasePaymentNaira extracts the default naira amount from agent_payment_allocation JSONB.
// Format: {"pollingAgent": {"default": 20000, "states": {...}}}
func resolveBasePaymentNaira(rawJSON []byte, roleType string) int64 {
	var alloc map[string]struct {
		Default int64            `json:"default"`
		States  map[string]int64 `json:"states"`
	}
	if err := json.Unmarshal(rawJSON, &alloc); err != nil {
		return 0
	}
	camel := roleToCamelCase(roleType)
	cfg, ok := alloc[camel]
	if !ok {
		return 0
	}
	return cfg.Default
}

// roleToCamelCase converts "polling_agent" → "pollingAgent"
func roleToCamelCase(role string) string {
	parts := strings.Split(role, "_")
	for i := 1; i < len(parts); i++ {
		if len(parts[i]) > 0 {
			parts[i] = strings.ToUpper(parts[i][:1]) + parts[i][1:]
		}
	}
	return strings.Join(parts, "")
}

// ─── GET /api/v1/practice-tests ──────────────────────────────────────────────

// ListPracticeTests godoc
// @Summary      List practice tests
// @Description  Returns the authenticated user's practice tests. Pass user_id to filter by a specific user (admin use).
// @Tags         Practice Tests
// @Produce      json
// @Param        user_id           query int    false "Filter by user ID (defaults to self)"
// @Param        election_group_id query int    false "Filter by election group"
// @Param        status            query string false "Filter by status (in_progress|completed)"
// @Param        limit             query int    false "Page size (default 50)"
// @Param        cursor            query int    false "Cursor for pagination"
// @Success      200 {object} utils.SuccessResponse
// @Security     BearerAuth
// @Router       /practice-tests [get]
func (h *Handler) ListPracticeTests(w http.ResponseWriter, r *http.Request) {
	callerID, ok := getCallerID(r)
	if !ok {
		h.u.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	q := r.URL.Query()

	// Default: only see own records; callers with user_id param can filter by another user
	userID := callerID
	if v := q.Get("user_id"); v != "" {
		if parsed, err := strconv.ParseInt(v, 10, 64); err == nil && parsed > 0 {
			userID = parsed
		}
	}

	var electionGroupID int64
	if v := q.Get("election_group_id"); v != "" {
		if parsed, err := strconv.ParseInt(v, 10, 64); err == nil {
			electionGroupID = parsed
		}
	}

	status := q.Get("status")
	limit := int32(50)
	if v := q.Get("limit"); v != "" {
		if parsed, err := strconv.ParseInt(v, 10, 32); err == nil && parsed > 0 {
			limit = int32(parsed)
		}
	}
	var cursor int64
	if v := q.Get("cursor"); v != "" {
		if parsed, err := strconv.ParseInt(v, 10, 64); err == nil {
			cursor = parsed
		}
	}

	rows, err := h.q.ListUserPracticeTests(r.Context(), queries.ListUserPracticeTestsParams{
		UserID:          userID,
		ElectionGroupID: electionGroupID,
		Status:          status,
		Cursor:          cursor,
		LimitVal:        limit,
	})
	if err != nil {
		h.u.RespondError(w, http.StatusInternalServerError, "Failed to list practice tests")
		return
	}

	results := make([]PracticeTestWithUserResponse, 0, len(rows))
	for _, row := range rows {
		results = append(results, mapPracticeTestRow(row))
	}

	h.u.RespondSuccess(w, http.StatusOK, "Practice tests retrieved", map[string]interface{}{
		"practice_tests": results,
	})
}
