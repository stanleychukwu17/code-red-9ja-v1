import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface SiteState {
  // sideBarState: This is used to determine if the sidebar is collapsed or expanded
  sideBarState: "" | "collapsed" | "expanded";

  visitorDetails: any;
}

const initialState: SiteState = {
  sideBarState: "",
  visitorDetails: null,
};

export const siteSlice = createSlice({
  name: "site",
  initialState,
  reducers: {
    updateSiteState: (state, action: PayloadAction<Partial<SiteState>>) => {
      const { sideBarState, visitorDetails } = action.payload;
      if (sideBarState) state.sideBarState = sideBarState;
      if (visitorDetails !== undefined) state.visitorDetails = visitorDetails;

      // store in local storage
      localStorage.setItem("site", JSON.stringify(state));
      return state
    },
  },
});

export const { updateSiteState } = siteSlice.actions;

export default siteSlice.reducer;
