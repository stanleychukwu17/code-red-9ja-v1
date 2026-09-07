package adminagentpaymentshandler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"free9ja/api/internal/utils"
)

type Handler struct {
	pool  *pgxpool.Pool
	utils *utils.Utils
}

func NewHandler(pool *pgxpool.Pool, utils *utils.Utils) *Handler {
	return &Handler{
		pool:  pool,
		utils: utils,
	}
}

func (h *Handler) resolveElectionGroupID(r *http.Request) int64 {
	v := r.URL.Query().Get("election_group_id")
	if v != "" {
		if id, err := strconv.ParseInt(v, 10, 64); err == nil && id > 0 {
			return id
		}
	}
	var egID int64
	if h.pool != nil {
		_ = h.pool.QueryRow(r.Context(), "SELECT id FROM election_groups ORDER BY id DESC LIMIT 1").Scan(&egID)
	}
	return egID
}

// ─── GET /api/v1/admin/agent-payments/overview ───────────────────────────────

func (h *Handler) GetOverview(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	egID := h.resolveElectionGroupID(r)

	if h.pool == nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Database connection not available")
		return
	}

	// 1. Election Pay summary from agent_earnings
	var (
		eleUnpaidKobo   int64
		elePaidKobo     int64
		eleUnpaidCount  int64
		elePaidCount    int64
		eleIneligCount  int64
	)

	eleQuery := `
		SELECT
			COALESCE(SUM(CASE WHEN ae.status = 'paid' THEN ae.total_earned_kobo ELSE 0 END), 0) AS paid_kobo,
			COALESCE(SUM(CASE WHEN ae.status != 'paid' AND ae.attendance_score > 0 THEN ae.total_earned_kobo ELSE 0 END), 0) AS unpaid_kobo,
			COUNT(CASE WHEN ae.status = 'paid' THEN 1 END) AS paid_count,
			COUNT(CASE WHEN ae.status != 'paid' AND ae.attendance_score > 0 THEN 1 END) AS unpaid_count,
			COUNT(CASE WHEN ae.status != 'paid' AND ae.attendance_score = 0 THEN 1 END) AS inelig_count
		FROM agent_earnings ae
		WHERE ($1::bigint = 0 OR ae.election_group_id = $1)
	`
	_ = h.pool.QueryRow(ctx, eleQuery, egID).Scan(
		&elePaidKobo,
		&eleUnpaidKobo,
		&elePaidCount,
		&eleUnpaidCount,
		&eleIneligCount,
	)

	// 2. Referral Pay summary from user_referrals
	var (
		refPaidNaira   float64
		refUnpaidNaira float64
		refPaidCount   int64
		refUnpaidCount int64
	)

	refQuery := `
		SELECT
			COALESCE(SUM(CASE WHEN ur.status = 'paid' THEN ur.earned_amount ELSE 0 END), 0) AS paid_naira,
			COALESCE(SUM(CASE WHEN ur.status != 'paid' AND ur.earned_amount > 0 THEN ur.earned_amount ELSE 0 END), 0) AS unpaid_naira,
			COUNT(CASE WHEN ur.status = 'paid' THEN 1 END) AS paid_count,
			COUNT(CASE WHEN ur.status != 'paid' AND ur.earned_amount > 0 THEN 1 END) AS unpaid_count
		FROM user_referrals ur
		WHERE ($1::bigint = 0 OR ur.election_group_id = $1)
	`
	_ = h.pool.QueryRow(ctx, refQuery, egID).Scan(
		&refPaidNaira,
		&refUnpaidNaira,
		&refPaidCount,
		&refUnpaidCount,
	)

	h.utils.RespondSuccess(w, http.StatusOK, "Overview fetched", map[string]interface{}{
		"election_group_id": egID,
		"election_pay": map[string]interface{}{
			"unpaid_total_kobo": eleUnpaidKobo,
			"paid_total_kobo":   elePaidKobo,
			"unpaid_count":      eleUnpaidCount,
			"paid_count":        elePaidCount,
			"ineligible_count":  eleIneligCount,
		},
		"referral_pay": map[string]interface{}{
			"unpaid_total": refUnpaidNaira,
			"paid_total":   refPaidNaira,
			"unpaid_count": refUnpaidCount,
			"paid_count":   refPaidCount,
		},
	})
}

