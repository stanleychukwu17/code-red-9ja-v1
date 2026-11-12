/**
 * @file Site Preference Loader Component
 * @description Headless component that hydrates the user's initial UI preferences (theme, sidebar mode)
 * from server-rendered cookies or backend data into the client Redux store without firing redundant save requests.
 * Also listens for client theme switch custom events to keep Redux and local storage in sync.
 */

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { hydrateSiteState, updateSiteState } from "@/redux/slice/siteSlice";
import type { SiteState } from "@/redux/slice/siteSlice";
import { applyThemeMode, type ThemeMode, ThemeModes } from "@repo/ui/hooks/use-theme";

/**
 * LoadSitePreference Component
 * Hydrates server preferences into Redux and listens for runtime theme events.
 */
export default function LoadSitePreference({ sitePreference }: { sitePreference?: Partial<SiteState> }) {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!sitePreference || Object.keys(sitePreference).length === 0) return;

    // Apply and sync theme if present in server/cookie preference
    if (sitePreference.theme) {
      applyThemeMode(sitePreference.theme);
      window.localStorage.setItem("theme", sitePreference.theme);
    }

    // Hydrate the Redux store with initial values from props (without triggering save)
    dispatch(hydrateSiteState(sitePreference));
  }, [sitePreference, dispatch]);

  // Listen for client-side theme changes and dispatch updateSiteState to persist to Redux, server, and cookies
  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ theme?: ThemeMode }> | undefined;
      const newTheme =
        customEvent?.detail?.theme ||
        (window.localStorage.getItem("theme") as ThemeMode) ||
        "auto";
      if (ThemeModes.includes(newTheme)) {
        dispatch(updateSiteState({ theme: newTheme }));
      }
    };

    window.addEventListener("theme-change", handleThemeChange);
    return () => {
      window.removeEventListener("theme-change", handleThemeChange);
    };
  }, [dispatch]);

  return null;
}
