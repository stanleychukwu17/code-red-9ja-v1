package worker

import (
	"context"
	"log/slog"

	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/robfig/cron/v3"

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
}

type RedisTaskProcessor struct {
	server *asynq.Server
	cron   *cron.Cron
	q      *queries.Queries
	pool   *pgxpool.Pool
	rdb    *redis.Client
}

func NewRedisTaskProcessor(redisOpt asynq.RedisClientOpt, q *queries.Queries, pool *pgxpool.Pool, rdb *redis.Client) TaskProcessor {
	server := asynq.NewServer(
		redisOpt,
		asynq.Config{
			Concurrency: 10,
			ErrorHandler: asynq.ErrorHandlerFunc(func(ctx context.Context, task *asynq.Task, err error) {
				slog.Error("process task failed", "type", task.Type(), "err", err)
			}),
		},
	)

	c := cron.New()

	return &RedisTaskProcessor{
		server: server,
		cron:   c,
		q:      q,
		pool:   pool,
		rdb:    rdb,
	}
}

func (processor *RedisTaskProcessor) Start() error {
	mux := asynq.NewServeMux()
	mux.HandleFunc(TaskCalculateFinalResult, processor.ProcessTaskCalculateFinalResult)

	// Register cron rollup jobs with staggered schedules to spread DB load.
	// Each scope's zenith rollup also updates election_candidates.votes_count.
	processor.cron.AddFunc("*/10 * * * *", processor.ProcessRollupWard)                // ward (zenith for ward-scoped elections)
	processor.cron.AddFunc("*/10 * * * *", processor.ProcessRollupStateConstituency)   // state-constituency zenith
	processor.cron.AddFunc("*/10 * * * *", processor.ProcessRollupLGA)                 // lga (zenith for lga-scoped elections)
	processor.cron.AddFunc("*/10 * * * *", processor.ProcessRollupSenatorialDistrict)  // senatorial-district zenith
	processor.cron.AddFunc("*/10 * * * *", processor.ProcessRollupFederalConstituency) // federal-constituency zenith
	processor.cron.AddFunc("*/10 * * * *", processor.ProcessRollupState)               // state (zenith for state-scoped elections)
	processor.cron.AddFunc("*/11 * * * *", processor.ProcessRollupElection)            // nationwide (zenith for presidential)

	// Geographic Stats pre-aggregation for dashboards (runs every 15 mins)
	processor.cron.AddFunc("*/15 * * * *", processor.ProcessRefreshAllElectionStats)

	processor.cron.Start()
	slog.Info("cron rollup scheduler started")

	return processor.server.Start(mux)
}

func (processor *RedisTaskProcessor) Shutdown() {
	processor.cron.Stop()
	processor.server.Shutdown()
}
