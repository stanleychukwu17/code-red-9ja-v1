package earningsservice

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"free9ja/api/internal/db/queries"
)

// ─── Service ─────────────────────────────────────────────────────────────────

type Service struct {
	q    *queries.Queries
	pool *pgxpool.Pool
}

func NewService(q *queries.Queries, pool *pgxpool.Pool) *Service {
	return &Service{q: q, pool: pool}
}

// ─── JSON shapes from DB ──────────────────────────────────────────────────────

type earningsAllocation struct {
	Readiness                     float64 `json:"readiness"`
	Results                       float64 `json:"results"`
	Updates                       float64 `json:"updates"`
	Attendance                    float64 `json:"attendance"`
	ElectionStart                 float64 `json:"election_start"`
	ElectionEnd                   float64 `json:"election_end"`
	TargetLiveVotersReferredCount float64 `json:"target_live_voters_referred_count"`
	LiveVotersReferred            float64 `json:"live_voters_referred"`
}

func (a earningsAllocation) GetLiveVotersPct() float64 {
	if a.LiveVotersReferred > 0 {
		return a.LiveVotersReferred
	}
	return a.TargetLiveVotersReferredCount
}

type testWindow struct {
	DaysBeforeElection int `json:"days_before_election"`
	Quota              int `json:"quota"`
}

type testRequirements struct {
	TotalRequired int          `json:"total_required"`
	Windows       []testWindow `json:"windows"`
}

// agentPaymentAllocation:
// {"pollingAgent": {"default": 2000000, "states": {"lagos": 2500000}}}
type rolePaymentConfig struct {
	Default int64             `json:"default"`
	States  map[string]int64  `json:"states"`
}

// ─── Calculate (public entry point) ──────────────────────────────────────────

// Calculate computes and upserts the agent_earnings row for a given assignment.
// It is safe to call repeatedly — each call refreshes the stored record.
func (s *Service) Calculate(ctx context.Context, assignmentID int64) (queries.AgentEarning, error) {
	asgn, err := s.q.GetAssignmentForEarnings(ctx, assignmentID)
	if err != nil {
		return queries.AgentEarning{}, fmt.Errorf("get assignment: %w", err)
	}
	return s.calculateWithTx(ctx, s.q, asgn)
}

// calculateWithTx performs the full earnings calculation using the given queries
// handle (which may be a transaction-scoped handle).
func (s *Service) calculateWithTx(
	ctx context.Context,
	q *queries.Queries,
	asgn queries.GetAssignmentForEarningsRow,
) (queries.AgentEarning, error) {
	roleType := "polling_agent"
	if asgn.RoleType.Valid && asgn.RoleType.String != "" {
		roleType = asgn.RoleType.String
	}

	// 1. Fetch earnings allocation for this role
	allocationKey := fmt.Sprintf("earnings_allocation_%s", strings.ReplaceAll(roleType, " ", "_"))
	allocationSetting, err := q.GetSystemSetting(ctx, allocationKey)
	if err != nil {
		return queries.AgentEarning{}, fmt.Errorf("get earnings allocation setting %q: %w", allocationKey, err)
	}
	var allocation earningsAllocation
	if err := json.Unmarshal(allocationSetting.Value, &allocation); err != nil {
		return queries.AgentEarning{}, fmt.Errorf("parse earnings allocation: %w", err)
	}

	// 2. Fetch update_schedule_config (or legacy target_updates_count)
	var targetUpdatesCount float64 = 20
	if scheduleSetting, err := q.GetSystemSetting(ctx, "update_schedule_config"); err == nil {
		var cfg struct {
			TargetUpdatesCount float64 `json:"target_updates_count"`
		}
		if err := json.Unmarshal(scheduleSetting.Value, &cfg); err == nil && cfg.TargetUpdatesCount > 0 {
			targetUpdatesCount = cfg.TargetUpdatesCount
		}
	} else if legacySetting, err := q.GetSystemSetting(ctx, "target_updates_count"); err == nil {
		_ = json.Unmarshal(legacySetting.Value, &targetUpdatesCount)
	}

	// 3. Fetch target_live_voters_referred_count target
	lvrTargetSetting, err := q.GetSystemSetting(ctx, "target_live_voters_referred_count")
	if err != nil {
		return queries.AgentEarning{}, fmt.Errorf("get target_live_voters_referred_count: %w", err)
	}
	var targetLiveVoters float64
	if err := json.Unmarshal(lvrTargetSetting.Value, &targetLiveVoters); err != nil {
		targetLiveVoters = 10
	}

	// 4. Fetch party to get base payment kobo
	party, err := q.GetPartyByID(ctx, asgn.PartyID)
	if err != nil {
		return queries.AgentEarning{}, fmt.Errorf("get party: %w", err)
	}

	basePaymentKobo := s.resolveBasePayment(party.AgentPaymentAllocationKobo, roleType, asgn.StateName)

	// 5. Compute each factor score (0–100)
	readinessScore     := s.computeReadinessScore(asgn)
	resultsScore       := computeRatioScore(float64(asgn.ResultsSubmittedCount), float64(asgn.ResultsExpectedToSubmitCount))
	updatesScore       := computeRatioScore(float64(asgn.UpdatesCount), targetUpdatesCount)
	attendanceScore    := boolScore(asgn.ArrivedAt.Valid)
	electionStartScore := boolScore(asgn.ElectionStartedAt.Valid)
	electionEndScore   := boolScore(asgn.ElectionEndedAt.Valid)
	liveVotersScore    := computeRatioScore(float64(asgn.LiveVotersReferredCount), targetLiveVoters)

	// 6. Compute per-factor earnings (kobo)
	readinessEarned    := factorEarned(basePaymentKobo, allocation.Readiness, readinessScore)
	resultsEarned      := factorEarned(basePaymentKobo, allocation.Results, resultsScore)
	updatesEarned      := factorEarned(basePaymentKobo, allocation.Updates, updatesScore)
	attendanceEarned   := factorEarned(basePaymentKobo, allocation.Attendance, attendanceScore)
	electionStartEarned := factorEarned(basePaymentKobo, allocation.ElectionStart, electionStartScore)
	electionEndEarned  := factorEarned(basePaymentKobo, allocation.ElectionEnd, electionEndScore)
	liveVotersEarned   := factorEarned(basePaymentKobo, allocation.GetLiveVotersPct(), liveVotersScore)

	totalEarned := readinessEarned + resultsEarned + updatesEarned +
		attendanceEarned + electionStartEarned + electionEndEarned + liveVotersEarned

	// 7. Re-marshal allocation for snapshot storage
	allocationBytes, _ := json.Marshal(allocation)

	// 8. Upsert earnings record
	result, err := q.UpsertAgentEarnings(ctx, queries.UpsertAgentEarningsParams{
		UserID:                  asgn.UserID,
		PartyID:                 asgn.PartyID,
		ElectionGroupID:         asgn.ElectionGroupID,
		RoleType:                roleType,
		BasePaymentKobo:         basePaymentKobo,
		EarningsAllocation:      allocationBytes,
		ReadinessScore:          toNumeric(readinessScore),
		ResultsScore:            toNumeric(resultsScore),
		UpdatesScore:            toNumeric(updatesScore),
		AttendanceScore:         toNumeric(attendanceScore),
		ElectionStartScore:      toNumeric(electionStartScore),
		ElectionEndScore:        toNumeric(electionEndScore),
		LiveVotersScore:         toNumeric(liveVotersScore),
		ReadinessEarnedKobo:     readinessEarned,
		ResultsEarnedKobo:       resultsEarned,
		UpdatesEarnedKobo:       updatesEarned,
		AttendanceEarnedKobo:    attendanceEarned,
		ElectionStartEarnedKobo: electionStartEarned,
		ElectionEndEarnedKobo:   electionEndEarned,
		LiveVotersEarnedKobo:    liveVotersEarned,
		TotalEarnedKobo:         totalEarned,
	})
	if err != nil {
		return queries.AgentEarning{}, fmt.Errorf("upsert agent earnings: %w", err)
	}

	return result, nil
}

