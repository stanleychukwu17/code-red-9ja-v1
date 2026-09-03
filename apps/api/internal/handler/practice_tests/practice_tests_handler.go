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
	ID               int64       `json:"id"`
	UserID           int64       `json:"user_id"`
	ElectionGroupID  *int64      `json:"election_group_id,omitempty"`
	Role             string      `json:"role"`
	TestAttempts     interface{} `json:"test_attempts"`
	OverallScore     float64     `json:"overall_score"`
	EarnedAmountKobo int64       `json:"earned_amount_kobo"`
	CreatedAt        string      `json:"created_at"`
	UpdatedAt        string      `json:"updated_at"`
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
	var egID *int64
	if t.ElectionGroupID.Valid {
		egID = &t.ElectionGroupID.Int64
	}
	scoreFloat, _ := t.OverallScore.Float64Value()

	var createdAtStr, updatedAtStr string
	if t.CreatedAt.Valid {
		createdAtStr = t.CreatedAt.Time.Format(time.RFC3339)
	}
	if t.UpdatedAt.Valid {
		updatedAtStr = t.UpdatedAt.Time.Format(time.RFC3339)
	}

	return PracticeTestResponse{
		ID:               t.ID,
		UserID:           t.UserID,
		ElectionGroupID:  egID,
		Role:             t.Role,
		TestAttempts:     attempts,
		OverallScore:     scoreFloat.Float64,
		EarnedAmountKobo: t.EarnedAmountKobo,
		CreatedAt:        createdAtStr,
		UpdatedAt:        updatedAtStr,
	}
}

