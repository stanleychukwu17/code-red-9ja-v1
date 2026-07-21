package worker

import (
	"context"
	"log/slog"

	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/robfig/cron/v3"

	"free9ja/api/internal/config"
	"free9ja/api/internal/db/queries"
)

// Task names
const (
	TaskCalculateFinalResult = "final_result:calculate"
)

// TaskProcessor defines the interface for our Asynq workers.
type TaskProcessor interface {
	Start() error
	Shutdown()
	ProcessTaskCalculateFinalResult(ctx context.Context, task *asynq.Task) error
	ProcessTaskAggregateLiveVotes(ctx context.Context, task *asynq.Task) error
	ProcessTaskRefreshPollingUnitStats(ctx context.Context, task *asynq.Task) error
	ProcessTaskSeedElectionGroupStats(ctx context.Context, task *asynq.Task) error
	ProcessTaskRefreshWardStats(ctx context.Context, task *asynq.Task) error
	ProcessTaskRefreshLGAStats(ctx context.Context, task *asynq.Task) error
	ProcessTaskRefreshStateConstituencyStats(ctx context.Context, task *asynq.Task) error
	ProcessTaskRefreshStateStats(ctx context.Context, task *asynq.Task) error
	ProcessTaskRefreshGlobalStats(ctx context.Context, task *asynq.Task) error
}

type RedisTaskProcessor struct {
	server          *asynq.Server
	cron            *cron.Cron
	q               *queries.Queries
	pool            *pgxpool.Pool
	rdb             *redis.Client
	taskDistributor TaskDistributor
	cfg             *config.Config
}

func NewRedisTaskProcessor(redisOpt asynq.RedisClientOpt, q *queries.Queries, pool *pgxpool.Pool, rdb *redis.Client, distributor TaskDistributor, cfg *config.Config) TaskProcessor {
	server := asynq.NewServer(
		redisOpt,
		asynq.Config{
			Concurrency: 10,
			ErrorHandler: asynq.ErrorHandlerFunc(func(ctx context.Context, task *asynq.Task, err error) {
				slog.Error("process task failed", "type", task.Type(), "err", err)
			}),
		},
	)

	return &RedisTaskProcessor{
		server:          server,
		cron:            cron.New(),
		q:               q,
		pool:            pool,
		rdb:             rdb,
		taskDistributor: distributor,
		cfg:             cfg,
	}
}

func (processor *RedisTaskProcessor) Start() error {
	mux := asynq.NewServeMux()
	mux.HandleFunc(TaskCalculateFinalResult, processor.ProcessTaskCalculateFinalResult)
	mux.HandleFunc(TaskAggregateLiveVotes, processor.ProcessTaskAggregateLiveVotes)
	mux.HandleFunc(TaskSeedElectionGroupStats, processor.ProcessTaskSeedElectionGroupStats)
	mux.HandleFunc(TaskRefreshPollingUnitStats, processor.ProcessTaskRefreshPollingUnitStats)

	// Cascading stats refresh handlers (event-driven, per geographic unit).
	mux.HandleFunc(TaskRefreshWardStats, processor.ProcessTaskRefreshWardStats)
	mux.HandleFunc(TaskRefreshLGAStats, processor.ProcessTaskRefreshLGAStats)
	mux.HandleFunc(TaskRefreshStateConstituencyStats, processor.ProcessTaskRefreshStateConstituencyStats)
	mux.HandleFunc(TaskRefreshStateStats, processor.ProcessTaskRefreshStateStats)
	mux.HandleFunc(TaskRefreshGlobalStats, processor.ProcessTaskRefreshGlobalStats)

	// Register cron rollup jobs with staggered schedules to spread DB load.
	// Each scope's zenith rollup also updates election_candidates.votes_count.
	// In development, set STATS_REFRESH_ENABLED=false in your .env to skip these
	// expensive full-table crons and rely only on event-driven updates.
	statsEnabled := config.GetEnv("STATS_REFRESH_ENABLED", "true") == "true"
	if !statsEnabled {
		slog.Warn("STATS_REFRESH_ENABLED=false — skipping all stats cron registration (dev mode)")
	} else {
		processor.cron.AddFunc("*/10 * * * *", processor.ProcessRollupWard)                // ward (zenith for ward-scoped elections)
		processor.cron.AddFunc("*/10 * * * *", processor.ProcessRollupStateConstituency)   // state-constituency zenith
		processor.cron.AddFunc("*/10 * * * *", processor.ProcessRollupLGA)                 // lga (zenith for lga-scoped elections)
		processor.cron.AddFunc("*/10 * * * *", processor.ProcessRollupSenatorialDistrict)  // senatorial-district zenith
		processor.cron.AddFunc("*/10 * * * *", processor.ProcessRollupFederalConstituency) // federal-constituency zenith
		processor.cron.AddFunc("*/10 * * * *", processor.ProcessRollupState)               // state (zenith for state-scoped elections)
		processor.cron.AddFunc("*/11 * * * *", processor.ProcessRollupElection)            // nationwide (zenith for presidential)

		// Geographic Stats: event-driven cascade is the primary mechanism.
		// This cron is a 30-minute safety-net fallback for any missed cascades.
		processor.cron.AddFunc("*/30 * * * *", processor.ProcessRefreshAllElectionStats)
	}

	processor.cron.Start()
	slog.Info("cron rollup scheduler started")

	return processor.server.Start(mux)
}

func (processor *RedisTaskProcessor) Shutdown() {
	processor.cron.Stop()
	processor.server.Shutdown()
}
