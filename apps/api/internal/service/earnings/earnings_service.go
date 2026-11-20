package earningsservice

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
)

// ─── Service ─────────────────────────────────────────────────────────────────

type partiesService interface {
	GetPartyByID(ctx context.Context, partyID int16) (queries.Party, error)
}

type usersWalletService interface {
	CreditUserWallet(
		ctx context.Context,
		userID int64,
		amountKobo int64,
		transactionReference string,
		payerName, payerAccountNumber, payerBankCode, narration string,
		rawPayload []byte,
	) (queries.UserWalletTransaction, error)
}

type Service struct {
	queries    *queries.Queries
	pool       *pgxpool.Pool
	rdb        *redis.Client
	partiesSvc partiesService
	usersSvc   usersWalletService
}

func NewService(q *queries.Queries, pool *pgxpool.Pool, rdb *redis.Client) *Service {
	return &Service{queries: q, pool: pool, rdb: rdb}
}

// SetPartiesService sets the parties service for caching party lookups.
func (s *Service) SetPartiesService(partiesSvc partiesService) {
	s.partiesSvc = partiesSvc
}

// SetUsersService sets the users/wallet service for crediting agent earnings.
func (s *Service) SetUsersService(usersSvc usersWalletService) {
	s.usersSvc = usersSvc
}

// getPartyByID fetches party details via the Redis-cached partiesService.
func (s *Service) getPartyByID(ctx context.Context, partyID int16) (queries.Party, error) {
	return s.partiesSvc.GetPartyByID(ctx, partyID)
}

// GetExpectedResultsCountForPU returns the number of contested elections that apply to a specific polling unit
// within an election group (e.g. Presidential + Senatorial + Federal Rep = 3).
// The result is cached in Redis for high-frequency evaluation.
func (s *Service) GetExpectedResultsCountForPU(ctx context.Context, electionGroupID int32, pollingUnitID int32) (int32, error) {
	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisElectionGroupExpectedElections, electionGroupID, pollingUnitID)
	if val, ok := utils.GetCachedJSON[int32](ctx, s.rdb, cacheKey); ok && val > 0 {
		return val, nil
	}

	count, err := s.queries.CountExpectedElectionsForPollingUnit(ctx, queries.CountExpectedElectionsForPollingUnitParams{
		PollingUnitID:   pollingUnitID,
		ElectionGroupID: electionGroupID,
	})
	if err != nil || count <= 0 {
		return 1, nil // Fallback to 1 to prevent division by zero
	}

	_ = utils.SetCachedJSON(ctx, s.rdb, cacheKey, count, db.RedisSevenDaysTTL)
	return count, nil
}

// ─── JSON shapes from DB ──────────────────────────────────────────────────────

type EarningsAllocation struct {
	Results       float64 `json:"results"`
	Updates       float64 `json:"updates"`
	Attendance    float64 `json:"attendance"`
	ElectionStart float64 `json:"election_start"`
	ElectionEnd   float64 `json:"election_end"`
}

type earningsAllocation = EarningsAllocation

type UpdateScheduleConfig struct {
	TargetUpdatesCount float64 `json:"target_updates_count"`
	StartTime          string  `json:"start_time"`
	EndTime            string  `json:"end_time"`
	IntervalMinutes    int     `json:"interval_minutes"`
}

// agentPaymentAllocation:
// {"polling_agent": {"default": 2000000}}
type rolePaymentConfig struct {
	Default int64 `json:"default"`
}

// ─── Calculate (public entry point) ──────────────────────────────────────────

// Calculate computes and upserts the agent_earnings row for a given assignment.
// It is safe to call repeatedly — each call refreshes the stored record.
func (s *Service) Calculate(ctx context.Context, assignmentID int64) (queries.AgentEarning, error) {
	asgn, err := s.queries.GetAssignmentForEarnings(ctx, assignmentID)
	if err != nil {
		return queries.AgentEarning{}, fmt.Errorf("get assignment: %w", err)
	}
	return s.calculateWithTx(ctx, s.queries, asgn)
}

