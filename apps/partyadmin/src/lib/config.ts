// lib/config.ts
export const IP_SERVICE_URL = import.meta.env.VITE_IP_SERVICE_URL;
export const APP_NAME = import.meta.env.VITE_APP_NAME;
export const FRONTEND_APP = "partyadmin";
export const WEB_DNS = import.meta.env.VITE_WEB_URL;
const API_BASE = import.meta.env.VITE_API_URL;

// ============================================================================
// Web URLs
// ============================================================================
const web = `${WEB_DNS}`;
export const WEB_URL = {
  users: {
    profile: (username: string) => `${web}/profile/${username}`,
  },
  parties: {
    profile: (shortName: string, id: number) =>
      `${web}/party/${shortName}/${id}/home`,
  },
};

// ============================================================================
// App URLs
// ============================================================================
export const APP_URL = {
  auth: {
    login: "/auth/login",
    logout: "/auth/logout",
  },
  homePage: "/dashboard",
  parties: "/parties",
  partyHome: "/$partyShortName/home",

  partyRoutes: {
    home: (party: string) => `/${party}/home`,
    elections: (party: string) => `/${party}/elections`,
    electionInstances: (party: string) => `/${party}/elections/instances`,
    electionInstance: (
      party: string,
      electionId: string | number,
      query?: { election_group_id?: string | number; scope?: string },
    ) => {
      const params = new URLSearchParams();
      if (query?.election_group_id) params.set("election_group_id", String(query.election_group_id));
      if (query?.scope) params.set("scope", query.scope);
      const qs = params.toString();
      return `/${party}/elections/${electionId}${qs ? `?${qs}` : ""}`;
    },
    applications: (party: string) => `/${party}/applications`,
    members: (party: string) => `/${party}/party-members/member`,
    partyAdmins: (party: string) => `/${party}/party-members/party-admin`,
    partyPositions: (party: string) => `/${party}/party-members/party-positions`,
    suspendedUsers: (party: string) => `/${party}/party-members/suspended`,
    blockedUsers: (party: string) => `/${party}/party-members/blocked`,
    searchUsers: (party: string) => `/${party}/party-members/search-users`,
    wallet: (party: string) => `/${party}/wallet`,
    marketing: (party: string) => `/${party}/marketing`,
    agents: (party: string) => `/${party}/agents`,
    coverage: (party: string) => `/${party}/coverage`,
    candidateResults: (party: string) => `/${party}/candidate-results`,
    electionRace: (party: string) => `/${party}/election-race`,
  },
} as const;



// ============================================================================
// API URLs
// ============================================================================
const api = `${API_BASE}/api/v1`;

