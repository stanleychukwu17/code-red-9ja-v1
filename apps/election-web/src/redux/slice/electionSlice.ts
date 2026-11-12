import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store";

/** Global election state managing active selection. */
export type ElectionState = {
  selectedElectionGroup: any | null; // The parent election group (e.g. 2027 Nigerian General Election)
  selectedElection: any | null; // The specific contest or ballot race (e.g. Presidential, Gubernatorial)
};

const initialState: ElectionState = {
  selectedElectionGroup: null,
  selectedElection: null,
};

/** Manages active election and ballot contest context in memory. */
export const electionSlice = createSlice({
  name: "election",
  initialState,
  reducers: {
    // Sets the active election group
    setSelectedElectionGroup: (state, action: PayloadAction<any | null>) => {
      state.selectedElectionGroup = action.payload;
    },

    // Sets the selected ballot contest
    setSelectedElection: (state, action: PayloadAction<any | null>) => {
      state.selectedElection = action.payload;
    },
  },
});

export const { setSelectedElectionGroup, setSelectedElection } = electionSlice.actions;

// Redux RootState Selectors
export const selectSelectedElectionGroup = (state: RootState) => state.election.selectedElectionGroup;
export const selectSelectedElection = (state: RootState) => state.election.selectedElection;

export default electionSlice.reducer;

