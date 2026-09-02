import { createServerOnlyFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { apiFetch } from "./fetch";
import { API_URL } from "@/lib/config";
import { normalizeSitePreference } from "#/redux/slice/siteSlice";

// Helper function to format and write the site preference cookie
export const setSitePreferenceCookie = (pref: any) => {
  if (!pref) return null;

  // Normalize preference data and apply safe defaults
  const toSave = {
    sideBarState: "expanded",
    pinnedLinks: {},
    theme: "auto",
    version: 0,
    ...normalizeSitePreference(pref),
  };

  const stringifiedDetails = JSON.stringify(toSave);

  // Persist preference cookie for 1 year (available for instant SSR reads)
  setCookie("site_preference", stringifiedDetails, {
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 365 * 24 * 60 * 60, // 1 year
  });

  return toSave;
};

// Persists site preferences to backend PostgreSQL database (if authenticated) and updates local cookie
export const persistSitePreferenceImpl = createServerOnlyFn(
  async ({ data }: { data: any }) => {
    let updatedVersion = data.version;

    // 1. Check if user is authenticated via cookies
    const accessToken = getCookie("access_token");
    const refreshToken = getCookie("refresh_token");

    if (accessToken || refreshToken) {
      try {
        const payload = {
          sidebar_state: data.sideBarState || undefined,
          pinned_links: data.pinnedLinks || undefined,
          theme: data.theme || undefined,
        };

        // Persist preferences to PostgreSQL DB
        const response = await apiFetch(API_URL.userPreferences, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const res = await response.json();

        // Capture newly incremented revision version from backend
        if (res?.data?.preference_version) {
          updatedVersion = res.data.preference_version;
        }
      } catch (err) {
        console.error("Failed to sync site preferences with backend:", err);
      }
    }

    // 2. Save in cookie using helper for instant SSR page loads
    setSitePreferenceCookie({
      ...data,
      version: updatedVersion,
    });

    // 3. Return success response with updated version
    return { success: true, data: { version: updatedVersion } };
  },
);

// Reads site preference directly from local cookie for instant SSR availability
export const getSitePreferenceCookieImpl = createServerOnlyFn(async () => {
  const siteCookie = getCookie("site_preference");
  if (siteCookie) {
    try {
      return JSON.parse(siteCookie);
    } catch {
      return null;
    }
  }
  return null;
});

// Fetches latest preferences from backend DB and updates local cookie (used for cross-device sync)
export const fetchRemoteUserPreferencesImpl = createServerOnlyFn(async () => {
  // 1. Verify user is authenticated
  const accessToken = getCookie("access_token");
  const refreshToken = getCookie("refresh_token");

  if (!accessToken && !refreshToken) {
    return null;
  }

  try {
    // 2. Fetch fresh user preferences from backend PostgreSQL DB
    const response = await apiFetch(API_URL.userPreferences, {
      method: "GET",
    });

    const res = await response.json();

    if (res?.data) {
      // 3. Read current cookie and normalize backend preferences
      const currentCookie = await getSitePreferenceCookieImpl();
      const normalizedBackend = normalizeSitePreference(res.data);

      // 4. Merge state (remote DB preferences take precedence)
      const mergedPref = {
        sideBarState: "expanded",
        theme: "auto",
        version: 0,
        ...currentCookie,
        ...normalizedBackend,
        pinnedLinks: {
          ...(currentCookie?.pinnedLinks || {}),
          ...(normalizedBackend?.pinnedLinks || {}),
        },
      };

      // 5. Update local cookie with synced preferences
      setSitePreferenceCookie(mergedPref);

      return mergedPref;
    }
  } catch (err) {
    console.warn("Failed to fetch remote user preferences:", err);
  }

  return null;
});
