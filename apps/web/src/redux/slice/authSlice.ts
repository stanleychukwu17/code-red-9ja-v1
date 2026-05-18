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
  fakeId?: number;
  dateTimeOtpSent?: string;
  otpVerified?: "yes" | "no";
}

export interface AuthState {
  onboardingData: AuthProps | null;
}

const initialState: AuthState = {
  onboardingData: null,
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
  },
});

export const { setOnboardingData, updateOnboardingData, clearOnboardingData } = authSlice.actions;

export default authSlice.reducer;
