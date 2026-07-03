import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
  const [mounted, setMounted] = useState(false);
  const [mainContentStyle, setMainContentStyle] = useState<React.CSSProperties | undefined>(undefined);
  const hideSideBar = listToHide.some(path => location.pathname.startsWith(path));

  const isReduxSynced = reduxSiteState.sideBarState !== "";
  const sideBarState = isReduxSynced ? reduxSiteState.sideBarState : (sitePreference?.sideBarState || "expanded");
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
  useEffect(() => {
    setMounted(true);
    if (isMobile || hideSideBar) {
      setMainContentStyle(undefined);
    } else {
      setMainContentStyle({
        width: `calc(100vw - ${sidebarWidth})`,
        marginLeft: `${sidebarWidth}`,
        transition: 'width 0.2s ease-in-out, margin-left 0.2s ease-in-out',
      });
    }
  }, [isMobile, hideSideBar, sidebarWidth]);

  return (
    <motion.div
      className="flex-1 relative max-sm:mt-12"
      style={mainContentStyle}
      initial={{ opacity: 0 }}
      animate={{ opacity: mounted ? 1 : 0 }}
      transition={{ delay: .3, duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
}
