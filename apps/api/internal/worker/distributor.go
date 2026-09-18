package worker

import (
	"context"

	"github.com/hibiken/asynq"
)

// TaskDistributor defines the interface for enqueueing tasks across all services.
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

// RedisTaskDistributor is a task distributor that uses Redis to enqueue tasks.
type RedisTaskDistributor struct {
	asynqClient *asynq.Client
}

// NewRedisTaskDistributor creates a new RedisTaskDistributor connected to Redis.
func NewRedisTaskDistributor(redisOpt asynq.RedisClientOpt) TaskDistributor {
	// Initializes a dedicated Redis client and connection pool managed by Asynq
	// specifically for task producer operations (separate from general application cache rdb).
	asynqClient := asynq.NewClient(redisOpt)

	return &RedisTaskDistributor{
		asynqClient: asynqClient,
	}
}