// ─── GET /api/v1/admin/agent-payments/election-pay ───────────────────────────

func (h *Handler) ListElectionPay(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	qParams := r.URL.Query()

	egID := h.resolveElectionGroupID(r)
	statusFilter := strings.ToLower(qParams.Get("status")) // "unpaid", "paid", "ineligible"
	if statusFilter == "" {
		statusFilter = "unpaid"
	}

	roleFilter := qParams.Get("role")
	partyID, _ := strconv.ParseInt(qParams.Get("party_id"), 10, 16)
	search := strings.TrimSpace(qParams.Get("search"))

	limit := 50
	if lStr := qParams.Get("limit"); lStr != "" {
		if l, err := strconv.Atoi(lStr); err == nil && l > 0 && l <= 200 {
			limit = l
		}
	}
	offset := 0
	if oStr := qParams.Get("offset"); oStr != "" {
		if o, err := strconv.Atoi(oStr); err == nil && o >= 0 {
			offset = o
		}
	}

	var whereClauses []string
	args := []interface{}{egID}
	argIdx := 2

	whereClauses = append(whereClauses, "($1::bigint = 0 OR ae.election_group_id = $1)")

	if statusFilter == "paid" {
		whereClauses = append(whereClauses, "ae.status = 'paid'")
	} else if statusFilter == "ineligible" {
		whereClauses = append(whereClauses, "ae.status != 'paid' AND (ae.attendance_score = 0 OR (ae.role_type = 'polling_agent' AND ae.results_score = 0 AND ae.election_start_score = 0))")
	} else {
		// unpaid & eligible
		whereClauses = append(whereClauses, "ae.status != 'paid' AND ae.attendance_score > 0")
	}

	if roleFilter != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("ae.role_type = $%d", argIdx))
		args = append(args, roleFilter)
		argIdx++
	}

	if partyID > 0 {
		whereClauses = append(whereClauses, fmt.Sprintf("ae.party_id = $%d", argIdx))
		args = append(args, partyID)
		argIdx++
	}

	if search != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("(CONCAT(u.first_name, ' ', u.last_name) ILIKE $%d OR u.phone ILIKE $%d)", argIdx, argIdx))
		args = append(args, "%"+search+"%")
		argIdx++
	}

	query := fmt.Sprintf(`
		SELECT
			ae.id,
			ae.user_id,
			CONCAT(u.first_name, ' ', u.last_name) AS user_name,
			COALESCE(u.avatar, '') AS user_avatar,
			COALESCE(p.id, 0) AS party_id,
			COALESCE(p.code, '') AS party_code,
			COALESCE(p.name, '') AS party_name,
			ae.role_type,
			ae.base_payment_kobo,
			ae.total_earned_kobo,
			ae.readiness_score,
			ae.attendance_score,
			ae.election_start_score,
			ae.election_end_score,
			ae.results_score,
			ae.updates_score,
			ae.status,
			ae.paid_at,
			ae.created_at
		FROM agent_earnings ae
		JOIN users u ON u.id = ae.user_id
		LEFT JOIN parties p ON p.id = ae.party_id
		WHERE %s
		ORDER BY ae.id DESC
		LIMIT $%d OFFSET $%d
	`, strings.Join(whereClauses, " AND "), argIdx, argIdx+1)

	args = append(args, limit, offset)

	rows, err := h.pool.Query(ctx, query, args...)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to query election pay: "+err.Error())
		return
	}
	defer rows.Close()

	var items []map[string]interface{}
	for rows.Next() {
		var (
			id, userID                           int64
			userName, userAvatar                 string
			partyID                              int16
			partyCode, partyName                 string
			roleType                             string
			basePaymentKobo, totalEarnedKobo     int64
			readinessScore, attendanceScore      float64
			startScore, endScore                 float64
			resultsScore, updatesScore           float64
			status                               string
			paidAt                               pgtype.Timestamptz
			createdAt                            time.Time
		)

		if err := rows.Scan(
			&id, &userID,
			&userName, &userAvatar,
			&partyID, &partyCode, &partyName,
			&roleType,
			&basePaymentKobo, &totalEarnedKobo,
			&readinessScore, &attendanceScore,
			&startScore, &endScore,
			&resultsScore, &updatesScore,
			&status, &paidAt, &createdAt,
		); err != nil {
			continue
		}

		// Calculate percentage
		var pct float64
		if basePaymentKobo > 0 {
			pct = (float64(totalEarnedKobo) / float64(basePaymentKobo)) * 100.0
		} else {
			pct = (readinessScore + attendanceScore + startScore + endScore + resultsScore + updatesScore) / 6.0
		}
		if pct > 100.0 {
			pct = 100.0
		}

		// Determine ineligibility reason if applicable
		var reason string
		if attendanceScore == 0 {
			reason = "Absent"
		} else if startScore == 0 {
			reason = "Election not started"
		} else if resultsScore == 0 {
			reason = "Results not uploaded"
		} else if resultsScore < 100.0 {
			reason = "Incomplete results upl."
		}

		// Role display
		displayRole := strings.Title(strings.ReplaceAll(roleType, "_", " "))

		// Format Naira string
		nairaAmount := float64(totalEarnedKobo) / 100.0
		earnedAmountStr := fmt.Sprintf("₦%s", formatMoney(nairaAmount))

		var paidAtStr string
		if paidAt.Valid {
			paidAtStr = paidAt.Time.Format("Jan 02, 2006")
		}

		items = append(items, map[string]interface{}{
			"id":                id,
			"user_id":           userID,
			"user_name":         userName,
			"user_avatar":       userAvatar,
			"party_id":          partyID,
			"party_code":        partyCode,
			"party_name":        partyName,
			"role":              displayRole,
			"role_type":         roleType,
			"base_payment_kobo": basePaymentKobo,
			"total_earned_kobo": totalEarnedKobo,
			"earned_amount":     earnedAmountStr,
			"earned_percentage": int(pct),
			"reason":            reason,
			"status":            status,
			"paid_at":           paidAtStr,
			"created_at":        createdAt,
		})
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Election pay fetched", map[string]interface{}{
		"items":  items,
		"total":  len(items),
		"limit":  limit,
		"offset": offset,
	})
}

