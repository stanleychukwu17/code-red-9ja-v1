// ─── helpers/data.js ──────────────────────────────────────────────────────────
// Shared data generators and payload builders for all test scenarios.

import {
  ELECTION_GROUP_ID,
  ELECTION_ID,
  PARTY_ID,
  COUNTRY_ID,
  STATE_ID,
  LGA_ID,
  WARD_ID,
  POLLING_UNIT_IDS,
  CANDIDATE_PARTY_ID,
} from '../config.js';

// Round-robin polling unit selector per VU
export function pickPollingUnit(vuId) {
  return POLLING_UNIT_IDS[vuId % POLLING_UNIT_IDS.length];
}

// ─── Party Application payload ─────────────────────────────────────────────────
// POST /api/v1/party-applications
// Required: party_id, election_group_ids (array), polling_unit_id,
//           current_country, current_state, current_lga
export function makeApplicationPayload(pollingUnitId) {
  return JSON.stringify({
    party_id:          PARTY_ID,
    election_group_id: ELECTION_GROUP_ID,
    election_group_ids: [ELECTION_GROUP_ID],
    polling_unit_id:   pollingUnitId,
    current_country:   COUNTRY_ID,
    current_state:     STATE_ID,
    current_lga:       LGA_ID,
    current_ward:      WARD_ID,
    educational_status: 'graduate',
    highest_degree:     'bachelors',
    graduation_year:    '2020',
    school_name:        'University of Lagos',
    phone:              '',
    address:            '1 Load Test Street, Lagos',
  });
}

// ─── Practice Test payload ──────────────────────────────────────────────────────
// POST /api/v1/practice-tests
// Fields: election_group_id, role, final_score, task_stats[]
export function makePracticeTestPayload() {
  return JSON.stringify({
    election_group_id: ELECTION_GROUP_ID,
    role:              'polling_agent',
    final_score:       85.0,
    task_stats: [
      { task_id: 1, score: 90.0, failed_attempts: 0, completed: true },
      { task_id: 2, score: 80.0, failed_attempts: 1, completed: true },
      { task_id: 3, score: 85.0, failed_attempts: 0, completed: true },
    ],
  });
}

// ─── Polling Unit Update payload ────────────────────────────────────────────────
// POST /api/v1/polling-unit-updates
// Fields: polling_unit_id, election_group_id, party_id, message,
//         media_urls, is_report, report_types
export function makeUpdatePayload(pollingUnitId, updateIndex, isReport) {
  return JSON.stringify({
    polling_unit_id:   pollingUnitId,
    election_group_id: ELECTION_GROUP_ID,
    party_id:          PARTY_ID,
    message:           isReport
      ? `[REPORT] Security incident at polling unit ${pollingUnitId} — update #${updateIndex}`
      : `Status update #${updateIndex} from polling unit ${pollingUnitId}: situation is calm`,
    media_urls:    [],
    is_report:     isReport,
    report_types:  isReport ? ['security_incident'] : [],
  });
}

// ─── Election Votes payload ─────────────────────────────────────────────────────
// POST /api/v1/elections/votes
// Fields: election_group_id, polling_unit_id, votes[{election_id, party_id}]
export function makeVotesPayload(pollingUnitId) {
  return JSON.stringify({
    election_group_id: ELECTION_GROUP_ID,
    polling_unit_id:   pollingUnitId,
    votes: [
      {
        election_id: ELECTION_ID,
        party_id:    CANDIDATE_PARTY_ID,
      },
    ],
    voters_card_image: '',
  });
}

// ─── Polling Unit Result payload ────────────────────────────────────────────────
// POST /api/v1/polling-unit-results
// Fields: election_id, election_group_id, polling_unit_id, result_sheet_image_url
export function makeResultPayload(pollingUnitId) {
  return JSON.stringify({
    election_id:          ELECTION_ID,
    election_group_id:    ELECTION_GROUP_ID,
    polling_unit_id:      pollingUnitId,
    result_sheet_image_url: '',
    result_sheet_video_url: '',
    uploaded_by_inec:     false,
  });
}
