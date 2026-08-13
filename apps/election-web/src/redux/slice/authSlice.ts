import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface AuthProps {
  country?: string;
  countryId?: number;
  id?: string;
  changePasswordId?: string;
  changeUserFid?: number;
  registrationCompleted?: boolean;
  registrationCompletedAt?: string;
  passwordChangeCompleted?: boolean;
  passwordChangeCompletedAt?: string;
}

export interface UserProps {
  id?: string | number;
  fake_id?: number;
  username?: string;
  account_status?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  phone?: string;
  referral_code?: string;
}

export interface AuthState {
  onboardingData: AuthProps | null;
  user: UserProps | null;
  userHydrated: boolean;
}

const initialState: AuthState = {
  onboardingData: null,
  user: null,
  userHydrated: false 
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
    updateAuthState: (state, action: PayloadAction<Partial<AuthState>>) => {
      Object.assign(state, action.payload); // merges the current state with the received action.payload
    },

  },
});

export const {
  setOnboardingData,
  updateOnboardingData,
  clearOnboardingData,
  updateAuthState,
} = authSlice.actions;

export default authSlice.reducer;