const withQuery = (
  base: string,
  query?: string | URLSearchParams,
) => {
  if (!query) return base;
  const qs = typeof query === "string" ? query.replace(/^\?/, "") : query.toString();
  return qs ? `${base}?${qs}` : base;
};

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
  getCities: (stateId: number, limit?: number, cursor?: string | number) => {
    const params = new URLSearchParams();
    if (limit) params.append("limit", String(limit));
    if (cursor) params.append("cursor", String(cursor));
    return withQuery(`${api}/states/${stateId}/cities`, params);
  },
  getLGAs: (query?: string | URLSearchParams) => withQuery(`${api}/lgas`, query),
  getWards: (query?: string | URLSearchParams) => withQuery(`${api}/wards`, query),
  parties: `${api}/parties`,
  publicParties: `${api}/parties/public`,
  partyById: (id: string | number) => `${api}/parties/${id}`,
  partyReadiness: (id: string | number) => `${api}/parties/${id}/readiness`,
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
  partySlotsBuy: (id: string | number) => `${api}/parties/${id}/slots/buy`,
  partyAgentPaymentDeposits: (id: string | number) =>
    `${api}/parties/${id}/agent-payment-deposits`,
  partyAgentPaymentAllocations: (id: string | number) =>
    `${api}/parties/${id}/agent-payment-allocations`,
  partyAgentTargets: (id: string | number) =>
    `${api}/parties/${id}/agent-targets`,
  partyPositions: (id: string | number) =>
    `${api}/parties/${id}/positions`,
  partyCustomPosition: (id: string | number, positionId?: string | number) =>
    positionId ? `${api}/parties/${id}/positions/${positionId}` : `${api}/parties/${id}/positions`,
  partyOfficials: (
    id: string | number,
    params?: {
      country_id?: number;
      zonal_id?: number;
      state_id?: number;
      lga_id?: number;
      ward_id?: number;
    },
  ) => {
    const sp = new URLSearchParams();
    if (params?.country_id) sp.append("country_id", String(params.country_id));
    if (params?.zonal_id) sp.append("zonal_id", String(params.zonal_id));
    if (params?.state_id) sp.append("state_id", String(params.state_id));
    if (params?.lga_id) sp.append("lga_id", String(params.lga_id));
    if (params?.ward_id) sp.append("ward_id", String(params.ward_id));
    const qs = sp.toString();
    return `${api}/parties/${id}/officials${qs ? `?${qs}` : ""}`;
  },
  assignOfficial: (id: string | number) =>
    `${api}/parties/${id}/officials`,
  vacateOfficial: (id: string | number, assignmentId: string | number) =>
    `${api}/parties/${id}/officials/${assignmentId}/vacate`,
  memberPositions: (id: string | number, userId: string | number) =>
    `${api}/parties/${id}/members/${userId}/positions`,
  suspendedMembers: (id: string | number, limit?: number, cursor?: string | number) => {
    const sp = new URLSearchParams();
    if (limit) sp.append("limit", String(limit));
    if (cursor) sp.append("cursor", String(cursor));
    const qs = sp.toString();
    return `${api}/parties/${id}/members/suspended${qs ? `?${qs}` : ""}`;
  },
  blockedMembers: (id: string | number, limit?: number, cursor?: string | number) => {
    const sp = new URLSearchParams();
    if (limit) sp.append("limit", String(limit));
    if (cursor) sp.append("cursor", String(cursor));
    const qs = sp.toString();
    return `${api}/parties/${id}/members/blocked${qs ? `?${qs}` : ""}`;
  },
  suspendMember: (id: string | number, userId: string | number) =>
    `${api}/parties/${id}/members/${userId}/suspend`,
  unsuspendMember: (id: string | number, userId: string | number) =>
    `${api}/parties/${id}/members/${userId}/unsuspend`,
  blockMember: (id: string | number, userId: string | number) =>
    `${api}/parties/${id}/members/${userId}/block`,
  unblockMember: (id: string | number, userId: string | number) =>
    `${api}/parties/${id}/members/${userId}/unblock`,
  uploadUrl: `${api}/files/upload-url`,
  confirmUpload: (id: string | number, success?: boolean) => {
    const qs = success !== undefined ? `?success=${success}` : "";
    return `${api}/files/${id}/confirm${qs}`;
  },
  users: (query?: string | URLSearchParams) => withQuery(`${api}/users`, query),
  searchUsers: (query?: string | URLSearchParams) => withQuery(`${api}/users/search`, query),
  adminUserById: (id: string | number) => `${api}/admin/users/${id}`,
  electionGroups: (query?: string | URLSearchParams) => withQuery(`${api}/election-groups`, query),
  electionGroupById: (id: string | number) => `${api}/election-groups/${id}`,
  electionGroupElections: (groupId: string | number) => `${api}/election-groups/${groupId}/elections`,
  elections: (query?: string | URLSearchParams) => withQuery(`${api}/elections`, query),
  electionById: (id: string | number) => `${api}/elections/${id}`,
  electionByFakeId: (fakeId: string | number, query?: string | URLSearchParams) =>
    withQuery(`${api}/elections/by-fake-id/${fakeId}`, query),
  fieldPartyCandidate: (id: string | number) => `${api}/elections/${id}/field-candidate`,
  unfieldPartyCandidate: (id: string | number) => `${api}/elections/${id}/unfield-candidate`,
  offices: (params?: { limit?: number; cursor?: string | number; contested?: boolean } | string | URLSearchParams) => {
    if (!params) return `${api}/offices`;
    if (typeof params === "string" || params instanceof URLSearchParams) {
      return withQuery(`${api}/offices`, params);
    }
    const sp = new URLSearchParams();
    if (params.limit !== undefined) sp.append("limit", String(params.limit));
    if (params.cursor !== undefined && params.cursor !== "") sp.append("cursor", String(params.cursor));
    if (params.contested !== undefined) sp.append("contested", String(params.contested));
    return withQuery(`${api}/offices`, sp);
  },
  officeById: (id: string | number) => `${api}/offices/${id}`,
  partyApplications: (query?: string | URLSearchParams) => withQuery(`${api}/party-applications`, query),
  partyApplicationsRecommendations: (query?: string | URLSearchParams) =>
    withQuery(`${api}/party-applications/recommendations`, query),
  pollingUnits: `${api}/polling-units`,
  pollingUnitsPaginated: (query?: string | URLSearchParams) => withQuery(`${api}/polling-units/paginated`, query),
  approveApplication: (id: string | number) =>
    `${api}/party-applications/${id}/approve`,
  rejectApplication: (id: string | number) =>
    `${api}/party-applications/${id}/reject`,
  getSenatorialDistricts: (query?: string | URLSearchParams) => withQuery(`${api}/senatorial-districts`, query),
  getFederalConstituencies: (query?: string | URLSearchParams) => withQuery(`${api}/federal-constituencies`, query),
  getStateConstituencies: (query?: string | URLSearchParams) => withQuery(`${api}/state-constituencies`, query),
  electionCandidates: (id: string | number, query?: string | URLSearchParams) =>
    withQuery(`${api}/elections/${id}/candidates`, query),
  pollingUnitUpdates: (query?: string | URLSearchParams) => withQuery(`${api}/polling-unit-updates`, query),
  pollingUnitResults: `${api}/polling-unit-results`,
  pollingUnitFinalResults: (query?: string | URLSearchParams) => withQuery(`${api}/polling-unit-final-results`, query),
  stateFinalResults: (query?: string | URLSearchParams) => withQuery(`${api}/state-final-results`, query),
  senatorialDistrictFinalResults: (query?: string | URLSearchParams) =>
    withQuery(`${api}/senatorial-district-final-results`, query),
  federalConstituencyFinalResults: (query?: string | URLSearchParams) =>
    withQuery(`${api}/federal-constituency-final-results`, query),
  lgaFinalResults: (query?: string | URLSearchParams) => withQuery(`${api}/lga-final-results`, query),
  wardFinalResults: (query?: string | URLSearchParams) => withQuery(`${api}/ward-final-results`, query),
  // Combined geo + final result endpoints (election_id required)
  electionResultsStates: (query?: string | URLSearchParams) => withQuery(`${api}/elections/results/states`, query),
  electionResultsSenatorialDistricts: (query?: string | URLSearchParams) =>
    withQuery(`${api}/elections/results/senatorial-districts`, query),
  electionResultsFederalConstituencies: (query?: string | URLSearchParams) =>
    withQuery(`${api}/elections/results/federal-constituencies`, query),
  electionResultsStateConstituencies: (query?: string | URLSearchParams) =>
    withQuery(`${api}/elections/results/state-constituencies`, query),
  electionResultsLGAs: (query?: string | URLSearchParams) => withQuery(`${api}/elections/results/lgas`, query),
  electionResultsWards: (query?: string | URLSearchParams) => withQuery(`${api}/elections/results/wards`, query),
  electionResultsPollingUnits: (query?: string | URLSearchParams) =>
    withQuery(`${api}/elections/results/polling-units`, query),
  electionResultsScoped: (query?: string | URLSearchParams) => withQuery(`${api}/elections/results`, query),
  electionResultsBreakdown: (query?: string | URLSearchParams) =>
    withQuery(`${api}/elections/results/breakdown`, query),
  electionOperationsBreakdown: (query?: string | URLSearchParams) =>
    withQuery(`${api}/elections/operations/breakdown`, query),
  agentCoverageBreakdown: (query?: string | URLSearchParams) =>
    withQuery(`${api}/elections/agent-coverage/breakdown`, query),
  agentPerformance: (query?: string | URLSearchParams) => withQuery(`${api}/agent-performance`, query),
  agentChangeRole: `${api}/agents/change-role`,
  agentById: (id: string | number, query?: string | URLSearchParams) =>
    withQuery(`${api}/agents/${id}`, query),
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


