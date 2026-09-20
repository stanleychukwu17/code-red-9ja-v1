# Free9ja Infrastructure & Terraform Guide

This directory contains the Infrastructure as Code (IaC) for **Free9ja** on AWS.

---

## 1. Architecture Overview: Fargate vs. EC2

> [!IMPORTANT]
> **Free9ja uses AWS ECS with AWS Fargate (`launch_type = "FARGATE"`).**
> You are **NOT** running on EC2 instances. 

### What this means:
- **Serverless Containers**: AWS fully manages the underlying operating systems, container runtimes, and host patching.
- **Zero EC2 Instance Management**: You do not have to maintain EC2 instances, configure AMIs, or manage Docker daemon clusters.
- **Autoscaling**: Fargate boots up additional containers directly into your VPC private subnets on demand based on your CPU utilization target (65%).

📖 **For the complete architectural breakdown**, see:
👉 [Fargate vs. EC2: The Election Day Architectural Strategy](file:///d:/Sz-projects/50-main-projects/3-free9ja/terraform/FARGATE_VS_EC2_ELECTION_STRATEGY.md)

---

## 2. Infrastructure Components

- **Compute**: AWS ECS running **AWS Fargate** in private subnets across 3 Availability Zones (`af-south-1a`, `1b`, `1c`).
- **Load Balancing**: AWS Application Load Balancer (ALB) routing public HTTPS traffic to the ECS Fargate tasks.
- **Database**: Amazon RDS (PostgreSQL) placed in dedicated database subnets.
- **Database Pooling**: **AWS RDS Proxy** sits between ECS Fargate tasks and RDS PostgreSQL, multiplexing connections and shielding the DB from connection exhaustion.
- **Caching & Queues**: Redis for Asynq task queues and application caching.
- **Security**: Strict security groups, AWS Secrets Manager integration, and least-privilege IAM roles.

---

## 3. Election Day Scaling Playbook (CRITICAL)

During a Nigerian General or State Gubernatorial Election, traffic surges exponentially between **2:00 PM and 8:00 PM** when polling units close, result sheets (EC8A) are uploaded, and millions of citizens refresh live vote maps.

### Why You Must Pre-Warm (Do NOT rely solely on autoscaling)
1. **Fargate Cold-Start Latency**: Provisioning a new Fargate container, pulling the image, running health checks, and registering it to the ALB takes **90 to 180 seconds**. A sudden surge of 50,000 users will overwhelm 3 baseline tasks before autoscaling finishes launching new ones.
2. **Multi-core Parallelism**: Upgrading from 1 vCPU to 2 vCPUs gives Go true multi-threaded execution for concurrent background workers (OCR, rollup calculations) while keeping HTTP API requests snappy (<50ms).

---

### Recommended Settings Comparison

| Setting | File / Location | Normal Days (Default) | Election Week / Day | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **`ecs_cpu`** | `production-5m/terraform.tfvars` | `1024` (1 vCPU) | **`2048` (2 vCPUs)** | Multi-core parallelism for HTTP + workers |
| **`ecs_memory`** | `production-5m/terraform.tfvars` | `2048` (2 GB RAM) | **`4096` (4 GB RAM)** | Ample headroom for image buffers & DB scans |
| **`ecs_desired_count`** | `production-5m/terraform.tfvars` | `3` | **`8 - 10`** | Pre-warmed capacity before polls close |
| **`max_capacity`** | `production-5m/main.tf` | `15` | **`25 - 30`** | High ceiling for unexpected national traffic spikes |
| **`WORKER_CONCURRENCY`**| Container Environment (`.env`) | `10` | **`15 - 20`** | Safe concurrency supported by 2 vCPUs & RDS Proxy |

---

### Step-by-Step Procedure

#### Step A: 24 to 48 Hours Before Election (Scale Up)
1. Open [`terraform/environments/production-5m/terraform.tfvars`](file:///d:/Sz-projects/50-main-projects/3-free9ja/terraform/environments/production-5m/terraform.tfvars):
   ```hcl
   ecs_cpu           = 2048 # 2 vCPUs
   ecs_memory        = 4096 # 4 GB RAM
   ecs_desired_count = 8    # Pre-warmed baseline
   ```
2. Open [`terraform/environments/production-5m/main.tf`](file:///d:/Sz-projects/50-main-projects/3-free9ja/terraform/environments/production-5m/main.tf):
   ```hcl
   resource "aws_appautoscaling_target" "ecs_target" {
     max_capacity = 30 # Increased ceiling
     ...
   }
   ```
3. Apply the changes:
   ```bash
   cd terraform/environments/production-5m
   terraform plan
   terraform apply
   ```
4. In your task definition or ECS environment variables, optionally set:
   ```
   WORKER_CONCURRENCY=15
   ```

#### Step B: 48 Hours Post-Election (Scale Down)
Once results are finalized and traffic normalizes, revert the numbers back to your cost-effective baseline:
1. Reset `terraform.tfvars`:
   ```hcl
   ecs_cpu           = 1024
   ecs_memory        = 2048
   ecs_desired_count = 3
   ```
2. Reset `main.tf`:
   ```hcl
   max_capacity = 15
   ```
3. Run `terraform apply` to return to standard monthly operating costs.

---

## 4. Production Pre-Launch Checklist

For alarms, metric thresholds, and infrastructure to-dos before going live, see:
👉 [Terraform Production To-Do List](todo-list.md)

