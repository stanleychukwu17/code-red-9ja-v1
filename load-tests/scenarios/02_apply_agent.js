// ─── scenarios/02_apply_agent.js ──────────────────────────────────────────────
// Phase 2: Register → Apply as Polling Agent → Submit Practice Test
// This validates the pre-election agent onboarding pipeline.
//
// Run: .\load-tests\bin\k6.exe run load-tests\scenarios\02_apply_agent.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

import { makeUser, registerAndLogin, authHeaders } from '../helpers/auth.js';
import {
  pickPollingUnit,
  makeApplicationPayload,
  makePracticeTestPayload,
} from '../helpers/data.js';
import { BASE_URL } from '../config.js';

const registrationErrors  = new Counter('registration_errors');
const applicationErrors   = new Counter('application_errors');
const practiceTestErrors  = new Counter('practice_test_errors');
const applicationDuration = new Trend('application_duration_ms');
const practiceTestDuration= new Trend('practice_test_duration_ms');

export const options = {
  stages: [
    { duration: '20s', target: 20 },
    { duration: '2m',  target: 50 },
    { duration: '2m',  target: 50 },
    { duration: '20s', target: 0  },
  ],
  thresholds: {
    http_req_duration:      ['p(95)<1000'],
    http_req_failed:        ['rate<0.08'],
    application_errors:     ['count<20'],
    practice_test_errors:   ['count<20'],
    application_duration_ms:  ['p(95)<1500'],
    practice_test_duration_ms:['p(95)<1500'],
  },
};

export default function () {
  const vuId        = __VU;
  const pollingUnit = pickPollingUnit(vuId);

  // ── Step 1: Register + Onboard ────────────────────────────────────────────────
  const user   = makeUser(vuId);
  const result = registerAndLogin(user);

  if (!result) {
    registrationErrors.add(1);
    return;
  }

  const h = authHeaders(result.accessToken);
  sleep(0.5);

  // ── Step 2: Apply as polling agent ────────────────────────────────────────────
  const t0 = Date.now();
  const applyRes = http.post(
    `${BASE_URL}/party-applications`,
    makeApplicationPayload(pollingUnit),
    h
  );
  applicationDuration.add(Date.now() - t0);

  const applyOk = check(applyRes, {
    '[apply] status 201': (r) => r.status === 201,
  });
  if (!applyOk) applicationErrors.add(1);

  sleep(0.5);

  // ── Step 3: Submit practice test (triggers auto-accept) ───────────────────────
  const t1 = Date.now();
  const testRes = http.post(
    `${BASE_URL}/practice-tests`,
    makePracticeTestPayload(),
    h
  );
  practiceTestDuration.add(Date.now() - t1);

  const testOk = check(testRes, {
    '[practice_test] status 201': (r) => r.status === 201,
  });
  if (!testOk) practiceTestErrors.add(1);

  sleep(1);
}
