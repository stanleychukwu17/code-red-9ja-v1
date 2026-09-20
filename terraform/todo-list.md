# Terraform Production Pre-Launch Checklist & To-Do List

This document is the master pre-launch and Election Day hardening checklist for **Free9ja**. It outlines the exact critical infrastructure tasks, metric alarms, and disaster prevention safeguards needed to guarantee a smooth, crash-proof outing under flash-crowd traffic.

---

## 1. ElastiCache Redis & Queue Safety

### Context & The Hidden Trap
Free9ja uses Redis for **both** Asynq distributed background queues (`asynq:default:pending`, `asynq:default:active`) and general application caching (e.g., party metadata cached for 1–2 years). 
- If Redis is configured with an aggressive eviction policy like `allkeys-lru`, Redis will evict keys **without TTL** when RAM runs tight. 
- Because Asynq's pending queue list has no TTL, **your pending vote tallying tasks will be deleted silently**, causing votes to vanish without any error log!

- [ ] **Verify ElastiCache Eviction Policy**:
  - Ensure `maxmemory-policy` remains **`volatile-lru`** (AWS ElastiCache default) or **`noeviction`**.
  - **Why**: `volatile-lru` strictly evicts keys that have a TTL (like temporary cache or 15-second deduplication locks). It **never** evicts keys without TTL (`asynq:default:pending`), protecting your vote rollup queues.
  - **CRITICAL WARNING**: NEVER change the parameter group to `allkeys-lru` or `allkeys-lfu`.

- [ ] **Add a CloudWatch Alarm for ElastiCache Memory Usage**:
  - **Metric**: `AWS/ElastiCache` ➔ `DatabaseMemoryUsagePercentage`
  - **Threshold**: Static `>= 75%` for 2 consecutive evaluation periods of 5 minutes.
  - **Notification**: SNS Topic connected to DevOps / Engineering alert email or Slack webhook.
  - **Why**: Your `cache.m6g.large` node has **6.38 GiB of RAM**. 100,000 queued Asynq tasks take only ~50 MB to 100 MB. As long as memory stays below 75%, your queues, deduplication locks, and app caches are 100% safe from eviction or OOM errors.

---

## 2. AWS RDS PostgreSQL & Disaster Recovery

### Context & The Hidden Trap
In [`terraform/modules/rds/main.tf`](modules/rds/main.tf), `backup_retention_period` and `multi_az` are currently omitted. In AWS RDS, omitting these defaults to **automated backups disabled (or 0/1 day retention)** and **Single-AZ deployment**. 
- If a human error occurs or a corrupt migration runs, you **cannot** rewind the database to 5 minutes ago.
- If an AWS data center in South Africa suffers a hardware or power failure on election night, your single database instance is **dead for hours**.

- [ ] **Enable Automated Backups & Point-In-Time Recovery (PITR)**:
  In [`terraform/modules/rds/main.tf`](modules/rds/main.tf):
  - [ ] Add `backup_retention_period = 7` (or `14`).
    - **Why**: PITR continuously archives PostgreSQL write-ahead logs (WAL) to S3. If an erroneous script or corrupted data touches production, you can rewind the entire database to any exact second within the last 7 to 14 days.
  - [ ] Add `deletion_protection = true` to physically prevent accidental deletion via Terraform or the AWS Console.

- [ ] **Enable Multi-AZ High Availability**:
  In [`terraform/modules/rds/main.tf`](modules/rds/main.tf):
  - [ ] Add `multi_az = true`.
    - **Why**: AWS synchronously replicates all data to a standby RDS instance in a separate Availability Zone (`af-south-1b`). If the primary instance fails, RDS automatically switches DNS to the standby in **under 60 seconds**.
    - **How RDS Proxy Helps**: Because you use AWS RDS Proxy, client connections are held in the proxy during the 60-second failover. ECS containers do **not** crash or disconnect; they simply pause for a few seconds and resume seamlessly.

- [ ] **Pre-Election Manual DB Snapshot**:
  - [ ] At **6:00 AM on election morning**, take an explicit manual snapshot named `free9ja-pre-election-clean-state` before polling begins.
  - **Why**: Automated backups are great, but a manual snapshot is immutable and can be spun up into an independent test instance in minutes if auditing is ever requested by electoral bodies.

- [ ] **CloudWatch Alarms for RDS**:
  - [ ] `CPUUtilization > 80%` (warns of slow unindexed queries).
  - [ ] `FreeStorageSpace < 20 GB` (protects against disk exhaustion).
  - [ ] `DatabaseConnections` approaching `max_connections_percent = 90`.

---