// GetEarningsAllocation retrieves the percentage weights for each milestone task for a given role,
// using Redis cache (1 day TTL) with fallback to system_settings in the database.
func (s *Service) GetEarningsAllocation(ctx context.Context, roleType string) (EarningsAllocation, error) {
	cacheKey := fmt.Sprintf("%s%s", db.RedisEarningsAllocation, roleType)

	// Check Redis cache first
	if alloc, ok := utils.GetCachedJSON[EarningsAllocation](ctx, s.rdb, cacheKey); ok && (alloc.Results > 0 || alloc.Updates > 0 || alloc.Attendance > 0 || alloc.ElectionStart > 0 || alloc.ElectionEnd > 0) {
		return alloc, nil
	}

	defaultAlloc := EarningsAllocation{
		Results:       50,
		Updates:       30,
		Attendance:    10,
		ElectionStart: 5,
		ElectionEnd:   5,
	}

	// Fetch from system_settings
	allocationKey := fmt.Sprintf("earnings_allocation_%s", roleType)
	allocationSetting, err := s.queries.GetSystemSetting(ctx, allocationKey)
	if err != nil {
		return defaultAlloc, nil
	}

	// Parse configuration JSON
	alloc := defaultAlloc
	if len(allocationSetting.Value) > 0 {
		if err := json.Unmarshal(allocationSetting.Value, &alloc); err != nil {
			return defaultAlloc, nil
		}
	}

	// Cache resolved allocation in Redis for 1 day
	_ = utils.SetCachedJSON(ctx, s.rdb, cacheKey, alloc, db.RedisOneDayTTL)
	return alloc, nil
}

// GetUpdateScheduleConfig retrieves the update schedule settings,
// using Redis cache (1 day TTL) with fallback to system_settings in the database.
func (s *Service) GetUpdateScheduleConfig(ctx context.Context) (UpdateScheduleConfig, error) {
	cacheKey := db.RedisUpdateScheduleConfig

	if cfg, ok := utils.GetCachedJSON[UpdateScheduleConfig](ctx, s.rdb, cacheKey); ok && cfg.TargetUpdatesCount > 0 {
		return cfg, nil
	}

	defaultCfg := UpdateScheduleConfig{
		TargetUpdatesCount: 18,
		StartTime:          "08:00",
		EndTime:            "17:00",
		IntervalMinutes:    30,
	}

	setting, err := s.queries.GetSystemSetting(ctx, "update_schedule_config")
	if err != nil {
		return defaultCfg, nil
	}

	if len(setting.Value) > 0 {
		if err := json.Unmarshal(setting.Value, &defaultCfg); err != nil {
			return defaultCfg, nil
		}
	}

	_ = utils.SetCachedJSON(ctx, s.rdb, cacheKey, defaultCfg, db.RedisOneDayTTL)
	return defaultCfg, nil
}

