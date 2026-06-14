import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction, Middleware } from "@reduxjs/toolkit";
import { saveSitePreference } from "@/lib/server/sitePreference";

export interface SiteState {
  // sideBarState: This is used to determine if the sidebar is collapsed or expanded
  sideBarState: "" | "collapsed" | "expanded";

  //currentSideBarWidth: This is used to store the current width of the sidebar
  currentSideBarWidth: string;

  //allowOutletToBeResponsive: This is used to allow the <Outlet /> component in the main __root.tsx
  // to be responsive when the sidebar is collapsed or expanded, if false <Outlet /> will take full width
  allowOutletToBeResponsive: boolean;
}

const initialState: SiteState = {
  sideBarState: "",
  currentSideBarWidth: "16rem",
  allowOutletToBeResponsive: true,
};

export const siteSlice = createSlice({
  name: "site",
  initialState,
  reducers: {
    updateSiteState: (state, action: PayloadAction<Partial<SiteState>>) => {
      const { sideBarState, currentSideBarWidth, allowOutletToBeResponsive } = action.payload;
      if (sideBarState) state.sideBarState = sideBarState;
      if (currentSideBarWidth) state.currentSideBarWidth = currentSideBarWidth;
      if (allowOutletToBeResponsive !== undefined) state.allowOutletToBeResponsive = allowOutletToBeResponsive;

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
