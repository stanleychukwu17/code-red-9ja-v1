import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "#/redux/hooks";
import { refreshUserToken } from "#/lib/server/auth/auth";
import { updateAuthState } from "#/redux/slice/authSlice";
import { hydrateSiteState, normalizeSitePreference } from "#/redux/slice/siteSlice";
import { fetchRemoteUserPreferences } from "#/lib/server/sitePreference";
import { applyThemeMode } from "@repo/ui/hooks/use-theme";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/config";

// This component is used to restore the auth session on page refresh,
// It will automatically refresh the accessToken and refreshToken every 14 minutes
// and clear the auth data if the refreshToken is invalid or missing
export default function LoadAuthSession() {
  const dispatch = useAppDispatch();
  const siteState = useAppSelector((state) => state.site);
  const siteStateRef = useRef(siteState);
  siteStateRef.current = siteState;

  // Periodically refresh JWT tokens (every 14 mins) and fetch current user profile
  const { data: response, error } = useQuery({
    queryKey: QUERY_KEYS.auth.session,
    queryFn: refreshUserToken,
    refetchInterval: 14 * 60 * 1000, // 14minutes interval since the jwt token expire in 15mins
    refetchOnWindowFocus: false,
  });

  // Hydrate auth state and synchronize remote preferences if version mismatch detected
  useEffect(() => {
    dispatch(updateAuthState({ userHydrated: true }));
    if (response?.success && response.user) {
      const user = response.user;
      const currentSiteState = siteStateRef.current;

      // Update auth state with user data
      dispatch(updateAuthState({ user }));

      // If site preferences returned directly in session refresh response
      if (response.sitePreference) {
        const formattedPref = normalizeSitePreference(response.sitePreference);

        // Only overwrite client theme if siteState is not yet hydrated OR if remote version changed
        const remoteVersion = formattedPref.version ?? user.preference_version;
        const isVersionMismatch =
          remoteVersion !== undefined &&
          String(remoteVersion) !== String(currentSiteState?.version);

        if (!currentSiteState?.isHydrated || isVersionMismatch) {
          if (formattedPref.theme) {
            applyThemeMode(formattedPref.theme);
            window.localStorage.setItem("theme", formattedPref.theme);
          }
        }

        // Hydrate state immediately since preferences are returned directly
        dispatch(hydrateSiteState(formattedPref));
      } else {
        // Multi-device sync: If user preferences were updated on another device/tab or uninitialized, pull latest version
        const remoteVersion = user.preference_version;
        const isUninitialized = !currentSiteState?.sideBarState;
        const isVersionMismatch =
          remoteVersion !== undefined &&
          String(remoteVersion) !== String(currentSiteState?.version);

        // Fetch remote preferences if uninitialized or version mismatch
        if (isUninitialized || isVersionMismatch) {
          fetchRemoteUserPreferences()
            .then((remotePref) => {
              if (remotePref) {
                // Apply new theme immediately if updated remotely
                if (remotePref.theme) {
                  applyThemeMode(remotePref.theme);
                  window.localStorage.setItem("theme", remotePref.theme);
                }

                // Hydrate state with remote preferences
                dispatch(hydrateSiteState(remotePref));
              }
            })
            .catch(console.error);
        }
      }
    } else if (error || (response && !response.success)) {
      // Clear authenticated state on invalid session or token refresh error
      dispatch(updateAuthState({ user: null }));
    }
  }, [response, error, dispatch]);

  return null;
}
