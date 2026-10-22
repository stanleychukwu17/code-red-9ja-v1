import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface UserPartyChapter {
  id: number;
  party_id: number;
  chapter_type: string;
  country_id?: number | null;
  zonal_id?: number | null;
  state_id?: number | null;
  lga_id?: number | null;
  ward_id?: number | null;
  country_name?: string;
  zone_name?: string;
  state_name?: string;
  lga_name?: string;
  ward_name?: string;
}

export interface UserParty {
  id: number;
  short_name: string;
  name: string;
  logo: string;
  is_verified?: boolean;
  color_hex?: string;
  dark_color_hex?: string;
}

export interface UserProps {
  id?: number;
  fake_id?: number;
  username?: string;
  account_status?: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  avatar?: string;
  avatar_url?: string;
  roles?: string[];
  party_id?: number;
  party?: UserParty;
  chapters?: UserPartyChapter[];
}

export interface AuthState {
  user: UserProps | null;
  userHydrated: boolean;
}

const initialState: AuthState = {
  user: null,
  userHydrated: false,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    updateAuthState: (state, action: PayloadAction<Partial<AuthState>>) => {
      Object.assign(state, action.payload); // merges the current state with the received action.payload
    },
  },
});

export const { updateAuthState } = authSlice.actions;

export default authSlice.reducer;
