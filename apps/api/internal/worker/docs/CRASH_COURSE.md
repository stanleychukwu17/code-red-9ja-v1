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
func (distributor *RedisTaskDistributor) DistributeTaskSeedElectionGroupStats(
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
    info, err := distributor.client.EnqueueContext(ctx, task)
    ...
}
```

### Step 3: Inside Redis (The Queue)
Redis stores the task under Asynq's internal keys:
- Because of `asynq.ProcessIn(5 * time.Second)`, Asynq places the task in a Redis **Sorted Set** (`asynq:{default}:scheduled`) with a score equal to `timestamp + 5 seconds`.
- While in the scheduled set, if another identical task is submitted, Asynq's `Unique(10 * time.Minute)` sees the existing lock in Redis and returns `asynq.ErrTaskIDConflict` (which our code catches and safely ignores).
- When the 5 seconds elapse, Asynq's internal scheduler atomically moves the task to the ready queue (`asynq:{default}:pending`).

### Step 4: The Worker Picks Up the Task (Consumer)
In [worker.go](file:///d:/Sz-projects/50-main-projects/3-free9ja/apps/api/internal/worker/worker.go#L94):
```go
mux.HandleFunc(TaskSeedElectionGroupStats, processor.ProcessTaskSeedElectionGroupStats)
```
1. One of the 10 concurrent worker goroutines inside `asynq.Server` pops the task from the ready queue.
2. `asynq.ServeMux` looks up the handler registered for `"election_group:seed_stats"`.
3. It calls `processor.ProcessTaskSeedElectionGroupStats(ctx, task)`.

### Step 5: Task Execution
Inside [ProcessTaskSeedElectionGroupStats](file:///d:/Sz-projects/50-main-projects/3-free9ja/apps/api/internal/worker/seed_election_stats_task.go#L71):
1. Unmarshals the JSON payload back into `SeedElectionGroupStatsPayload`.
2. Runs the 6 SQL queries in order:
   - States (`SeedElectionGroupStateStats`)
   - Senatorial Districts (`SeedElectionGroupSenatorialDistrictStats`)
   - Federal Constituencies (`SeedElectionGroupFederalConstituencyStats`)
   - LGAs (`SeedElectionGroupLGAStats`)
   - State Constituencies (`SeedElectionGroupStateConstituencyStats`)
   - Wards (`SeedElectionGroupWardStats`)
3. If all queries succeed, it returns `nil`. Asynq marks the task as **Completed**.
4. If an error is returned, Asynq reschedules the task using exponential backoff according to `MaxRetry(5)`.

---

## 3. How to Add a New Background Task (4-Step Recipe)

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
// In final_result_task.go (or your task file):
type TaskDistributor interface {
    ...
    DistributeTaskSendSMS(ctx context.Context, payload *SendSMSPayload, opts ...asynq.Option) error
}

func (d *RedisTaskDistributor) DistributeTaskSendSMS(ctx context.Context, payload *SendSMSPayload, opts ...asynq.Option) error {
    jsonPayload, err := json.Marshal(payload)
    if err != nil {
        return err
    }
    task := asynq.NewTask(TaskSendSMS, jsonPayload, opts...)
    _, err = d.client.EnqueueContext(ctx, task)
    return err
}
```

### Step 3: Implement the Processor Method
Add to `TaskProcessor` interface in `worker.go` and implement on `RedisTaskProcessor`:
```go
func (p *RedisTaskProcessor) ProcessTaskSendSMS(ctx context.Context, task *asynq.Task) error {
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
mux.HandleFunc(TaskSendSMS, processor.ProcessTaskSendSMS)
```

Done! Now any service can call:
```go
s.distributor.DistributeTaskSendSMS(ctx, &worker.SendSMSPayload{...})
```

---

## 4. Key Takeaways & Best Practices

1. **Idempotent Handlers**: Because background workers may retry failed tasks, handlers should always be safe to run multiple times (e.g., using `ON CONFLICT DO NOTHING` or checking existing records).
2. **Deterministic Task IDs**: Always use `asynq.TaskID(...)` with meaningful IDs (e.g., `fmt.Sprintf("live_votes:%d:%d", electionID, puID)`) when you want debouncing and deduplication.
3. **Context Awareness**: Always pass `ctx` so that if a task times out (`asynq.Timeout(...)`) or the worker shuts down gracefully, in-flight queries get cancelled cleanly.
4. **Carry-Forward IDs**: When building multi-step cascades (like `PU -> Ward -> LGA -> State`), pass parent IDs in payloads to avoid redundant database lookups at each tier.

---

## 5. Deploying to AWS ECS Behind an ALB

If you run multiple task containers in ECS behind an Application Load Balancer:
- **Queue Tasks**: All ECS tasks act as competing consumers on Redis. Redis atomically ensures only **one** container processes any given job.
- **Crons**: Because `robfig/cron` runs in memory, you should either split ECS into an `api` service and a single-instance `worker` service, or guard the cron with a Redis distributed lock (`SETNX`).

👉 See the complete guide: **[DEPLOYMENT_ECS.md](file:///d:/Sz-projects/50-main-projects/3-free9ja/apps/api/internal/worker/docs/DEPLOYMENT_ECS.md)**.

