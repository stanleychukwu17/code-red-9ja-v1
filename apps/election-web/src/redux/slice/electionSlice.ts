import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store";

/**
 * Global election state interface managing active selection and live mode.
 */
export interface ElectionState {
  /** The parent election group (e.g. 2027 Nigerian General Election) */
  selectedElectionGroup: any | null;
  /** The specific contest or ballot race (e.g. Presidential, Gubernatorial) */
  selectedElection: any | null;
  /** Toggle between live real-time returns and certified consensus results */
  isLive: boolean;
  /** Whether the election ballot is locked from further updates */
  isLock: boolean;
}

/**
 * SSR-safe helper to retrieve parsed JSON from localStorage with a fallback.
 */
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

/**
 * SSR-safe helper to serialize and persist values to localStorage.
 */
const safeSetLocalStorage = (key: string, value: any) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(error);
  }
};

/** Initial state hydrated from browser localStorage if available */
const initialState: ElectionState = {
  selectedElectionGroup: safeGetLocalStorage("selected-election-group", null),
  selectedElection: safeGetLocalStorage("selected-election", null),
  isLive: safeGetLocalStorage("is-live", true),
  isLock: safeGetLocalStorage("is-lock", false),
};

/**
 * electionSlice
 * Manages active election and ballot contest context, live vs certified mode,
 * and persists selections locally across browser sessions.
 */
export const electionSlice = createSlice({
  name: "election",
  initialState,
  reducers: {
    /** Sets and persists the active election group */
    setSelectedElectionGroup: (state, action: PayloadAction<any | null>) => {
      state.selectedElectionGroup = action.payload;
      safeSetLocalStorage("selected-election-group", action.payload);
    },
    /** Sets and persists the selected ballot contest */
    setSelectedElection: (state, action: PayloadAction<any | null>) => {
      state.selectedElection = action.payload;
      safeSetLocalStorage("selected-election", action.payload);
    },
    /** Toggles and persists live returns vs certified mode */
    setIsLive: (state, action: PayloadAction<boolean>) => {
      state.isLive = action.payload;
      safeSetLocalStorage("is-live", action.payload);
    },
    /** Updates election lock status */
    setIsLocked: (state, action: PayloadAction<boolean>) => {
      state.isLock = action.payload;
      safeSetLocalStorage("is-lock", action.payload);
    },
  },
});

export const {
  setSelectedElectionGroup,
  setSelectedElection,
  setIsLive,
  setIsLocked,
} = electionSlice.actions;

// Redux RootState Selectors
export const selectSelectedElectionGroup = (state: RootState) =>
  state.election.selectedElectionGroup;
export const selectSelectedElection = (state: RootState) =>
  state.election.selectedElection;
export const selectIsLive = (state: RootState) => state.election.isLive;
export const selectIsLocked = (state: RootState) => state.election.isLock;

export default electionSlice.reducer;

