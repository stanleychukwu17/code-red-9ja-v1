/**
 * @file Election Redux Slice
 * @description Manages global election selection state, active election group, current ballot race,
 * contextual geographic drill-down filters (State, District, Federal/State Constituency, LGA, Ward),
 * and live streaming mode toggle.
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store";

export interface ElectionScopeFilter {
  stateId?: number;
  districtId?: number;
  federalConstituencyId?: number;
  stateConstituencyId?: number;
  lgaId?: number;
  wardId?: number;
}

export interface ElectionState {
  selectedElectionGroup: any | null;
  selectedElection: any | null;
  filter: ElectionScopeFilter;
  isLive: boolean;
}

/**
 * Safely reads and parses a JSON value from window.localStorage with fallback
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
 * Safely writes a JSON value to window.localStorage
 */
const safeSetLocalStorage = (key: string, value: any) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(error);
  }
};

const initialState: ElectionState = {
  selectedElectionGroup: safeGetLocalStorage("partyadmin-selected-election-group", null),
  selectedElection: safeGetLocalStorage("partyadmin-selected-election", null),
  filter: {},
  isLive: safeGetLocalStorage("partyadmin-is-live", true),
};

export const electionSlice = createSlice({
  name: "election",
  initialState,
  reducers: {
    setSelectedElectionGroup: (state, action: PayloadAction<any | null>) => {
      state.selectedElectionGroup = action.payload;
      safeSetLocalStorage("partyadmin-selected-election-group", action.payload);
    },
    setSelectedElection: (state, action: PayloadAction<any | null>) => {
      state.selectedElection = action.payload;
      // Reset contextual drill-down filter when switching election contest
      state.filter = {};
      safeSetLocalStorage("partyadmin-selected-election", action.payload);
    },
    setSelectedStateId: (state, action: PayloadAction<number | undefined>) => {
      state.filter.stateId = action.payload;
    },
    setSelectedDistrictId: (state, action: PayloadAction<number | undefined>) => {
      state.filter.districtId = action.payload;
    },
    setSelectedFederalConstituencyId: (state, action: PayloadAction<number | undefined>) => {
      state.filter.federalConstituencyId = action.payload;
    },
    setSelectedStateConstituencyId: (state, action: PayloadAction<number | undefined>) => {
      state.filter.stateConstituencyId = action.payload;
    },
    setSelectedLGAId: (state, action: PayloadAction<number | undefined>) => {
      state.filter.lgaId = action.payload;
    },
    setSelectedWardId: (state, action: PayloadAction<number | undefined>) => {
      state.filter.wardId = action.payload;
    },
    resetElectionFilter: (state) => {
      state.filter = {};
    },
    setIsLive: (state, action: PayloadAction<boolean>) => {
      state.isLive = action.payload;
      safeSetLocalStorage("partyadmin-is-live", action.payload);
    },
  },
});

export const {
  setSelectedElectionGroup,
  setSelectedElection,
  setSelectedStateId,
  setSelectedDistrictId,
  setSelectedFederalConstituencyId,
  setSelectedStateConstituencyId,
  setSelectedLGAId,
  setSelectedWardId,
  resetElectionFilter,
  setIsLive,
} = electionSlice.actions;

// Selectors
export const selectSelectedElectionGroup = (state: RootState) => state.election.selectedElectionGroup;
export const selectSelectedElection = (state: RootState) => state.election.selectedElection;
export const selectIsLive = (state: RootState) => state.election.isLive;
export const selectElectionFilter = (state: RootState) => state.election.filter;

/**
 * Resolves geographic boundary IDs:
 * Prioritizes active contextual filter if specified, otherwise inherits from the active contest's jurisdiction.
 */
export const selectSelectedStateId = (state: RootState) =>
  state.election.filter.stateId ?? state.election.selectedElection?.state_id ?? undefined;

export const selectSelectedDistrictId = (state: RootState) =>
  state.election.filter.districtId ?? state.election.selectedElection?.senatorial_district_id ?? undefined;

export const selectSelectedFederalConstituencyId = (state: RootState) =>
  state.election.filter.federalConstituencyId ?? state.election.selectedElection?.federal_constituency_id ?? undefined;

export const selectSelectedStateConstituencyId = (state: RootState) =>
  state.election.filter.stateConstituencyId ?? state.election.selectedElection?.state_constituency_id ?? undefined;

export const selectSelectedLGAId = (state: RootState) =>
  state.election.filter.lgaId ?? state.election.selectedElection?.lga_id ?? undefined;

export const selectSelectedWardId = (state: RootState) =>
  state.election.filter.wardId ?? state.election.selectedElection?.ward_id ?? undefined;

export default electionSlice.reducer;
