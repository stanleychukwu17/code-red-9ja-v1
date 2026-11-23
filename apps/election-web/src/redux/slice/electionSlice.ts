import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store";

/** Global election state managing active selection. */
export type ElectionState = {
  selectedElectionGroup: any | null; // The parent election group (e.g. 2027 Nigerian General Election)
};

const initialState: ElectionState = {
  selectedElectionGroup: null,
};

/** Manages active election group context in memory. */
export const electionSlice = createSlice({
  name: "election",
  initialState,
  reducers: {
    // Sets the active election group
    setSelectedElectionGroup: (state, action: PayloadAction<any | null>) => {
      state.selectedElectionGroup = action.payload;
    },
  },
});

export const { setSelectedElectionGroup } = electionSlice.actions;

// Redux RootState Selectors
export const selectSelectedElectionGroup = (state: RootState) => state.election.selectedElectionGroup;

export default electionSlice.reducer;