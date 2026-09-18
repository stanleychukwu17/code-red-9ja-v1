# Asynchronous Worker & Queue Crash Course

Welcome to the **Free9ja Worker Crash Course**! This guide walks you through how asynchronous tasks, Redis queues, distributors, and worker processors work in this codebase.

---

## 1. The Core Problem: Why Queues Exist

When a user or admin performs an action in the API (like creating an election group, uploading an election result, or casting a vote), several heavy operations must occur:
- Seeding thousands of database rows.
- Calling external AI APIs (like Google Gemini Vision).
- Aggregating numbers across 176,000+ Polling Units, 8,800+ Wards, 774 LGAs, and 37 States.

### Without a Queue (Blocking Synchronous Model):
```
Client HTTP Request ---> [API Server]
                             ├── Creates group in DB (50ms)
                             ├── Inserts 9,000+ skeleton rows (3500ms)
                             ├── Calculates statistics (2000ms)
                             └── Response returns after 6 SECONDS! (Client timeout / sluggish UI)
```

### With Asynq + Redis (Asynchronous Non-Blocking Model):
```
Client HTTP Request ---> [API Server]
                             ├── Creates group in DB (50ms)
                             ├── Calls s.distributor.DistributeTask...(2ms) ---> Redis Queue
                             └── Returns HTTP 201 Created immediately in 55ms!

Background Goroutine ---> Reads from Redis Queue ---> Runs seeding/stats in background
```

---

## 2. Step-by-Step Code Trace: The `s.distributor` Call

Let's trace the exact line from `election_groups_service.go:L109`:

```go
if seedErr := s.distributor.DistributeTaskSeedElectionGroupStats(ctx, &worker.SeedElectionGroupStatsPayload{
    ElectionGroupID: eg.ID,
}); seedErr != nil {
    slog.Warn("failed to enqueue seed election group stats task", "election_group_id", eg.ID, "error", seedErr)
}
```

### Step 1: The Call (Producer)
1. In `election_groups_service.go`, `s.distributor` is of interface type `worker.TaskDistributor`.
2. It passes a typed payload: `SeedElectionGroupStatsPayload{ ElectionGroupID: eg.ID }`.
3. The HTTP handler does not wait for the database rows to be seeded. It simply schedules the job and returns to the user.

