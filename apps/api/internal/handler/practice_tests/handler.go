package practicetestshandler

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"
	"free9ja/api/internal/utils"
)

type Handler struct {
	q *queries.Queries
	u *utils.Utils
}

func NewHandler(q *queries.Queries, u *utils.Utils) *Handler {
	return &Handler{q: q, u: u}
}

// ─── response mapper ──────────────────────────────────────────────────────────

type PracticeTestResponse struct {
	ID              int64              `json:"id"`
	UserID          int64              `json:"user_id"`
	ElectionGroupID pgtype.Int8        `json:"election_group_id"`
	Role            string             `json:"role"`
	Sequence        int16              `json:"sequence"`
	TaskStats       json.RawMessage    `json:"task_stats"`
	FinalScore      pgtype.Numeric     `json:"final_score"`
	Status          string             `json:"status"`
	StartedAt       pgtype.Timestamptz `json:"started_at"`
	CompletedAt     pgtype.Timestamptz `json:"completed_at"`
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
	stats := json.RawMessage(t.TaskStats)
	if len(stats) == 0 {
		stats = json.RawMessage("[]")
	}
	return PracticeTestResponse{
		ID:              t.ID,
		UserID:          t.UserID,
		ElectionGroupID: t.ElectionGroupID,
		Role:            t.Role,
		Sequence:        t.Sequence,
		TaskStats:       stats,
		FinalScore:      t.FinalScore,
		Status:          t.Status,
		StartedAt:       t.StartedAt,
		CompletedAt:     t.CompletedAt,
		CreatedAt:       t.CreatedAt,
		UpdatedAt:       t.UpdatedAt,
	}
}

