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

const ICON_CLASS = "size-4! md:size-6!";
const APP_SIDEBAR_ITEMS = [
  {
    id: "home",
    label: "Home",
    icon: <HomeIcon className={ICON_CLASS} />,
    selectedIcon: <HomeSolidIcon className={ICON_CLASS} />,
    href: "/home",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <DashboardIcon className={ICON_CLASS} />,
    selectedIcon: <DashboardIcon className={ICON_CLASS} fill={"black"} stroke="white" />,
    href: "/dashboard",
  },
  {
    id: "feed",
    label: "Feed",
    icon: <FeedIcon className={ICON_CLASS} />,
    selectedIcon: <FeedSolidIcon className={ICON_CLASS} />,
    href: "/feed",
  },
  {
    id: "search",
    label: "Search",
    icon: <SearchIcon className={ICON_CLASS} />,
    selectedIcon: <SearchSolidIcon className={ICON_CLASS} />,
    href: "/search",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: <NotificationIcon className={ICON_CLASS} />,
    selectedIcon: <NotificationSolidIcon className={ICON_CLASS} />,
    href: "/notifications",
  },
  {
    id: "profile",
    label: "Profile",
    icon: <ProfileIcon className={ICON_CLASS} />,
    selectedIcon: <ProfileSolidIcon className={ICON_CLASS} />,
    href: "/profile",
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
