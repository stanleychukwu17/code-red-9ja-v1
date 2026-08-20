// ─── full_election_flow.js ─────────────────────────────────────────────────────
// Complete end-to-end election flow in one script.
// Covers your full todo scenario:
//   Register → Onboard → Apply as polling agent → Practice test (auto-accept)
//   → Election day: 20 updates (20% reports) → Cast vote → Submit result
//
// Start here: .\load-tests\bin\k6.exe run --vus 50 --duration 60m load-tests\full_election_flow.js
//
// For richer output: .\load-tests\bin\k6.exe run --out dashboard load-tests\full_election_flow.js

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";

import { makeUser, registerAndLogin, authHeaders } from "./helpers/auth.js";
import {
  pickPollingUnit,
  makeApplicationPayload,
  makePracticeTestPayload,
  makeUpdatePayload,
  makeVotesPayload,
  makeResultPayload,
} from "./helpers/data.js";
import { BASE_URL, TARGET_VUS, getRandomUpdateInterval } from "./config.js";

// ─── Custom Metrics ────────────────────────────────────────────────────────────
const registrationErrors = new Counter("registration_errors");
const applicationErrors = new Counter("application_errors");
const updateErrors = new Counter("update_errors");
const voteErrors = new Counter("vote_errors");
const resultErrors = new Counter("result_errors");

const updateDuration = new Trend("update_duration_ms");
const voteDuration = new Trend("vote_duration_ms");
const resultDuration = new Trend("result_duration_ms");

// ─── Load Profile ──────────────────────────────────────────────────────────────
// Configured target: 50 VUs over 60 minutes simulation duration.
// Dynamic update interval: 1s to 10s per user between election day updates.
export const options = {
  stages: [
    { duration: "2m", target: TARGET_VUS },  // Ramp up to 50 VUs over 2 minutes
    { duration: "56m", target: TARGET_VUS }, // Sustain 50 VUs for 56 minutes (60m total duration)
    { duration: "2m", target: 0 },           // Ramp down over 2 minutes
  ],

  thresholds: {
    // Global request performance
    http_req_duration: ["p(95)<800"], // 95% of all requests < 800ms
    http_req_failed: ["rate<0.05"], // < 5% overall error rate

    // Per-phase timing targets
    update_duration_ms: ["p(95)<600"],
    vote_duration_ms: ["p(95)<1000"],
    result_duration_ms: ["p(95)<1000"],

    // Hard failure caps — these FAIL the test if breached
    registration_errors: ["count<20"],
    application_errors: ["count<20"],
    update_errors: ["count<50"],
    vote_errors: ["count<20"],
    result_errors: ["count<20"],
  },
};

// ─── Main VU function ──────────────────────────────────────────────────────────
export default function () {
  const vuId = __VU;
  const pollingUnit = pickPollingUnit(vuId);

  // ╔══════════════════════════════════════════════════════╗
  // ║  PRE-ELECTION: Register + Onboard + Apply + Test    ║
  // ╚══════════════════════════════════════════════════════╝

  // ── Step 1: Register and onboard ──────────────────────────────────────────────
  const user = makeUser(vuId);
  const result = registerAndLogin(user);

  if (!result) {
    registrationErrors.add(1);
    return; // Can't proceed without auth token
  }

  const h = authHeaders(result.accessToken);
  sleep(0.5);

  // ── Step 2: Apply to be polling agent ─────────────────────────────────────────
  const applyRes = http.post(
    `${BASE_URL}/party-applications`,
    makeApplicationPayload(pollingUnit),
    h,
  );

  const applyOk = check(applyRes, {
    "[apply] status 201": (r) => r.status === 201,
  });
  if (!applyOk) applicationErrors.add(1);

  sleep(0.5);

  // ── Step 3: Submit practice test → triggers auto-accept ───────────────────────
  const testRes = http.post(
    `${BASE_URL}/practice-tests`,
    makePracticeTestPayload(),
    h,
  );

  check(testRes, {
    "[practice_test] status 201": (r) => r.status === 201,
  });

  sleep(1);

  // ╔══════════════════════════════════════════════════════╗
  // ║  ELECTION DAY: Updates → Vote → Result             ║
  // ╚══════════════════════════════════════════════════════╝

  // ── Step 4: Submit 20 updates (20% = 4 reports, 80% = 16 normal) ─────────────
  for (let i = 0; i < 20; i++) {
    const isReport = i < 4; // First 4 iterations = reports (exactly 20%)

    const t0 = Date.now();
    const updateRes = http.post(
      `${BASE_URL}/polling-unit-updates`,
      makeUpdatePayload(pollingUnit, i + 1, isReport),
      h,
    );
    updateDuration.add(Date.now() - t0);

    const ok = check(updateRes, {
      [`[update_${i + 1}] ok`]: (r) => r.status === 201,
    });
    if (!ok) updateErrors.add(1);

    // Update interval per user: 1 to 10 seconds randomized sleep per update
    sleep(getRandomUpdateInterval());
  }

  sleep(0.5);

  // ── Step 5: Cast live vote ────────────────────────────────────────────────────
  const vt0 = Date.now();
  const voteRes = http.post(
    `${BASE_URL}/elections/votes`,
    makeVotesPayload(pollingUnit),
    h,
  );
  voteDuration.add(Date.now() - vt0);

  const voteOk = check(voteRes, {
    "[vote] status 200 or 201": (r) => [200, 201].includes(r.status),
  });
  if (!voteOk) voteErrors.add(1);

  sleep(0.5);

  // ── Step 6: Upload election result (close of election) ────────────────────────
  const rt0 = Date.now();
  const resultRes = http.post(
    `${BASE_URL}/polling-unit-results`,
    makeResultPayload(pollingUnit),
    h,
  );
  resultDuration.add(Date.now() - rt0);

  const resultOk = check(resultRes, {
    "[result] status 201": (r) => r.status === 201,
  });
  if (!resultOk) resultErrors.add(1);

  sleep(0.5);
}
