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
	Readiness        float64 `json:"readiness"`
	Results          float64 `json:"results"`
	Updates          float64 `json:"updates"`
	Attendance       float64 `json:"attendance"`
	ElectionStart    float64 `json:"election_start"`
	ElectionEnd      float64 `json:"election_end"`
	LiveVotersReferred float64 `json:"live_voters_referred"`
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

	// 2. Fetch target_updates_count
	updatesTargetSetting, err := q.GetSystemSetting(ctx, "target_updates_count")
	if err != nil {
		return queries.AgentEarning{}, fmt.Errorf("get target_updates_count: %w", err)
	}
	var targetUpdatesCount float64
	if err := json.Unmarshal(updatesTargetSetting.Value, &targetUpdatesCount); err != nil {
		targetUpdatesCount = 20
	}

	// 3. Fetch live_voters_referred target
	lvrTargetSetting, err := q.GetSystemSetting(ctx, "live_voters_referred")
	if err != nil {
		return queries.AgentEarning{}, fmt.Errorf("get live_voters_referred: %w", err)
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
	liveVotersEarned   := factorEarned(basePaymentKobo, allocation.LiveVotersReferred, liveVotersScore)

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
				Narration:            pgtype.Text{String: "Practice test readiness earnings", Valid: true},
				RawPayload:           nil,
			}); txErr != nil {
				slog.Error("earnings: failed to record wallet transaction", "ref", txRef, "error", txErr)
				return
			}
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
	switch roleType {
	case "polling_agent", "pollingagent":
		asgnID, err := s.q.GetAssignmentIDByUserAndElectionGroup(ctx, queries.GetAssignmentIDByUserAndElectionGroupParams{
			UserID:          userID,
			ElectionGroupID: electionGroupID,
		})
		if err != nil {
			return nil, err
		}
		asgn, err := s.q.GetAssignmentForEarnings(ctx, asgnID)
		if err != nil {
			return nil, err
		}
		return &AssignmentInfo{ID: asgn.ID, PartyID: asgn.PartyID, StateID: 0}, nil

	case "state_election_supervisor", "state_supervisor":
		sup, err := s.q.GetStateSupervisorByElectionGroup(ctx, queries.GetStateSupervisorByElectionGroupParams{
			UserID:          userID,
			ElectionGroupID: electionGroupID,
		})
		if err != nil {
			return nil, err
		}
		return &AssignmentInfo{ID: sup.ID, PartyID: sup.PartyID, StateID: sup.StateID}, nil

	case "lga_election_supervisor", "lga_supervisor":
		sup, err := s.q.GetLgaSupervisorByElectionGroup(ctx, queries.GetLgaSupervisorByElectionGroupParams{
			UserID:          userID,
			ElectionGroupID: electionGroupID,
		})
		if err != nil {
			return nil, err
		}
		return &AssignmentInfo{ID: sup.ID, PartyID: sup.PartyID, StateID: sup.StateID}, nil

	case "ward_election_supervisor", "ward_supervisor":
		sup, err := s.q.GetWardSupervisorByElectionGroup(ctx, queries.GetWardSupervisorByElectionGroupParams{
			UserID:          userID,
			ElectionGroupID: electionGroupID,
		})
		if err != nil {
			return nil, err
		}
		return &AssignmentInfo{ID: sup.ID, PartyID: sup.PartyID, StateID: sup.StateID}, nil
	}
	return nil, fmt.Errorf("unknown role: %s", roleType)
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
	asgnInfo, err := s.getAssignmentInfo(ctx, userID, electionGroupID, roleType)
	if err != nil {
		slog.Info("earnings: user has no assignment for role/election group", "userID", userID, "electionGroupID", electionGroupID, "roleType", roleType)
		return PracticeTestPayoutResult{Eligible: false}, nil
	}

	// 3. Fetch earnings allocation for role (e.g. earnings_allocation_polling_agent)
	roleKey := strings.ReplaceAll(roleType, "-", "_")
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
	basePaymentKobo := s.resolveBasePayment(party.AgentPaymentAllocationKobo, roleType, stateName)

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
		Role:            roleType,
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

	cfg, ok := alloc[roleType]
	if !ok {
		camel := roleToCamel(roleType)
		cfg, ok = alloc[camel]
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

// roleToCamel converts DB role strings like "polling_agent" → "pollingAgent"
func roleToCamel(role string) string {
	parts := strings.Split(role, "_")
	for i := 1; i < len(parts); i++ {
		if len(parts[i]) > 0 {
			parts[i] = strings.ToUpper(parts[i][:1]) + parts[i][1:]
		}
	}
	return strings.Join(parts, "")
}

// isWithinWindow returns true if testCompletedAt falls within the band defined by
// [electionDate - window.daysBeforeElection, electionDate - nextWindow.daysBeforeElection).
// Windows must be sorted from furthest to closest (descending days_before_election).
func isWithinWindow(testTime time.Time, electionDate time.Time, window testWindow, nextDays int) bool {
	windowStart := electionDate.AddDate(0, 0, -window.DaysBeforeElection)
	windowEnd := electionDate.AddDate(0, 0, -nextDays)
	return !testTime.Before(windowStart) && testTime.Before(windowEnd)
}