// ─── GET /api/v1/admin/agent-payments/referral-pay ───────────────────────────

func (h *Handler) ListReferralPay(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	qParams := r.URL.Query()

	egID := h.resolveElectionGroupID(r)
	statusFilter := strings.ToLower(qParams.Get("status")) // "unpaid", "paid"
	if statusFilter == "" {
		statusFilter = "unpaid"
	}

	partyID, _ := strconv.ParseInt(qParams.Get("party_id"), 10, 16)
	search := strings.TrimSpace(qParams.Get("search"))

	limit := 50
	if lStr := qParams.Get("limit"); lStr != "" {
		if l, err := strconv.Atoi(lStr); err == nil && l > 0 && l <= 200 {
			limit = l
		}
	}
	offset := 0
	if oStr := qParams.Get("offset"); oStr != "" {
		if o, err := strconv.Atoi(oStr); err == nil && o >= 0 {
			offset = o
		}
	}

	var whereClauses []string
	args := []interface{}{egID}
	argIdx := 2

	whereClauses = append(whereClauses, "($1::bigint = 0 OR ur.election_group_id = $1)")

	if statusFilter == "paid" {
		whereClauses = append(whereClauses, "ur.status = 'paid'")
	} else {
		whereClauses = append(whereClauses, "ur.status != 'paid' AND ur.earned_amount > 0")
	}

	if partyID > 0 {
		whereClauses = append(whereClauses, fmt.Sprintf("ur.party_id = $%d", argIdx))
		args = append(args, partyID)
		argIdx++
	}

	if search != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("(CONCAT(u.first_name, ' ', u.last_name) ILIKE $%d OR u.phone ILIKE $%d)", argIdx, argIdx))
		args = append(args, "%"+search+"%")
		argIdx++
	}

	query := fmt.Sprintf(`
		SELECT
			ur.id,
			ur.user_id,
			CONCAT(u.first_name, ' ', u.last_name) AS user_name,
			COALESCE(u.avatar, '') AS user_avatar,
			COALESCE(p.id, 0) AS party_id,
			COALESCE(p.code, '') AS party_code,
			COALESCE(p.name, '') AS party_name,
			COALESCE(ur.duties_completed_referrals, 0) AS duties_completed_referrals,
			COALESCE(ur.agent_referrals, 0) AS agent_referrals,
			COALESCE(ur.total_referrals, 0) AS total_referrals,
			COALESCE(ur.earned_amount, 0) AS earned_amount,
			ur.status,
			ur.paid_at,
			ur.created_at
		FROM user_referrals ur
		JOIN users u ON u.id = ur.user_id
		LEFT JOIN parties p ON p.id = ur.party_id
		WHERE %s
		ORDER BY ur.id DESC
		LIMIT $%d OFFSET $%d
	`, strings.Join(whereClauses, " AND "), argIdx, argIdx+1)

	args = append(args, limit, offset)

	rows, err := h.pool.Query(ctx, query, args...)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to query referral pay: "+err.Error())
		return
	}
	defer rows.Close()

	var items []map[string]interface{}
	for rows.Next() {
		var (
			id, userID                                int64
			userName, userAvatar                      string
			partyID                                   int16
			partyCode, partyName                      string
			dutiesCompleted, agentRefs, totalRefs     int64
			earnedAmount                              float64
			status                                    string
			paidAt                                    pgtype.Timestamptz
			createdAt                                 time.Time
		)

		if err := rows.Scan(
			&id, &userID,
			&userName, &userAvatar,
			&partyID, &partyCode, &partyName,
			&dutiesCompleted, &agentRefs, &totalRefs,
			&earnedAmount,
			&status, &paidAt, &createdAt,
		); err != nil {
			continue
		}

		// Duties completed percentage
		var dutyPctStr string
		if totalRefs > 0 {
			pct := (float64(dutiesCompleted) / float64(totalRefs)) * 100.0
			dutyPctStr = fmt.Sprintf("%d (%.1f%%)", dutiesCompleted, pct)
		} else {
			dutyPctStr = fmt.Sprintf("%d (0%%)", dutiesCompleted)
		}

		earnedAmountStr := fmt.Sprintf("₦%s", formatMoney(earnedAmount))

		var paidAtStr string
		if paidAt.Valid {
			paidAtStr = paidAt.Time.Format("Jan 02, 2006")
		}

		userLabel := userName
		if partyCode != "" {
			userLabel = fmt.Sprintf("%s (%s)", userName, partyCode)
		}

		items = append(items, map[string]interface{}{
			"id":                         id,
			"user_id":                    userID,
			"user_name":                  userName,
			"user_label":                 userLabel,
			"user_avatar":                userAvatar,
			"party_id":                   partyID,
			"party_code":                 partyCode,
			"party_name":                 partyName,
			"duties_completed":           dutiesCompleted,
			"duties_completed_formatted": dutyPctStr,
			"agent_referrals":            agentRefs,
			"total_referrals":            totalRefs,
			"earned_amount":              earnedAmountStr,
			"earned_amount_num":          earnedAmount,
			"status":                     status,
			"paid_at":                    paidAtStr,
			"created_at":                 createdAt,
		})
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Referral pay fetched", map[string]interface{}{
		"items":  items,
		"total":  len(items),
		"limit":  limit,
		"offset": offset,
	})
}

