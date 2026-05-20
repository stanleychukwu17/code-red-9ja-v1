import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface AuthProps {
  country: string;
  countryId?: number;
  iso2?: string;
  phoneNumber: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  id?: number;
  dateTimeOtpSent?: string;
  otpVerified?: "yes" | "no";
}

export interface UserProps {
  id: number;
  fake_id?: number;
  email?: string;
  phone: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface AuthState {
  onboardingData: AuthProps | null;
  user: UserProps | null;
  accessToken: string | null;
}

const initialState: AuthState = {
  onboardingData: null,
  user: null,
  accessToken: null,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setOnboardingData: (state, action: PayloadAction<AuthProps>) => {
      state.onboardingData = action.payload;
    },
    updateOnboardingData: (state, action: PayloadAction<Partial<AuthProps>>) => {
      if (state.onboardingData) {
        state.onboardingData = { ...state.onboardingData, ...action.payload };
      } else {
        state.onboardingData = action.payload as AuthProps;
      }
    },
    clearOnboardingData: (state) => {
      state.onboardingData = null;
    },
    setAuthData: (
      state,
      action: PayloadAction<{ user: UserProps; accessToken: string }>
    ) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
    },
    clearAuthData: (state) => {
      state.user = null;
      state.accessToken = null;
    },
  },
});

export const {
  setOnboardingData,
  updateOnboardingData,
  clearOnboardingData,
  setAuthData,
  clearAuthData,
} = authSlice.actions;

export default authSlice.reducer;
