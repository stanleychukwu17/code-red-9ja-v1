// lib/config.ts
export const IP_SERVICE_URL = import.meta.env.VITE_IP_SERVICE_URL;
export const APP_NAME = import.meta.env.VITE_APP_NAME;
const API_BASE = import.meta.env.VITE_API_URL;

export const APP_URL = {
  auth: {
    forgotPassword: "/auth/forgot-password",
    login: "/auth/login",
    logout: "/auth/logout",
    onboarding: "/auth/onboarding",
    securityQuestions: "/auth/security-questions",
    signup: "/auth/signup",
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
    registerPhaseSignUp: `${api}/auth/signup/web`,
    sendSignupEmailOtp: `${api}/auth/signup/email-otp`,
    verifySignupEmailOtp: `${api}/auth/signup/email-otp/verify`,
    checkNin: `${api}/auth/check_nin`,
    checkUsername: `${api}/auth/check_username`,
    register: `${api}/auth/register`,
    login: `${api}/auth/login`,
    refresh: `${api}/auth/refresh`,
    logout: `${api}/auth/logout`,
    verifySecurityQuestions: `${api}/auth/verify_security_questions`,
    forgotPassword: `${api}/auth/forgot_password`,
  },
  "getAllCountries": `${api}/countries`,
  "getStates": (countryId: number) => `${api}/countries/${countryId}/states`,
  "getCities": (stateId: number) => `${api}/states/${stateId}/cities`,
  "getPartyProfile": (partyId: number, shortName: string) => `${api}/parties/${partyId}/${shortName}/profile`,
}