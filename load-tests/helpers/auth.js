// ─── helpers/auth.js ──────────────────────────────────────────────────────────
// Registration and login helpers matching your actual API contracts:
//   POST /api/v1/auth/signup      → gets onboarding_id + token
//   PATCH /api/v1/auth/onboarding → completes profile
//   POST /api/v1/auth/login       → gets access + refresh tokens

import http from "k6/http";
import { check } from "k6";
import { BASE_URL, COUNTRY_ID, STATE_ID } from "../config.js";
import {
  getRandomNigerianName,
  generateRealisticUsername,
  generateRealisticEmail,
} from "./names.js";

const JSON_HEADERS = { headers: { "Content-Type": "application/json" } };

// ─── Generates unique per-VU Nigerian user data ────────────────────────────────
export function makeUser(vuId) {
  const uniqueId = Math.floor(Math.random() * 8999999) + 1000000;
  const phone = `0803${uniqueId}`;

  // Pick authentic Nigerian names (90% male, 10% female)
  const name = getRandomNigerianName();
  const email = generateRealisticEmail(name.firstName, name.lastName, vuId);
  const username = generateRealisticUsername(name.firstName, name.lastName, vuId);

  return {
    email:     email,
    phone:     phone,
    password:  'Password123!',
    firstName: name.firstName,
    lastName:  name.lastName,
    username:  username,
    dob:       '1995-06-15',
    gender:    name.gender,
  };
}

// ─── Full registration flow ────────────────────────────────────────────────────
// Returns { accessToken, refreshToken } or null on failure
export function registerAndLogin(user) {
  // Step 1: Basic signup — gets us an onboarding_id and initial token
  const signupRes = http.post(
    `${BASE_URL}/auth/signup`,
    JSON.stringify({
      countryId: COUNTRY_ID,
      phoneNumber: user.phone,
      email: user.email,
      password: user.password,
    }),
    JSON_HEADERS,
  );

  check(signupRes, {
    "[signup] status 200": (r) => r.status === 200,
  });

  if (signupRes.status !== 200) return null;

  const signupBody = JSON.parse(signupRes.body);
  const accessToken = signupBody?.data?.accessToken;
  const refreshToken = signupBody?.data?.refreshToken;

  if (!accessToken) return null;

  // Step 2: Complete onboarding profile (PATCH /api/v1/auth/onboarding)
  const onboardRes = http.patch(
    `${BASE_URL}/auth/onboarding`,
    JSON.stringify({
      first_name: user.firstName,
      last_name: user.lastName,
      username: user.username,
      gender: user.gender,
      date_of_birth: user.dob,
      current_country: COUNTRY_ID,
      current_state: STATE_ID,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  check(onboardRes, {
    "[onboarding] status 200": (r) => r.status === 200,
  });

  // Onboarding failure is non-fatal — we can still proceed with the token
  return { accessToken, refreshToken };
}

// ─── Standalone login (for pre-existing users) ─────────────────────────────────
export function login(email, password) {
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      country: "Nigeria",
      identifier: email,
      identifierType: "email",
      password: password,
      iso2: "NG",
    }),
    JSON_HEADERS,
  );

  check(loginRes, {
    "[login] status 200": (r) => r.status === 200,
    "[login] has token": (r) => !!JSON.parse(r.body)?.data?.accessToken,
  });

  if (loginRes.status !== 200) return null;

  const body = JSON.parse(loginRes.body);
  return {
    accessToken: body?.data?.accessToken,
    refreshToken: body?.data?.refreshToken,
  };
}

// ─── Auth header factory ───────────────────────────────────────────────────────
export function authHeaders(token) {
  return {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };
}
