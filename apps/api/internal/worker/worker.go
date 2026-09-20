package worker

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/robfig/cron/v3"

	"free9ja/api/internal/config"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	inecgrabber "free9ja/api/internal/service/inec_grabber"
	r2service "free9ja/api/internal/service/r2"
	"free9ja/api/internal/service/realtime"
)

// Task names
const (
	TaskCalculateFinalResult = "final_result:calculate"

	INECGrabberSyncLockKey = db.RedisCronLockINECGrabberSync
	INECGrabberSyncLockTTL = 14 * time.Minute
)

// TaskProcessor defines the interface for our Asynq workers.
type TaskProcessor interface {
	Start() error
	Shutdown()
	ProcessTaskCalculateFinalResult(ctx context.Context, task *asynq.Task) error
	ProcessTaskExtractPUResultAI(ctx context.Context, task *asynq.Task) error
	ProcessTaskAggregateLiveVotes(ctx context.Context, task *asynq.Task) error
	ProcessTaskRefreshPollingUnitStats(ctx context.Context, task *asynq.Task) error
	ProcessTaskSeedElectionGroupStats(ctx context.Context, task *asynq.Task) error
	ProcessTaskRefreshWardStats(ctx context.Context, task *asynq.Task) error
	ProcessTaskRefreshLGAStats(ctx context.Context, task *asynq.Task) error
	ProcessTaskRefreshStateConstituencyStats(ctx context.Context, task *asynq.Task) error
	ProcessTaskRefreshStateStats(ctx context.Context, task *asynq.Task) error
	ProcessTaskRefreshGlobalStats(ctx context.Context, task *asynq.Task) error
	// Scoped candidate rollup processors
	ProcessTaskRollupSingleWard(ctx context.Context, task *asynq.Task) error
	ProcessTaskRollupSingleStateConstituency(ctx context.Context, task *asynq.Task) error
	ProcessTaskRollupSingleLGA(ctx context.Context, task *asynq.Task) error
	ProcessTaskRollupSingleFederalConstituency(ctx context.Context, task *asynq.Task) error
	ProcessTaskRollupSingleSenatorialDistrict(ctx context.Context, task *asynq.Task) error
	ProcessTaskRollupSingleState(ctx context.Context, task *asynq.Task) error
	ProcessTaskRollupSingleElection(ctx context.Context, task *asynq.Task) error
	ProcessDailyMarketingCampaignDeductions()
	ProcessINECResultGrabberSync()
}

type RedisTaskProcessor struct {
	asynqServer     *asynq.Server
	cron            *cron.Cron
	queries         *queries.Queries
	pool            *pgxpool.Pool
	rdb             *redis.Client
	taskDistributor TaskDistributor
	cfg             *config.Config
	r2Svc           *r2service.R2Service
	broadcaster     realtime.Broadcaster
}

func NewRedisTaskProcessor(redisOpt asynq.RedisClientOpt, q *queries.Queries, pool *pgxpool.Pool, rdb *redis.Client, distributor TaskDistributor, cfg *config.Config, r2Svc *r2service.R2Service, broadcaster realtime.Broadcaster) TaskProcessor {
	if broadcaster == nil {
		broadcaster = realtime.NewNoOpBroadcaster()
	}

	concurrency := 10
	if cfg != nil && cfg.WorkerConcurrency > 0 {
		concurrency = cfg.WorkerConcurrency
	}

	asynqServer := asynq.NewServer(
		redisOpt,
		asynq.Config{
			Concurrency: concurrency,
			ErrorHandler: asynq.ErrorHandlerFunc(func(ctx context.Context, task *asynq.Task, err error) {
				slog.Error("process task failed", "type", task.Type(), "err", err)
			}),
		},
	)

	return &RedisTaskProcessor{
		asynqServer:     asynqServer,
		cron:            cron.New(),
		queries:         q,
		pool:            pool,
		rdb:             rdb,
		taskDistributor: distributor,
		cfg:             cfg,
		r2Svc:           r2Svc,
		broadcaster:     broadcaster,
	}
}

