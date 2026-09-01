package worker

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"sort"
	"strings"
	"time"

	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/service/realtime"

	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgtype"
)

type CalculateFinalResultPayload struct {
	ElectionID    int64 `json:"election_id"`
	PollingUnitID int32 `json:"polling_unit_id"`
}

// CandidateResult represents a simplified view of the vote counts
type CandidateResult struct {
	PartyShortName string `json:"party_short_name"`
	VoteCount      int32  `json:"vote_count"`
}

// hashCandidateResults normalizes candidate results array so we can group them exactly
func hashCandidateResults(rawJSON []byte) string {
	var candidates []CandidateResult
	if err := json.Unmarshal(rawJSON, &candidates); err != nil {
		return ""
	}
	// Sort by party name
	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].PartyShortName < candidates[j].PartyShortName
	})

	var builder strings.Builder
	for _, c := range candidates {
		builder.WriteString(fmt.Sprintf("%s:%d;", c.PartyShortName, c.VoteCount))
	}
	return builder.String()
}

func (processor *RedisTaskProcessor) ProcessTaskCalculateFinalResult(ctx context.Context, task *asynq.Task) error {
	var payload CalculateFinalResultPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal payload: %w", err)
	}

	results, err := processor.q.GetAllPollingUnitResultsByPU(ctx, queries.GetAllPollingUnitResultsByPUParams{
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

	type groupData struct {
		Hash       string
		Count      int
		BaseResult queries.PollingUnitResult
	}
	groups := make(map[string]*groupData)

	var winningGroup *groupData
	maxCount := 0

	for _, r := range results {
		hash := hashCandidateResults(r.CandidateResults)
		if hash == "" {
			continue // Skip invalid JSON
		}

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
	_, err = processor.q.UpsertPollingUnitFinalResult(ctx, queries.UpsertPollingUnitFinalResultParams{
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
		CandidateResults:         r.CandidateResults,
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

	// Broadcast real-time PU result event
	if processor.broadcaster != nil {
		_ = processor.broadcaster.BroadcastPUResultUploaded(ctx, realtime.PUResultUploadedEvent{
			ElectionID:    r.ElectionID,
			PollingUnitID: r.PollingUnitID,
			WardID:        r.WardID.Int32,
			LGAID:         r.LgaID.Int32,
			StateID:       r.StateID.Int16,
			ValidVotes:    r.ValidVotes,
			Timestamp:     time.Now().UTC(),
		})
	}

	// Trigger the cascading stats & geo refresh chain starting from this Polling Unit
	if processor.taskDistributor != nil {
		_ = processor.taskDistributor.DistributeTaskRefreshPollingUnitStats(ctx, &RefreshPollingUnitStatsPayload{
			Params: queries.RefreshSingleElectionGroupPollingUnitStatsParams{
				ElectionGroupID: r.ElectionGroupID,
				PollingUnitID:   r.PollingUnitID,
			},
		})

		// Trigger the cascading candidate rollup chain starting from this Ward and State Constituency
		_ = processor.taskDistributor.DistributeTaskRollupSingleWard(ctx, &RollupSingleWardPayload{
			ElectionID:            r.ElectionID,
			WardID:                r.WardID.Int32,
			LGAID:                 r.LgaID.Int32,
			StateID:               r.StateID.Int16,
			StateConstituencyID:   r.StateConstituencyID.Int32,
			FederalConstituencyID: r.FederalConstituencyID.Int32,
			SenatorialDistrictID:  r.SenatorialDistrictID.Int32,
		})
		if r.StateConstituencyID.Valid && r.StateConstituencyID.Int32 > 0 {
			_ = processor.taskDistributor.DistributeTaskRollupSingleStateConstituency(ctx, &RollupSingleStateConstituencyPayload{
				ElectionID:          r.ElectionID,
				StateConstituencyID: r.StateConstituencyID.Int32,
			})
		}
	}

	return nil
}

// TaskDistributor defines the interface for enqueueing tasks
type TaskDistributor interface {
	DistributeTaskCalculateFinalResult(ctx context.Context, payload *CalculateFinalResultPayload, opts ...asynq.Option) error
	DistributeTaskSeedElectionGroupStats(ctx context.Context, payload *SeedElectionGroupStatsPayload, opts ...asynq.Option) error
	DistributeTaskAggregateLiveVotes(ctx context.Context, payload *AggregateLiveVotesPayload, opts ...asynq.Option) error
	DistributeTaskRefreshPollingUnitStats(ctx context.Context, payload *RefreshPollingUnitStatsPayload, opts ...asynq.Option) error
	// Cascading stats refresh chain
	DistributeTaskRefreshWardStats(ctx context.Context, payload *RefreshWardStatsPayload, opts ...asynq.Option) error
	DistributeTaskRefreshLGAStats(ctx context.Context, payload *RefreshLGAStatsPayload, opts ...asynq.Option) error
	DistributeTaskRefreshStateConstituencyStats(ctx context.Context, payload *RefreshStateConstituencyStatsPayload, opts ...asynq.Option) error
	DistributeTaskRefreshStateStats(ctx context.Context, payload *RefreshStateStatsPayload, opts ...asynq.Option) error
	DistributeTaskRefreshGlobalStats(ctx context.Context, payload *RefreshGlobalStatsPayload, opts ...asynq.Option) error
	// PU result AI extraction
	DistributeTaskExtractPUResultAI(ctx context.Context, payload *ExtractPUResultAIPayload, opts ...asynq.Option) error
	// Scoped candidate rollup chain
	DistributeTaskRollupSingleWard(ctx context.Context, payload *RollupSingleWardPayload, opts ...asynq.Option) error
	DistributeTaskRollupSingleStateConstituency(ctx context.Context, payload *RollupSingleStateConstituencyPayload, opts ...asynq.Option) error
	DistributeTaskRollupSingleLGA(ctx context.Context, payload *RollupSingleLGAPayload, opts ...asynq.Option) error
	DistributeTaskRollupSingleFederalConstituency(ctx context.Context, payload *RollupSingleFederalConstituencyPayload, opts ...asynq.Option) error
	DistributeTaskRollupSingleSenatorialDistrict(ctx context.Context, payload *RollupSingleSenatorialDistrictPayload, opts ...asynq.Option) error
	DistributeTaskRollupSingleState(ctx context.Context, payload *RollupSingleStatePayload, opts ...asynq.Option) error
	DistributeTaskRollupSingleElection(ctx context.Context, payload *RollupSingleElectionPayload, opts ...asynq.Option) error
}

type RedisTaskDistributor struct {
	client *asynq.Client
}

func NewRedisTaskDistributor(redisOpt asynq.RedisClientOpt) TaskDistributor {
	client := asynq.NewClient(redisOpt)
	return &RedisTaskDistributor{
		client: client,
	}
}

func (distributor *RedisTaskDistributor) DistributeTaskCalculateFinalResult(ctx context.Context, payload *CalculateFinalResultPayload, opts ...asynq.Option) error {
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

	info, err := distributor.client.EnqueueContext(ctx, task)
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
