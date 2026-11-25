package worker

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"sort"
	"strings"
	"time"

	"free9ja/api/internal/db/queries"

	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgtype"
)

type CalculateFinalResultPayload struct {
	ElectionID    int32 `json:"election_id"`
	PollingUnitID int32 `json:"polling_unit_id"`
}

// ProcessTaskCalculateFinalResult processes a task to calculate the final result for a polling unit
func (redisTaskProcessor *RedisTaskProcessor) ProcessTaskCalculateFinalResult(ctx context.Context, task *asynq.Task) error {
	var payload CalculateFinalResultPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal payload: %w", err)
	}

	results, err := redisTaskProcessor.queries.GetAllPollingUnitResultsByPU(ctx, queries.GetAllPollingUnitResultsByPUParams{
		ElectionID:    payload.ElectionID,
		PollingUnitID: payload.PollingUnitID,
	})
	if err != nil {
		return fmt.Errorf("failed to fetch PU results: %w", err)
	}

	if len(results) == 0 {
		slog.Warn("no valid results found for PU", "election_id", payload.ElectionID, "polling_unit_id", payload.PollingUnitID)
		return nil
	}

	allScores, err := redisTaskProcessor.queries.GetPollingUnitResultScoresByPU(ctx, queries.GetPollingUnitResultScoresByPUParams{
		ElectionID:    payload.ElectionID,
		PollingUnitID: payload.PollingUnitID,
	})
	if err != nil {
		return fmt.Errorf("failed to fetch PU result scores: %w", err)
	}

	scoresByResult := make(map[int64][]queries.PollingUnitResultScore)
	for _, s := range allScores {
		scoresByResult[s.ResultID] = append(scoresByResult[s.ResultID], s)
	}

	type groupData struct {
		Hash       string
		Count      int
		BaseResult queries.PollingUnitResult
	}
	groups := make(map[string]*groupData)

	var winningGroup *groupData
	maxCount := 0

	for _, r := range results {
		scores := scoresByResult[r.ID]
		if len(scores) == 0 {
			continue
		}
		sort.Slice(scores, func(i, j int) bool {
			return scores[i].PartyShortName < scores[j].PartyShortName
		})
		var builder strings.Builder
		for _, s := range scores {
			builder.WriteString(fmt.Sprintf("%s:%d;", s.PartyShortName, s.VoteCount))
		}
		hash := builder.String()

		if g, exists := groups[hash]; exists {
			g.Count++
			if g.Count > maxCount {
				winningGroup = g
				maxCount = g.Count
			} else if g.Count == maxCount && winningGroup != nil {
				// Deterministic tie-breaking: prefer earlier submission ID or higher total votes
				if g.BaseResult.VotesCast > winningGroup.BaseResult.VotesCast ||
					(g.BaseResult.VotesCast == winningGroup.BaseResult.VotesCast && g.BaseResult.ID < winningGroup.BaseResult.ID) {
					winningGroup = g
				}
			}
		} else {
			g := &groupData{
				Hash:       hash,
				Count:      1,
				BaseResult: r,
			}
			groups[hash] = g
			if maxCount == 0 {
				winningGroup = g
				maxCount = 1
			} else if maxCount == 1 && winningGroup != nil {
				// Tie at count = 1: break deterministically
				if g.BaseResult.VotesCast > winningGroup.BaseResult.VotesCast ||
					(g.BaseResult.VotesCast == winningGroup.BaseResult.VotesCast && g.BaseResult.ID < winningGroup.BaseResult.ID) {
					winningGroup = g
				}
			}
		}
	}

	if winningGroup == nil {
		return nil
	}

	r := winningGroup.BaseResult
	validVotes := float64(r.ValidVotes)
	candList := make([]map[string]interface{}, 0, len(scoresByResult[r.ID]))
	for _, s := range scoresByResult[r.ID] {
		voteShare := 0.0
		if validVotes > 0 {
			voteShare = math.Round((float64(s.VoteCount)/validVotes)*10000) / 100
		}
		candList = append(candList, map[string]interface{}{
			"party_short_name": s.PartyShortName,
			"vote_count":       s.VoteCount,
			"vote_share":       voteShare,
			"agent_name":       s.AgentName.String,
			"has_signature":    s.HasSignature,
		})
	}
	candResults, err := json.Marshal(candList)
	if err != nil {
		candResults = []byte("[]")
	}

	_, err = redisTaskProcessor.queries.UpsertPollingUnitFinalResult(ctx, queries.UpsertPollingUnitFinalResultParams{
		ElectionID:               r.ElectionID,
		ElectionGroupID:          r.ElectionGroupID,
		PollingUnitID:            r.PollingUnitID,
		StateID:                  r.StateID,
		SenatorialDistrictID:     r.SenatorialDistrictID,
		FederalConstituencyID:    r.FederalConstituencyID,
		StateConstituencyID:      r.StateConstituencyID,
		LgaID:                    r.LgaID,
		WardID:                   r.WardID,
		PollingUnitResultID:      pgtype.Int8{Int64: r.ID, Valid: true},
		AccreditedVoters:         r.AccreditedVoters,
		VotesCast:                r.VotesCast,
		ValidVotes:               r.ValidVotes,
		RejectedVotes:            r.RejectedVotes,
		CandidateResults:         candResults,
		MatchingSubmissionsCount: int32(winningGroup.Count),
		TotalSubmissionsCount:    int32(len(results)),
	})
	if err != nil {
		return fmt.Errorf("failed to upsert final result: %w", err)
	}

	slog.Info("calculated final result for PU",
		"election_id", payload.ElectionID,
		"polling_unit_id", payload.PollingUnitID,
		"matching", winningGroup.Count,
		"total", len(results))

	// Trigger the cascading candidate rollup chain starting from this Ward and State Constituency
	if redisTaskProcessor.taskDistributor != nil {
		_ = redisTaskProcessor.taskDistributor.DistributeTaskRollupSingleWard(ctx, &RollupSingleWardPayload{
			ElectionID:            r.ElectionID,
			WardID:                r.WardID.Int32,
			LGAID:                 r.LgaID.Int32,
			StateID:               r.StateID.Int16,
			StateConstituencyID:   r.StateConstituencyID.Int32,
			FederalConstituencyID: r.FederalConstituencyID.Int32,
			SenatorialDistrictID:  r.SenatorialDistrictID.Int32,
		})
		if r.StateConstituencyID.Valid && r.StateConstituencyID.Int32 > 0 {
			_ = redisTaskProcessor.taskDistributor.DistributeTaskRollupSingleStateConstituency(ctx, &RollupSingleStateConstituencyPayload{
				ElectionID:          r.ElectionID,
				StateConstituencyID: r.StateConstituencyID.Int32,
			})
		}
	}

	return nil
}