// calculateWithTx performs the full earnings calculation using the given queries
// handle (which may be a transaction-scoped handle).
func (s *Service) calculateWithTx(ctx context.Context, q *queries.Queries, asgn queries.GetAssignmentForEarningsRow) (queries.AgentEarning, error) {
	roleType := "polling_agent"

	// 1. Fetch earnings allocation for this role (Redis cached)
	allocation, err := s.GetEarningsAllocation(ctx, roleType)
	if err != nil {
		return queries.AgentEarning{}, fmt.Errorf("get earnings allocation: %w", err)
	}

	// 2. Fetch update_schedule_config (Redis cached)
	updateScheduleConfig, _ := s.GetUpdateScheduleConfig(ctx)
	targetUpdatesCount := updateScheduleConfig.TargetUpdatesCount
	intervalMinutes := updateScheduleConfig.IntervalMinutes

	// 3. Fetch party to get base payment kobo (cached via partiesService)
	party, err := s.getPartyByID(ctx, asgn.PartyID)
	if err != nil {
		return queries.AgentEarning{}, fmt.Errorf("get party: %w", err)
	}

	// Resolves party-configured base payout for this role
	basePaymentKobo := s.resolveBasePayment(party.AgentPaymentAllocationKobo, roleType)

	// Expected results count: total contested elections applicable to this PU (e.g., Presidential + Senate + Reps)
	expectedResults, err := s.GetExpectedResultsCountForPU(ctx, asgn.ElectionGroupID, asgn.PollingUnitID)
	if err != nil || expectedResults <= 0 {
		expectedResults = 1
	}

	// Results score: percentage of expected election results submitted by the agent (0–100%)
	resultsScore := computeRatioScore(ComputeRatioScoreParams{
		Actual: float64(asgn.ResultsSubmittedCount),
		Target: float64(expectedResults),
	})

	// Updates score: situational reports scored by interval bucket spacing and GPS geo-fence proximity (1.0 on-site, 0.5 off-site/no GPS)
	// finally returns the percentage of updates achieved
	updatesScore := s.computeUpdatesScore(ctx, asgn, targetUpdatesCount, intervalMinutes)

	// Attendance score: binary milestone (100 if arrived, 0 if not) verifying agent presence at the polling unit
	attendanceScore := boolScore(asgn.ArrivedAt.Valid)

	// Election start score: binary milestone (100 if recorded, 0 if not) for reporting voting commencement
	electionStartScore := boolScore(asgn.ElectionStartedAt.Valid)

	// Election end score: binary milestone (100 if recorded, 0 if not) for reporting official voting conclusion
	electionEndScore := boolScore(asgn.ElectionEndedAt.Valid)

	// 5. Compute per-factor earnings (kobo)
	// Calculate payout for each task: base pay * task % * score %
	resultsEarned := factorEarned(basePaymentKobo, allocation.Results, resultsScore)
	updatesEarned := factorEarned(basePaymentKobo, allocation.Updates, updatesScore)
	attendanceEarned := factorEarned(basePaymentKobo, allocation.Attendance, attendanceScore)
	electionStartEarned := factorEarned(basePaymentKobo, allocation.ElectionStart, electionStartScore)
	electionEndEarned := factorEarned(basePaymentKobo, allocation.ElectionEnd, electionEndScore)

	// Total earned kobo accumulated across all milestone factors
	totalEarned := resultsEarned + updatesEarned + attendanceEarned + electionStartEarned + electionEndEarned

	// 6. Re-marshal allocation for snapshot storage
	allocationBytes, _ := json.Marshal(allocation)

	// 7. Upsert earnings record
	result, err := q.UpsertAgentEarnings(ctx, queries.UpsertAgentEarningsParams{
		UserID:                  asgn.UserID,
		PartyID:                 asgn.PartyID,
		ElectionGroupID:         asgn.ElectionGroupID,
		RoleType:                roleType,
		BasePaymentKobo:         basePaymentKobo,
		EarningsAllocation:      allocationBytes,
		ResultsScore:            toNumeric(resultsScore),
		UpdatesScore:            toNumeric(updatesScore),
		AttendanceScore:         toNumeric(attendanceScore),
		ElectionStartScore:      toNumeric(electionStartScore),
		ElectionEndScore:        toNumeric(electionEndScore),
		ResultsEarnedKobo:       resultsEarned,
		UpdatesEarnedKobo:       updatesEarned,
		AttendanceEarnedKobo:    attendanceEarned,
		ElectionStartEarnedKobo: electionStartEarned,
		ElectionEndEarnedKobo:   electionEndEarned,
		TotalEarnedKobo:         totalEarned,
	})
	if err != nil {
		return queries.AgentEarning{}, fmt.Errorf("upsert agent earnings: %w", err)
	}

	return result, nil
}

// ProcessTaskEarningsParams contains parameters to calculate and credit task milestone earnings.
type ProcessTaskEarningsParams struct {
	AssignmentID    int64  `json:"assignment_id"`
	TaskType        string `json:"task_type"`
	CustomNarration string `json:"custom_narration,omitempty"`
}