// ============================================================================
// Query keys
// ============================================================================

export const QUERY_KEYS = {
  auth: {
    session: ["authSession"],
  },
  countries: ["countries"],

  applications: {
    root: ["applications"] as const,
    list: (
      status?: string,
      partyId?: number | string,
      electionGroupId?: number | string,
      stateId?: number,
      lgaId?: number,
      wardId?: number,
    ) =>
      [
        "applications",
        status,
        partyId,
        electionGroupId,
        stateId,
        lgaId,
        wardId,
      ] as const,
  },

  partyMembers: {
    root: ["party-members"] as const,

    list: (
      partyId?: number | string,
      search?: string,
      filters?: unknown,
    ) => ["party-members", partyId, search, filters] as const,

    partyAdmins: (
      partyId?: number | string,
      search?: string,
      filters?: unknown,
    ) => ["party-members", "party-admin", partyId, search, filters] as const,

    suspended: (partyId?: number | string) =>
      ["party-members", "suspended", partyId] as const,

    blocked: (partyId?: number | string) =>
      ["party-members", "blocked", partyId] as const,
  },

  partyOfficials: {
    root: ["partyOfficials"] as const,

    byChapterType: (partyId?: number | string, chapterType?: string) =>
      ["partyOfficials", partyId, chapterType] as const,

    list: (
      partyId?: number | string,
      chapterType?: string,
      countryId?: number,
      zonalId?: number,
      stateId?: number,
      lgaId?: number,
      wardId?: number,
    ) =>
      [
        "partyOfficials",
        partyId,
        chapterType,
        countryId,
        zonalId,
        stateId,
        lgaId,
        wardId,
      ] as const,
  },

  partyPositions: {
    root: ["partyPositions"] as const,
    byParty: (partyId?: number | string) =>
      ["partyPositions", partyId] as const,
  },

  partyWallet: {
    root: ["partyWallet"] as const,
    byParty: (partyId?: number | string) => ["partyWallet", partyId] as const,
    transactions: (partyId?: number | string) =>
      ["partyWalletTransactions", partyId] as const,
  },

  partyReadiness: {
    root: ["partyReadiness"] as const,
    byParty: (partyId?: number | string) => ["partyReadiness", partyId] as const,
  },

  party: {
    root: ["party"] as const,
    byId: (partyId?: number | string) => ["party", partyId] as const,
  },

  electionStats: {
    root: ["election-stats"] as const,
    byFilter: (
      electionGroupId?: number | string,
      partyId?: number | string,
      stateId?: number,
      lgaId?: number,
      wardId?: number,
    ) => ["election-stats", electionGroupId, partyId, stateId, lgaId, wardId] as const,
  },
};

