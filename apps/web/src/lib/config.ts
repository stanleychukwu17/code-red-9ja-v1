// lib/config.ts
export const APP_NAME = import.meta.env.VITE_APP_NAME;
const API_URLO = import.meta.env.VITE_API_URL

export const APP_URL = {
  "auth": {
    "signup": "/auth/signup",
    "login": "/auth/login",
    "verifyOtp": "/auth/verify-otp",
    "onboarding": "/auth/onboarding"
  },
  "dashboard": "/dashboard",
}

export const API_URL = {
  "registration": `${API_URLO}/auth/register`,
  "login": `${API_URLO}/auth/login`,
  "getAllCountries": `${API_URLO}api/v1/countries`,
}