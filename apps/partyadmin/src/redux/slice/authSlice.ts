import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface PartyProps {
  id?: number;
  short_name?: string;
  name?: string;
  logo?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserProps {
  fake_id?: number;
  username?: string;
  account_status?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  party?: PartyProps;
}

export interface AuthState {
  user: UserProps | null;
  userHydrated: boolean;
}

const initialState: AuthState = {
  user: null,
  userHydrated: false 
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

export const {
  updateAuthState,
} = authSlice.actions;

export default authSlice.reducer;