// DistributeTaskCalculateFinalResult enqueues a task to calculate the final result for a polling unit
func (redisTaskDistributor *RedisTaskDistributor) DistributeTaskCalculateFinalResult(ctx context.Context, payload *CalculateFinalResultPayload, opts ...asynq.Option) error {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal task payload: %w", err)
	}

	// Build a unique key per (election, polling_unit) pair so duplicate uploads
	// within the debounce window are collapsed into a single task.
	uniqueKey := fmt.Sprintf("final_result:%d:%d", payload.ElectionID, payload.PollingUnitID)

	// Prepend our standard options so callers can still append their own overrides.
	defaults := []asynq.Option{
		asynq.ProcessIn(2 * time.Minute), // debounce: wait 2 min before executing
		asynq.Unique(2 * time.Minute),    // deduplicate within the debounce window
		asynq.MaxRetry(3),                // retry up to 3 times on failure
		asynq.Timeout(30 * time.Second),  // fail fast if the worker stalls
		asynq.TaskID(uniqueKey),          // deterministic ID aids deduplication
	}
	opts = append(defaults, opts...)

	task := asynq.NewTask(TaskCalculateFinalResult, jsonPayload, opts...)

	info, err := redisTaskDistributor.asynqClient.EnqueueContext(ctx, task)
	if err != nil {
		// Both ErrTaskIDConflict (same TaskID already queued) and ErrDuplicateTask
		// (from the Unique() option) are expected during the debounce window — not real errors.
		if errors.Is(err, asynq.ErrTaskIDConflict) || errors.Is(err, asynq.ErrDuplicateTask) {
			slog.Debug("final result task already queued, skipping duplicate",
				"election_id", payload.ElectionID, "polling_unit_id", payload.PollingUnitID)
			return nil
		}
		return fmt.Errorf("failed to enqueue task: %w", err)
	}

	slog.Info("enqueued task", "type", task.Type(), "queue", info.Queue, "max_retry", info.MaxRetry)
	return nil
}