## 3. ECS Fargate Sizing & Autoscaling

### Context & The Hidden Trap
AWS Fargate eliminates the headache of managing EC2 virtual machines, Docker daemons, and disk leaks. However, Fargate has **one known characteristic**: **Cold-Start Provisioning Latency (90 to 180 seconds)**.
- If you start election day with only 3 containers (1 vCPU each), and 50,000 citizens arrive at 3:00 PM when polling units close, the 3 containers will spike to 100% CPU.
- Fargate will trigger autoscaling, but new containers take 2 to 3 minutes to launch, pull the image, pass health checks, and register to the ALB. During those 3 minutes, users will experience 502/504 Bad Gateway timeouts.
- **Solution**: Pre-warm on election morning!

- [ ] **Configure ECS Container Graceful Stop Timeout**:
  In [`terraform/modules/ecs/main.tf`](modules/ecs/main.tf):
  - [ ] Add `"stopTimeout": 60` (or `90`) inside the container definition JSON.
  - **Why**: By default, ECS waits only 30 seconds after sending `SIGTERM` before issuing a violent `SIGKILL`. If an Asynq worker is 20 seconds into a heavy election aggregation or a Gemini vision OCR call, 30 seconds is too tight. Setting `stopTimeout = 60` gives in-flight worker tasks ample time to finish cleanly before shutdown.

- [ ] **ALB 5XX Error Rate Alarm**:
  - Alert if ALB `HTTPCode_Target_5XX_Count > 10` within a 1-minute window.

- [ ] **Election Week Capacity Upgrade (T-48 to T-24 Hours)**:
  In [`terraform/environments/production-5m/terraform.tfvars`](environments/production-5m/terraform.tfvars):
  - [ ] Upgrade CPU: `ecs_cpu = 2048` (Upgrade from 1 vCPU to 2 vCPUs).
    - **Why**: 1 vCPU has only 1 execution thread. Upgrading to 2 vCPUs gives Go true multi-core hardware parallelism so background tasks (OCR, rollups) do not steal CPU from the HTTP web server.
  - [ ] Upgrade RAM: `ecs_memory = 4096` (Upgrade from 2 GB to 4 GB RAM).
    - **Why**: Prevents Out-Of-Memory (OOM) crashes when scanning large database tables or processing high-resolution result sheet images.
  - [ ] Upgrade Max Capacity: Set `max_capacity = 30` in [`main.tf`](environments/production-5m/main.tf) to give autoscaling an ample ceiling for nationwide surges.

- [ ] **Election Morning Pre-Warming (T-12 Hours / 7:00 AM)**:
  In [`terraform/environments/production-5m/terraform.tfvars`](environments/production-5m/terraform.tfvars):
  - [ ] Set `ecs_desired_count = 8` (or `10`) and run `terraform apply`.
    - **Why**: Your 8–10 containers are already booted, warm, and sitting active behind the ALB *hours before* the 2:00 PM poll closure. Fargate's 2-minute cold-start delay is completely neutralized.
  - [ ] Set `WORKER_CONCURRENCY=15` in the task environment variables.
    - **Why**: With 2 vCPUs and RDS Proxy handling database connection pooling, each container can comfortably process 15 background tasks simultaneously ($8 \text{ tasks} \times 15 = 120$ concurrent cluster workers).

- [ ] **Post-Election Cost Scale-Down (T+48 Hours)**:
  Once election results are finalized and certified:
  - [ ] Reset `ecs_cpu = 1024` (1 vCPU)
  - [ ] Reset `ecs_memory = 2048` (2 GB RAM)
  - [ ] Reset `ecs_desired_count = 3`
  - [ ] Reset `max_capacity = 15` in `main.tf`
  - [ ] Run `terraform apply` to return to your normal, low monthly cloud budget.

---

## 4. Cloudflare CDN Edge Micro-Caching (The 5M Visitor Lifesaver)

### Context & The Hidden Trap
When millions of citizens follow live election tallies, they refresh the election results and stats pages repeatedly (every 5 to 10 seconds).
- Currently, the API returns no `Cache-Control` headers.
- **The Disaster Scenario**: Cloudflare treats responses as dynamic and forwards **every single request directly to your ALB and PostgreSQL**.
- 500,000 citizens refreshing every 10 seconds = **50,000 HTTP requests per second hitting your backend**. Even with 15 containers and RDS Proxy, 50,000 DB queries/sec will saturate CPU and bring down the API.

