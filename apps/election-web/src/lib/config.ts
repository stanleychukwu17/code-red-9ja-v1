// lib/config.ts
export const APP_NAME = import.meta.env.VITE_APP_NAME;
const API_BASE = import.meta.env.VITE_API_URL;
export const IP_SERVICE_URL = import.meta.env.VITE_IP_SERVICE_URL;

export const APP_URL = {
  auth: {
    signup: "/auth/signup",
    login: "/auth/login",
    logout: "/auth/logout",
    securityQuestions: "/auth/security-questions",
    onboarding: "/auth/onboarding",
    forgotPassword: "/auth/forgot-password",
  },
  home: "/home",
  applications: "/applications",
  notifications: "/notifications",
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
    adminLogin: `${api}/auth/admin/login`,
    refresh: `${api}/auth/refresh`,
    logout: `${api}/auth/logout`,
    verifySecurityQuestions: `${api}/auth/verify_security_questions`,
    forgotPassword: `${api}/auth/forgot_password`,
    registerCandidate: `${api}/auth/register-candidate`,
  },

  getBanks: `${api}/banks`,

  validateBankAccount: (accountNumber: string, bankCode: string) =>
    `${api}/banks/validate?accountNumber=${accountNumber}&bankCode=${bankCode}`,

  getAllCountries: `${api}/countries`,

  getStates: (countryId: number, limit?: number, cursor?: string | number) => {
    const params = new URLSearchParams();
    if (limit) params.append("limit", String(limit));
    if (cursor) params.append("cursor", String(cursor));
    const qs = params.toString();
    return `${api}/countries/${countryId}/states${qs ? `?${qs}` : ""}`;
  },

  getCities: (stateId: number) => `${api}/states/${stateId}/cities`,

  getSenatorialDistricts: (
    stateId?: number,
    limit?: number,
    cursor?: string | number,
  ) => {
    const params = new URLSearchParams();
    if (stateId) params.append("state_id", String(stateId));
    if (limit) params.append("limit", String(limit));
    if (cursor) params.append("cursor", String(cursor));
    const qs = params.toString();
    return `${api}/senatorial-districts${qs ? `?${qs}` : ""}`;
  },

  getFederalConstituencies: (
    stateId?: number,
    senatorialDistrictId?: number,
    limit?: number,
    cursor?: string | number,
  ) => {
    const params = new URLSearchParams();
    if (stateId) params.append("state_id", String(stateId));
    if (senatorialDistrictId)
      params.append("senatorial_district_id", String(senatorialDistrictId));
    if (limit) params.append("limit", String(limit));
    if (cursor) params.append("cursor", String(cursor));
    const qs = params.toString();
    return `${api}/federal-constituencies${qs ? `?${qs}` : ""}`;
  },

  getStateAssemblyConstituencies: (
    stateId?: number,
    federalConstituencyId?: number,
    limit?: number,
    cursor?: string | number,
  ) => {
    const params = new URLSearchParams();
    if (stateId) params.append("state_id", String(stateId));
    if (federalConstituencyId)
      params.append("federal_constituency_id", String(federalConstituencyId));
    if (limit) params.append("limit", String(limit));
    if (cursor) params.append("cursor", String(cursor));
    const qs = params.toString();
    return `${api}/state-constituencies${qs ? `?${qs}` : ""}`;
  },

  getLGAs: (stateId?: number, limit?: number, cursor?: string | number) => {
    const params = new URLSearchParams();
    if (stateId) params.append("state_id", String(stateId));
    if (limit) params.append("limit", String(limit));
    if (cursor) params.append("cursor", String(cursor));
    const qs = params.toString();
    return `${api}/lgas${qs ? `?${qs}` : ""}`;
  },

  getWards: (
    localGovernmentId?: number,
    stateId?: number,
    limit?: number,
    cursor?: string | number,
  ) => {
    const params = new URLSearchParams();
    if (localGovernmentId) params.append("lga_id", String(localGovernmentId));
    if (stateId) params.append("state_id", String(stateId));
    if (limit) params.append("limit", String(limit));
    if (cursor) params.append("cursor", String(cursor));
    const qs = params.toString();
    return `${api}/wards${qs ? `?${qs}` : ""}`;
  },

  getPollingUnits: (
    wardId?: number,
    localGovernmentId?: number,
    stateId?: number,
    limit?: number,
    cursor?: string | number,
  ) => {
    const params = new URLSearchParams();
    if (wardId) params.append("ward_id", String(wardId));
    if (localGovernmentId) params.append("lga_id", String(localGovernmentId));
    if (stateId) params.append("state_id", String(stateId));
    if (limit) params.append("limit", String(limit));
    if (cursor) params.append("cursor", String(cursor));
    const qs = params.toString();
    return `${api}/polling-units${qs ? `?${qs}` : ""}`;
  },

  electionStats: {
    singleStateStats: (
      id: number | string,
      stateId: number | string,
      partyId?: number | string,
    ) => {
      const qs = partyId ? `?party_id=${partyId}` : "";
      return `${api}/election-groups/${id}/stats/states/${stateId}${qs}`;
    },
    singleLGAStats: (
      id: number | string,
      lgaId: number | string,
      partyId?: number | string,
    ) => {
      const qs = partyId ? `?party_id=${partyId}` : "";
      return `${api}/election-groups/${id}/stats/lgas/${lgaId}${qs}`;
    },
    singleWardStats: (
      id: number | string,
      wardId: number | string,
      partyId?: number | string,
    ) => {
      const qs = partyId ? `?party_id=${partyId}` : "";
      return `${api}/election-groups/${id}/stats/wards/${wardId}${qs}`;
    },
  },

  uploadToR2: `${api}/upload`,
  lgaById: (id: string | number) => `${api}/lgas/${id}`,

  parties: `${api}/parties`,
  partyById: (id: string | number) => `${api}/parties/${id}`,

  uploadUrl: `${api}/files/upload-url`,
  confirmUpload: (id: string | number) => `${api}/files/${id}/confirm`,

  offices: `${api}/offices`,
  officeById: (id: string | number) => `${api}/offices/${id}`,

  states: `${api}/states`,
  stateById: (id: string | number) => `${api}/states/${id}`,

  senatorialDistricts: `${api}/senatorial-districts`,
  senatorialDistrictById: (id: string | number) =>
    `${api}/senatorial-districts/${id}`,

  federalConstituencies: `${api}/federal-constituencies`,
  federalConstituencyById: (id: string | number) =>
    `${api}/federal-constituencies/${id}`,

  stateAssemblyConstituencies: `${api}/state-assembly-constituencies`,
  stateAssemblyConstituencyById: (id: string | number) =>
    `${api}/state-assembly-constituencies/${id}`,

  wards: `${api}/wards`,
  wardById: (id: string | number) => `${api}/wards/${id}`,

  pollingUnits: `${api}/polling-units`,
  pollingUnitUpdates: `${api}/polling-unit-updates`,
  pollingUnitById: (id: string | number) => `${api}/polling-units/${id}`,

  electionGroups: `${api}/election-groups`,
  electionGroupById: (id: string | number) => `${api}/election-groups/${id}`,
  electionGroupElections: (id: string | number) =>
    `${api}/election-groups/${id}/elections`,

  elections: `${api}/elections`,
  nonVotingReasons: `${api}/elections/non-voting-reasons`,
  didNotVote: `${api}/elections/did-not-vote`,
  electionById: (id: string | number) => `${api}/elections/${id}`,
  electionCandidates: (id: string | number) =>
    `${api}/elections/${id}/candidates`,

  electionsNationwide: `${api}/elections/nationwide`,
  electionsState: `${api}/elections/state`,
  electionsSenatorialDistrict: `${api}/elections/senatorial-district`,
  electionsFederalConstituency: `${api}/elections/federal-constituency`,
  electionsStateConstituency: `${api}/elections/state-constituency`,

  electionsLga: `${api}/elections/lga`,
  electionsWard: `${api}/elections/ward`,


  adminUserById: (id: string | number) => `${api}/admin/users/${id}`,

  users: `${api}/users`,
  pollingAgentApplications: `${api}/party-applications`,
  pollingAgentRecommendations: `${api}/party-applications/recommendations`,

  approveApplication: (id: string | number) => `${api}/party-applications/${id}/approve`,
  rejectApplication: (id: string | number) => `${api}/party-applications/${id}/reject`,
  cancelApplication: (id: string | number) => `${api}/party-applications/${id}/cancel`,

  pollingUnitAssignments: `${api}/polling-unit-assignments`,
  updateAssignmentTracking: (id: string | number) =>
    `${api}/polling-unit-assignments/${id}/tracking`,

  supervisorAssignments: `${api}/supervisor-assignments`,

  pollingUnitResults: `${api}/polling-unit-results`,
  pollingUnitResultById: (id: string | number) =>
    `${api}/polling-unit-results/${id}`,
  voteOnResult: (id: string | number) =>
    `${api}/polling-unit-results/${id}/vote`,

  nationalMetrics: `${api}/bodies/metrics`,
};
