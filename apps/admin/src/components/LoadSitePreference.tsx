import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { updateSiteState } from "@/redux/slice/siteSlice";
import type { SiteState } from "@/redux/slice/siteSlice";

export default function LoadSitePreference({ sitePreference }: { sitePreference?: Partial<SiteState> }) {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!sitePreference || Object.keys(sitePreference).length === 0) return;

    // Dispatch the actions to update the Redux store with the values from the props
    dispatch(updateSiteState(sitePreference));
  }, [sitePreference, dispatch]);

  return null;
}