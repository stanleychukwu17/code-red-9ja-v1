# Free9ja Worker & Queue Documentation

This directory contains complete documentation and crash courses on the asynchronous background task system in `apps/api/internal/worker`.

## Guides & Documentation

1. [CRASH_COURSE.md](file:///d:/Sz-projects/50-main-projects/3-free9ja/apps/api/internal/worker/docs/CRASH_COURSE.md)
   - **Why queues exist**: The non-blocking background model vs synchronous blocking model.
   - **Code Trace**: Line-by-line trace of how `s.distributor.DistributeTaskSeedElectionGroupStats(...)` travels from service to Redis to worker.
   - **How to Add a Task**: 4-step developer recipe to create new asynchronous background jobs.
   - **Best Practices**: Deduplication, debouncing, idempotency, and graceful shutdowns.

2. [ARCHITECTURE.md](file:///d:/Sz-projects/50-main-projects/3-free9ja/apps/api/internal/worker/docs/ARCHITECTURE.md)
   - **The Three Pillars**: Producer (`TaskDistributor`), Broker (`Asynq` + Redis), and Consumer (`TaskProcessor`).
   - **Flowchart**: System architecture diagram showing API services, Redis sorted sets/queues, worker concurrency pools, PostgreSQL, and WebSockets.
   - **Lifecycle**: How the worker starts, runs, and gracefully stops in `cmd/api/main.go`.

3. [TASK_REFERENCE.md](file:///d:/Sz-projects/50-main-projects/3-free9ja/apps/api/internal/worker/docs/TASK_REFERENCE.md)
   - **Task Inventory**: Table of all 17 task names, types, payloads, files, and debounce options.
   - **Top-Down Seeding**: How election group stats are seeded across all 6 administrative tiers.
   - **Bottom-Up Stats Cascade**: Polling Unit -> Ward -> LGA -> State -> Global stats flow.
   - **Bottom-Up Candidate Rollup**: Real-time vote aggregation & WebSocket broadcasting cascade.
   - **AI Extraction & Crons**: Google Gemini Vision OCR processing and safety-net scheduled cron jobs.

4. [DEPLOYMENT_ECS.md](file:///d:/Sz-projects/50-main-projects/3-free9ja/apps/api/internal/worker/docs/DEPLOYMENT_ECS.md)
   - **Multi-Task ECS & ALB**: Explains who runs queue tasks across multiple ECS containers.
   - **Competing Consumers**: Why Redis atomic locks guarantee no two containers process the same job.
   - **In-Memory Cron Caveat**: How to prevent multiple containers from running the same cron at midnight.
   - **Production Strategies**: Split Architecture (`api` vs `worker` services) vs Colocated with Redis `SETNX` distributed locks.
