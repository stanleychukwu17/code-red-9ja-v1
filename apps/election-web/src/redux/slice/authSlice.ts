import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

/**
 * Onboarding and registration workflow session properties.
 */
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

/**
 * Authenticated user entity cached in Redux store.
 */
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

/**
 * Global authentication state interface.
 */
export interface AuthState {
  onboardingData: AuthProps | null;
  user: UserProps | null;
  /** Whether the user profile has been restored from session/cookies */
  userHydrated: boolean;
}

const initialState: AuthState = {
  onboardingData: null,
  user: null,
  userHydrated: false,
};

/**
 * authSlice
 * Manages active user authentication session, hydration status,
 * and temporary multi-step onboarding registration metadata.
 */
export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /** Overwrites onboarding session data with a new payload */
    setOnboardingData: (state, action: PayloadAction<AuthProps>) => {
      state.onboardingData = action.payload;
    },
    /** Partially updates onboarding session attributes */
    updateOnboardingData: (state, action: PayloadAction<Partial<AuthProps>>) => {
      if (state.onboardingData) {
        state.onboardingData = { ...state.onboardingData, ...action.payload };
      } else {
        state.onboardingData = action.payload as AuthProps;
      }
    },
    /** Clears onboarding session data upon completion or cancellation */
    clearOnboardingData: (state) => {
      state.onboardingData = null;
    },
    /** Merges partial state updates (e.g., user profile or hydration flag) */
    updateAuthState: (state, action: PayloadAction<Partial<AuthState>>) => {
      Object.assign(state, action.payload);
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

