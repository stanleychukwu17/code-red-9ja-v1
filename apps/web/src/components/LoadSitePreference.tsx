import { useEffect } from "react";
import { useDispatch } from "react-redux";
import {
  setCurrentSideBarWidth,
  setSidebarState,
  setAllowOutletToBeResponsive,
} from "@/redux/slice/siteSlice";

export default function LoadSitePreference() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Get the site settings from the local storage
    const siteSettings = localStorage.getItem("site");

    if (!siteSettings) return;
    const parsed = JSON.parse(siteSettings);

    // Dispatch the actions to update the Redux store with the values from the local storage
    dispatch(setSidebarState(parsed.sideBarState));
    dispatch(setCurrentSideBarWidth(parsed.currentSideBarWidth));
    dispatch(setAllowOutletToBeResponsive(parsed.allowOutletToBeResponsive));
  }, []);

  return null;
}