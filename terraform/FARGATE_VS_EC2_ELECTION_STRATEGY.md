# AWS ECS Fargate vs. ECS + EC2: The Election Day Architectural Strategy

This document explains why **Free9ja** uses **AWS Fargate** over **ECS + EC2**, specifically addressing high-stakes flash crowd traffic during a Nigerian General or Gubernatorial Election.

---

## 1. Executive Summary

During an election, traffic behavior changes from steady daily usage to **extreme flash crowds**:
- Hundreds of thousands of voters refresh live results simultaneously.
- Tens of thousands of polling unit agents upload result sheets (EC8A forms) within a compressed 2 to 3-hour window when voting ends (between **2:00 PM and 7:00 PM**).

In this environment, **AWS Fargate with Pre-Warming is vastly superior to ECS + EC2**.

---

## 2. In-Depth Architectural Comparison

| Architectural Dimension | AWS ECS + Fargate (Free9ja Setup) | AWS ECS + EC2 |
| :--- | :--- | :--- |
| **Server Management & Maintenance** | **Zero OS management.** AWS manages the operating system, container runtime, security patches, and hardware health. | **High maintenance.** You must patch host Linux AMIs, monitor host disk space, manage Docker daemon health, and maintain SSH access. |
| **Autoscaling Mechanism** | **Single-Tier Direct Placement.** AWS boots container tasks straight into your VPC private subnets on demand. | **Two-Tier (Double Hop).** If EC2 instances fill up, ECS must wait for the EC2 Auto Scaling Group to launch a new virtual machine before containers can be placed. |
| **Fault Isolation & Blast Radius** | **MicroVM Isolation.** Every task runs in its own dedicated microVM. If a container suffers an Out-Of-Memory (OOM) crash, no other container is affected. | **Shared Host Risk.** Multiple containers share one EC2 instance. If one container runs out of memory or locks the CPU, the **entire host crashes**, taking all colocated containers down at once. |
| **Docker Storage / Disk Exhaustion** | **Managed Storage.** Ephemeral storage (default 20 GB+) is dedicated per task and wiped cleanly when the task terminates. | **Disk Leaks Risk.** If Docker does not clean up old image layers or logs on the EC2 host, the root disk fills up to 100%, causing the Docker daemon to lock up completely. |
| **Launch Speed (Cold Start)** | **90 to 180 seconds** to provision the microVM and pull the Docker image. | **5 to 15 seconds** *only if* the EC2 host already has spare capacity and the Docker image is cached locally. |
| **Cost Profile** | Pay-as-you-go per second of vCPU/RAM used. Slightly higher hourly rate, but **zero idle server waste**. | Cheaper per raw vCPU for steady 24/7 loads, but requires paying for idle compute buffers. |

---

## 3. The "Election Day Nightmare": Two-Tier Autoscaling on EC2

The number one cause of production outages during flash crowds on ECS + EC2 is the **Two-Tier Autoscaling lag**:

```
Flash Crowd Hits at 3:00 PM (Polls Close)
                  │
                  ▼
 1. Incoming HTTP & Result Sheet Uploads Spike 10x
                  │
                  ▼
 2. Existing EC2 Instances hit 100% CPU / RAM Capacity
                  │
                  ▼
 3. ECS Scheduler tries to place new container tasks ──> FAILS (No EC2 capacity)
                  │
                  ▼
 4. ECS signals EC2 Auto Scaling Group (ASG) to add an instance
                  │
                  ▼
 5. EC2 Instance Launch Latency:
    • AWS provisions virtual machine (~60s)
    • Linux boots and systemd services initialize (~45s)
    • ECS Agent connects and registers to cluster (~30s)
    • Docker pulls 500MB container image over the network (~45s)
                  │
                  ▼
 6. Container finally launches 4 to 6 MINUTES later!
                  │
                  ▼
 OUTCOME: Users experience 502/504 Bad Gateway errors for 5+ minutes,
          and polling unit agents fail to submit critical vote tallies.
```

With **AWS Fargate**, there is no intermediate host VM layer to provision. AWS injects container tasks directly into your network interface.

---

## 4. Why Fargate + Pre-Warming Is the Winning Strategy

Fargate’s only drawback compared to EC2 is **cold-start latency (90–180s)**.

By implementing the **Pre-Warming Playbook** on Election Morning:
1. **You eliminate the cold-start delay entirely**:
   By setting `ecs_desired_count = 8` or `10` at **7:00 AM** on election day, your containers are **already warm, health-checked, and sitting active behind the ALB** before polling units close at 2:00 PM.
2. **You eliminate server operations**:
   During election afternoon, your engineering team can focus 100% on election monitoring, verifying INEC grabber syncs, and database health—rather than firefighting crashed Docker daemons or out-of-disk-space alerts on EC2 hosts.
3. **You save money after the election**:
   Because Fargate charges per second, you can scale to 15–20 tasks for the 48-hour election window, and immediately drop back to 3 tasks once votes are finalized. A couple days of scaled compute costs only tens of dollars, providing maximum reliability at negligible expense.

---

## 5. Election Week Operations Checklist

- [ ] **T-48 Hours**: Update [`terraform/environments/production-5m/terraform.tfvars`](file:///d:/Sz-projects/50-main-projects/3-free9ja/terraform/environments/production-5m/terraform.tfvars) to `ecs_cpu = 2048` (2 vCPUs) and `ecs_memory = 4096` (4 GB RAM).
- [ ] **T-12 Hours (Election Morning, 7:00 AM)**: Increase `ecs_desired_count` to `8` or `10` (Pre-warm).
- [ ] **T-12 Hours**: Verify `WORKER_CONCURRENCY` is set to `15` in the environment.
- [ ] **T-12 Hours**: Verify AWS RDS Proxy metrics in CloudWatch (`DatabaseConnections`, `QueryRequests`).
- [ ] **T+48 Hours (Post-Election)**: Revert `ecs_desired_count = 3`, `ecs_cpu = 1024`, `ecs_memory = 2048` and run `terraform apply`.
