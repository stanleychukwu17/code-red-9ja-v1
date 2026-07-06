import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction, Middleware } from "@reduxjs/toolkit";
import { saveSitePreference } from "@/lib/server/sitePreference";

export interface VisitorDetails {
  ip: string;
  location?: {
    city?: string;
    country?: string;
    country_code?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
  };
}

export interface SiteState {
  // sideBarState: This is used to determine if the sidebar is collapsed or expanded
  sideBarState: "" | "collapsed" | "expanded";

  //currentSideBarWidth: This is used to store the current width of the sidebar
  currentSideBarWidth: string;

  //visitorDetails: The details of the visitor detected via IP
  visitorDetails?: VisitorDetails | null;
}

const initialState: SiteState = {
  sideBarState: "",
  currentSideBarWidth: "16rem",
  visitorDetails: null,
};

export const siteSlice = createSlice({
  name: "site",
  initialState,
  reducers: {
    updateSiteState: (state, action: PayloadAction<Partial<SiteState>>) => {
      const { sideBarState, currentSideBarWidth, visitorDetails } = action.payload;
      if (sideBarState) state.sideBarState = sideBarState;
      if (currentSideBarWidth) state.currentSideBarWidth = currentSideBarWidth;
      if (visitorDetails !== undefined) state.visitorDetails = visitorDetails;

      return state;
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
