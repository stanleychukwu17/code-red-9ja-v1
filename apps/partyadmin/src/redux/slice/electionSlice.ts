/**
 * @file Election Redux Slice
 * @description Manages global election selection state, active election group, current ballot race,
 * and live streaming mode toggle in application memory.
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store";

export type ElectionState = {
  selectedElectionGroup: any | null;
  selectedElection: any | null;
  isLive: boolean;
};

const initialState: ElectionState = {
  selectedElectionGroup: null,
  selectedElection: null,
  isLive: true,
};

export const electionSlice = createSlice({
  name: "election",
  initialState,
  reducers: {
    setSelectedElectionGroup: (state, action: PayloadAction<any | null>) => {
      state.selectedElectionGroup = action.payload;
    },
    setSelectedElection: (state, action: PayloadAction<any | null>) => {
      state.selectedElection = action.payload;
    },
    setIsLive: (state, action: PayloadAction<boolean>) => {
      state.isLive = action.payload;
    },
  },
});

export const {
  setSelectedElectionGroup,
  setSelectedElection,
  setIsLive,
} = electionSlice.actions;

// Selectors
export const selectSelectedElectionGroup = (state: RootState) => state.election.selectedElectionGroup;
export const selectSelectedElection = (state: RootState) => state.election.selectedElection;
export const selectIsLive = (state: RootState) => state.election.isLive;

export default electionSlice.reducer;