// ─── POST /api/v1/admin/agent-payments/election-pay/{id}/pay ─────────────────

func (h *Handler) PayElectionEarnings(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid ID")
		return
	}

	var paidAt time.Time
	err = h.pool.QueryRow(ctx, `
		UPDATE agent_earnings
		SET status = 'paid', paid_at = NOW(), updated_at = NOW()
		WHERE id = $1
		RETURNING paid_at
	`, id).Scan(&paidAt)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to process payment: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Payment processed successfully", map[string]interface{}{
		"id":      id,
		"status":  "paid",
		"paid_at": paidAt.Format("Jan 02, 2006"),
	})
}

// ─── POST /api/v1/admin/agent-payments/referral-pay/{id}/pay ─────────────────

func (h *Handler) PayReferralEarnings(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid ID")
		return
	}

	var paidAt time.Time
	err = h.pool.QueryRow(ctx, `
		UPDATE user_referrals
		SET status = 'paid', paid_at = NOW(), updated_at = NOW()
		WHERE id = $1
		RETURNING paid_at
	`, id).Scan(&paidAt)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to process referral payment: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Referral payment processed successfully", map[string]interface{}{
		"id":      id,
		"status":  "paid",
		"paid_at": paidAt.Format("Jan 02, 2006"),
	})
}

