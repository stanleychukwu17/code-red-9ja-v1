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
	inecgrabber "free9ja/api/internal/service/inec_grabber"
	r2service "free9ja/api/internal/service/r2"
	"free9ja/api/internal/service/realtime"
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

	asynqServer := asynq.NewServer(
		redisOpt,
		asynq.Config{
			Concurrency: 10,
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

	redisTaskProcessor.cron.Start()
	slog.Info("cron rollup scheduler started")

	return redisTaskProcessor.asynqServer.Start(mux)
}

func (redisTaskProcessor *RedisTaskProcessor) ProcessINECResultGrabberSync() {
	ctx := context.Background()
	geminiKey := ""
	if redisTaskProcessor.cfg != nil {
		geminiKey = redisTaskProcessor.cfg.GeminiAPIKey
	}
	var notifier inecgrabber.ResultNotifierFunc
	if redisTaskProcessor.taskDistributor != nil {
		notifier = func(ctx context.Context, electionID int32, puID int32) {
			_ = redisTaskProcessor.taskDistributor.DistributeTaskCalculateFinalResult(ctx, &CalculateFinalResultPayload{
				ElectionID:    electionID,
				PollingUnitID: puID,
			})
		}
	}
	grabberSvc := inecgrabber.NewINECGrabberService(redisTaskProcessor.queries, redisTaskProcessor.pool, redisTaskProcessor.rdb, redisTaskProcessor.r2Svc, geminiKey, notifier)

	cfg, err := grabberSvc.GetINECAPIConfig(ctx)
	if err != nil {
		slog.Error("cron INEC grabber: failed to load config", "err", err)
		return
	}

	activeGrabbers, err := redisTaskProcessor.queries.ListActiveINECResultGrabbers(ctx, int32(cfg.ActiveSyncDaysLimit))
	if err != nil {
		slog.Error("cron INEC grabber: failed to list active grabbers", "err", err)
		return
	}

	if len(activeGrabbers) == 0 {
		return
	}

	slog.Info("cron INEC grabber: starting sync for active grabbers", "count", len(activeGrabbers))
	for _, grabber := range activeGrabbers {
		opts := inecgrabber.SyncOptions{}
		_, err := grabberSvc.SyncGrabber(ctx, grabber.ID, opts)
		if err != nil {
			slog.Error("cron INEC grabber: sync error for grabber", "grabber_id", grabber.ID, "err", err)
		}
	}
}

func (redisTaskProcessor *RedisTaskProcessor) Shutdown() {
	redisTaskProcessor.cron.Stop()
	redisTaskProcessor.asynqServer.Shutdown()
}
