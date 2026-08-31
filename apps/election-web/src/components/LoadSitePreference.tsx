import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { hydrateSiteState } from "@/redux/slice/siteSlice";
import type { SiteState } from "@/redux/slice/siteSlice";
import { applyThemeMode } from "@repo/ui/hooks/use-theme";

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

  return null;
}
