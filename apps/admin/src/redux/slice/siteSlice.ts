import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface SiteState {
  // sideBarState: This is used to determine if the sidebar is collapsed or expanded
  sideBarState: "" | "collapsed" | "expanded";

  //allowOutletToBeResponsive: This is used to allow the <Outlet /> component in the main __root.tsx
  // to be responsive when the sidebar is collapsed or expanded, if false <Outlet /> will take full width
  allowOutletToBeResponsive: boolean;

  visitorDetails: any | null;
}

const initialState: SiteState = {
  sideBarState: "",
  allowOutletToBeResponsive: true,
  visitorDetails: null,
};

export const siteSlice = createSlice({
  name: "site",
  initialState,
  reducers: {
    updateSiteState: (state, action: PayloadAction<Partial<SiteState>>) => {
      const { sideBarState, allowOutletToBeResponsive, visitorDetails } = action.payload;
      if (sideBarState) state.sideBarState = sideBarState;
      if (allowOutletToBeResponsive !== undefined) state.allowOutletToBeResponsive = allowOutletToBeResponsive;
      if (visitorDetails) state.visitorDetails = visitorDetails;

      // store in local storage
      localStorage.setItem("site", JSON.stringify(state));
      return state
    },
  },
});

export const { updateSiteState } = siteSlice.actions;

export default siteSlice.reducer;
