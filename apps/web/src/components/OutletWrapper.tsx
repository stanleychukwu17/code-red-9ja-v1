import React, { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/redux/hooks';
import { setCurrentSideBarWidth } from '@/redux/slice/siteSlice';
import { useIsMobile } from '@repo/ui/hooks/useMobile';

interface OutletWrapperProps {
  children: React.ReactNode;
}

export function OutletWrapper({ children }: OutletWrapperProps) {
  const { sideBarState, allowOutletToBeResponsive } = useAppSelector((state) => state.site);
  const isMobile = useIsMobile();
  const dispatch = useAppDispatch();
  const [sidebarWidth, setSidebarWidth] = useState('16rem');

  // Get sidebar width from DOM
  useEffect(() => {
    const updateSidebarWidth = () => {
      const sidebarWrapper = document.querySelector('#sidebar-wrapper');
      if (sidebarWrapper) {
        const computedStyle = window.getComputedStyle(sidebarWrapper);
        const expandedWidth = computedStyle.getPropertyValue('--sidebar-width');
        const collapsedWidth = computedStyle.getPropertyValue('--sidebar-width-icon');
        const width = sideBarState === 'expanded' ? expandedWidth : collapsedWidth;
        // console.log("Sidebar width:", width);
        const trimmedWidth = width.trim();
        setSidebarWidth(trimmedWidth);
        dispatch(setCurrentSideBarWidth(trimmedWidth));
      }
    };

    updateSidebarWidth();
  },[sideBarState, dispatch])
  
  // Calculate width based on sidebar width from DOM
  const getMainContentStyle = (): React.CSSProperties => {
    if (isMobile || !allowOutletToBeResponsive) {
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
