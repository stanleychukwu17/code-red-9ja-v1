// ─── scenarios/01_register.js ──────────────────────────────────────────────────
// Phase 1: Registration & Onboarding only
// Use this first to validate your auth flow works under load before
// adding the full election day complexity.
//
// Run: .\load-tests\bin\k6.exe run load-tests\scenarios\01_register.js

import { sleep } from 'k6';
import { Counter } from 'k6/metrics';

import { makeUser, registerAndLogin } from '../helpers/auth.js';

const registrationErrors = new Counter('registration_errors');

export const options = {
  stages: [
    { duration: '15s', target: 10 },  // Warm up
    { duration: '1m',  target: 50 },  // Ramp to 50 VUs
    { duration: '2m',  target: 50 },  // Hold
    { duration: '15s', target: 0  },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],   // 95% of requests < 800ms
    http_req_failed:   ['rate<0.10'],   // Less than 10% errors (generous for phase 1)
    registration_errors: ['count<20'],  // Fewer than 20 hard failures
  },
};

export default function () {
  const user   = makeUser(__VU);
  const result = registerAndLogin(user);

  if (!result) {
    registrationErrors.add(1);
  }

  sleep(1);
}