// ─── ProcessPracticeTestEarnings ─────────────────────────────────────────────

// ProcessPracticeTestEarnings runs the full atomic flow when an agent completes
// a practice test:
//  1. Update election_practice_test_readiness_percentage on the assignment
//  2. Recalculate and upsert agent_earnings
//  3. Credit the delta in readiness_earned_kobo to the agent's wallet
//  4. Create a wallet transaction record
//  5. Mark all been_paid:false attempts in test_attempts as been_paid:true
//
// It is intentionally called in a background goroutine; errors are logged only.
func (s *Service) ProcessPracticeTestEarnings(
	ctx context.Context,
	assignmentID int64,
	practiceTestRecordID int64,
	newReadinessPct float64,
) {
	if s.pool == nil {
		slog.Warn("earnings: pool is nil, skipping practice test earnings processing")
		return
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		slog.Error("earnings: failed to begin transaction", "error", err)
		return
	}
	defer tx.Rollback(ctx)

	qtx := s.q.WithTx(tx)

	// 1. Update readiness percentage on the assignment
	var readinessPct pgtype.Numeric
	if scanErr := readinessPct.Scan(fmt.Sprintf("%.2f", newReadinessPct)); scanErr != nil {
		slog.Error("earnings: failed to scan readiness percentage", "error", scanErr)
		return
	}
	if _, err := qtx.UpdateAssignmentReadinessPercentage(ctx, queries.UpdateAssignmentReadinessPercentageParams{
		ID:                                     assignmentID,
		ElectionPracticeTestReadinessPercentage: readinessPct,
	}); err != nil {
		slog.Error("earnings: failed to update assignment readiness percentage", "assignmentID", assignmentID, "error", err)
		return
	}

	// 2. Fetch the current agent_earnings row to get the old readiness_earned_kobo
	asgn, err := qtx.GetAssignmentForEarnings(ctx, assignmentID)
	if err != nil {
		slog.Error("earnings: failed to get assignment for earnings", "assignmentID", assignmentID, "error", err)
		return
	}

	roleType := "polling_agent"
	if asgn.RoleType.Valid && asgn.RoleType.String != "" {
		roleType = asgn.RoleType.String
	}

	// Fetch old readiness_earned_kobo before recalculating
	oldReadinessEarned := int64(0)
	oldEarnings, err := qtx.GetAgentEarningsByUserAndElectionGroupAndRole(ctx, queries.GetAgentEarningsByUserAndElectionGroupAndRoleParams{
		UserID:          asgn.UserID,
		ElectionGroupID: asgn.ElectionGroupID,
		RoleType:        roleType,
	})
	if err == nil {
		oldReadinessEarned = oldEarnings.ReadinessEarnedKobo
	}

	// 3. Compute and upsert agent_earnings (using the in-tx queries)
	newEarnings, err := s.calculateWithTx(ctx, qtx, asgn)
	if err != nil {
		slog.Error("earnings: failed to calculate earnings", "assignmentID", assignmentID, "error", err)
		return
	}

	// 4. Compute the readiness delta and credit the wallet
	delta := newEarnings.ReadinessEarnedKobo - oldReadinessEarned
	if delta > 0 {
		wallet, wErr := qtx.GetUserWalletByUserID(ctx, asgn.UserID)
		if wErr != nil {
			slog.Warn("earnings: agent has no wallet, skipping credit", "userID", asgn.UserID, "error", wErr)
			// Non-fatal — we still want to mark the attempts paid
		} else {
			updatedWallet, creditErr := qtx.CreditUserWallet(ctx, queries.CreditUserWalletParams{
				BalanceKobo: delta,
				ID:          wallet.ID,
			})
			if creditErr != nil {
				slog.Error("earnings: failed to credit wallet", "userID", asgn.UserID, "delta", delta, "error", creditErr)
				return
			}
			// Build a unique reference: practiceTest-<recordID>-<timestamp>
			txRef := fmt.Sprintf("practice-readiness-%d-%d", practiceTestRecordID, time.Now().UnixNano())
			if _, txErr := qtx.CreateUserWalletTransaction(ctx, queries.CreateUserWalletTransactionParams{
				WalletID:             wallet.ID,
				TransactionReference: txRef,
				Type:                 "credit",
				AmountKobo:           delta,
				BalanceAfterKobo:     updatedWallet.BalanceKobo,
				PayerName:            pgtype.Text{},
				PayerAccountNumber:   pgtype.Text{},
				PayerBankCode:        pgtype.Text{},
				Narration:            pgtype.Text{String: "Practice Test: Submitted", Valid: true},
				RawPayload:           nil,
			}); txErr != nil {
				slog.Error("earnings: failed to record wallet transaction", "ref", txRef, "error", txErr)
				return
			}
		}

		// Update polling_unit_assignments.earned_amount_kobo
		if _, updateAsgnErr := qtx.UpdatePollingUnitAssignmentEarnedAmountKobo(ctx, queries.UpdatePollingUnitAssignmentEarnedAmountKoboParams{
			UserID:          asgn.UserID,
			ElectionGroupID: asgn.ElectionGroupID,
			EarnedDeltaKobo: delta,
		}); updateAsgnErr != nil {
			slog.Warn("earnings: failed to update polling_unit_assignments earned_amount_kobo", "userID", asgn.UserID, "electionGroupID", asgn.ElectionGroupID, "err", updateAsgnErr)
		}
	}

	// 5. Mark all been_paid:false attempts as been_paid:true and credit earned_amount_kobo
	earnedDelta := delta
	if earnedDelta < 0 {
		earnedDelta = 0
	}
	if _, err := qtx.MarkPracticeTestAttemptsPaid(ctx, queries.MarkPracticeTestAttemptsPaidParams{
		EarnedDeltaKobo: earnedDelta,
		ID:              practiceTestRecordID,
	}); err != nil {
		slog.Error("earnings: failed to mark practice test attempts as paid", "practiceTestID", practiceTestRecordID, "error", err)
		return
	}

	if err := tx.Commit(ctx); err != nil {
		slog.Error("earnings: failed to commit practice test earnings transaction", "error", err)
		return
	}

	slog.Info("earnings: practice test earnings processed",
		"assignmentID", assignmentID,
		"practiceTestID", practiceTestRecordID,
		"readinessDeltaKobo", delta,
		"newReadinessPct", newReadinessPct,
	)
}