// ─── POST /api/v1/admin/agent-payments/pay-all ────────────────────────────────

type PayAllRequest struct {
	Type            string  `json:"type"` // "election" or "referral"
	ElectionGroupID int64   `json:"election_group_id"`
	IDs             []int64 `json:"ids"`
}

func (h *Handler) PayAll(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var req PayAllRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Type != "election" && req.Type != "referral" {
		h.utils.RespondError(w, http.StatusBadRequest, "Type must be 'election' or 'referral'")
		return
	}

	var count int64
	if req.Type == "election" {
		if len(req.IDs) > 0 {
			res, err := h.pool.Exec(ctx, `
				UPDATE agent_earnings
				SET status = 'paid', paid_at = NOW(), updated_at = NOW()
				WHERE id = ANY($1) AND status != 'paid'
			`, req.IDs)
			if err != nil {
				h.utils.RespondError(w, http.StatusInternalServerError, "Failed to pay agents: "+err.Error())
				return
			}
			count = res.RowsAffected()
		} else {
			res, err := h.pool.Exec(ctx, `
				UPDATE agent_earnings
				SET status = 'paid', paid_at = NOW(), updated_at = NOW()
				WHERE ($1::bigint = 0 OR election_group_id = $1) AND status != 'paid' AND attendance_score > 0
			`, req.ElectionGroupID)
			if err != nil {
				h.utils.RespondError(w, http.StatusInternalServerError, "Failed to pay agents: "+err.Error())
				return
			}
			count = res.RowsAffected()
		}
	} else {
		// referral
		if len(req.IDs) > 0 {
			res, err := h.pool.Exec(ctx, `
				UPDATE user_referrals
				SET status = 'paid', paid_at = NOW(), updated_at = NOW()
				WHERE id = ANY($1) AND status != 'paid'
			`, req.IDs)
			if err != nil {
				h.utils.RespondError(w, http.StatusInternalServerError, "Failed to pay referrals: "+err.Error())
				return
			}
			count = res.RowsAffected()
		} else {
			res, err := h.pool.Exec(ctx, `
				UPDATE user_referrals
				SET status = 'paid', paid_at = NOW(), updated_at = NOW()
				WHERE ($1::bigint = 0 OR election_group_id = $1) AND status != 'paid' AND earned_amount > 0
			`, req.ElectionGroupID)
			if err != nil {
				h.utils.RespondError(w, http.StatusInternalServerError, "Failed to pay referrals: "+err.Error())
				return
			}
			count = res.RowsAffected()
		}
	}

	h.utils.RespondSuccess(w, http.StatusOK, fmt.Sprintf("Successfully processed %d payments", count), map[string]interface{}{
		"count": count,
	})
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func formatMoney(amount float64) string {
	parts := strings.Split(fmt.Sprintf("%.2f", amount), ".")
	intPart := parts[0]
	decPart := parts[1]

	var res []byte
	l := len(intPart)
	for i, c := range intPart {
		if i > 0 && (l-i)%3 == 0 {
			res = append(res, ',')
		}
		res = append(res, byte(c))
	}
	return string(res) + "." + decPart
}
