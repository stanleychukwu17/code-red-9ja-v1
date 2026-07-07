// lib/config.ts
export const IP_SERVICE_URL = import.meta.env.VITE_IP_SERVICE_URL;
export const APP_NAME = import.meta.env.VITE_APP_NAME;
const API_BASE = import.meta.env.VITE_API_URL;

export const APP_URL = {
  auth: {
    signup: "/auth/signup",
    login: "/auth/login",
    logout: "/auth/logout",
    securityQuestions: "/auth/security-questions",
    onboarding: "/auth/onboarding",
    forgotPassword: "/auth/forgot-password",
  },
  homePage: "/dashboard",
};

const api = `${API_BASE}/api/v1`;
export const API_URL = {
  health: `${API_BASE}/health`,
  auth: {
    registerPhaseSignUp: `${api}/auth/register_phase_signup`,
    checkNin: `${api}/auth/check_nin`,
    checkUsername: `${api}/auth/check_username`,
    register: `${api}/auth/register`,
    login: `${api}/auth/login`,
    refresh: `${api}/auth/refresh`,
    logout: `${api}/auth/logout`,
    verifySecurityQuestions: `${api}/auth/verify_security_questions`,
    forgotPassword: `${api}/auth/forgot_password`,
    partyLogin: `${api}/auth/partyapp/login`,
    registerCandidate: `${api}/auth/register-candidate`,
  },
  getAllCountries: `${api}/countries`,
  getStates: (countryId: number, limit?: number, cursor?: string | number) => {
    const params = new URLSearchParams();
    if (limit) params.append("limit", String(limit));
    if (cursor) params.append("cursor", String(cursor));
    const qs = params.toString();
    return `${api}/countries/${countryId}/states${qs ? `?${qs}` : ""}`;
  },
  getCities: (stateId: number) => `${api}/states/${stateId}/cities`,
  getLGAs: `${api}/lgas`,
  getWards: `${api}/wards`,
  parties: `${api}/parties`,
  uploadUrl: `${api}/files/upload-url`,
  confirmUpload: (id: string | number) => `${api}/files/${id}/confirm`,
  users: `${api}/users`,
  adminUserById: (id: string | number) => `${api}/admin/users/${id}`,
  electionGroups: `${api}/election-groups`,
  electionGroupById: (id: string | number) => `${api}/election-groups/${id}`,
  elections: `${api}/elections`,
  electionById: (id: string | number) => `${api}/elections/${id}`,
  pollingAgentApplications: `${api}/polling-agent-applications`,
  pollingAgentRecommendations: `${api}/polling-agent-applications/recommendations`,
  pollingUnits: `${api}/polling-units`,
  approveApplication: (id: string | number) =>
    `${api}/polling-agent-applications/${id}/approve`,
  rejectApplication: (id: string | number) =>
    `${api}/polling-agent-applications/${id}/reject`,
  getSenatorialDistricts: `${api}/senatorial-districts`,
  getFederalConstituencies: `${api}/federal-constituencies`,
  getStateConstituencies: `${api}/state-constituencies`,
  electionCandidates: (id: string | number) =>
    `${api}/elections/${id}/candidates`,
  pollingUnitUpdates: `${api}/polling-unit-updates`,
  pollingUnitResults: `${api}/polling-unit-results`,
  pollingUnitFinalResults: `${api}/polling-unit-final-results`,
  stateFinalResults: `${api}/state-final-results`,
  senatorialDistrictFinalResults: `${api}/senatorial-district-final-results`,
  federalConstituencyFinalResults: `${api}/federal-constituency-final-results`,
  lgaFinalResults: `${api}/lga-final-results`,
  wardFinalResults: `${api}/ward-final-results`,
  // Combined geo + final result endpoints (election_id required)
  electionResultsStates: `${api}/elections/results/states`,
  electionResultsSenatorialDistricts: `${api}/elections/results/senatorial-districts`,
  electionResultsFederalConstituencies: `${api}/elections/results/federal-constituencies`,
  electionResultsLGAs: `${api}/elections/results/lgas`,
  electionResultsWards: `${api}/elections/results/wards`,
  electionResultsPollingUnits: `${api}/elections/results/polling-units`,
};