// ProcessTaskEarnings recalculates earnings for a given assignment and taskType,
// credits any positive delta for that specific task to the user's wallet, and creates
// a wallet transaction log. It is safe to call asynchronously or synchronously after task actions.
func (s *Service) ProcessTaskEarnings(
	ctx context.Context,
	assignmentID int64,
	taskType string,
	customNarration ...string,
) (int64, error) {
	if s.pool == nil {
		slog.Warn("earnings: pool is nil, skipping task earnings processing", "taskType", taskType)
		return 0, nil
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("earnings: failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	qtx := s.q.WithTx(tx)

	asgn, err := qtx.GetAssignmentForEarnings(ctx, assignmentID)
	if err != nil {
		return 0, fmt.Errorf("earnings: failed to get assignment: %w", err)
	}

	roleType := "polling_agent"
	if asgn.RoleType.Valid && asgn.RoleType.String != "" {
		roleType = asgn.RoleType.String
	}

	// Fetch old earnings before recalculating
	oldEarnings, err := qtx.GetAgentEarningsByUserAndElectionGroupAndRole(ctx, queries.GetAgentEarningsByUserAndElectionGroupAndRoleParams{
		UserID:          asgn.UserID,
		ElectionGroupID: asgn.ElectionGroupID,
		RoleType:        roleType,
	})

	oldFactorEarned := int64(0)
	if err == nil {
		switch taskType {
		case "attendance":
			oldFactorEarned = oldEarnings.AttendanceEarnedKobo
		case "election_start":
			oldFactorEarned = oldEarnings.ElectionStartEarnedKobo
		case "election_end":
			oldFactorEarned = oldEarnings.ElectionEndEarnedKobo
		case "updates":
			oldFactorEarned = oldEarnings.UpdatesEarnedKobo
		case "results":
			oldFactorEarned = oldEarnings.ResultsEarnedKobo
		case "live_voters_referred":
			oldFactorEarned = oldEarnings.LiveVotersEarnedKobo
		}
	}

	// Recalculate earnings
	newEarnings, err := s.calculateWithTx(ctx, qtx, asgn)
	if err != nil {
		return 0, fmt.Errorf("earnings: failed to calculate earnings: %w", err)
	}

	newFactorEarned := int64(0)
	var narrationLabel string
	if len(customNarration) > 0 && customNarration[0] != "" {
		narrationLabel = customNarration[0]
	} else {
		switch taskType {
		case "attendance":
			newFactorEarned = newEarnings.AttendanceEarnedKobo
			narrationLabel = "Polling Unit: Arrived"
		case "election_start":
			newFactorEarned = newEarnings.ElectionStartEarnedKobo
			narrationLabel = "Election: Started"
		case "election_end":
			newFactorEarned = newEarnings.ElectionEndEarnedKobo
			narrationLabel = "Election: Ended"
		case "updates":
			newFactorEarned = newEarnings.UpdatesEarnedKobo
			narrationLabel = "Update: Given"
		case "results":
			newFactorEarned = newEarnings.ResultsEarnedKobo
			narrationLabel = "Results: Uploaded"
		case "live_voters_referred":
			newFactorEarned = newEarnings.LiveVotersEarnedKobo
			narrationLabel = "Referred User: Voted"
		default:
			narrationLabel = fmt.Sprintf("Task earnings (%s)", taskType)
		}
	}

	if taskType == "live_voters_referred" {
		newFactorEarned = newEarnings.LiveVotersEarnedKobo
	}

	delta := newFactorEarned - oldFactorEarned
	if delta > 0 {
		wallet, wErr := qtx.GetUserWalletByUserID(ctx, asgn.UserID)
		if wErr != nil {
			slog.Warn("earnings: user has no wallet to credit", "userID", asgn.UserID, "err", wErr)
		} else {
			updatedWallet, creditErr := qtx.CreditUserWallet(ctx, queries.CreditUserWalletParams{
				BalanceKobo: delta,
				ID:          wallet.ID,
			})
			if creditErr != nil {
				return 0, fmt.Errorf("earnings: failed to credit wallet: %w", creditErr)
			}

			txRef := fmt.Sprintf("%s-%d-%d", taskType, assignmentID, time.Now().UnixNano())
			if _, txErr := qtx.CreateUserWalletTransaction(ctx, queries.CreateUserWalletTransactionParams{
				WalletID:             wallet.ID,
				TransactionReference: txRef,
				Type:                 "credit",
				AmountKobo:           delta,
				BalanceAfterKobo:     updatedWallet.BalanceKobo,
				PayerName:            pgtype.Text{},
				PayerAccountNumber:   pgtype.Text{},
				PayerBankCode:        pgtype.Text{},
				Narration:            pgtype.Text{String: narrationLabel, Valid: true},
				RawPayload:           nil,
			}); txErr != nil {
				return 0, fmt.Errorf("earnings: failed to record transaction: %w", txErr)
			}
		}

		// Also update polling_unit_assignments.earned_amount_kobo
		if _, updateAsgnErr := qtx.UpdatePollingUnitAssignmentEarnedAmountKobo(ctx, queries.UpdatePollingUnitAssignmentEarnedAmountKoboParams{
			UserID:          asgn.UserID,
			ElectionGroupID: asgn.ElectionGroupID,
			EarnedDeltaKobo: delta,
		}); updateAsgnErr != nil {
			slog.Warn("earnings: failed to update polling_unit_assignments earned_amount_kobo", "userID", asgn.UserID, "electionGroupID", asgn.ElectionGroupID, "err", updateAsgnErr)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("earnings: failed to commit transaction: %w", err)
	}

	slog.Info("earnings: task earnings processed",
		"assignmentID", assignmentID,
		"taskType", taskType,
		"deltaKobo", delta,
	)

	return delta, nil
}

// ─── Readiness calculation ────────────────────────────────────────────────────

// computeReadinessScore derives the readiness score from the already-stored
// election_practice_test_readiness_percentage on the assignment (0–100).
// That field is kept up to date by the practice test completion flow.
func (s *Service) computeReadinessScore(asgn queries.GetAssignmentForEarningsRow) float64 {
	if !asgn.ElectionPracticeTestReadinessPercentage.Valid {
		return 0
	}
	f, err := asgn.ElectionPracticeTestReadinessPercentage.Float64Value()
	if err != nil || !f.Valid {
		return 0
	}
	return clamp(f.Float64, 0, 100)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func computeRatioScore(actual, target float64) float64 {
	if target <= 0 {
		return 0
	}
	return clamp((actual/target)*100, 0, 100)
}

func boolScore(set bool) float64 {
	if set {
		return 100
	}
	return 0
}

// factorEarned = base × (allocationPct/100) × (achievementScore/100), rounded to kobo
func factorEarned(baseKobo int64, allocationPct, achievementScore float64) int64 {
	earned := float64(baseKobo) * (allocationPct / 100.0) * (achievementScore / 100.0)
	return int64(math.Round(earned))
}

func clamp(v, min, max float64) float64 {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}

func toNumeric(f float64) pgtype.Numeric {
	var n pgtype.Numeric
	_ = n.Scan(fmt.Sprintf("%.2f", f))
	return n
}

// ─── Practice Test Payout Evaluation & Processing ─────────────────────────────

type PracticeTestPayoutResult struct {
	Eligible         bool
	EarnedAmountKobo int64
	AssignmentID     int64
	PartyID          int16
}

type AssignmentInfo struct {
	ID      int64
	PartyID int16
	StateID int16
}

func (s *Service) getAssignmentInfo(ctx context.Context, userID, electionGroupID int64, roleType string) (*AssignmentInfo, error) {
	normRole := strings.ReplaceAll(roleType, "-", "_")
	switch normRole {
	case "pollingagent":
		normRole = "polling_agent"
	case "ward_supervisor":
		normRole = "ward_election_supervisor"
	case "lga_supervisor":
		normRole = "lga_election_supervisor"
	case "state_supervisor":
		normRole = "state_election_supervisor"
	}

	switch normRole {
	case "polling_agent":
		asgnID, err := s.q.GetAssignmentIDByUserAndElectionGroup(ctx, queries.GetAssignmentIDByUserAndElectionGroupParams{
			UserID:          userID,
			ElectionGroupID: electionGroupID,
		})
		if err == nil && asgnID > 0 {
			asgn, err := s.q.GetAssignmentForEarnings(ctx, asgnID)
			if err == nil {
				return &AssignmentInfo{ID: asgn.ID, PartyID: asgn.PartyID, StateID: 0}, nil
			}
		}

	case "state_election_supervisor", "state_supervisor":
		sup, err := s.q.GetStateSupervisorByElectionGroup(ctx, queries.GetStateSupervisorByElectionGroupParams{
			UserID:          userID,
			ElectionGroupID: electionGroupID,
		})
		if err == nil && sup.ID > 0 {
			return &AssignmentInfo{ID: sup.ID, PartyID: sup.PartyID, StateID: sup.StateID}, nil
		}

	case "lga_election_supervisor", "lga_supervisor":
		sup, err := s.q.GetLgaSupervisorByElectionGroup(ctx, queries.GetLgaSupervisorByElectionGroupParams{
			UserID:          userID,
			ElectionGroupID: electionGroupID,
		})
		if err == nil && sup.ID > 0 {
			return &AssignmentInfo{ID: sup.ID, PartyID: sup.PartyID, StateID: sup.StateID}, nil
		}

	case "ward_election_supervisor", "ward_supervisor":
		sup, err := s.q.GetWardSupervisorByElectionGroup(ctx, queries.GetWardSupervisorByElectionGroupParams{
			UserID:          userID,
			ElectionGroupID: electionGroupID,
		})
		if err == nil && sup.ID > 0 {
			return &AssignmentInfo{ID: sup.ID, PartyID: sup.PartyID, StateID: sup.StateID}, nil
		}
	}

	// Fallback: Check if user has a pending party application for this election group
	if apps, err := s.q.GetPendingApplicationsForUserAutoAccept(ctx, userID); err == nil {
		for _, app := range apps {
			if app.ElectionGroupID == electionGroupID {
				return &AssignmentInfo{
					ID:      0,
					PartyID: app.PartyID,
					StateID: app.StateID.Int16,
				}, nil
			}
		}
	}

	return nil, fmt.Errorf("user %d has no assignment or application for role %s / election group %d", userID, roleType, electionGroupID)
}

func (s *Service) EvaluatePracticeTestPayout(
	ctx context.Context,
	userID int64,
	electionGroupID int64,
	roleType string,
	finalScore float64,
) (PracticeTestPayoutResult, error) {
	if roleType == "" {
		roleType = "polling_agent"
	}
	roleKey := strings.ReplaceAll(roleType, "-", "_")
	switch roleKey {
	case "pollingagent":
		roleKey = "polling_agent"
	case "ward_supervisor":
		roleKey = "ward_election_supervisor"
	case "lga_supervisor":
		roleKey = "lga_election_supervisor"
	case "state_supervisor":
		roleKey = "state_election_supervisor"
	}

	// 1. Fetch election group to verify date is not in past
	eg, err := s.q.GetElectionGroupByID(ctx, electionGroupID)
	if err != nil {
		return PracticeTestPayoutResult{Eligible: false}, nil
	}
	if eg.ElectionDate.Valid {
		now := time.Now()
		today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		if eg.ElectionDate.Time.Before(today) {
			slog.Info("earnings: election date is in the past, no practice test payout", "electionGroupID", electionGroupID)
			return PracticeTestPayoutResult{Eligible: false}, nil
		}
	}

	// 2. Fetch assignment info
	asgnInfo, err := s.getAssignmentInfo(ctx, userID, electionGroupID, roleKey)
	if err != nil {
		slog.Info("earnings: user has no assignment or application for role/election group", "userID", userID, "electionGroupID", electionGroupID, "roleType", roleKey, "err", err)
		return PracticeTestPayoutResult{Eligible: false}, nil
	}

	// 3. Fetch earnings allocation for role (e.g. earnings_allocation_polling_agent)
	allocationKey := fmt.Sprintf("earnings_allocation_%s", roleKey)
	allocationSetting, err := s.q.GetSystemSetting(ctx, allocationKey)
	if err != nil {
		allocationSetting, _ = s.q.GetSystemSetting(ctx, "earnings_allocation_polling_agent")
	}
	var alloc earningsAllocation
	if len(allocationSetting.Value) > 0 {
		_ = json.Unmarshal(allocationSetting.Value, &alloc)
	}
	readinessPct := alloc.Readiness
	if readinessPct <= 0 {
		readinessPct = 20.0
	}

	// 4. Fetch test requirements for role (e.g. test_requirements_polling_agent)
	reqKey := fmt.Sprintf("test_requirements_%s", roleKey)
	reqSetting, err := s.q.GetSystemSetting(ctx, reqKey)
	if err != nil {
		reqSetting, _ = s.q.GetSystemSetting(ctx, "test_requirements_polling_agent")
	}
	var testReq testRequirements
	if len(reqSetting.Value) > 0 {
		_ = json.Unmarshal(reqSetting.Value, &testReq)
	}
	if testReq.TotalRequired <= 0 {
		testReq.TotalRequired = 10
	}

	// 5. Fetch party base payment
	party, err := s.q.GetPartyByID(ctx, asgnInfo.PartyID)
	if err != nil {
		return PracticeTestPayoutResult{Eligible: false}, fmt.Errorf("get party: %w", err)
	}
	stateName := ""
	if asgnInfo.StateID > 0 {
		stateName = strconv.Itoa(int(asgnInfo.StateID))
	}
	basePaymentKobo := s.resolveBasePayment(party.AgentPaymentAllocationKobo, roleKey, stateName)
	if basePaymentKobo <= 0 {
		basePaymentKobo = 2000000 // default 2,000,000 Kobo fallback
	}

	// 6. Calculate days to election & cumulative quota from windows
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	daysToElection := 0
	if eg.ElectionDate.Valid {
		diff := eg.ElectionDate.Time.Sub(today)
		daysToElection = int(math.Ceil(diff.Hours() / 24.0))
		if daysToElection < 0 {
			daysToElection = 0
		}
	}

	allowedCumulativeQuota := 0
	for _, win := range testReq.Windows {
		if daysToElection <= win.DaysBeforeElection {
			allowedCumulativeQuota += win.Quota
		}
	}
	if allowedCumulativeQuota > testReq.TotalRequired {
		allowedCumulativeQuota = testReq.TotalRequired
	}

	// 7. Count paid tests already taken
	paidTestsCount := 0
	existingTest, err := s.q.GetPracticeTest(ctx, queries.GetPracticeTestParams{
		UserID:          userID,
		ElectionGroupID: pgtype.Int8{Int64: electionGroupID, Valid: true},
		Role:            roleKey,
	})
	if err == nil && len(existingTest.TestAttempts) > 0 {
		var attempts []map[string]interface{}
		if err := json.Unmarshal(existingTest.TestAttempts, &attempts); err == nil {
			for _, att := range attempts {
				if paid, ok := att["been_paid"].(bool); ok && paid {
					paidTestsCount++
				} else if earned, ok := att["earned_amount_kobo"].(float64); ok && earned > 0 {
					paidTestsCount++
				}
			}
		}
	}

	remainingQuota := allowedCumulativeQuota - paidTestsCount
	if remainingQuota <= 0 {
		slog.Info("earnings: test submission exceeds allowed window quota",
			"userID", userID, "daysToElection", daysToElection, "allowedQuota", allowedCumulativeQuota, "paidCount", paidTestsCount)
		return PracticeTestPayoutResult{
			Eligible:     false,
			AssignmentID: asgnInfo.ID,
			PartyID:      asgnInfo.PartyID,
		}, nil
	}

	// 8. Compute payout amount
	totalReadinessPayKobo := float64(basePaymentKobo) * (readinessPct / 100.0)
	payPerTestKobo := totalReadinessPayKobo / float64(testReq.TotalRequired)
	earnedKobo := int64(math.Round(payPerTestKobo * (finalScore / 100.0)))

	slog.Info("earnings: practice test payout evaluated",
		"userID", userID,
		"daysToElection", daysToElection,
		"allowedQuota", allowedCumulativeQuota,
		"paidCount", paidTestsCount,
		"payPerTestKobo", payPerTestKobo,
		"finalScore", finalScore,
		"earnedKobo", earnedKobo,
	)

	return PracticeTestPayoutResult{
		Eligible:         true,
		EarnedAmountKobo: earnedKobo,
		AssignmentID:     asgnInfo.ID,
		PartyID:          asgnInfo.PartyID,
	}, nil
}

func (s *Service) ProcessPracticeTestPayout(
	ctx context.Context,
	userID int64,
	electionGroupID int64,
	roleType string,
	earnedKobo int64,
	testRecordID int64,
) error {
	if s.pool == nil || earnedKobo <= 0 {
		return nil
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	qtx := s.q.WithTx(tx)

	// 1. Update assignment earned_amount_kobo based on role
	switch roleType {
	case "polling_agent", "pollingagent":
		_, _ = qtx.UpdatePollingUnitAssignmentEarnedAmountKobo(ctx, queries.UpdatePollingUnitAssignmentEarnedAmountKoboParams{
			UserID:          userID,
			ElectionGroupID: electionGroupID,
			EarnedDeltaKobo: earnedKobo,
		})
	case "state_election_supervisor", "state_supervisor":
		_, _ = qtx.UpdateStateSupervisorEarnedAmountKobo(ctx, queries.UpdateStateSupervisorEarnedAmountKoboParams{
			UserID:          userID,
			ElectionGroupID: electionGroupID,
			EarnedDeltaKobo: earnedKobo,
		})
	case "lga_election_supervisor", "lga_supervisor":
		_, _ = qtx.UpdateLgaSupervisorEarnedAmountKobo(ctx, queries.UpdateLgaSupervisorEarnedAmountKoboParams{
			UserID:          userID,
			ElectionGroupID: electionGroupID,
			EarnedDeltaKobo: earnedKobo,
		})
	case "ward_election_supervisor", "ward_supervisor":
		_, _ = qtx.UpdateWardSupervisorEarnedAmountKobo(ctx, queries.UpdateWardSupervisorEarnedAmountKoboParams{
			UserID:          userID,
			ElectionGroupID: electionGroupID,
			EarnedDeltaKobo: earnedKobo,
		})
	}

	// 2. Credit User Wallet
	wallet, wErr := qtx.GetUserWalletByUserID(ctx, userID)
	if wErr != nil {
		slog.Warn("earnings: user has no wallet for practice test payout", "userID", userID, "error", wErr)
	} else {
		updatedWallet, creditErr := qtx.CreditUserWallet(ctx, queries.CreditUserWalletParams{
			BalanceKobo: earnedKobo,
			ID:          wallet.ID,
		})
		if creditErr != nil {
			return fmt.Errorf("credit wallet: %w", creditErr)
		}

		txRef := fmt.Sprintf("practice-test-readiness-%d-%d", testRecordID, time.Now().UnixNano())
		if _, txErr := qtx.CreateUserWalletTransaction(ctx, queries.CreateUserWalletTransactionParams{
			WalletID:             wallet.ID,
			TransactionReference: txRef,
			Type:                 "credit",
			AmountKobo:           earnedKobo,
			BalanceAfterKobo:     updatedWallet.BalanceKobo,
			Narration:            pgtype.Text{String: fmt.Sprintf("Practice test readiness payout (%s)", roleType), Valid: true},
		}); txErr != nil {
			return fmt.Errorf("create wallet tx: %w", txErr)
		}
	}

	return tx.Commit(ctx)
}

// resolveBasePayment extracts the kobo amount from agent_payment_allocation JSONB.
// Format: {"polling_agent": {"default": 2000000, "states": {"lagos": 2500000}}}
func (s *Service) resolveBasePayment(rawJSON []byte, roleType, stateName string) int64 {
	var alloc map[string]rolePaymentConfig
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

	// Check for a state-specific override (case-insensitive key match)
	lowerState := strings.ToLower(stateName)
	for k, v := range cfg.States {
		if strings.ToLower(k) == lowerState {
			return v
		}
	}
	return cfg.Default
}

// isWithinWindow returns true if testCompletedAt falls within the band defined by
// [electionDate - window.daysBeforeElection, electionDate - nextWindow.daysBeforeElection).
// Windows must be sorted from furthest to closest (descending days_before_election).
func isWithinWindow(testTime time.Time, electionDate time.Time, window testWindow, nextDays int) bool {
	windowStart := electionDate.AddDate(0, 0, -window.DaysBeforeElection)
	windowEnd := electionDate.AddDate(0, 0, -nextDays)
	return !testTime.Before(windowStart) && testTime.Before(windowEnd)
}

// ─── CalculatePotentialPayout ──────────────────────────────────────────────────

type PotentialPayoutResult struct {
	AssignmentID        int64  `json:"assignment_id"`
	TaskType            string `json:"task_type"`
	PotentialPayoutKobo int64  `json:"potential_payout_kobo"`
	IsEligible          bool   `json:"is_eligible"`
	Reason              string `json:"reason"`
}

// CalculatePotentialPayout calculates the potential payout (in Kobo) for performing a specific task type.
func (s *Service) CalculatePotentialPayout(ctx context.Context, assignmentID int64, taskType string) (PotentialPayoutResult, error) {
	asgn, err := s.q.GetAssignmentForEarnings(ctx, assignmentID)
	if err != nil {
		return PotentialPayoutResult{}, fmt.Errorf("get assignment: %w", err)
	}

	roleType := "polling_agent"
	if asgn.RoleType.Valid && asgn.RoleType.String != "" {
		roleType = asgn.RoleType.String
	}

	// Determine base payment
	basePaymentKobo := asgn.PotentialPaymentKobo
	if basePaymentKobo <= 0 {
		party, err := s.q.GetPartyByID(ctx, asgn.PartyID)
		if err == nil {
			basePaymentKobo = s.resolveBasePayment(party.AgentPaymentAllocationKobo, roleType, asgn.StateName)
		}
	}
	if basePaymentKobo <= 0 {
		basePaymentKobo = 2000000 // default 20,000 NGN (2,000,000 Kobo) fallback
	}

	// Election day check for non-readiness tasks
	now := time.Now().UTC()
	if taskType != "readiness" {
		if !asgn.ElectionDate.Valid || now.Format("2006-01-02") != asgn.ElectionDate.Time.Format("2006-01-02") {
			return PotentialPayoutResult{
				AssignmentID:        assignmentID,
				TaskType:            taskType,
				PotentialPayoutKobo: 0,
				IsEligible:          false,
				Reason:              "Task type is only eligible on election day",
			}, nil
		}
	}

	// Fetch earnings allocation for role
	allocationKey := fmt.Sprintf("earnings_allocation_%s", strings.ReplaceAll(roleType, " ", "_"))
	allocationSetting, err := s.q.GetSystemSetting(ctx, allocationKey)
	if err != nil {
		return PotentialPayoutResult{}, fmt.Errorf("get earnings allocation setting %q: %w", allocationKey, err)
	}
	var allocation earningsAllocation
	if err := json.Unmarshal(allocationSetting.Value, &allocation); err != nil {
		return PotentialPayoutResult{}, fmt.Errorf("parse earnings allocation: %w", err)
	}

	switch taskType {
	case "readiness":
		reqKey := fmt.Sprintf("test_requirements_%s", strings.ReplaceAll(roleType, " ", "_"))
		totalRequired := 10
		if reqSetting, err := s.q.GetSystemSetting(ctx, reqKey); err == nil {
			var testReq testRequirements
			if jErr := json.Unmarshal(reqSetting.Value, &testReq); jErr == nil && testReq.TotalRequired > 0 {
				totalRequired = testReq.TotalRequired
			}
		}
		readinessBudgetKobo := float64(basePaymentKobo) * (allocation.Readiness / 100.0)
		payout := int64(readinessBudgetKobo / float64(totalRequired))
		return PotentialPayoutResult{
			AssignmentID:        assignmentID,
			TaskType:            taskType,
			PotentialPayoutKobo: payout,
			IsEligible:          true,
			Reason:              "Potential payout for practice test completion",
		}, nil

	case "results":
		expected := asgn.ResultsExpectedToSubmitCount
		if expected <= 0 {
			expected = 1
		}
		if asgn.ResultsSubmittedCount >= expected {
			return PotentialPayoutResult{
				AssignmentID:        assignmentID,
				TaskType:            taskType,
				PotentialPayoutKobo: 0,
				IsEligible:          false,
				Reason:              "Results requirement already completed",
			}, nil
		}
		resultsBudgetKobo := float64(basePaymentKobo) * (allocation.Results / 100.0)
		payout := int64(resultsBudgetKobo / float64(expected))
		return PotentialPayoutResult{
			AssignmentID:        assignmentID,
			TaskType:            taskType,
			PotentialPayoutKobo: payout,
			IsEligible:          true,
			Reason:              "Potential payout for submitting election result",
		}, nil

	case "attendance":
		if asgn.ArrivedAt.Valid {
			return PotentialPayoutResult{
				AssignmentID:        assignmentID,
				TaskType:            taskType,
				PotentialPayoutKobo: 0,
				IsEligible:          false,
				Reason:              "Attendance video already submitted",
			}, nil
		}
		payout := int64(float64(basePaymentKobo) * (allocation.Attendance / 100.0))
		return PotentialPayoutResult{
			AssignmentID:        assignmentID,
			TaskType:            taskType,
			PotentialPayoutKobo: payout,
			IsEligible:          true,
			Reason:              "Potential payout for submitting attendance",
		}, nil

	case "election_start":
		if asgn.ElectionStartedAt.Valid {
			return PotentialPayoutResult{
				AssignmentID:        assignmentID,
				TaskType:            taskType,
				PotentialPayoutKobo: 0,
				IsEligible:          false,
				Reason:              "Election start video already submitted",
			}, nil
		}
		payout := int64(float64(basePaymentKobo) * (allocation.ElectionStart / 100.0))
		return PotentialPayoutResult{
			AssignmentID:        assignmentID,
			TaskType:            taskType,
			PotentialPayoutKobo: payout,
			IsEligible:          true,
			Reason:              "Potential payout for submitting election start video",
		}, nil

	case "election_end":
		if asgn.ElectionEndedAt.Valid {
			return PotentialPayoutResult{
				AssignmentID:        assignmentID,
				TaskType:            taskType,
				PotentialPayoutKobo: 0,
				IsEligible:          false,
				Reason:              "Election end video already submitted",
			}, nil
		}
		payout := int64(float64(basePaymentKobo) * (allocation.ElectionEnd / 100.0))
		return PotentialPayoutResult{
			AssignmentID:        assignmentID,
			TaskType:            taskType,
			PotentialPayoutKobo: payout,
			IsEligible:          true,
			Reason:              "Potential payout for submitting election end video",
		}, nil

	case "live_voters_referred":
		var targetLiveVoters float64 = 20
		if lvrSetting, err := s.q.GetSystemSetting(ctx, "target_live_voters_referred_count"); err == nil {
			_ = json.Unmarshal(lvrSetting.Value, &targetLiveVoters)
		}
		if targetLiveVoters <= 0 {
			targetLiveVoters = 20
		}
		if float64(asgn.LiveVotersReferredCount) >= targetLiveVoters {
			return PotentialPayoutResult{
				AssignmentID:        assignmentID,
				TaskType:            taskType,
				PotentialPayoutKobo: 0,
				IsEligible:          false,
				Reason:              "Live voters referral target reached",
			}, nil
		}
		lvrBudgetKobo := float64(basePaymentKobo) * (allocation.GetLiveVotersPct() / 100.0)
		payout := int64(lvrBudgetKobo / targetLiveVoters)
		return PotentialPayoutResult{
			AssignmentID:        assignmentID,
			TaskType:            taskType,
			PotentialPayoutKobo: payout,
			IsEligible:          true,
			Reason:              "Potential payout for referring live voter",
		}, nil

	case "updates":
		var targetUpdates float64 = 20
		startTimeStr := "07:00"
		endTimeStr := "17:00"
		intervalMinutes := 30

		if schedSetting, err := s.q.GetSystemSetting(ctx, "update_schedule_config"); err == nil {
			var cfg struct {
				TargetUpdatesCount float64 `json:"target_updates_count"`
				StartTime          string  `json:"start_time"`
				EndTime            string  `json:"end_time"`
				IntervalMinutes    int     `json:"interval_minutes"`
			}
			if jErr := json.Unmarshal(schedSetting.Value, &cfg); jErr == nil {
				if cfg.TargetUpdatesCount > 0 {
					targetUpdates = cfg.TargetUpdatesCount
				}
				if cfg.StartTime != "" {
					startTimeStr = cfg.StartTime
				}
				if cfg.EndTime != "" {
					endTimeStr = cfg.EndTime
				}
				if cfg.IntervalMinutes > 0 {
					intervalMinutes = cfg.IntervalMinutes
				}
			}
		}

		// Check time window
		locNow := time.Now()
		const timeFmt = "15:04"
		startT, sErr := time.Parse(timeFmt, startTimeStr)
		endT, eErr := time.Parse(timeFmt, endTimeStr)
		if sErr == nil && eErr == nil {
			nowMins := locNow.Hour()*60 + locNow.Minute()
			startMins := startT.Hour()*60 + startT.Minute()
			endMins := endT.Hour()*60 + endT.Minute()

			if nowMins < startMins || nowMins >= endMins {
				return PotentialPayoutResult{
					AssignmentID:        assignmentID,
					TaskType:            taskType,
					PotentialPayoutKobo: 0,
					IsEligible:          false,
					Reason:              fmt.Sprintf("Current time %s is outside update schedule window (%s - %s)", locNow.Format("15:04"), startTimeStr, endTimeStr),
				}, nil
			}
		}

		// Calculate current interval key
		flooredMin := (locNow.Minute() / intervalMinutes) * intervalMinutes
		currentIntervalKey := fmt.Sprintf("%02d:%02d", locNow.Hour(), flooredMin)

		// Check interval_updates JSONB map
		var intervalMap map[string]int
		if len(asgn.IntervalUpdates) > 0 {
			_ = json.Unmarshal(asgn.IntervalUpdates, &intervalMap)
		}
		if count, exists := intervalMap[currentIntervalKey]; exists && count > 0 {
			return PotentialPayoutResult{
				AssignmentID:        assignmentID,
				TaskType:            taskType,
				PotentialPayoutKobo: 0,
				IsEligible:          false,
				Reason:              fmt.Sprintf("Update already submitted for interval %s", currentIntervalKey),
			}, nil
		}

		updatesBudgetKobo := float64(basePaymentKobo) * (allocation.Updates / 100.0)
		payout := int64(updatesBudgetKobo / targetUpdates)
		return PotentialPayoutResult{
			AssignmentID:        assignmentID,
			TaskType:            taskType,
			PotentialPayoutKobo: payout,
			IsEligible:          true,
			Reason:              fmt.Sprintf("Current time is within a new unfulfilled interval (%s)", currentIntervalKey),
		}, nil

	default:
		return PotentialPayoutResult{}, fmt.Errorf("invalid task_type %q", taskType)
	}
}

type EstimatePayoutResult struct {
	TaskType            string `json:"task_type"`
	Role                string `json:"role"`
	PotentialPayoutKobo int64  `json:"potential_payout_kobo"`
	IsEligible          bool   `json:"is_eligible"`
	Reason              string `json:"reason"`
}

// EstimatePotentialPayout calculates unconstrained potential payout for a task type without requiring an assignment or checking election day status.
func (s *Service) EstimatePotentialPayout(
	ctx context.Context,
	taskType string,
	reqRole string,
	electionGroupID int64,
	partyID int16,
) (EstimatePayoutResult, error) {
	roleType := reqRole
	if roleType == "" {
		roleType = "polling_agent"
	}
	normRole := strings.ReplaceAll(roleType, "-", "_")
	switch normRole {
	case "pollingagent":
		normRole = "polling_agent"
	case "ward_supervisor":
		normRole = "ward_election_supervisor"
	case "lga_supervisor":
		normRole = "lga_election_supervisor"
	case "state_supervisor":
		normRole = "state_election_supervisor"
	}

	var basePaymentKobo int64
	if partyID > 0 {
		if party, err := s.q.GetPartyByID(ctx, partyID); err == nil {
			basePaymentKobo = s.resolveBasePayment(party.AgentPaymentAllocationKobo, normRole, "")
		}
	}
	if basePaymentKobo <= 0 {
		basePaymentKobo = 2000000 // default 2,000,000 Kobo (20,000 NGN)
	}

	allocationKey := fmt.Sprintf("earnings_allocation_%s", strings.ReplaceAll(normRole, " ", "_"))
	allocationSetting, err := s.q.GetSystemSetting(ctx, allocationKey)
	if err != nil {
		return EstimatePayoutResult{}, fmt.Errorf("get earnings allocation setting %q: %w", allocationKey, err)
	}
	var allocation earningsAllocation
	if err := json.Unmarshal(allocationSetting.Value, &allocation); err != nil {
		return EstimatePayoutResult{}, fmt.Errorf("parse earnings allocation: %w", err)
	}

	var payout int64
	switch taskType {
	case "readiness":
		reqKey := fmt.Sprintf("test_requirements_%s", strings.ReplaceAll(normRole, " ", "_"))
		totalRequired := 10
		if reqSetting, err := s.q.GetSystemSetting(ctx, reqKey); err == nil {
			var testReq testRequirements
			if jErr := json.Unmarshal(reqSetting.Value, &testReq); jErr == nil && testReq.TotalRequired > 0 {
				totalRequired = testReq.TotalRequired
			}
		}
		readinessBudgetKobo := float64(basePaymentKobo) * (allocation.Readiness / 100.0)
		payout = int64(readinessBudgetKobo / float64(totalRequired))

	case "results":
		resultsBudgetKobo := float64(basePaymentKobo) * (allocation.Results / 100.0)
		payout = int64(resultsBudgetKobo)

	case "attendance":
		payout = int64(float64(basePaymentKobo) * (allocation.Attendance / 100.0))

	case "election_start":
		payout = int64(float64(basePaymentKobo) * (allocation.ElectionStart / 100.0))

	case "election_end":
		payout = int64(float64(basePaymentKobo) * (allocation.ElectionEnd / 100.0))

	case "live_voters_referred":
		var targetLiveVoters float64 = 20
		if lvrSetting, err := s.q.GetSystemSetting(ctx, "target_live_voters_referred_count"); err == nil {
			_ = json.Unmarshal(lvrSetting.Value, &targetLiveVoters)
		}
		if targetLiveVoters <= 0 {
			targetLiveVoters = 20
		}
		lvrBudgetKobo := float64(basePaymentKobo) * (allocation.GetLiveVotersPct() / 100.0)
		payout = int64(lvrBudgetKobo / targetLiveVoters)

	case "updates":
		var targetUpdates float64 = 20
		if schedSetting, err := s.q.GetSystemSetting(ctx, "update_schedule_config"); err == nil {
			var cfg struct {
				TargetUpdatesCount float64 `json:"target_updates_count"`
			}
			if jErr := json.Unmarshal(schedSetting.Value, &cfg); jErr == nil && cfg.TargetUpdatesCount > 0 {
				targetUpdates = cfg.TargetUpdatesCount
			}
		}
		updatesBudgetKobo := float64(basePaymentKobo) * (allocation.Updates / 100.0)
		payout = int64(updatesBudgetKobo / targetUpdates)

	default:
		return EstimatePayoutResult{}, fmt.Errorf("invalid task_type %q", taskType)
	}

	return EstimatePayoutResult{
		TaskType:            taskType,
		Role:                normRole,
		PotentialPayoutKobo: payout,
		IsEligible:          true,
		Reason:              "Estimated potential payout for task type",
	}, nil
}

// ─── GetAgentAllocations ───────────────────────────────────────────────────────

type AllocationItem struct {
	TaskType            string  `json:"task_type"`
	Label               string  `json:"label"`
	Percentage          float64 `json:"percentage"`
	PotentialPayoutKobo int64   `json:"potential_payout_kobo"`
}

type AgentAllocationsResponse struct {
	RoleType             string           `json:"role_type"`
	PotentialPaymentKobo int64            `json:"potential_payment_kobo"`
	Allocations          []AllocationItem `json:"allocations"`
	TotalPercentage      float64          `json:"total_percentage"`
}

func (s *Service) GetAgentAllocations(
	ctx context.Context,
	userID int64,
	electionGroupID int64,
	reqRoleType string,
	assignmentID int64,
) (AgentAllocationsResponse, error) {
	var roleType string
	var potentialPaymentKobo int64
	var partyID int16
	var stateName string

	// 1. If assignmentID is explicitly provided, fetch assignment for polling agent
	if assignmentID > 0 {
		if asgn, err := s.q.GetAssignmentForEarnings(ctx, assignmentID); err == nil {
			if asgn.RoleType.Valid && asgn.RoleType.String != "" {
				roleType = asgn.RoleType.String
			} else {
				roleType = "polling_agent"
			}
			potentialPaymentKobo = asgn.PotentialPaymentKobo
			partyID = asgn.PartyID
			stateName = asgn.StateName
		}
	}

	// 2. Check polling_unit_assignments by user & election_group
	if roleType == "" && electionGroupID > 0 && userID > 0 {
		if asgnID, err := s.q.GetAssignmentIDByUserAndElectionGroup(ctx, queries.GetAssignmentIDByUserAndElectionGroupParams{
			UserID:          userID,
			ElectionGroupID: electionGroupID,
		}); err == nil && asgnID > 0 {
			if asgn, err := s.q.GetAssignmentForEarnings(ctx, asgnID); err == nil {
				if asgn.RoleType.Valid && asgn.RoleType.String != "" {
					roleType = asgn.RoleType.String
				} else {
					roleType = "polling_agent"
				}
				potentialPaymentKobo = asgn.PotentialPaymentKobo
				partyID = asgn.PartyID
				stateName = asgn.StateName
			}
		}
	}

	// 3. Check ward_election_supervisors
	if roleType == "" && electionGroupID > 0 && userID > 0 {
		if wardSup, err := s.q.GetWardSupervisorByElectionGroup(ctx, queries.GetWardSupervisorByElectionGroupParams{
			UserID:          userID,
			ElectionGroupID: electionGroupID,
		}); err == nil && wardSup.ID > 0 {
			roleType = "ward_supervisor"
			potentialPaymentKobo = wardSup.PotentialPaymentKobo
			partyID = wardSup.PartyID
		}
	}

	// 4. Check lga_election_supervisors
	if roleType == "" && electionGroupID > 0 && userID > 0 {
		if lgaSup, err := s.q.GetLgaSupervisorByElectionGroup(ctx, queries.GetLgaSupervisorByElectionGroupParams{
			UserID:          userID,
			ElectionGroupID: electionGroupID,
		}); err == nil && lgaSup.ID > 0 {
			roleType = "lga_supervisor"
			potentialPaymentKobo = lgaSup.PotentialPaymentKobo
			partyID = lgaSup.PartyID
		}
	}

	// 5. Check state_election_supervisors
	if roleType == "" && electionGroupID > 0 && userID > 0 {
		if stateSup, err := s.q.GetStateSupervisorByElectionGroup(ctx, queries.GetStateSupervisorByElectionGroupParams{
			UserID:          userID,
			ElectionGroupID: electionGroupID,
		}); err == nil && stateSup.ID > 0 {
			roleType = "state_supervisor"
			potentialPaymentKobo = stateSup.PotentialPaymentKobo
			partyID = stateSup.PartyID
		}
	}

	// Fallback to requested roleType or default "polling_agent"
	if roleType == "" {
		if reqRoleType != "" {
			roleType = reqRoleType
		} else {
			roleType = "polling_agent"
		}
	}

	// If potentialPaymentKobo is missing, resolve base payment from party allocation
	if potentialPaymentKobo <= 0 && partyID > 0 {
		if party, err := s.q.GetPartyByID(ctx, partyID); err == nil {
			potentialPaymentKobo = s.resolveBasePayment(party.AgentPaymentAllocationKobo, roleType, stateName)
		}
	}
	if potentialPaymentKobo <= 0 {
		potentialPaymentKobo = 2000000 // default 2,000,000 Kobo (20,000 NGN)
	}

	// Fetch earnings allocation for role
	allocationKey := fmt.Sprintf("earnings_allocation_%s", strings.ReplaceAll(roleType, " ", "_"))
	allocationSetting, err := s.q.GetSystemSetting(ctx, allocationKey)
	if err != nil {
		return AgentAllocationsResponse{}, fmt.Errorf("get earnings allocation setting %q: %w", allocationKey, err)
	}
	var alloc earningsAllocation
	if err := json.Unmarshal(allocationSetting.Value, &alloc); err != nil {
		return AgentAllocationsResponse{}, fmt.Errorf("parse earnings allocation: %w", err)
	}

	liveVotersPct := alloc.GetLiveVotersPct()

	items := []AllocationItem{
		{
			TaskType:            "readiness",
			Label:               "Practice Tests Readiness",
			Percentage:          alloc.Readiness,
			PotentialPayoutKobo: int64(float64(potentialPaymentKobo) * (alloc.Readiness / 100.0)),
		},
		{
			TaskType:            "results",
			Label:               "Election Results",
			Percentage:          alloc.Results,
			PotentialPayoutKobo: int64(float64(potentialPaymentKobo) * (alloc.Results / 100.0)),
		},
		{
			TaskType:            "updates",
			Label:               "Periodic Situation Updates",
			Percentage:          alloc.Updates,
			PotentialPayoutKobo: int64(float64(potentialPaymentKobo) * (alloc.Updates / 100.0)),
		},
		{
			TaskType:            "attendance",
			Label:               "Polling Unit Arrival Video",
			Percentage:          alloc.Attendance,
			PotentialPayoutKobo: int64(float64(potentialPaymentKobo) * (alloc.Attendance / 100.0)),
		},
		{
			TaskType:            "election_start",
			Label:               "Election Commencement Video",
			Percentage:          alloc.ElectionStart,
			PotentialPayoutKobo: int64(float64(potentialPaymentKobo) * (alloc.ElectionStart / 100.0)),
		},
		{
			TaskType:            "election_end",
			Label:               "Election Conclusion Video",
			Percentage:          alloc.ElectionEnd,
			PotentialPayoutKobo: int64(float64(potentialPaymentKobo) * (alloc.ElectionEnd / 100.0)),
		},
		{
			TaskType:            "live_voters_referred",
			Label:               "Live Voters Referred",
			Percentage:          liveVotersPct,
			PotentialPayoutKobo: int64(float64(potentialPaymentKobo) * (liveVotersPct / 100.0)),
		},
	}

	totalPct := alloc.Readiness + alloc.Results + alloc.Updates + alloc.Attendance + alloc.ElectionStart + alloc.ElectionEnd + liveVotersPct

	return AgentAllocationsResponse{
		RoleType:             roleType,
		PotentialPaymentKobo: potentialPaymentKobo,
		Allocations:          items,
		TotalPercentage:      totalPct,
	}, nil
}


