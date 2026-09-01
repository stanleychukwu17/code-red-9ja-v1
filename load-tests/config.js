// ─── Base Configuration ────────────────────────────────────────────────────────
// All shared constants across load test scripts.
// Updated with real, valid IDs from your PostgreSQL database.

export const BASE_URL = "http://localhost:4100/api/v1";

// ─── Pre-seeded DB IDs (real database values) ──────────────────────────────────
export const ELECTION_GROUP_ID = 8;

export const ELECTION_ID = 3;

export const PARTY_ID = 17;

export const COUNTRY_ID = 161;

export const STATE_ID = 1;

export const LGA_ID = 3103;

export const WARD_ID = 17534;

// Real polling unit IDs from database
export const POLLING_UNIT_IDS = [
  8, 22, 27, 7, 24, 11, 28, 19, 9, 26, 29, 23, 10, 12, 17, 15, 16, 18, 13, 14,
];

export const CANDIDATE_PARTY_ID = 17;

// ─── Load Simulation Profile Controls ─────────────────────────────────────────
// Override defaults via environment variables (e.g. -e VUS=50 -e DURATION=60m)
export const SIMULATION_DURATION = __ENV.DURATION || "10m";
export const TARGET_VUS = Number(__ENV.VUS) || 50;

// Update interval per user (1 to 10 seconds per update request)
export const UPDATE_INTERVAL_MIN_SEC =
  Number(__ENV.UPDATE_INTERVAL_MIN_SEC) || 1;
export const UPDATE_INTERVAL_MAX_SEC =
  Number(__ENV.UPDATE_INTERVAL_MAX_SEC) || 10;

/**
 * Generates a randomized sleep interval between UPDATE_INTERVAL_MIN_SEC and UPDATE_INTERVAL_MAX_SEC
 * @param {number} minSec - Minimum delay in seconds (default: 1)
 * @param {number} maxSec - Maximum delay in seconds (default: 10)
 * @returns {number} Sleep time in seconds
 */
export function getRandomUpdateInterval(
  minSec = UPDATE_INTERVAL_MIN_SEC,
  maxSec = UPDATE_INTERVAL_MAX_SEC,
) {
  return Math.random() * (maxSec - minSec) + minSec;
}
