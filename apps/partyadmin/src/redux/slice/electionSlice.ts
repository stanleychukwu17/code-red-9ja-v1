import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store";

export interface ElectionSelections {
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
  selectedCountryId: number | undefined;
  electionScopes: Record<number, ElectionSelections>;
  isLive: boolean;
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
  selectedElectionGroup: safeGetLocalStorage("partyadmin-selected-election-group", null),
  selectedElection: safeGetLocalStorage("partyadmin-selected-election", null),
  selectedCountryId: safeGetLocalStorage("partyadmin-selected-country-id", 161),
  electionScopes: safeGetLocalStorage("partyadmin-election-scopes", {}),
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
      safeSetLocalStorage("partyadmin-selected-election", action.payload);
    },
    setSelectedCountryId: (state, action: PayloadAction<number | undefined>) => {
      state.selectedCountryId = action.payload;
      safeSetLocalStorage("partyadmin-selected-country-id", action.payload);
    },
    setSelectedStateId: (state, action: PayloadAction<number | undefined>) => {
      const electionId = state.selectedElection?.id;
      if (electionId) {
        if (!state.electionScopes[electionId]) state.electionScopes[electionId] = {};
        state.electionScopes[electionId].stateId = action.payload;
        safeSetLocalStorage("partyadmin-election-scopes", state.electionScopes);
      }
    },
    setSelectedDistrictId: (state, action: PayloadAction<number | undefined>) => {
      const electionId = state.selectedElection?.id;
      if (electionId) {
        if (!state.electionScopes[electionId]) state.electionScopes[electionId] = {};
        state.electionScopes[electionId].districtId = action.payload;
        safeSetLocalStorage("partyadmin-election-scopes", state.electionScopes);
      }
    },
    setSelectedFederalConstituencyId: (state, action: PayloadAction<number | undefined>) => {
      const electionId = state.selectedElection?.id;
      if (electionId) {
        if (!state.electionScopes[electionId]) state.electionScopes[electionId] = {};
        state.electionScopes[electionId].federalConstituencyId = action.payload;
        safeSetLocalStorage("partyadmin-election-scopes", state.electionScopes);
      }
    },
    setSelectedStateConstituencyId: (state, action: PayloadAction<number | undefined>) => {
      const electionId = state.selectedElection?.id;
      if (electionId) {
        if (!state.electionScopes[electionId]) state.electionScopes[electionId] = {};
        state.electionScopes[electionId].stateConstituencyId = action.payload;
        safeSetLocalStorage("partyadmin-election-scopes", state.electionScopes);
      }
    },
    setSelectedLGAId: (state, action: PayloadAction<number | undefined>) => {
      const electionId = state.selectedElection?.id;
      if (electionId) {
        if (!state.electionScopes[electionId]) state.electionScopes[electionId] = {};
        state.electionScopes[electionId].lgaId = action.payload;
        safeSetLocalStorage("partyadmin-election-scopes", state.electionScopes);
      }
    },
    setSelectedWardId: (state, action: PayloadAction<number | undefined>) => {
      const electionId = state.selectedElection?.id;
      if (electionId) {
        if (!state.electionScopes[electionId]) state.electionScopes[electionId] = {};
        state.electionScopes[electionId].wardId = action.payload;
        safeSetLocalStorage("partyadmin-election-scopes", state.electionScopes);
      }
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
  setSelectedCountryId,
  setSelectedStateId,
  setSelectedDistrictId,
  setSelectedFederalConstituencyId,
  setSelectedStateConstituencyId,
  setSelectedLGAId,
  setSelectedWardId,
  setIsLive,
} = electionSlice.actions;

// Selectors
export const selectSelectedElectionGroup = (state: RootState) => state.election.selectedElectionGroup;
export const selectSelectedElection = (state: RootState) => state.election.selectedElection;
export const selectSelectedCountryId = (state: RootState) => state.election.selectedCountryId;
export const selectIsLive = (state: RootState) => state.election.isLive;

export const selectCurrentSelections = (state: RootState) => {
  const electionId = state.election.selectedElection?.id;
  return electionId ? state.election.electionScopes[electionId] || {} : {};
};

export const selectSelectedStateId = (state: RootState) => selectCurrentSelections(state).stateId;
export const selectSelectedDistrictId = (state: RootState) => selectCurrentSelections(state).districtId;
export const selectSelectedFederalConstituencyId = (state: RootState) => selectCurrentSelections(state).federalConstituencyId;
export const selectSelectedStateConstituencyId = (state: RootState) => selectCurrentSelections(state).stateConstituencyId;
export const selectSelectedLGAId = (state: RootState) => selectCurrentSelections(state).lgaId;
export const selectSelectedWardId = (state: RootState) => selectCurrentSelections(state).wardId;

export default electionSlice.reducer;
