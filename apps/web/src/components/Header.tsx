import { useNavigate } from "@tanstack/react-router";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { updateSiteState } from "@/redux/slice/siteSlice";
import type { SiteState } from "@/redux/slice/siteSlice";
import { updateAuthState } from "@/redux/slice/authSlice";
import type { UserProps } from "@/redux/slice/authSlice";
import { logoutUser } from "#/lib/server/auth/auth";
import { APP_URL } from "#/lib/config";

import { AppSidebarShell as SharedSidebar } from "@repo/ui/components/custom/AppSidebar";

import FeedIcon from "@repo/ui/icons/navbar/feed-icon";
import FeedSolidIcon from "@repo/ui/icons/navbar/feed-solid-icon";
import HomeIcon from "@repo/ui/icons/navbar/home-icon";
import HomeSolidIcon from "@repo/ui/icons/navbar/home-solid-icon";
import NotificationIcon from "@repo/ui/icons/navbar/notification-icon";
import NotificationSolidIcon from "@repo/ui/icons/navbar/notification-solid-icon";
import ProfileIcon from "@repo/ui/icons/navbar/profile-icon";
import ProfileSolidIcon from "@repo/ui/icons/navbar/profile-solid-icon";
import SearchIcon from "@repo/ui/icons/navbar/search-icon";
import SearchSolidIcon from "@repo/ui/icons/navbar/search-solid-icon";
import DashboardIcon from "@repo/ui/icons/navbar/dashboard-icon";
import PartyIcon from "@repo/ui/icons/navbar/party-icon";
import PartySolidIcon from "@repo/ui/icons/navbar/party-solid-icon";
import CubeIcon from "@repo/ui/icons/navbar/cube-icon";
import CubeSolidIcon from "@repo/ui/icons/navbar/cube-solid-icon";
import PollingUnitIcon from "@repo/ui/icons/polling-unit-icon";

const APP_SIDEBAR_ITEMS = [
  {
    id: "home",
    label: "Home",
    icon: <HomeIcon />,
    selectedIcon: <HomeSolidIcon />,
    href: APP_URL.home,
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <DashboardIcon />,
    selectedIcon: <DashboardIcon fill={"black"} stroke="white" />,
    href: APP_URL.dashboard,
  },
  {
    id: "feed",
    label: "Feed",
    icon: <FeedIcon />,
    selectedIcon: <FeedSolidIcon />,
    href: APP_URL.feed,
  },
  {
    id: "search",
    label: "Search",
    icon: <SearchIcon />,
    selectedIcon: <SearchSolidIcon />,
    href: APP_URL.search,
  },
  {
    id: "polling-units",
    label: "Polling Units",
    icon: <PollingUnitIcon />,
    selectedIcon: <PollingUnitIcon />,
    href: APP_URL.pollingUnits,
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: <NotificationIcon />,
    selectedIcon: <NotificationSolidIcon />,
    href: APP_URL.notifications,
  },
  {
    id: "profile",
    label: "Profile",
    icon: <ProfileIcon />,
    selectedIcon: <ProfileSolidIcon />,
    href: APP_URL.profile(),
  },
  {
    id: "party",
    label: "My Party",
    icon: <PartyIcon />,
    selectedIcon: <PartySolidIcon />,
    href: APP_URL.myParty,
  },
  {
    id: "parties",
    label: "All Parties",
    icon: <CubeIcon />,
    selectedIcon: <CubeSolidIcon />,
    href: APP_URL.parties,
  },
];

export function AppSidebarShell({ userDetails, sitePreference }: { userDetails?: UserProps; sitePreference?: Partial<SiteState> }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { user: authUser } = useAppSelector((state) => state.auth);
  const user = authUser || userDetails;

  const isExpanded = sitePreference?.sideBarState !== "collapsed";

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error("Failed to call logoutUser on server:", error);
    }
    dispatch(updateAuthState({ user: null }));
    navigate({ to: APP_URL.dashboard });
  };

  const handleSidebarStateChange = (sideBarState: "expanded" | "collapsed") => {
    dispatch(updateSiteState({ sideBarState }));
  };

  return (
    <SharedSidebar
      defaultOpen={isExpanded}
      userDetails={user}
      items={APP_SIDEBAR_ITEMS}
      onLogout={handleLogout}
      onSidebarStateChange={handleSidebarStateChange}
      homePageUrl={APP_URL.home}
    />
  );
}
