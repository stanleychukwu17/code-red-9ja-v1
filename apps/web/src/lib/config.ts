// lib/config.ts
export const IP_SERVICE_URL = import.meta.env.VITE_IP_SERVICE_URL;
export const APP_NAME = import.meta.env.VITE_APP_NAME;
const API_BASE = import.meta.env.VITE_API_URL;

export const APP_URL = {
  auth: {
    login: "/auth/login",
    logout: "/auth/logout",
    onboarding: "/auth/onboarding",
    securityQuestions: "/auth/security-questions",
    signup: "/auth/signup",
    forgotPassword: "/auth/forgot-password",
  },
  dashboard: "/dashboard",
  feed: "/feed",
  home: "/home",
  notifications: "/notifications",
  profile: "/profile",
  search: "/search",
  party: (partyName: string, partyId: string) =>
    `/party/${partyName}/${partyId}/home`,
  parties: "/parties",
};

const api = `${API_BASE}/api/v1`;
export const API_URL = {
  health: `${API_BASE}/health`,
  auth: {
    sendSignupEmailOtp: `${api}/auth/signup/email-otp`,
    verifySignupEmailOtp: `${api}/auth/signup/email-otp/verify`,
    checkNin: `${api}/auth/check_nin`,
    checkUsername: `${api}/auth/check_username`,
    checkReferralCode: `${api}/auth/check_referral_code`,
    signup: `${api}/auth/signup`,
    completeOnboarding: `${api}/auth/onboarding`,
    login: `${api}/auth/login`,
    refresh: `${api}/auth/refresh`,
    logout: `${api}/auth/logout`,
    sendForgotPasswordEmailOtp: `${api}/auth/forgot-password/email-otp`,
    changePasswordByEmail: `${api}/auth/change_password_by_email`,
  },
  getAllCountries: `${api}/countries`,
  getStates: (countryId: number) => `${api}/countries/${countryId}/states`,
  getCities: (stateId: number) => `${api}/states/${stateId}/cities`,
  getLGAs: (stateId?: number, limit?: number, cursor?: string | number) => {
    const params = new URLSearchParams();
    if (stateId) params.append("state_id", String(stateId));
    if (limit) params.append("limit", String(limit));
    if (cursor) params.append("cursor", String(cursor));
    const qs = params.toString();
    return `${api}/lgas${qs ? `?${qs}` : ""}`;
  },
  getWards: (localGovernmentId?: number, stateId?: number, limit?: number, cursor?: string | number) => {
    const params = new URLSearchParams();
    if (localGovernmentId) params.append("lga_id", String(localGovernmentId));
    if (stateId) params.append("state_id", String(stateId));
    if (limit) params.append("limit", String(limit));
    if (cursor) params.append("cursor", String(cursor));
    const qs = params.toString();
    return `${api}/wards${qs ? `?${qs}` : ""}`;
  },
  getPollingUnits: (wardId?: number, localGovernmentId?: number, stateId?: number, limit?: number, cursor?: string | number) => {
    const params = new URLSearchParams();
    if (wardId) params.append("ward_id", String(wardId));
    if (localGovernmentId) params.append("lga_id", String(localGovernmentId));
    if (stateId) params.append("state_id", String(stateId));
    if (limit) params.append("limit", String(limit));
    if (cursor) params.append("cursor", String(cursor));
    const qs = params.toString();
    return `${api}/polling-units${qs ? `?${qs}` : ""}`;
  },
  getPartyProfile: (partyId: number, shortName: string) => `${api}/parties/${partyId}/${shortName}/profile`,
};