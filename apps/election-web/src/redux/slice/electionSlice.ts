import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store";

export interface ElectionState {
  selectedElectionGroup: any | null;
  selectedElection: any | null;
}

const safeGetLocalStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === "undefined") return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(error);
    return defaultValue;
  }
};

const safeSetLocalStorage = (key: string, value: any) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(error);
  }
};

const initialState: ElectionState = {
  selectedElectionGroup: safeGetLocalStorage("selected-election-group", null),
  selectedElection: safeGetLocalStorage("selected-election", null),
};

export const electionSlice = createSlice({
  name: "election",
  initialState,
  reducers: {
    setSelectedElectionGroup: (state, action: PayloadAction<any | null>) => {
      state.selectedElectionGroup = action.payload;
      safeSetLocalStorage("selected-election-group", action.payload);
    },
    setSelectedElection: (state, action: PayloadAction<any | null>) => {
      state.selectedElection = action.payload;
      safeSetLocalStorage("selected-election", action.payload);
    },
  },
});

export const { setSelectedElectionGroup, setSelectedElection } = electionSlice.actions;

export const selectSelectedElectionGroup = (state: RootState) => state.election.selectedElectionGroup;
export const selectSelectedElection = (state: RootState) => state.election.selectedElection;

export default electionSlice.reducer;
