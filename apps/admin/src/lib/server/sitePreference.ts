import { createServerFn } from "@tanstack/react-start";
import {
  persistSitePreferenceImpl,
  getSitePreferenceCookieImpl,
  fetchRemoteUserPreferencesImpl,
} from "./sitePreference.server";

// Saves site preferences to local cookie and syncs with backend if authenticated
export const saveSitePreference = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    return await persistSitePreferenceImpl({ data });
  });

// Reads site preferences directly from local cookies for instant SSR page loads
export const getSitePreference = createServerFn({ method: "GET" }).handler(
  async () => {
    return await getSitePreferenceCookieImpl();
  },
);

// Fetches latest preferences from backend DB and updates local cookies (used for cross-device sync)
export const fetchRemoteUserPreferences = createServerFn({ method: "GET" }).handler(async () => {
  return await fetchRemoteUserPreferencesImpl();
});