// ProcessTaskEarnings recalculates earnings for a given assignment and taskType,
// credits any positive delta for that specific task to the user's wallet, and creates
// a wallet transaction log. It is safe to call asynchronously or synchronously after task actions.
func (s *Service) ProcessTaskEarnings(ctx context.Context, params ProcessTaskEarningsParams) (int64, error) {
	// Begin atomic transaction for earnings recalculation and wallet payout
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("earnings: failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// starts transaction
	qtx := s.queries.WithTx(tx)

	// Fetch assignment snapshot including polling unit geo-coordinates
	asgn, err := qtx.GetAssignmentForEarnings(ctx, params.AssignmentID)
	if err != nil {
		return 0, fmt.Errorf("earnings: failed to get assignment: %w", err)
	}

	roleType := "polling_agent"

	// Incremental Delta Payout Pattern:
	// 1. Fetch current cumulative earnings record for this agent & election to check what has already been paid.
	// agent_earnings (user_id, election_group_id, role_type)
	// ├── attendance_earned_kobo
	// ├── election_start_earned_kobo
	// ├── election_end_earned_kobo
	// ├── updates_earned_kobo
	// └── results_earned_kobo
	oldEarnings, err := qtx.GetAgentEarningsByUserAndElectionGroupAndRole(ctx, queries.GetAgentEarningsByUserAndElectionGroupAndRoleParams{
		UserID:          asgn.UserID,
		ElectionGroupID: asgn.ElectionGroupID,
		RoleType:        roleType,
	})

	oldFactorEarned := int64(0)
	if err == nil {
		switch params.TaskType {
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
		}
	}

	// 2. Recalculate total achievement scores and new earnings across all factors with the latest submission included.
	newEarnings, err := s.calculateWithTx(ctx, qtx, asgn)
	if err != nil {
		return 0, fmt.Errorf("earnings: failed to calculate earnings: %w", err)
	}

	newFactorEarned := int64(0)
	switch params.TaskType {
	case "attendance":
		newFactorEarned = newEarnings.AttendanceEarnedKobo
	case "election_start":
		newFactorEarned = newEarnings.ElectionStartEarnedKobo
	case "election_end":
		newFactorEarned = newEarnings.ElectionEndEarnedKobo
	case "updates":
		newFactorEarned = newEarnings.UpdatesEarnedKobo
	case "results":
		newFactorEarned = newEarnings.ResultsEarnedKobo
	}

	// Resolve user-facing transaction narration for the wallet credit log
	narrationLabel := params.CustomNarration
	if narrationLabel == "" {
		switch params.TaskType {
		case "attendance":
			narrationLabel = "Polling Unit: Arrived"
		case "election_start":
			narrationLabel = "Election: Started"
		case "election_end":
			narrationLabel = "Election: Ended"
		case "updates":
			narrationLabel = "Update: Given"
		case "results":
			narrationLabel = "Results: Uploaded"
		default:
			narrationLabel = fmt.Sprintf("Task earnings (%s)", params.TaskType)
		}
	}

	// 3. Compute newly unlocked delta (new - old).
	// Only credit the positive difference to the wallet, guaranteeing idempotency and preventing duplicate payouts.
	delta := newFactorEarned - oldFactorEarned
	if delta > 0 {
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

	// 4. Delegate wallet credit to users/wallet service (atomic balance update + ledger entry).
	if delta > 0 && s.usersSvc != nil {
		txRef := fmt.Sprintf("%s-%d-%d", params.TaskType, params.AssignmentID, time.Now().UnixNano())
		if _, creditErr := s.usersSvc.CreditUserWallet(
			ctx,
			asgn.UserID,
			delta,
			txRef,
			"", "", "",
			narrationLabel,
			nil,
		); creditErr != nil {
			slog.Error("earnings: failed to credit wallet via usersService", "userID", asgn.UserID, "delta", delta, "err", creditErr)
			return delta, fmt.Errorf("earnings: failed to credit wallet: %w", creditErr)
		}
	}

	return delta, nil
}

// ─── Updates calculation ──────────────────────────────────────────────────────

// computeUpdatesScore derives the updates score (0–100) taking into account location verification
// and interval spacing (Option B: max 1 update credited per interval bucket, taking best weight in bucket):
// - Updates within the polling unit geo-fence (or when PU coordinates are missing from DB) receive full weight (1.0).
// - Updates lacking GPS or submitted outside the PU geo-fence (> 2,000m + device accuracy buffer) receive reduced weight (0.5).
func (s *Service) computeUpdatesScore(ctx context.Context, asgn queries.GetAssignmentForEarningsRow, targetUpdatesCount float64, intervalMinutes int) float64 {
	// Fetch all update timestamps and GPS coordinates for this assignment to evaluate interval spacing and geo-fence verification
	updates, err := s.queries.ListAssignmentUpdatesCoordinates(ctx, asgn.ID)
	if err != nil || len(updates) == 0 {
		return 0
	}

	if intervalMinutes <= 0 {
		intervalMinutes = 30
	}

	const baseMaxDistanceMeters = 2000.0   // 2km base tolerance radius for polling unit location
	const maxAccuracyBufferMeters = 1000.0 // Cap device inaccuracy buffer at 1km (yielding 2km–3km effective radius)
	const unverifiedWeight = 0.5           // 50% payout tier for updates lacking verified coordinates

	hasPuCoords := asgn.PuLatitude.Valid && asgn.PuLongitude.Valid &&
		asgn.PuLatitude.Float64 != 0 && asgn.PuLongitude.Float64 != 0

	// Group updates by interval bucket and track the highest weight achieved per interval
	// we want to make sure an update is been received at-least every 30mins
	bucketWeights := make(map[string]float64)

	// Process each update to determine its geofence credit and interval slot
	for _, update := range updates {
		creditWeight := unverifiedWeight // Default 0.5 credit until location check passes
		hasUpdateCoords := update.Latitude.Valid && update.Longitude.Valid &&
			update.Latitude.Float64 != 0 && update.Longitude.Float64 != 0

		if hasUpdateCoords {
			if !hasPuCoords {
				// PU coordinates unavailable in DB -> benefit of doubt, full credit
				creditWeight = 1.0
			} else {
				accuracyBuffer := 0.0
				if update.AccuracyMeters.Valid && update.AccuracyMeters.Float64 > 0 {
					accuracyBuffer = math.Min(update.AccuracyMeters.Float64, maxAccuracyBufferMeters)
				}

				if utils.IsWithinDistance(utils.IsWithinDistanceParams{
					Lat1:              update.Latitude.Float64,
					Lon1:              update.Longitude.Float64,
					Lat2:              asgn.PuLatitude.Float64,
					Lon2:              asgn.PuLongitude.Float64,
					MaxDistanceMeters: baseMaxDistanceMeters + accuracyBuffer,
				}) {
					creditWeight = 1.0
				}
			}
		}

		// Calculate interval bucket key (e.g. 2026-11-19_14:30)
		// ---
		// Timestamp when this situational update was recorded
		t := update.CreatedAt.Time
		// Round down minutes to interval boundary via integer division (e.g., 08:14 -> 08:00, 08:42 -> 08:30)
		flooredMin := (t.Minute() / intervalMinutes) * intervalMinutes
		// Unique time-slot identifier so multiple updates within the same interval map to one entry.
		// Example bucketKey output: "2026-11-20_08:00", "2026-11-20_08:30", "2026-11-20_09:00"
		bucketKey := fmt.Sprintf("%s_%02d:%02d", t.Format("2006-01-02"), t.Hour(), flooredMin)

		// Keep the highest credit achieved in this slot (upgrade unverified 0.5 to verified 1.0, never downgrade)
		if prevWeight, ok := bucketWeights[bucketKey]; !ok || creditWeight > prevWeight {
			bucketWeights[bucketKey] = creditWeight
		}
	}

	// Sum qualified credits across all intervals covered throughout the day.
	// Each 30-min window contributes at most 1.0 (verified) or 0.5 (unverified) to prevent spam.
	var effectiveUpdates float64
	for _, weight := range bucketWeights {
		effectiveUpdates += weight
	}

	return computeRatioScore(ComputeRatioScoreParams{
		Actual: effectiveUpdates,
		Target: targetUpdatesCount,
	})
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ComputeRatioScoreParams struct {
	Actual float64
	Target float64
}

func computeRatioScore(params ComputeRatioScoreParams) float64 {
	if params.Target <= 0 {
		return 0
	}

	return clamp((params.Actual/params.Target)*100, 0, 100)
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

// resolveBasePayment extracts the kobo amount from agent_payment_allocation JSONB.
// Format: {"polling_agent": {"default": 2000000}}
func (s *Service) resolveBasePayment(rawJSON []byte, roleType string) int64 {
	var alloc map[string]rolePaymentConfig
	if err := json.Unmarshal(rawJSON, &alloc); err != nil {
		return 0
	}
	return alloc[roleType].Default
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
	asgn, err := s.queries.GetAssignmentForEarnings(ctx, assignmentID)
	if err != nil {
		return PotentialPayoutResult{}, fmt.Errorf("get assignment: %w", err)
	}

	roleType := "polling_agent"

	// Determine base payment
	basePaymentKobo := asgn.PotentialPaymentKobo
	if basePaymentKobo <= 0 {
		party, err := s.getPartyByID(ctx, asgn.PartyID)
		if err == nil {
			if party.AgentPaymentBalanceKobo <= 0 {
				return PotentialPayoutResult{
					AssignmentID:        assignmentID,
					TaskType:            taskType,
					PotentialPayoutKobo: 0,
					IsEligible:          false,
					Reason:              "Party has not funded agent payments",
				}, nil
			}
			basePaymentKobo = s.resolveBasePayment(party.AgentPaymentAllocationKobo, roleType)
		}
	}
	if basePaymentKobo <= 0 {
		return PotentialPayoutResult{
			AssignmentID:        assignmentID,
			TaskType:            taskType,
			PotentialPayoutKobo: 0,
			IsEligible:          false,
			Reason:              "Party has not configured payment allocation for this role",
		}, nil
	}

	// Election cycle check
	now := time.Now().UTC()
	if now.Year() > asgn.ElectionDate.Time.Year() {
		return PotentialPayoutResult{
			AssignmentID:        assignmentID,
			TaskType:            taskType,
			PotentialPayoutKobo: 0,
			IsEligible:          false,
			Reason:              "Task type is only eligible during the election cycle",
		}, nil
	}

	// Fetch earnings allocation for role (Redis cached)
	allocation, err := s.GetEarningsAllocation(ctx, roleType)
	if err != nil {
		return PotentialPayoutResult{}, fmt.Errorf("get earnings allocation: %w", err)
	}

	switch taskType {

	case "results":
		expected, err := s.GetExpectedResultsCountForPU(ctx, asgn.ElectionGroupID, asgn.PollingUnitID)
		if err != nil || expected <= 0 {
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

	case "updates":
		updateScheduleConfig, _ := s.GetUpdateScheduleConfig(ctx)
		targetUpdates := updateScheduleConfig.TargetUpdatesCount
		startTimeStr := updateScheduleConfig.StartTime
		endTimeStr := updateScheduleConfig.EndTime
		intervalMinutes := updateScheduleConfig.IntervalMinutes

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

		if float64(asgn.UpdatesCount) >= targetUpdates {
			return PotentialPayoutResult{
				AssignmentID:        assignmentID,
				TaskType:            taskType,
				PotentialPayoutKobo: 0,
				IsEligible:          false,
				Reason:              "Target updates count reached",
			}, nil
		}

		if asgn.LastUpdateAt.Valid {
			lastUpdateLoc := asgn.LastUpdateAt.Time.In(locNow.Location())
			lastUpdateInterval := fmt.Sprintf("%02d:%02d", lastUpdateLoc.Hour(), (lastUpdateLoc.Minute()/intervalMinutes)*intervalMinutes)
			if lastUpdateInterval == currentIntervalKey && lastUpdateLoc.Year() == locNow.Year() && lastUpdateLoc.YearDay() == locNow.YearDay() {
				return PotentialPayoutResult{
					AssignmentID:        assignmentID,
					TaskType:            taskType,
					PotentialPayoutKobo: 0,
					IsEligible:          false,
					Reason:              fmt.Sprintf("Update already submitted for interval %s", currentIntervalKey),
				}, nil
			}
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
	electionGroupID int32,
	partyID int16,
) (EstimatePayoutResult, error) {
	normRole := strings.ReplaceAll(reqRole, "-", "_")
	if normRole == "" {
		normRole = "polling_agent"
	}

	var basePaymentKobo int64
	if partyID > 0 {
		if party, err := s.getPartyByID(ctx, partyID); err == nil {
			if party.AgentPaymentBalanceKobo <= 0 {
				return EstimatePayoutResult{
					TaskType:            taskType,
					Role:                normRole,
					PotentialPayoutKobo: 0,
					IsEligible:          false,
					Reason:              "Party has not funded agent payments",
				}, nil
			}
			basePaymentKobo = s.resolveBasePayment(party.AgentPaymentAllocationKobo, normRole)
		}
	}
	if basePaymentKobo <= 0 {
		return EstimatePayoutResult{
			TaskType:            taskType,
			Role:                normRole,
			PotentialPayoutKobo: 0,
			IsEligible:          false,
			Reason:              "Party has not configured payment allocation for this role",
		}, nil
	}

	// Fetch earnings allocation for role (Redis cached)
	allocation, err := s.GetEarningsAllocation(ctx, normRole)
	if err != nil {
		return EstimatePayoutResult{}, fmt.Errorf("get earnings allocation: %w", err)
	}

	var payout int64
	switch taskType {
	case "results":
		resultsBudgetKobo := float64(basePaymentKobo) * (allocation.Results / 100.0)
		payout = int64(resultsBudgetKobo)

	case "attendance":
		payout = int64(float64(basePaymentKobo) * (allocation.Attendance / 100.0))

	case "election_start":
		payout = int64(float64(basePaymentKobo) * (allocation.ElectionStart / 100.0))

	case "election_end":
		payout = int64(float64(basePaymentKobo) * (allocation.ElectionEnd / 100.0))

	case "updates":
		updateScheduleConfig, _ := s.GetUpdateScheduleConfig(ctx)
		targetUpdates := updateScheduleConfig.TargetUpdatesCount
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
	electionGroupID int32,
	reqRoleType string,
	assignmentID int64,
) (AgentAllocationsResponse, error) {
	var roleType string
	var potentialPaymentKobo int64
	var partyID int16

	// 1. If assignmentID is explicitly provided, fetch assignment for polling agent
	if assignmentID > 0 {
		if asgn, err := s.queries.GetAssignmentForEarnings(ctx, assignmentID); err == nil {
			roleType = "polling_agent"
			potentialPaymentKobo = asgn.PotentialPaymentKobo
			partyID = asgn.PartyID
		}
	}

	// 2. Check polling_unit_assignments by user & election_group
	if roleType == "" && electionGroupID > 0 && userID > 0 {
		if asgnID, err := s.queries.GetAssignmentIDByUserAndElectionGroup(ctx, queries.GetAssignmentIDByUserAndElectionGroupParams{
			UserID:          userID,
			ElectionGroupID: electionGroupID,
		}); err == nil && asgnID > 0 {
			if asgn, err := s.queries.GetAssignmentForEarnings(ctx, asgnID); err == nil {
				roleType = "polling_agent"
				potentialPaymentKobo = asgn.PotentialPaymentKobo
				partyID = asgn.PartyID
			}
		}
	}

	// 3. Check ward_election_supervisors
	if roleType == "" && electionGroupID > 0 && userID > 0 {
		if wardSup, err := s.queries.GetWardSupervisorByElectionGroup(ctx, queries.GetWardSupervisorByElectionGroupParams{
			UserID:          userID,
			ElectionGroupID: electionGroupID,
		}); err == nil && wardSup.ID > 0 {
			roleType = "ward_election_supervisor"
			potentialPaymentKobo = wardSup.PotentialPaymentKobo
			partyID = wardSup.PartyID
		}
	}

	// 4. Check lga_election_supervisors
	if roleType == "" && electionGroupID > 0 && userID > 0 {
		if lgaSup, err := s.queries.GetLgaSupervisorByElectionGroup(ctx, queries.GetLgaSupervisorByElectionGroupParams{
			UserID:          userID,
			ElectionGroupID: electionGroupID,
		}); err == nil && lgaSup.ID > 0 {
			roleType = "lga_election_supervisor"
			potentialPaymentKobo = lgaSup.PotentialPaymentKobo
			partyID = lgaSup.PartyID
		}
	}

	// 5. Check state_election_supervisors
	if roleType == "" && electionGroupID > 0 && userID > 0 {
		if stateSup, err := s.queries.GetStateSupervisorByElectionGroup(ctx, queries.GetStateSupervisorByElectionGroupParams{
			UserID:          userID,
			ElectionGroupID: electionGroupID,
		}); err == nil && stateSup.ID > 0 {
			roleType = "state_election_supervisor"
			potentialPaymentKobo = stateSup.PotentialPaymentKobo
			partyID = stateSup.PartyID
		}
	}

	// Fallback to requested roleType or default "polling_agent"
	if roleType == "" {
		if reqRoleType != "" {
			roleType = strings.ReplaceAll(reqRoleType, "-", "_")
		} else {
			roleType = "polling_agent"
		}
	}

	// If potentialPaymentKobo is missing, resolve base payment from party allocation
	if potentialPaymentKobo <= 0 && partyID > 0 {
		if party, err := s.getPartyByID(ctx, partyID); err == nil {
			potentialPaymentKobo = s.resolveBasePayment(party.AgentPaymentAllocationKobo, roleType)
		}
	}
	if potentialPaymentKobo < 0 {
		potentialPaymentKobo = 0
	}

	// Fetch earnings allocation for role (Redis cached)
	alloc, err := s.GetEarningsAllocation(ctx, roleType)
	if err != nil {
		return AgentAllocationsResponse{}, fmt.Errorf("get earnings allocation: %w", err)
	}

	items := []AllocationItem{
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
	}

	totalPct := alloc.Results + alloc.Updates + alloc.Attendance + alloc.ElectionStart + alloc.ElectionEnd

	return AgentAllocationsResponse{
		RoleType:             roleType,
		PotentialPaymentKobo: potentialPaymentKobo,
		Allocations:          items,
		TotalPercentage:      totalPct,
	}, nil
}

// RequestPayout calculates/refreshes earnings and marks agent_earnings.status as 'requested'.
func (s *Service) RequestPayout(ctx context.Context, userID int64, electionGroupID int32, roleType string) (queries.AgentEarning, error) {
	if roleType == "" {
		roleType = "polling_agent"
	}
	asgnID, err := s.queries.GetAssignmentIDByUserAndElectionGroup(ctx, queries.GetAssignmentIDByUserAndElectionGroupParams{
		UserID:          userID,
		ElectionGroupID: electionGroupID,
	})
	if err == nil && asgnID > 0 {
		_, _ = s.Calculate(ctx, asgnID)
	}

	res, err := s.queries.RequestAgentEarningsPayout(ctx, queries.RequestAgentEarningsPayoutParams{
		UserID:          userID,
		ElectionGroupID: electionGroupID,
		RoleType:        roleType,
	})
	if err != nil {
		return queries.AgentEarning{}, fmt.Errorf("request payout: %w", err)
	}
	return res, nil
}
