import React, { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/redux/hooks";
import { updateSiteState } from "@/redux/slice/siteSlice";
import { useIsMobile } from "@repo/ui/hooks/useMobile";
import { useLocation } from "@tanstack/react-router";

interface OutletWrapperProps {
  children: React.ReactNode;
}

const listToHide = ["/auth/*", "/auth"];

export function OutletWrapper({ children }: OutletWrapperProps) {
  const location = useLocation();
  const hideSideBar = listToHide.some((path) =>
    location.pathname.startsWith(path),
  );
  const { sideBarState, allowOutletToBeResponsive } = useAppSelector(
    (state) => state.site,
  );
  const isMobile = useIsMobile();
  const dispatch = useAppDispatch();
  const [sidebarWidth, setSidebarWidth] = useState("16rem");

  // Get sidebar width from DOM
  useEffect(() => {
    const updateSidebarWidth = () => {
      const sidebarWrapper = document.querySelector("#sidebar-wrapper");
      if (sidebarWrapper) {
        const computedStyle = window.getComputedStyle(sidebarWrapper);
        const expandedWidth = computedStyle.getPropertyValue("--sidebar-width");
        const collapsedWidth = computedStyle.getPropertyValue(
          "--sidebar-width-icon",
        );
        const width =
          sideBarState === "expanded" ? expandedWidth : collapsedWidth;
        // console.log("Sidebar width:", width

        const trimmedWidth = width.trim();
        setSidebarWidth(trimmedWidth);
        dispatch(updateSiteState({ currentSideBarWidth: trimmedWidth }));
      }
    };

    updateSidebarWidth();
  }, [sideBarState, dispatch]);

  return <div className="flex-1">{children}</div>;
}
