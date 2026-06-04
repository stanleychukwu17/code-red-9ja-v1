import React, { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/redux/hooks';
import { updateSiteState, type SiteState } from '@/redux/slice/siteSlice';
import { useIsMobile } from '@repo/ui/hooks/useMobile';
import { useLocation } from '@tanstack/react-router';

interface OutletWrapperProps {
  children: React.ReactNode;
  sitePreference?: SiteState | null;
}

const listToHide = ['/auth/*', '/auth'];

export function OutletWrapper({ children, sitePreference }: OutletWrapperProps) {
  const dispatch = useAppDispatch();
  const reduxSiteState = useAppSelector((state) => state.site);
  const location = useLocation();
  const isMobile = useIsMobile();
  const hideSideBar = listToHide.some(path => location.pathname.startsWith(path));

  const isReduxSynced = reduxSiteState.sideBarState !== "";
  const sideBarState = isReduxSynced ? reduxSiteState.sideBarState : (sitePreference?.sideBarState || "expanded");
  const allowOutletToBeResponsive = isReduxSynced ? reduxSiteState.allowOutletToBeResponsive : (sitePreference?.allowOutletToBeResponsive ?? true);
  const [sidebarWidth, setSidebarWidth] = useState(sitePreference?.currentSideBarWidth || "16rem");

  // Get sidebar width from DOM
  useEffect(() => {
    const updateSidebarWidth = () => {
      const sidebarWrapper = document.querySelector('#sidebar-wrapper');
      if (sidebarWrapper) {
        const computedStyle = window.getComputedStyle(sidebarWrapper);
        const expandedWidth = computedStyle.getPropertyValue('--sidebar-width');
        const collapsedWidth = computedStyle.getPropertyValue('--sidebar-width-icon');
        const width = sideBarState === 'expanded' ? expandedWidth : collapsedWidth;

        const trimmedWidth = width.trim();
        setSidebarWidth(trimmedWidth);
        dispatch(updateSiteState({ currentSideBarWidth: trimmedWidth }));
      }
    };

    updateSidebarWidth();
  }, [sideBarState, dispatch])

  // Calculate width based on sidebar width from DOM
  const getMainContentStyle = (): React.CSSProperties => {
    if (isMobile || !allowOutletToBeResponsive || hideSideBar) {
      return {
        width: '100vw',
        marginLeft: '0',
        transition: 'width 0.2s ease-in-out, margin-left 0.2s ease-in-out',
      };
    }

    return {
      width: `calc(100vw - ${sidebarWidth})`,
      marginLeft: `${sidebarWidth}`,
      transition: 'width 0.2s ease-in-out, margin-left 0.2s ease-in-out',
    };
  };

  return (
    <div style={getMainContentStyle()} className="flex-1">
      {children}
    </div>
  );
}
