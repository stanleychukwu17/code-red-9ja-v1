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
  }
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
  electionResultsLGAs: `${api}/elections/results/lgas`,
  electionResultsWards: `${api}/elections/results/wards`,
  electionResultsPollingUnits: `${api}/elections/results/polling-units`,
  electionStats: {
    singleGlobalStats: (id: number | string, partyId?: number | string) => {
      const qs = partyId ? `?party_id=${partyId}` : "";
      return `${api}/election-groups/${id}/stats${qs}`;
    },
    singleStateStats: (id: number | string, stateId: number | string, partyId?: number | string) => {
      const qs = partyId ? `?party_id=${partyId}` : "";
      return `${api}/election-groups/${id}/stats/states/${stateId}${qs}`;
    },
    singleSenatorialDistrictStats: (id: number | string, sdId: number | string, partyId?: number | string) => {
      const qs = partyId ? `?party_id=${partyId}` : "";
      return `${api}/election-groups/${id}/stats/senatorial-districts/${sdId}${qs}`;
    },
    singleFederalConstituencyStats: (id: number | string, fcId: number | string, partyId?: number | string) => {
      const qs = partyId ? `?party_id=${partyId}` : "";
      return `${api}/election-groups/${id}/stats/federal-constituencies/${fcId}${qs}`;
    },
    singleStateConstituencyStats: (id: number | string, scId: number | string, partyId?: number | string) => {
      const qs = partyId ? `?party_id=${partyId}` : "";
      return `${api}/election-groups/${id}/stats/state-constituencies/${scId}${qs}`;
    },
    singleLGAStats: (id: number | string, lgaId: number | string, partyId?: number | string) => {
      const qs = partyId ? `?party_id=${partyId}` : "";
      return `${api}/election-groups/${id}/stats/lgas/${lgaId}${qs}`;
    },
    singleWardStats: (id: number | string, wardId: number | string, partyId?: number | string) => {
      const qs = partyId ? `?party_id=${partyId}` : "";
      return `${api}/election-groups/${id}/stats/wards/${wardId}${qs}`;
    },
  },
};
