import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction, Middleware } from "@reduxjs/toolkit";
import { saveSitePreference } from "@/lib/server/sitePreference";

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

      return state
    },
  },
});

export const { updateSiteState } = siteSlice.actions;

export const sitePreferenceMiddleware: Middleware = store => next => action => {
  const result = next(action);
  if (updateSiteState.match(action)) {
    const state = store.getState() as { site: SiteState };
    saveSitePreference({ data: state.site }).catch(console.error);
  }
  return result;
};

export default siteSlice.reducer;
