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
	server          *asynq.Server
	cron            *cron.Cron
	q               *queries.Queries
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
		r2Svc:           r2Svc,
		broadcaster:     broadcaster,
	}
}

func (processor *RedisTaskProcessor) Start() error {
	mux := asynq.NewServeMux()
	mux.HandleFunc(TaskCalculateFinalResult, processor.ProcessTaskCalculateFinalResult)
	mux.HandleFunc(TaskExtractPUResultAI, processor.ProcessTaskExtractPUResultAI)
	mux.HandleFunc(TaskAggregateLiveVotes, processor.ProcessTaskAggregateLiveVotes)
	mux.HandleFunc(TaskSeedElectionGroupStats, processor.ProcessTaskSeedElectionGroupStats)
	mux.HandleFunc(TaskRefreshPollingUnitStats, processor.ProcessTaskRefreshPollingUnitStats)

	// Cascading stats refresh handlers (event-driven, per geographic unit).
	mux.HandleFunc(TaskRefreshWardStats, processor.ProcessTaskRefreshWardStats)
	mux.HandleFunc(TaskRefreshLGAStats, processor.ProcessTaskRefreshLGAStats)
	mux.HandleFunc(TaskRefreshStateConstituencyStats, processor.ProcessTaskRefreshStateConstituencyStats)
	mux.HandleFunc(TaskRefreshStateStats, processor.ProcessTaskRefreshStateStats)
	mux.HandleFunc(TaskRefreshGlobalStats, processor.ProcessTaskRefreshGlobalStats)

	// Scoped candidate rollup handlers (event-driven, bottom-up cascading).
	mux.HandleFunc(TaskRollupSingleWard, processor.ProcessTaskRollupSingleWard)
	mux.HandleFunc(TaskRollupSingleStateConstituency, processor.ProcessTaskRollupSingleStateConstituency)
	mux.HandleFunc(TaskRollupSingleLGA, processor.ProcessTaskRollupSingleLGA)
	mux.HandleFunc(TaskRollupSingleFederalConstituency, processor.ProcessTaskRollupSingleFederalConstituency)
	mux.HandleFunc(TaskRollupSingleSenatorialDistrict, processor.ProcessTaskRollupSingleSenatorialDistrict)
	mux.HandleFunc(TaskRollupSingleState, processor.ProcessTaskRollupSingleState)
	mux.HandleFunc(TaskRollupSingleElection, processor.ProcessTaskRollupSingleElection)

	// Register cron rollup safety-net jobs.
	// Primary live updates happen via event-driven cascades; these crons act as safety-net reconciliation.
	// In development, set STATS_REFRESH_ENABLED=false in your .env to skip scheduled safety-net crons.
	statsEnabled := config.GetEnv("STATS_REFRESH_ENABLED", "true") == "true"
	if !statsEnabled {
		slog.Warn("STATS_REFRESH_ENABLED=false — skipping all stats cron registration (dev mode)")
	} else {
		// Single sequential rollup pipeline (runs every 15 minutes) bottom-up from Ward to Nationwide
		// processor.cron.AddFunc("*/15 * * * *", processor.ProcessFullElectionRollup)

		// Geographic Stats safety-net fallback (runs every 10 minutes)
		// processor.cron.AddFunc("*/10 * * * *", processor.ProcessRefreshAllElectionStats)
	}

	// Daily Marketing Campaign Deductions & Auto-Completion Worker (runs every day at 00:05 AM)
	// Recommended schedule: "5 0 * * *" (5 minutes past midnight) to process previous day's campaign allocations cleanly.
	processor.cron.AddFunc("5 0 * * *", processor.ProcessDailyMarketingCampaignDeductions)

	// INEC Result Grabber sync cron job (runs every 15 minutes)
	processor.cron.AddFunc("*/15 * * * *", processor.ProcessINECResultGrabberSync)

	processor.cron.Start()
	slog.Info("cron rollup scheduler started")

	return processor.server.Start(mux)
}

func (processor *RedisTaskProcessor) ProcessINECResultGrabberSync() {
	ctx := context.Background()
	geminiKey := ""
	if processor.cfg != nil {
		geminiKey = processor.cfg.GeminiAPIKey
	}
	var notifier inecgrabber.ResultNotifierFunc
	if processor.taskDistributor != nil {
		notifier = func(ctx context.Context, electionID int64, puID int32) {
			_ = processor.taskDistributor.DistributeTaskCalculateFinalResult(ctx, &CalculateFinalResultPayload{
				ElectionID:    electionID,
				PollingUnitID: puID,
			})
		}
	}
	grabberSvc := inecgrabber.NewINECGrabberService(processor.q, processor.pool, processor.rdb, processor.r2Svc, geminiKey, notifier)

	cfg, err := grabberSvc.GetINECAPIConfig(ctx)
	if err != nil {
		slog.Error("cron INEC grabber: failed to load config", "err", err)
		return
	}

	activeGrabbers, err := processor.q.ListActiveINECResultGrabbers(ctx, int32(cfg.ActiveSyncDaysLimit))
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

func (processor *RedisTaskProcessor) Shutdown() {
	processor.cron.Stop()
	processor.server.Shutdown()
}