func mapPracticeTestRow(t queries.ListUserPracticeTestsRow) PracticeTestWithUserResponse {
	attempts := json.RawMessage(t.TestAttempts)
	if len(attempts) == 0 {
		attempts = json.RawMessage("[]")
	}
	var egID *int64
	if t.ElectionGroupID.Valid {
		egID = &t.ElectionGroupID.Int64
	}
	scoreFloat, _ := t.OverallScore.Float64Value()

	var createdAtStr, updatedAtStr string
	if t.CreatedAt.Valid {
		createdAtStr = t.CreatedAt.Time.Format(time.RFC3339)
	}
	if t.UpdatedAt.Valid {
		updatedAtStr = t.UpdatedAt.Time.Format(time.RFC3339)
	}

	resp := PracticeTestWithUserResponse{
		PracticeTestResponse: PracticeTestResponse{
			ID:               t.ID,
			UserID:           t.UserID,
			ElectionGroupID:  egID,
			Role:             t.Role,
			TestAttempts:     attempts,
			OverallScore:     scoreFloat.Float64,
			EarnedAmountKobo: t.EarnedAmountKobo,
			CreatedAt:        createdAtStr,
			UpdatedAt:        updatedAtStr,
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
		slog.Warn("⚠️ [SubmitPracticeTest] Invalid request payload", "error", err)
		h.u.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	role := req.Role
	if role == "" {
		role = "polling_agent"
	}

	slog.Info("📥 [SubmitPracticeTest] Request received",
		"userID", userID,
		"electionGroupID", req.ElectionGroupID,
		"role", role,
		"finalScore", req.FinalScore,
		"tasksCount", len(req.TaskStats),
	)

	var electionGroupID pgtype.Int8
	if req.ElectionGroupID != 0 {
		electionGroupID = pgtype.Int8{Int64: req.ElectionGroupID, Valid: true}
	}

	// 1. Process auto-accept for any pending party applications first so assignment exists
	h.processAutoAccept(r.Context(), userID)

	// 2. Evaluate eligibility and calculate payout
	var payoutEarnedKobo int64 = 0
	var beenPaid bool = false
	if req.ElectionGroupID != 0 && h.earnings != nil {
		payoutRes, evalErr := h.earnings.EvaluatePracticeTestPayout(r.Context(), userID, req.ElectionGroupID, role, req.FinalScore)
		if evalErr != nil {
			slog.Warn("⚠️ [SubmitPracticeTest] Error evaluating practice test payout", "error", evalErr)
		} else if payoutRes.Eligible && payoutRes.EarnedAmountKobo > 0 {
			beenPaid = true
			payoutEarnedKobo = payoutRes.EarnedAmountKobo
		}
	}

	attemptMap := map[string]interface{}{
		"final_score":        req.FinalScore,
		"tasks":              req.TaskStats,
		"been_paid":          beenPaid,
		"earned_amount_kobo": payoutEarnedKobo,
		"completed_at":       time.Now().Format(time.RFC3339),
	}
	attemptBytes, err := json.Marshal(attemptMap)
	if err != nil {
		slog.Error("❌ [SubmitPracticeTest] Failed to serialize attempt", "error", err)
		h.u.RespondError(w, http.StatusInternalServerError, "Failed to serialize attempt")
		return
	}

	scoreStr := fmt.Sprintf("%.2f", req.FinalScore)
	var numericScore pgtype.Numeric
	if scanErr := numericScore.Scan(scoreStr); scanErr != nil {
		slog.Error("❌ [SubmitPracticeTest] Invalid final_score numeric scan", "scoreStr", scoreStr, "error", scanErr)
		h.u.RespondError(w, http.StatusBadRequest, "Invalid final_score value")
		return
	}

	test, err := h.q.SubmitPracticeTest(r.Context(), queries.SubmitPracticeTestParams{
		UserID:           userID,
		ElectionGroupID:  electionGroupID,
		Role:             role,
		Attempt:          attemptBytes,
		OverallScore:     numericScore,
		EarnedAmountKobo: payoutEarnedKobo,
	})
	if err != nil {
		slog.Error("❌ [SubmitPracticeTest] Database query failed", "userID", userID, "error", err)
		h.u.RespondError(w, http.StatusInternalServerError, "Failed to submit practice test")
		return
	}

	slog.Info("✅ [SubmitPracticeTest] Practice test saved to database", "userID", userID, "testID", test.ID, "earnedKobo", payoutEarnedKobo)

	// Process wallet payout & update assignment earned_amount_kobo in background
	if payoutEarnedKobo > 0 && h.earnings != nil {
		uID := userID
		egID := req.ElectionGroupID
		rType := role
		deltaKobo := payoutEarnedKobo
		testID := test.ID
		earningsSvc := h.earnings
		go func() {
			bgCtx := context.Background()
			if err := earningsSvc.ProcessPracticeTestPayout(bgCtx, uID, egID, rType, deltaKobo, testID); err != nil {
				slog.Error("❌ [SubmitPracticeTest] Failed to process practice test payout", "error", err)
			}
		}()
	}

	h.u.RespondSuccess(w, http.StatusCreated, "Practice test submitted", map[string]interface{}{
		"practice_test": mapPracticeTest(test),
	})
}

// processAutoAccept checks and auto-approves any pending applications for the user
func (h *Handler) processAutoAccept(ctx context.Context, uid int64) {
	apps, err := h.q.GetPendingApplicationsForUserAutoAccept(ctx, uid)
	if err != nil {
		slog.Warn("⚠️ [AutoAccept] Could not fetch pending applications for user", "userID", uid, "error", err)
		return
	}

	slog.Info("🔍 [AutoAccept] Checking pending applications for user", "userID", uid, "pendingAppsCount", len(apps))

	for _, app := range apps {
		var autoAcceptConfig map[string]bool
		if len(app.AutoAcceptApplications) > 0 {
			if err := json.Unmarshal(app.AutoAcceptApplications, &autoAcceptConfig); err != nil {
				slog.Error("Failed to parse auto_accept_applications config", "error", err, "partyID", app.PartyID)
				continue
			}
		}

		role := strings.ReplaceAll(app.Role, "-", "_")
		switch role {
		case "pollingagent":
			role = "polling_agent"
		case "ward_supervisor":
			role = "ward_election_supervisor"
		case "lga_supervisor":
			role = "lga_election_supervisor"
		case "state_supervisor":
			role = "state_election_supervisor"
		}

		isAutoAcceptEnabled := autoAcceptConfig[role] || autoAcceptConfig[app.Role]
		if isAutoAcceptEnabled {
			slog.Info("🚀 [AutoAccept] Auto-accepting party application", "applicationID", app.ID, "userID", uid, "role", app.Role, "electionGroupID", app.ElectionGroupID)

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
				slog.Error("❌ [AutoAccept] Failed to auto-accept party application", "error", err, "applicationID", app.ID)
				continue
			}

			slog.Info("🎉 [AutoAccept] Party application approved successfully", "applicationID", app.ID)

			if app.PollingUnitID.Valid && app.PollingUnitID.Int32 > 0 {
				_ = h.q.RefreshSingleElectionGroupPollingUnitStats(ctx, queries.RefreshSingleElectionGroupPollingUnitStatsParams{
					ElectionGroupID: app.ElectionGroupID,
					PollingUnitID:   app.PollingUnitID.Int32,
				})
			}
		}
	}
}

// ─── GET /api/v1/practice-tests/payout-preview ───────────────────────────────

// GetPayoutPreview godoc
// @Summary      Get practice test payout preview
// @Description  Returns the potential payout for the next practice test the user takes, based on their role, party payment allocation, and how many tests they have already taken in the active time window. All monetary values (potential_window_payout_kobo, potential_test_payout_kobo, readiness_budget_kobo) are returned in kobo.
// @Tags         Practice Tests
// @Produce      json
// @Param        election_group_id query int    true  "The election group to preview payout for"
// @Param        role              query string false "Role override (default: polling_agent)"
// @Success      200 {object} utils.SuccessResponse
// @Failure      400 {object} utils.ErrorResponse
// @Failure      401 {object} utils.ErrorResponse
// @Security     BearerAuth
// @Router       /practice-tests/payout-preview [get]
func (h *Handler) GetPayoutPreview(w http.ResponseWriter, r *http.Request) {
	userID, ok := getCallerID(r)
	if !ok {
		slog.Warn("🔐 [PayoutPreview] Unauthorized request")
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
		role = "polling_agent"
	}

	electionDateStr := q.Get("election_date")
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

	if partyID == 0 {
		h.u.RespondSuccess(w, http.StatusOK, "Payout preview", map[string]interface{}{
			"potential_window_payout_kobo":       0,
			"potential_test_payout_kobo":         0,
			"quota_remaining":                    0,
			"tests_taken_in_window":              0,
			"readiness_budget_kobo":              0,
			"active_window_days_before_election": 0,
		})
		return
	}

	// ── 2. Fetch party base payment ───────────────────────────────────────────
	party, err := h.q.GetPartyByID(ctx, partyID)
	if err != nil {
		h.u.RespondError(w, http.StatusInternalServerError, "Failed to fetch party details")
		return
	}

	basePaymentKobo := resolveBasePaymentKobo(party.AgentPaymentAllocationKobo, roleType)
	if party.AgentPaymentBalanceKobo <= 0 {
		basePaymentKobo = 0
	}

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
	readinessBudgetKobo := int64(float64(basePaymentKobo) * (alloc.Readiness / 100.0))

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

	perTestValueKobo := int64(0)
	if testReq.TotalRequired > 0 {
		perTestValueKobo = readinessBudgetKobo / int64(testReq.TotalRequired)
	}

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

	// ── 7. Compute remaining quota and final payout ───────────────────────────
	quotaRemaining := accumulatedQuota - testsTakenInWindow
	if quotaRemaining < 0 {
		quotaRemaining = 0
	}

	potentialWindowPayoutKobo := perTestValueKobo * int64(quotaRemaining)

	h.u.RespondSuccess(w, http.StatusOK, "Payout preview", map[string]interface{}{
		"potential_window_payout_kobo":       potentialWindowPayoutKobo,
		"potential_test_payout_kobo":         perTestValueKobo,
		"quota_remaining":                    quotaRemaining,
		"tests_taken_in_window":              testsTakenInWindow,
		"readiness_budget_kobo":              readinessBudgetKobo,
		"active_window_days_before_election": activeWindowDays,
	})
}

// resolveBasePaymentKobo extracts the default kobo amount from agent_payment_allocation JSONB.
// Format: {"pollingAgent": {"default": 2000000, "states": {...}}}
func resolveBasePaymentKobo(rawJSON []byte, roleType string) int64 {
	var alloc map[string]struct {
		Default int64            `json:"default"`
		States  map[string]int64 `json:"states"`
	}
	if err := json.Unmarshal(rawJSON, &alloc); err != nil {
		return 0
	}

	role := strings.ReplaceAll(roleType, "-", "_")
	switch role {
	case "ward_supervisor":
		role = "ward_election_supervisor"
	case "lga_supervisor":
		role = "lga_election_supervisor"
	case "state_supervisor":
		role = "state_election_supervisor"
	}

	cfg, ok := alloc[role]
	if !ok {
		cfg, ok = alloc[roleType]
	}
	if !ok {
		return 0
	}
	return cfg.Default
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
