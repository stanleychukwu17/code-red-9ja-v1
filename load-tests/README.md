# free9ja Load Tests

k6 load testing suite for the free9ja API.

## Setup

k6 is already installed as a portable binary at `load-tests/bin/k6.exe` — no install needed.

## Before You Run

Update `config.js` with real IDs from your dev DB. Run these queries in psql:

```sql
-- Get your election group ID
SELECT id FROM election_groups LIMIT 5;

-- Get an election ID
SELECT id FROM elections WHERE election_group_id = 1 LIMIT 5;

-- Get a party ID
SELECT id FROM parties LIMIT 5;

-- Get geography IDs
SELECT id FROM countries LIMIT 1;
SELECT id FROM states LIMIT 5;
SELECT id FROM local_government_areas LIMIT 5;
SELECT id FROM wards LIMIT 5;

-- Get polling unit IDs to populate POLLING_UNIT_IDS array
SELECT id FROM polling_units LIMIT 20;
```

## Running Tests

All commands from the repo root (`c:\Users\danie\Desktop\Repos\free9ja`):

### Step 1 — Validate registration flow (start here)
```powershell
.\load-tests\bin\k6.exe run load-tests\scenarios\01_register.js
```

### Step 2 — Validate agent application + practice test
```powershell
.\load-tests\bin\k6.exe run load-tests\scenarios\02_apply_agent.js
```

### Step 3 — Election day only (uses pre-existing accounts)
```powershell
.\load-tests\bin\k6.exe run load-tests\scenarios\03_election_day.js
```

### Full end-to-end flow (50 VUs, 60 minutes simulation)
```powershell
.\load-tests\bin\k6.exe run load-tests\full_election_flow.js
```

### With live dashboard (recommended)
```powershell
.\load-tests\bin\k6.exe run --out dashboard load-tests\full_election_flow.js
```

### Override parameters via env vars or flags
```powershell
# Custom VUs, duration, and update intervals
.\load-tests\bin\k6.exe run -e VUS=50 -e DURATION=60m -e UPDATE_INTERVAL_MIN_SEC=1 -e UPDATE_INTERVAL_MAX_SEC=10 load-tests\full_election_flow.js
```

### Export results to JSON
```powershell
.\load-tests\bin\k6.exe run --out json=results.json load-tests\full_election_flow.js
```

## Scaling Strategy

| Stage  | VUs     | Command                                              |
|--------|---------|------------------------------------------------------|
| Crawl  | 10      | Default in full_election_flow.js                     |
| Walk   | 50–100  | Edit stages in full_election_flow.js                 |
| Jog    | 200–500 | Edit stages, watch DB pool + Redis                   |
| Run    | 1000+   | Tune OS TCP settings + consider k6 Cloud             |

## What to Watch on the Server

1. **Prometheus metrics**: http://localhost:4100/metrics
2. **DB connections**: `SELECT count(*) FROM pg_stat_activity;` in psql
3. **Redis memory**: `redis-cli -a password info memory`
4. **Go server logs**: already running in your terminal via `pnpm dev`

## Project Structure

```
load-tests/
├── bin/
│   └── k6.exe             ← k6 binary (v0.55.0, no install needed)
├── helpers/
│   ├── auth.js            ← signup → onboarding → login helpers
│   └── data.js            ← payload builders for all endpoints
├── scenarios/
│   ├── 01_register.js     ← Phase 1: registration only
│   ├── 02_apply_agent.js  ← Phase 2: apply + practice test
│   └── 03_election_day.js ← Phase 3: election day (pre-existing users)
├── config.js              ← shared constants and DB IDs (EDIT THIS FIRST)
└── full_election_flow.js  ← complete end-to-end scenario
```
