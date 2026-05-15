import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface AuthProps {
  country: string;
  countryId?: number;
  phoneNumber: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
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
    clearOnboardingData: (state) => {
      state.onboardingData = null;
    },
  },
});

export const { setOnboardingData, clearOnboardingData } = authSlice.actions;

export default authSlice.reducer;
