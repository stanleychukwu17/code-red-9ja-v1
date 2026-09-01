import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction, Middleware } from "@reduxjs/toolkit";
import { saveSitePreference } from "@/lib/server/sitePreference";

export type VisitorDetails = {
  ip: string;
  location?: {
    city?: string;
    country?: string;
    country_code?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
  };
};

export type SiteState = {
  isHydrated?: boolean; // Indicates if initial preferences have been loaded into the client store
  sideBarState: "" | "collapsed" | "expanded"; // Determines if the sidebar is collapsed or expanded
  theme?: "light" | "dark" | "auto" | ""; // Current user interface theme preference
  version?: number | string; // bigint/fake_id tracking user preference revisions for multi-device sync
  visitorDetails?: VisitorDetails | null; // The details of the visitor detected via IP
  pinnedLinks?: Record<string, string[]>; // Map of app key (e.g. web, election, partyadmin, admin) to array of pinned item ids
};

export type BackendUserSitePreferences = {
  sidebar_state?: "expanded" | "collapsed" | string;
  pinned_links?: Record<string, string[]>;
  theme?: "light" | "dark" | "auto" | "";
  preference_version?: number | string;
};

// Normalizes backend API responses (snake_case) or partial cookie data into strongly-typed SiteState
export function normalizeSitePreference(
  pref?: BackendUserSitePreferences | Partial<SiteState> | Record<string, any> | null
): Partial<SiteState> {
  if (!pref || typeof pref !== "object") return {};

  const p = pref as Record<string, any>;
  const sideBarState = p.sidebar_state || p.sideBarState || undefined;
  const pinnedLinks = p.pinned_links ?? p.pinnedLinks ?? undefined;
  const theme = p.theme || undefined;
  const version = p.preference_version ?? p.version ?? undefined;

  const result: Partial<SiteState> = {};
  if (sideBarState) {
    result.sideBarState = sideBarState as "collapsed" | "expanded";
  }
  if (pinnedLinks !== undefined && typeof pinnedLinks === "object") {
    result.pinnedLinks = Array.isArray(pinnedLinks)
      ? { admin: pinnedLinks }
      : (pinnedLinks as Record<string, string[]>);
  }
  if (theme) {
    result.theme = theme as "light" | "dark" | "auto";
  }
  if (version !== undefined) {
    result.version = version;
  }

  return result;
}

// Initial default site configuration and preferences
const initialState: SiteState = {
  isHydrated: false,
  sideBarState: "",
  theme: "auto",
  version: 0,
  visitorDetails: null,
  pinnedLinks: undefined,
};

export const siteSlice = createSlice({
  name: "site",
  initialState,
  reducers: {
    // Partially updates site state fields from user actions (triggers persistence middleware)
    updateSiteState: (state, action: PayloadAction<Partial<SiteState>>) => {
      const { sideBarState, theme, version, visitorDetails, pinnedLinks } = action.payload;
      if (sideBarState) state.sideBarState = sideBarState;
      if (theme) state.theme = theme;
      if (version !== undefined) state.version = version;
      if (visitorDetails !== undefined) state.visitorDetails = visitorDetails;
      if (pinnedLinks !== undefined) {
        state.pinnedLinks = {
          ...(state.pinnedLinks || {}),
          ...pinnedLinks,
        };
      }
    },

    // Hydrates site state from cookies / remote backend without triggering save middleware
    hydrateSiteState: (state, action: PayloadAction<Partial<SiteState>>) => {
      const { sideBarState, theme, version, visitorDetails, pinnedLinks } = action.payload;
      if (!state.isHydrated) {
        if (sideBarState) state.sideBarState = sideBarState;
        if (theme) state.theme = theme;
        if (version !== undefined) state.version = version;
        if (visitorDetails !== undefined) state.visitorDetails = visitorDetails;
        if (pinnedLinks !== undefined) {
          state.pinnedLinks = {
            ...(state.pinnedLinks || {}),
            ...pinnedLinks,
          };
        }
        state.isHydrated = true;
      } else {
        // Once hydrated, only update version/visitor details or merge remote pinned links
        if (version !== undefined) state.version = version;
        if (visitorDetails !== undefined) state.visitorDetails = visitorDetails;
        if (pinnedLinks !== undefined) {
          state.pinnedLinks = {
            ...(state.pinnedLinks || {}),
            ...pinnedLinks,
          };
        }
      }
    },
  },
});

export const { updateSiteState, hydrateSiteState } = siteSlice.actions;

// Debounce timer reference to avoid excessive backend/cookie writes when user toggles preferences quickly
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Automatically persists updated site preferences to cookies/server ONLY when user action updateSiteState is dispatched
export const sitePreferenceMiddleware: Middleware = store => next => action => {
  const result = next(action);
  // Only persist when explicit user interaction triggers updateSiteState (never on hydrateSiteState)
  if (updateSiteState.match(action)) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Theme changes can cause flicker, so we use a debounce time (600ms) to batch rapid updates
    debounceTimer = setTimeout(async () => {
      const state = store.getState() as { site: SiteState };
      try {
        const res = await saveSitePreference({ data: state.site });
        if (res?.data?.version && res.data.version !== state.site.version) {
          // Hydrate version into Redux without triggering another save loop
          store.dispatch(hydrateSiteState({ version: res.data.version }));
        }
      } catch (err) {
        console.error("Failed to save site preference:", err);
      }
    }, 600);
  }
  return result;
};

export default siteSlice.reducer;