func (redisTaskProcessor *RedisTaskProcessor) Start() error {
	mux := asynq.NewServeMux()
	mux.HandleFunc(TaskCalculateFinalResult, redisTaskProcessor.ProcessTaskCalculateFinalResult)
	mux.HandleFunc(TaskExtractPUResultAI, redisTaskProcessor.ProcessTaskExtractPUResultAI)
	mux.HandleFunc(TaskAggregateLiveVotes, redisTaskProcessor.ProcessTaskAggregateLiveVotes)
	mux.HandleFunc(TaskSeedElectionGroupStats, redisTaskProcessor.ProcessTaskSeedElectionGroupStats)
	mux.HandleFunc(TaskRefreshPollingUnitStats, redisTaskProcessor.ProcessTaskRefreshPollingUnitStats)

	// Cascading stats refresh handlers (event-driven, per geographic unit).
	mux.HandleFunc(TaskRefreshWardStats, redisTaskProcessor.ProcessTaskRefreshWardStats)
	mux.HandleFunc(TaskRefreshLGAStats, redisTaskProcessor.ProcessTaskRefreshLGAStats)
	mux.HandleFunc(TaskRefreshStateConstituencyStats, redisTaskProcessor.ProcessTaskRefreshStateConstituencyStats)
	mux.HandleFunc(TaskRefreshStateStats, redisTaskProcessor.ProcessTaskRefreshStateStats)
	mux.HandleFunc(TaskRefreshGlobalStats, redisTaskProcessor.ProcessTaskRefreshGlobalStats)

	// Scoped candidate rollup handlers (event-driven, bottom-up cascading).
	mux.HandleFunc(TaskRollupSingleWard, redisTaskProcessor.ProcessTaskRollupSingleWard)
	mux.HandleFunc(TaskRollupSingleStateConstituency, redisTaskProcessor.ProcessTaskRollupSingleStateConstituency)
	mux.HandleFunc(TaskRollupSingleLGA, redisTaskProcessor.ProcessTaskRollupSingleLGA)
	mux.HandleFunc(TaskRollupSingleFederalConstituency, redisTaskProcessor.ProcessTaskRollupSingleFederalConstituency)
	mux.HandleFunc(TaskRollupSingleSenatorialDistrict, redisTaskProcessor.ProcessTaskRollupSingleSenatorialDistrict)
	mux.HandleFunc(TaskRollupSingleState, redisTaskProcessor.ProcessTaskRollupSingleState)
	mux.HandleFunc(TaskRollupSingleElection, redisTaskProcessor.ProcessTaskRollupSingleElection)

	// Daily Marketing Campaign Deductions & Auto-Completion Worker (runs every day at 00:05 AM)
	// Recommended schedule: "5 0 * * *" (5 minutes past midnight) to process previous day's campaign allocations cleanly.
	redisTaskProcessor.cron.AddFunc("5 0 * * *", redisTaskProcessor.ProcessDailyMarketingCampaignDeductions)

	// INEC Result Grabber sync cron job (runs every 15 minutes)
	redisTaskProcessor.cron.AddFunc("*/15 * * * *", redisTaskProcessor.ProcessINECResultGrabberSync)

	// Start the cron scheduler in its own background Goroutine to evaluate scheduled triggers
	redisTaskProcessor.cron.Start()
	slog.Info("cron rollup scheduler started")

	// Start the Asynq server worker loop: polls Redis queues and executes matched handlers in mux
	return redisTaskProcessor.asynqServer.Start(mux)
}

// ProcessINECResultGrabberSync runs periodically (every 15 mins) to poll INEC IReV
// for newly uploaded polling unit result sheets (EC8A) across all active election grabbers.
func (redisTaskProcessor *RedisTaskProcessor) ProcessINECResultGrabberSync() {
	ctx := context.Background()

	// 1. Acquire distributed lock in Redis to ensure only ONE instance/container executes this sync
	// In multi-container ECS deployments, all containers trigger the cron at the same time;
	// Mode: "NX" with a 14-minute TTL ensures the winner runs the sync while others safely skip.
	err := redisTaskProcessor.rdb.SetArgs(ctx, INECGrabberSyncLockKey, "locked", redis.SetArgs{
		Mode: "NX",
		TTL:  INECGrabberSyncLockTTL,
	}).Err()
	if errors.Is(err, redis.Nil) {
		// Lock is already held by another container/replica for this 15-minute window
		slog.Debug("cron INEC grabber: sync already running or executed on another instance, skipping")
		return
	}
	if err != nil {
		slog.Error("cron INEC grabber: failed to acquire distributed lock", "error", err)
		return
	}

	// 2. Retrieve Gemini API key for multi-modal AI OCR extraction of EC8A result sheets
	geminiKey := redisTaskProcessor.cfg.GeminiAPIKey

	// 3. Define callback: when a result sheet is processed, enqueue an asynchronous rollup task
	var notifier inecgrabber.ResultNotifierFunc
	notifier = func(ctx context.Context, electionID int32, puID int32) {
		_ = redisTaskProcessor.taskDistributor.DistributeTaskCalculateFinalResult(ctx, &CalculateFinalResultPayload{
			ElectionID:    electionID,
			PollingUnitID: puID,
		})
	}

	// 4. Instantiate the INEC Grabber service with DB pool, queries, Redis, R2 storage, and OCR credentials
	grabberSvc := inecgrabber.NewINECGrabberService(redisTaskProcessor.queries, redisTaskProcessor.pool, redisTaskProcessor.rdb, redisTaskProcessor.r2Svc, geminiKey, notifier)

	// 5. Fetch system configuration (e.g., active sync days limit)
	cfg, err := grabberSvc.GetINECAPIConfig(ctx)
	if err != nil {
		slog.Error("cron INEC grabber: failed to load config", "err", err)
		return
	}

	// 6. Query all active grabber profiles within the active window (e.g. elections within last 7 days)
	activeGrabbers, err := redisTaskProcessor.queries.ListActiveINECResultGrabbers(ctx, int32(cfg.ActiveSyncDaysLimit))
	if err != nil {
		slog.Error("cron INEC grabber: failed to list active grabbers", "err", err)
		return
	}

	// If no elections/grabbers are currently active, exit early to save compute
	if len(activeGrabbers) == 0 {
		return
	}

	// 7. Iterate through each active election grabber and sync newly available results from INEC IReV
	slog.Info("cron INEC grabber: starting sync for active grabbers", "count", len(activeGrabbers))
	for _, grabber := range activeGrabbers {
		opts := inecgrabber.SyncOptions{}
		_, err := grabberSvc.SyncGrabber(ctx, grabber.ID, opts)
		if err != nil {
			slog.Error("cron INEC grabber: sync error for grabber", "grabber_id", grabber.ID, "err", err)
		}
	}
}

// Shutdown gracefully stops the background scheduler and Asynq worker server
func (redisTaskProcessor *RedisTaskProcessor) Shutdown() {
	// Stop cron scheduler so no new scheduled jobs are launched
	redisTaskProcessor.cron.Stop()

	// Gracefully shutdown Asynq server, allowing currently executing jobs to finish
	redisTaskProcessor.asynqServer.Shutdown()
}
