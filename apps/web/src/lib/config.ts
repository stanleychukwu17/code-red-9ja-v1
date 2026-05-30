// lib/config.ts
export const APP_NAME = import.meta.env.VITE_APP_NAME;
const API_BASE = import.meta.env.VITE_API_URL

export const APP_URL = {
  "auth": {
    "signup": "/auth/signup",
    "login": "/auth/login",
    "logout": "/auth/logout",
    "securityQuestions": "/auth/security-questions",
    "onboarding": "/auth/onboarding",
  },
  "homePage": "/dashboard",
}

const api = `${API_BASE}/api/v1`
export const API_URL = {
  "health": `${API_BASE}/health`,
  "auth": {
    "registerPhaseSignUp": `${api}/auth/register_phase_signup`,
    // "verifyOtp": `${api}/auth/verify_otp`,
    // "resendOtp": `${api}/auth/resend_otp`,
    "checkNin": `${api}/auth/check_nin`,
    "checkUsername": `${api}/auth/check_username`,
    "register": `${api}/auth/register`,
    "login": `${api}/auth/login`,
    "refresh": `${api}/auth/refresh`,
    "logout": `${api}/auth/logout`,
  },
  "getAllCountries": `${api}/countries`,
  "getStates": (countryId: number) => `${api}/countries/${countryId}/states`,
  "getCities": (stateId: number) => `${api}/states/${stateId}/cities`,
}