func mapPracticeTestRow(t queries.ListUserPracticeTestsRow) PracticeTestWithUserResponse {
	stats := json.RawMessage(t.TaskStats)
	if len(stats) == 0 {
		stats = json.RawMessage("[]")
	}
	resp := PracticeTestWithUserResponse{
		PracticeTestResponse: PracticeTestResponse{
			ID:              t.ID,
			UserID:          t.UserID,
			ElectionGroupID: t.ElectionGroupID,
			Role:            t.Role,
			Sequence:        t.Sequence,
			TaskStats:       stats,
			FinalScore:      t.FinalScore,
			Status:          t.Status,
			StartedAt:       t.StartedAt,
			CompletedAt:     t.CompletedAt,
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

// ─── POST /api/v1/practice-tests ─────────────────────────────────────────────

type StartPracticeTestRequest struct {
	ElectionGroupID int64  `json:"election_group_id"`
	Role            string `json:"role"`
}

// StartPracticeTest godoc
// @Summary      Start a practice test session
// @Description  Creates a new in-progress practice test row for the authenticated user
// @Tags         Practice Tests
// @Accept       json
// @Produce      json
// @Param        request body StartPracticeTestRequest true "Start Practice Test"
// @Success      201 {object} utils.SuccessResponse{data=PracticeTestResponse}
// @Failure      400 {object} utils.ErrorResponse
// @Failure      401 {object} utils.ErrorResponse
// @Failure      500 {object} utils.ErrorResponse
// @Security     BearerAuth
// @Router       /practice-tests [post]
func (h *Handler) StartPracticeTest(w http.ResponseWriter, r *http.Request) {
	userID, ok := getCallerID(r)
	if !ok {
		h.u.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req StartPracticeTestRequest
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

	test, err := h.q.CreatePracticeTest(r.Context(), queries.CreatePracticeTestParams{
		UserID:          userID,
		ElectionGroupID: electionGroupID,
		Role:            role,
	})
	if err != nil {
		h.u.RespondError(w, http.StatusInternalServerError, "Failed to start practice test")
		return
	}

	h.u.RespondSuccess(w, http.StatusCreated, "Practice test started", map[string]interface{}{
		"practice_test": mapPracticeTest(test),
	})
}

// ─── PATCH /api/v1/practice-tests/{id}/task ──────────────────────────────────

type AppendTaskRequest struct {
	TaskID         int     `json:"task_id"`
	Score          float64 `json:"score"`
	FailedAttempts int     `json:"failed_attempts"`
}

// AppendTask godoc
// @Summary      Append a completed task to a practice test
// @Tags         Practice Tests
// @Accept       json
// @Produce      json
// @Param        id path int true "Practice Test ID"
// @Param        request body AppendTaskRequest true "Task stats"
// @Success      200 {object} utils.SuccessResponse{data=PracticeTestResponse}
// @Failure      400 {object} utils.ErrorResponse
// @Failure      404 {object} utils.ErrorResponse
// @Failure      500 {object} utils.ErrorResponse
// @Security     BearerAuth
// @Router       /practice-tests/{id}/task [patch]
func (h *Handler) AppendTask(w http.ResponseWriter, r *http.Request) {
	userID, ok := getCallerID(r)
	if !ok {
		h.u.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		h.u.RespondError(w, http.StatusBadRequest, "Invalid practice test ID")
		return
	}

	var req AppendTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.u.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	taskStatMap := map[string]interface{}{
		"task_id":         req.TaskID,
		"score":           req.Score,
		"failed_attempts": req.FailedAttempts,
	}
	taskStatBytes, err := json.Marshal(taskStatMap)
	if err != nil {
		h.u.RespondError(w, http.StatusInternalServerError, "Failed to serialize task stat")
		return
	}

	// Wrap in an array so it can be appended: task_stats || '[{...}]'::jsonb
	wrapped := fmt.Sprintf("[%s]", string(taskStatBytes))

	test, err := h.q.AppendPracticeTestTask(r.Context(), queries.AppendPracticeTestTaskParams{
		TaskStat: []byte(wrapped),
		ID:       id,
		UserID:   userID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			h.u.RespondError(w, http.StatusNotFound, "Practice test not found")
			return
		}
		h.u.RespondError(w, http.StatusInternalServerError, "Failed to append task")
		return
	}

	h.u.RespondSuccess(w, http.StatusOK, "Task appended", map[string]interface{}{
		"practice_test": mapPracticeTest(test),
	})
}

// ─── PATCH /api/v1/practice-tests/{id}/complete ──────────────────────────────

type CompleteTestRequest struct {
	FinalScore float64 `json:"final_score"`
}

// CompleteTest godoc
// @Summary      Mark a practice test as completed
// @Tags         Practice Tests
// @Accept       json
// @Produce      json
// @Param        id path int true "Practice Test ID"
// @Param        request body CompleteTestRequest true "Final score"
// @Success      200 {object} utils.SuccessResponse{data=PracticeTestResponse}
// @Failure      400 {object} utils.ErrorResponse
// @Failure      404 {object} utils.ErrorResponse
// @Failure      500 {object} utils.ErrorResponse
// @Security     BearerAuth
// @Router       /practice-tests/{id}/complete [patch]
func (h *Handler) CompleteTest(w http.ResponseWriter, r *http.Request) {
	userID, ok := getCallerID(r)
	if !ok {
		h.u.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		h.u.RespondError(w, http.StatusBadRequest, "Invalid practice test ID")
		return
	}

	var req CompleteTestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.u.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	scoreStr := fmt.Sprintf("%.2f", req.FinalScore)
	var numericScore pgtype.Numeric
	if scanErr := numericScore.Scan(scoreStr); scanErr != nil {
		h.u.RespondError(w, http.StatusBadRequest, "Invalid final_score value")
		return
	}

	test, err := h.q.CompletePracticeTest(r.Context(), queries.CompletePracticeTestParams{
		FinalScore: numericScore,
		ID:         id,
		UserID:     userID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			h.u.RespondError(w, http.StatusNotFound, "Practice test not found")
			return
		}
		h.u.RespondError(w, http.StatusInternalServerError, "Failed to complete practice test")
		return
	}

	h.u.RespondSuccess(w, http.StatusOK, "Practice test completed", map[string]interface{}{
		"practice_test": mapPracticeTest(test),
	})
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