- [ ] **Configure Cloudflare Edge Micro-Caching (5 to 10 Seconds)**:
  - Create a Cloudflare Cache Rule (or Page Rule) matching:
    `api.free9ja.com/api/v1/elections/*/results*` and `api.free9ja.com/api/v1/elections/*/stats*`
  - **Setting**: **Eligible for Cache**, Edge TTL = **5 seconds** (or 10 seconds).
  - **The Magic**:
    1. Cloudflare’s 300+ global edge data centers cache the calculated result for 5 seconds.
    2. Millions of users get served directly from Cloudflare’s RAM in **5 to 15 milliseconds** without ever reaching AWS.
    3. Your Go backend and PostgreSQL only receive **1 request every 5 seconds** per Cloudflare POP to refresh the cache.
    4. **Traffic reaching your backend drops by 99.8%**, allowing 5 million visitors to browse smoothly while your database CPU stays under 15%!

---

## 5. External API Quotas (Google Gemini & Monnify)

### Context & The Hidden Trap
When polling units close, thousands of polling unit agents upload photo scans of the official INEC EC8A result sheets.
[`TaskExtractPUResultAI`](../../apps/api/internal/worker/extract_pu_result_ai_task.go) downloads each image and calls **Google Gemini Vision API** to extract party votes via structured JSON prompts.

- [ ] **Verify Google Gemini Pay-As-You-Go / Tier 1+ Billing**:
  - **The Risk**: Free or basic Google AI tiers cap requests at **15 Requests Per Minute (RPM)**. On election afternoon, uploading 100 sheets in a minute will cause Google to return `HTTP 429 Too Many Requests`, halting the AI result extraction pipeline.
  - [ ] Ensure the Google Cloud Project has **active credit card billing (Tier 1+)** enabled.
  - [ ] Check Google Cloud Console quotas for `Generative Language API` Requests Per Minute (RPM) and ensure the quota supports at least **60 to 120 RPM**.

- [ ] **Monnify Webhook & Virtual Account Quotas**:
  - [ ] Contact Monnify support prior to election week to ensure your account limits and webhook rate limits are uncapped for high-volume transactions and agent allowance disbursements.

---

## 6. Security & DDoS Protection

### Context & The Hidden Trap
During election night, high public visibility attracts malicious actors attempting credential stuffing, vote manipulation attempts, or DDoS attacks to disrupt public reporting.

- [ ] **Cloudflare WAF Rate Limiting on Authentication & Submission Endpoints**:
  - Set WAF rate-limiting rules on `/api/v1/auth/login` and agent registration endpoints (e.g., maximum **10 requests per minute per IP address**).
  - **Why**: Prevents botnets from attempting brute-force password attacks on supervisor and agent accounts during high-traffic hours.

- [ ] **Cloudflare Under Attack Mode Preparedness**:
  - Familiarize the team with enabling Cloudflare "Under Attack Mode" or managed JavaScript challenges in case of a targeted Layer 7 volumetric HTTP flood.

---

## 7. Observability & Live Queue Monitoring (Optional)

### Context & Trade-Off: Bastion Tunnel vs. Dedicated ECS Task
Asynq provides a web management UI called **Asynqmon** to inspect active, pending, retry, and dead-letter queues (DLQ) in real time, inspect task payloads/errors, and manually re-trigger failed election rollup jobs.

- **Recommended Approach (SSH Bastion Tunnel)**:
  Connect securely on-demand from your local machine via your existing Bastion Host:
  1. Open an SSH port-forwarding tunnel:
     ```bash
     ssh -i ~/.ssh/terraform/free9ja/pgsql_redis_rsa -N -L 6380:<elasticache-endpoint>:6379 ec2-user@<bastion-ip>
     ```
  2. Launch Asynqmon locally in Docker:
     ```bash
     docker run --rm -p 8080:8080 hibiken/asynqmon --redis-addr=host.docker.internal:6380
     ```
  - **Why this is recommended**: Asynqmon has destructive administrative capabilities (cancelling in-flight jobs, deleting queues). The Bastion tunnel keeps it completely off the public internet with zero attack surface, zero open ports, and $0 extra AWS cost. It closes the moment you shut your laptop.
- **Alternative Approach (Internal ECS Task)**:
  Deploy `hibiken/asynqmon:latest` as an internal Fargate task behind **Cloudflare Zero Trust Access** (e.g., `queues.free9ja.com` with Google OAuth). Only necessary if you have a distributed multi-person DevOps/Support team who need continuous browser access without sharing SSH keys.

- [ ] **(Optional) Test Live Asynqmon Inspection via Bastion Host**:
  - [ ] Test the SSH port-forwarding tunnel to ElastiCache port 6379 via the Bastion.
  - [ ] Confirm Asynqmon connects and displays your queues at `http://localhost:8080`.

