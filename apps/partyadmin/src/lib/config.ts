// lib/config.ts
export const IP_SERVICE_URL = import.meta.env.VITE_IP_SERVICE_URL;
export const APP_NAME = import.meta.env.VITE_APP_NAME;
const API_BASE = import.meta.env.VITE_API_URL;

export const APP_URL = {
  auth: {
    login: "/auth/login",
    logout: "/auth/logout",
  },
  homePage: "/dashboard",
  partyHome: "/$partyShortName/home",
  partyRoutes: {
    home: (party: string) => `/${party}/home`,
    elections: (party: string) => `/${party}/elections`,
    applications: (party: string) => `/${party}/applications`,
    members: (party: string) => `/${party}/party-members`,
    wallet: (party: string) => `/${party}/wallet`,
    marketing: (party: string) => `/${party}/marketing`,
    agents: (party: string) => `/${party}/agents`,
    coverage: (party: string) => `/${party}/coverage`,
    candidateResults: (party: string) => `/${party}/candidate-results`,
    electionRace: (party: string) => `/${party}/election-race`,
  },
} as const;

const api = `${API_BASE}/api/v1`;
export const API_URL = {
  health: `${API_BASE}/health`,
  auth: {
    refresh: `${api}/auth/refresh`,
    logout: `${api}/auth/logout`,
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
  partyById: (id: string | number) => `${api}/parties/${id}`,
  partyWallet: (id: string | number) => `${api}/parties/${id}/wallet`,
  partyWalletWithdraw: (id: string | number) =>
    `${api}/parties/${id}/wallet/withdraw`,
  partyWalletTransactions: (
    id: string | number,
    limit?: number,
    offset?: number,
  ) => {
    const params = new URLSearchParams();
    if (limit !== undefined) params.append("limit", String(limit));
    if (offset !== undefined) params.append("offset", String(offset));
    const qs = params.toString();
    return `${api}/parties/${id}/wallet/transactions${qs ? `?${qs}` : ""}`;
  },
  partyWalletDepositTest: (id: string | number) =>
    `${api}/parties/${id}/wallet/deposit-test`,
  partySlotPrice: (id: string | number) => `${api}/parties/${id}/slots/price`,
  partySlotsBuy: (id: string | number) => `${api}/parties/${id}/slots/buy`,
  partyAgentPaymentDeposits: (id: string | number) =>
    `${api}/parties/${id}/agent-payment-deposits`,
  partyAgentPaymentAllocations: (id: string | number) =>
    `${api}/parties/${id}/agent-payment-allocations`,
  partyAgentTargets: (id: string | number) =>
    `${api}/parties/${id}/agent-targets`,
  uploadUrl: `${api}/files/upload-url`,
  confirmUpload: (id: string | number) => `${api}/files/${id}/confirm`,
  users: `${api}/users`,
  adminUserById: (id: string | number) => `${api}/admin/users/${id}`,
  electionGroups: `${api}/election-groups`,
  electionGroupById: (id: string | number) => `${api}/election-groups/${id}`,
  elections: `${api}/elections`,
  electionById: (id: string | number) => `${api}/elections/${id}`,
  partyApplications: `${api}/party-applications`,
  partyApplicationsRecommendations: `${api}/party-applications/recommendations`,
  pollingUnits: `${api}/polling-units`,
  approveApplication: (id: string | number) =>
    `${api}/party-applications/${id}/approve`,
  rejectApplication: (id: string | number) =>
    `${api}/party-applications/${id}/reject`,
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
  electionResultsStateConstituencies: `${api}/elections/results/state-constituencies`,
  electionResultsLGAs: `${api}/elections/results/lgas`,
  electionResultsWards: `${api}/elections/results/wards`,
  electionResultsPollingUnits: `${api}/elections/results/polling-units`,
  electionResultsScoped: `${api}/elections/results`,
  electionResultsBreakdown: `${api}/elections/results/breakdown`,
  electionOperationsBreakdown: `${api}/elections/operations/breakdown`,
  agentCoverageBreakdown: `${api}/elections/agent-coverage/breakdown`,
  electionStats: {
    singleGlobalStats: (id: number | string, partyId: number | string) => {
      return `${api}/election-groups/${id}/stats/parties/${partyId}`;
    },
    singleStateStats: (
      id: number | string,
      stateId: number | string,
      partyId: number | string,
    ) => {
      return `${api}/election-groups/${id}/stats/states/${stateId}/parties/${partyId}`;
    },
    singleSenatorialDistrictStats: (
      id: number | string,
      sdId: number | string,
      partyId: number | string,
    ) => {
      return `${api}/election-groups/${id}/stats/senatorial-districts/${sdId}/parties/${partyId}`;
    },
    singleFederalConstituencyStats: (
      id: number | string,
      fcId: number | string,
      partyId: number | string,
    ) => {
      return `${api}/election-groups/${id}/stats/federal-constituencies/${fcId}/parties/${partyId}`;
    },
    singleStateConstituencyStats: (
      id: number | string,
      scId: number | string,
      partyId: number | string,
    ) => {
      return `${api}/election-groups/${id}/stats/state-constituencies/${scId}/parties/${partyId}`;
    },
    singleLGAStats: (
      id: number | string,
      lgaId: number | string,
      partyId: number | string,
    ) => {
      return `${api}/election-groups/${id}/stats/lgas/${lgaId}/parties/${partyId}`;
    },
    singleWardStats: (
      id: number | string,
      wardId: number | string,
      partyId: number | string,
    ) => {
      return `${api}/election-groups/${id}/stats/wards/${wardId}/parties/${partyId}`;
    },
  },
  plans: (type?: string, isActive?: boolean) => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (isActive !== undefined) params.set('is_active', String(isActive));
    const qs = params.toString();
    return `${api}/plans${qs ? `?${qs}` : ''}`;
  },
  partyMarketingCampaigns: (id: string | number) =>
    `${api}/parties/${id}/agent-marketing-campaigns`,
  userPreferences: `${api}/user_preferences`,
};

export const QUERY_KEYS = {
  auth: {
    session: ["authSession"],
  },
  countries: ["countries"],
};