### Step 2: Enqueueing into Redis
Look at [seed_election_stats_task.go](file:///d:/Sz-projects/50-main-projects/3-free9ja/apps/api/internal/worker/seed_election_stats_task.go#L23):
```go
func (redisTaskDistributor *RedisTaskDistributor) DistributeTaskSeedElectionGroupStats(
    ctx context.Context,
    payload *SeedElectionGroupStatsPayload,
    opts ...asynq.Option,
) error {
    // 1. Serialize payload to JSON: {"election_group_id": 15}
    jsonPayload, _ := json.Marshal(payload)

    // 2. Build deterministic task ID for deduplication
    uniqueKey := fmt.Sprintf("election_group:seed_stats:%d", payload.ElectionGroupID)

    // 3. Configure options:
    defaults := []asynq.Option{
        asynq.ProcessIn(5 * time.Second), // Debounce / delay 5s
        asynq.Unique(10 * time.Minute),   // Ignore duplicates within 10m
        asynq.MaxRetry(5),               // Retry up to 5 times on DB transient errors
        asynq.Timeout(5 * time.Minute),  // Fail fast if hanging
        asynq.TaskID(uniqueKey),
    }

    // 4. Send to Redis
    task := asynq.NewTask(TaskSeedElectionGroupStats, jsonPayload, opts...)
    info, err := redisTaskDistributor.asynqClient.EnqueueContext(ctx, task)
    ...
}
```

### Step 3: Inside Redis (The Queue & State Machine)
Redis stores the task under Asynq's internal keys:
- Because of `asynq.ProcessIn(5 * time.Second)`, Asynq places the task in a Redis **Sorted Set** (`asynq:{default}:scheduled`) with a score equal to `current_timestamp + 5 seconds`.
- While in the scheduled set, if another identical task is submitted, Asynq's `Unique(10 * time.Minute)` sees the existing lock in Redis (`asynq:unique:...`) and returns `asynq.ErrTaskIDConflict` (which our code catches and safely ignores).
- When the 5 seconds elapse, Asynq's background scheduler atomically moves the task from the sorted set to the ready queue (`asynq:{default}:pending`).

### Step 4: The Worker Picks Up the Task (Consumer)
In [worker.go](file:///d:/Sz-projects/50-main-projects/3-free9ja/apps/api/internal/worker/worker.go#L94):
```go
mux.HandleFunc(TaskSeedElectionGroupStats, redisTaskProcessor.ProcessTaskSeedElectionGroupStats)
```
1. One of the 10 concurrent worker goroutines inside `asynq.Server` atomically claims the task from `asynq:{default}:pending` and moves it to `asynq:{default}:active`.
2. `asynq.ServeMux` looks up the handler registered for `"election_group:seed_stats"`.
3. It calls `redisTaskProcessor.ProcessTaskSeedElectionGroupStats(ctx, task)`.

### Step 5: Task Execution & Lifecycle Resolution
Inside [ProcessTaskSeedElectionGroupStats](file:///d:/Sz-projects/50-main-projects/3-free9ja/apps/api/internal/worker/seed_election_stats_task.go#L71):
1. Unmarshals the JSON payload back into `SeedElectionGroupStatsPayload`.
2. Runs the 6 SQL queries in order:
   - States (`SeedElectionGroupStateStats`)
   - Senatorial Districts (`SeedElectionGroupSenatorialDistrictStats`)
   - Federal Constituencies (`SeedElectionGroupFederalConstituencyStats`)
   - LGAs (`SeedElectionGroupLGAStats`)
   - State Constituencies (`SeedElectionGroupStateConstituencyStats`)
   - Wards (`SeedElectionGroupWardStats`)
3. **Success**: If all queries succeed, it returns `nil`. Asynq removes the task from `asynq:{default}:active` and marks it completed.
4. **Failure**: If an error is returned, Asynq moves the task to `asynq:{default}:retry` with an exponential backoff timestamp calculated according to `MaxRetry(5)`.
5. **Panic Recovery**: If code panics (e.g. nil pointer), Asynq's built-in `recover()` intercepts it, logs the stack trace, increments retry count, and prevents the entire API/worker from crashing.

---

## 3. Deep Dive: Under the Hood of Asynq & Redis

To truly master Asynq, you need to understand how it organizes data in Redis and how `asynq.Server` operates internally.

### A. The Redis State Machine

Asynq does not use a single Redis list. It manages a complete distributed state machine across Redis data structures:

```
                  ┌──────────────────────┐
                  │   asynq.NewTask()    │
                  └──────────┬───────────┘
                             │
                  ┌──────────┴──────────┐
      With ProcessIn()                  Immediate
                  │                             │
                  ▼                             ▼
       asynq:{q}:scheduled              asynq:{q}:pending
         (Redis Sorted Set)               (Redis List)
         Score = timestamp                      │
                  │                             │
                  │ (Scheduler polls            │ (Worker pops atomically)
                  │  score <= now)              │
                  └──────────────►──────────────┤
                                                ▼
                                         asynq:{q}:active
                                        (Redis Sorted Set)
                                                │
                          ┌─────────────────────┴─────────────────────┐
                          ▼                                           ▼
                      Returns nil                                Returns error
                          │                                           │
                   Task Succeeded                                Task Failed
                          │                                           │
                          ▼                                           ▼
                 asynq:{q}:completed                          asynq:{q}:retry
                 (Optional retention)                        (Redis Sorted Set)
                                                          Score = next retry time
                                                                      │
                                                            Max retries exceeded?
                                                                      │
                                                                      ▼
                                                                asynq:{q}:dead
                                                             (Dead Letter Queue)
```

#### Redis Keys Breakdown:
- **`asynq:{q}:pending`** (List): Ready-to-execute tasks waiting for an available worker goroutine.
- **`asynq:{q}:active`** (Sorted Set): Tasks currently being executed. Score is the deadline timestamp. If a worker dies mid-task, this is used for recovery.
- **`asynq:{q}:scheduled`** (Sorted Set): Delayed tasks (e.g., `ProcessIn(15s)`). Score is the unix timestamp when it should run.
- **`asynq:{q}:retry`** (Sorted Set): Failed tasks waiting for their backoff duration. Score is the next retry timestamp.
- **`asynq:{q}:dead`** (Sorted Set): The Dead Letter Queue (DLQ). Tasks that failed `MaxRetry` times. Stored for manual inspection and debugging.
- **`asynq:unique:{q}:{task_id_hash}`** (String with TTL): Distributed locks guaranteeing task deduplication within the specified window.
- **`asynq:servers` & `asynq:workers`** (Hashes & Sets): Cluster membership, heartbeat timestamps, and active worker metadata.

### B. The 4 Background Daemons Inside `asynq.Server`

When [main.go](file:///d:/Sz-projects/50-main-projects/3-free9ja/apps/api/cmd/api/main.go#L139-L144) starts `processor.Start()`, Asynq launches several dedicated internal background daemons:

1. **The Scheduler**:
   - Polls `asynq:{q}:scheduled` every second using a Redis Lua script.
   - Atomically pulls tasks where `score <= time.Now().Unix()` and pushes them into `asynq:{q}:pending`.
2. **The Retrier**:
   - Polls `asynq:{q}:retry` and moves matured retry tasks back into `asynq:{q}:pending`.
3. **The Heartbeat & Watchdog (Crash / Orphan Recovery)**:
   - Periodically pings Redis to update its node status.
   - If an ECS task or Docker container crashes unexpectedly (e.g., OOM killed, host reboot), the tasks it was working on remain in `asynq:{q}:active`.
   - The watchdog on surviving nodes inspects `asynq:{q}:active`, detects that the owning worker server missed its heartbeat, and **automatically reclaims the orphaned task back into `asynq:{q}:pending`**.
4. **The Worker Pool & Concurrency Manager**:
   - Spawns N goroutines (`Concurrency: 10` in Free9ja).
   - Each goroutine loops, popping ready jobs from `asynq:{q}:pending`, wrapping them in panic recovery, and passing them to `asynq.ServeMux`.

> [!WARNING]
> **Redis Eviction Policy Caveat**:
> Redis must be configured with `maxmemory-policy noeviction` (or `volatile-ttl`). If Redis is configured with `allkeys-lru` or `allkeys-lfu` and runs low on RAM, it will evict queue keys, causing tasks to vanish silently!

---

## 4. Advanced Patterns in the Free9ja Codebase

Free9ja's worker system is significantly more sophisticated than simple one-off background jobs. Here is what is actually going on across the codebase:

### Pattern 1: Event-Driven Chained Cascades (Tasks as Producers)

In Free9ja, workers don't just consume tasks; **they act as producers that trigger downstream workers**. This forms a bottom-up hierarchical aggregation tree:

```
Agent Submits PU Result
          │
          ▼
TaskCalculateFinalResult (PU Consensus Calculated)
          │
          ├─────────────────────────────────────────┐
          ▼                                         ▼
TaskRollupSingleWard                      TaskRefreshPollingUnitStats
          │                                         │
          ▼                                         ▼
TaskRollupSingleLGA                       TaskRefreshWardStats
          │                                         │
          ▼                                         ▼
TaskRollupSingleState                     TaskRefreshLGAStats
          │                                         │
          ▼                                         ▼
TaskRollupSingleElection (Nationwide)     TaskRefreshStateStats
                                                    │
                                                    ▼
                                          TaskRefreshGlobalStats
```

Each stage in the chain aggregates votes or statistics for its administrative tier and immediately distributes the task for its parent tier using `s.distributor`.

### Pattern 2: The "Thundering Herd" Defense (Debouncing & Deduplication)

Imagine an election day where **100 polling units** in the same Ward upload results within the same 60-second window.

Without debouncing:
- 100 Ward rollup tasks would run concurrently.
- 100 LGA rollup tasks would run concurrently.
- 100 State rollup tasks would run concurrently.
- PostgreSQL CPU would spike to 100%, causing connection pool exhaustion and deadlocks!

**How Free9ja prevents this**:
Look at [candidate_rollup_tasks.go](file:///d:/Sz-projects/50-main-projects/3-free9ja/apps/api/internal/worker/candidate_rollup_tasks.go):
```go
uniqueKey := fmt.Sprintf("rollup:ward:%d:%d", payload.ElectionID, payload.WardID)

defaults := []asynq.Option{
    asynq.ProcessIn(15 * time.Second), // Wait 15 seconds before running
    asynq.Unique(15 * time.Second),    // Collapse duplicates in this window
    asynq.TaskID(uniqueKey),          // Deterministic key
}
```
When all 100 polling units trigger `DistributeTaskRollupSingleWard`, the first one schedules the task for `T + 15s`. The subsequent 99 calls hit the unique lock, receive `ErrTaskIDConflict`, and are safely discarded. **The database only calculates the Ward aggregation ONCE.**

### Pattern 3: The Dual Engine in `worker.go`

Inside [worker.go](file:///d:/Sz-projects/50-main-projects/3-free9ja/apps/api/internal/worker/worker.go#L49-L87), two distinct systems run side-by-side:

| System | Technology | Storage | Execution Model | Multi-Container Behavior |
|---|---|---|---|---|
| **Queue Tasks** | Asynq | Redis | Event-driven (push to queue) | **Distributed**: Atomic competing consumers across all ECS containers |
| **Scheduled Crons** | `robfig/cron` | In-memory | Time-driven (cron clock) | **Local**: Runs on **every** container unless isolated or locked |

Free9ja uses `robfig/cron` for scheduled periodic tasks:
- **Daily Marketing Deductions** (`5 0 * * *`): Runs at 00:05 AM to settle allowances.
- **INEC Result Grabber Sync** (`*/15 * * * *`): Polls the INEC IReV portal every 15 minutes for newly uploaded EC8A sheets.

👉 *To learn how to handle the cron multi-container challenge in production, see [DEPLOYMENT_ECS.md](file:///d:/Sz-projects/50-main-projects/3-free9ja/apps/api/internal/worker/docs/DEPLOYMENT_ECS.md).*

### Pattern 4: External Side-Effects (AI OCR & Real-Time WebSockets)

Workers in Free9ja connect to external services and push live client events:
1. **Google Gemini Vision OCR** ([extract_pu_result_ai_task.go](file:///d:/Sz-projects/50-main-projects/3-free9ja/apps/api/internal/worker/extract_pu_result_ai_task.go)):
   - Downloads official EC8A election result photos from Cloudflare R2.
   - Sends the image to Google Gemini Vision with structured schema prompts.
   - Parses the returned JSON party tallies into PostgreSQL and triggers consensus calculation.
2. **Live WebSocket Broadcasting** ([realtime.Broadcaster](file:///d:/Sz-projects/50-main-projects/3-free9ja/apps/api/internal/service/realtime)):
   - At every tier of candidate rollup (`Ward -> LGA -> State -> Election`), the worker broadcasts a WebSocket message to all connected frontend clients so election dashboards update in real time.

---

## 5. Observability & Inspecting Queues with `asynqmon`

Asynq comes with a first-class web management dashboard called **Asynqmon**. It allows you to:
- Inspect active, pending, scheduled, retry, and dead letter queues.
- View payload JSON and error stack traces for failed jobs.
- Manually retry or delete tasks from the dead letter queue.
- Cancel in-flight or scheduled tasks.

### Running Asynqmon via Docker:
```bash
docker run --rm -p 8080:8080 hibiken/asynqmon --redis-addr=host.docker.internal:6379
```
Then open `http://localhost:8080` in your browser.

---

## 6. How to Add a New Background Task (4-Step Recipe)

When you want to add a new background task (for example, sending a welcome SMS or generating an audit report), follow this exact pattern:

### Step 1: Define the Constant and Payload
In a task file (e.g. `send_sms_task.go`):
```go
package worker

const TaskSendSMS = "notification:send_sms"

type SendSMSPayload struct {
    PhoneNumber string `json:"phone_number"`
    Message     string `json:"message"`
}
```

### Step 2: Implement the Distributor Method
Add to `TaskDistributor` interface and implement on `RedisTaskDistributor`:
```go
// In distributor.go:
type TaskDistributor interface {
    ...
    DistributeTaskSendSMS(ctx context.Context, payload *SendSMSPayload, opts ...asynq.Option) error
}

func (redisTaskDistributor *RedisTaskDistributor) DistributeTaskSendSMS(ctx context.Context, payload *SendSMSPayload, opts ...asynq.Option) error {
    jsonPayload, err := json.Marshal(payload)
    if err != nil {
        return err
    }
    task := asynq.NewTask(TaskSendSMS, jsonPayload, opts...)
    _, err = redisTaskDistributor.asynqClient.EnqueueContext(ctx, task)
    return err
}
```

### Step 3: Implement the Processor Method
Add to `TaskProcessor` interface in `worker.go` and implement on `RedisTaskProcessor`:
```go
func (redisTaskProcessor *RedisTaskProcessor) ProcessTaskSendSMS(ctx context.Context, task *asynq.Task) error {
    var payload SendSMSPayload
    if err := json.Unmarshal(task.Payload(), &payload); err != nil {
        return err
    }
    // Perform SMS sending logic here
    return smsClient.Send(payload.PhoneNumber, payload.Message)
}
```

### Step 4: Register the Handler in `worker.go`
In `worker.go` inside `Start()`:
```go
mux.HandleFunc(TaskSendSMS, redisTaskProcessor.ProcessTaskSendSMS)
```

Done! Now any service can call:
```go
s.distributor.DistributeTaskSendSMS(ctx, &worker.SendSMSPayload{...})
```

---

## 7. Key Takeaways & Best Practices

1. **Idempotent Handlers**: Because background workers may retry failed tasks, handlers should always be safe to run multiple times (e.g., using `ON CONFLICT DO NOTHING` or checking existing records).
2. **Deterministic Task IDs**: Always use `asynq.TaskID(...)` with meaningful IDs (e.g., `fmt.Sprintf("live_votes:%d:%d", electionID, puID)`) when you want debouncing and deduplication.
3. **Context Awareness**: Always pass `ctx` so that if a task times out (`asynq.Timeout(...)`) or the worker shuts down gracefully, in-flight queries get cancelled cleanly.
4. **Carry-Forward IDs**: When building multi-step cascades (like `PU -> Ward -> LGA -> State`), pass parent IDs in payloads to avoid redundant database lookups at each tier.
5. **Monitor the Dead Letter Queue**: Check `asynq:{q}:dead` periodically using `asynqmon` to discover recurring bugs or poison pills.

---

## 8. Deploying to AWS ECS Behind an ALB

If you run multiple task containers in ECS behind an Application Load Balancer:
- **Queue Tasks**: All ECS tasks act as competing consumers on Redis. Redis atomically ensures only **one** container processes any given job.
- **Crons**: Because `robfig/cron` runs in memory, you should either split ECS into an `api` service and a single-instance `worker` service, or guard the cron with a Redis distributed lock (`SETNX`).

👉 See the complete guide: **[DEPLOYMENT_ECS.md](file:///d:/Sz-projects/50-main-projects/3-free9ja/apps/api/internal/worker/docs/DEPLOYMENT_ECS.md)**.


