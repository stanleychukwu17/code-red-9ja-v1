// ─── scenarios/03_election_day.js ─────────────────────────────────────────────
// Phase 3: Full election day flow (assumes users are pre-registered agents)
// Uses pre-seeded credentials to skip the registration overhead and focus
// entirely on the high-frequency election day endpoints.
//
// To use pre-seeded users: set SEED_EMAIL_PREFIX and SEED_PASSWORD env vars.
// Example: .\load-tests\bin\k6.exe run -e SEED_EMAIL_PREFIX=agent -e SEED_PASSWORD=Test@12345 load-tests\scenarios\03_election_day.js
//
// Run: .\load-tests\bin\k6.exe run load-tests\scenarios\03_election_day.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

import { login, authHeaders } from '../helpers/auth.js';
import {
  pickPollingUnit,
  makeUpdatePayload,
  makeVotesPayload,
  makeResultPayload,
} from '../helpers/data.js';
import { BASE_URL, getRandomUpdateInterval } from '../config.js';

// ─── Custom Metrics ────────────────────────────────────────────────────────────
const loginErrors         = new Counter('login_errors');
const updateErrors        = new Counter('update_errors');
const voteErrors          = new Counter('vote_errors');
const resultErrors        = new Counter('result_errors');
const updateDuration      = new Trend('update_duration_ms');
const voteDuration        = new Trend('vote_duration_ms');
const resultDuration      = new Trend('result_duration_ms');

export const options = {
  stages: [
    { duration: '30s', target: 50  },   // Crawl: ramp to 50 agents
    { duration: '3m',  target: 50  },   // Hold — observe first bottleneck
    { duration: '30s', target: 150 },   // Walk: ramp to 150
    { duration: '3m',  target: 150 },   // Hold — observe second bottleneck
    { duration: '30s', target: 0   },   // Ramp down
  ],

  thresholds: {
    // Overall request performance
    http_req_duration:   ['p(95)<800'],   // 95th percentile < 800ms
    http_req_failed:     ['rate<0.05'],   // < 5% error rate

    // Per-operation targets
    update_duration_ms:  ['p(95)<600'],
    vote_duration_ms:    ['p(95)<1000'],
    result_duration_ms:  ['p(95)<1000'],

    // Hard failure caps
    login_errors:  ['count<10'],
    update_errors: ['count<50'],
    vote_errors:   ['count<30'],
    result_errors: ['count<30'],
  },
};

// ─── Pre-configured agent credentials (set via env vars or hardcode here) ──────
const SEED_EMAIL_PREFIX = __ENV.SEED_EMAIL_PREFIX || 'loadtest_vu';
const SEED_PASSWORD     = __ENV.SEED_PASSWORD     || 'Test@12345';

export default function () {
  const vuId        = __VU;
  const pollingUnit = pickPollingUnit(vuId);

  // ── Step 1: Login as pre-existing agent ───────────────────────────────────────
  // Uses the accounts created by 01_register.js or manually seeded accounts
  const email  = `${SEED_EMAIL_PREFIX}${vuId}_0@free9ja-test.com`;
  const tokens = login(email, SEED_PASSWORD);

  if (!tokens) {
    loginErrors.add(1);
    return;
  }

  const h = authHeaders(tokens.accessToken);
  sleep(0.3);

  // ── Step 2: Submit 20 Updates (20% as reports = 4 reports, 16 normal) ─────────
  for (let i = 0; i < 20; i++) {
    const isReport = i < 4;  // First 4 = reports (exactly 20%)

    const t0        = Date.now();
    const updateRes = http.post(
      `${BASE_URL}/polling-unit-updates`,
      makeUpdatePayload(pollingUnit, i + 1, isReport),
      h
    );
    updateDuration.add(Date.now() - t0);

    const ok = check(updateRes, {
      [`[update_${i + 1}] status 201`]: (r) => r.status === 201,
    });
    if (!ok) updateErrors.add(1);

    // Realistic agent pacing: 1 to 10 seconds randomized interval per user update
    sleep(getRandomUpdateInterval());
  }

  sleep(0.5);

  // ── Step 3: Cast vote ─────────────────────────────────────────────────────────
  const vt0     = Date.now();
  const voteRes = http.post(
    `${BASE_URL}/elections/votes`,
    makeVotesPayload(pollingUnit),
    h
  );
  voteDuration.add(Date.now() - vt0);

  const voteOk = check(voteRes, {
    '[vote] status 200 or 201': (r) => [200, 201].includes(r.status),
  });
  if (!voteOk) voteErrors.add(1);

  sleep(0.5);

  // ── Step 4: Upload election result ───────────────────────────────────────────
  const rt0       = Date.now();
  const resultRes = http.post(
    `${BASE_URL}/polling-unit-results`,
    makeResultPayload(pollingUnit),
    h
  );
  resultDuration.add(Date.now() - rt0);

  const resultOk = check(resultRes, {
    '[result] status 201': (r) => r.status === 201,
  });
  if (!resultOk) resultErrors.add(1);

  sleep(1);
}
