import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import {
  AppSidebarShell,
  type AppSidebarItem,
} from "@repo/ui/components/custom/AppSidebar";
import HomeIcon from "@repo/ui/icons/navbar/home-icon";
import HomeSolidIcon from "@repo/ui/icons/navbar/home-solid-icon";
import CubeIcon from "@repo/ui/icons/navbar/cube-icon";
import CubeSolidIcon from "@repo/ui/icons/navbar/cube-solid-icon";
import PartyIcon from "@repo/ui/icons/navbar/party-icon";
import PartySolidIcon from "@repo/ui/icons/navbar/party-solid-icon";
import NotificationIcon from "@repo/ui/icons/navbar/notification-icon";
import NotificationSolidIcon from "@repo/ui/icons/navbar/notification-solid-icon";
import CalendarIcon from "@repo/ui/icons/navbar/calendar-icon";
import CalendarSolidIcon from "@repo/ui/icons/navbar/calendar-solid-icon";
import UserIcon from "@repo/ui/icons/navbar/user-icon";
import UserSolidIcon from "@repo/ui/icons/navbar/user-solid-icon";
import PaperIcon from "@repo/ui/icons/navbar/paper-icon";
import PaperSolidIcon from "@repo/ui/icons/navbar/paper-solid-icon";

import { useAppDispatch } from "@/redux/hooks";
import { updateSiteState } from "@/redux/slice/siteSlice";
import { updateAuthState } from "@/redux/slice/authSlice";
import {
  logoutUser,
  checkIfRefreshTokenInCookie,
  refreshUserToken,
} from "#/lib/server/auth/auth";
import { APP_URL } from "#/lib/config";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const res = await refreshUserToken();
    if (res.status !== "success") {
      throw redirect({ to: "/auth/login" });
    }
  },
  component: AuthenticatedRoutes,
  errorComponent: ({ error }) => <div>{error.message}</div>,
});

const APP_SIDEBAR_ITEMS: AppSidebarItem[] = [
  {
    id: "home",
    label: "Home",
    icon: <HomeIcon className="shrink-0 size-6" />,
    selectedIcon: <HomeSolidIcon className="shrink-0 size-6 text-c-90" />,
    href: "/home",
  },
  {
    id: "elections",
    label: "Elections",
    icon: <CubeIcon className="shrink-0 size-6" />,
    selectedIcon: <CubeSolidIcon className="shrink-0 size-6 text-c-90" />,
    href: "/elections",
  },
  {
    id: "bodies",
    label: "Bodies",
    icon: <CalendarIcon className="shrink-0 size-6" />,
    selectedIcon: <CalendarSolidIcon className="shrink-0 size-6 text-c-90" />,
    href: "/bodies/states",
  },
  {
    id: "users",
    label: "Users",
    icon: <UserIcon className="shrink-0 size-6" />,
    selectedIcon: <UserSolidIcon className="shrink-0 size-6 text-c-90" />,
    href: "/users/admin",
  },
  {
    id: "parties",
    label: "Parties",
    icon: <PartyIcon className="shrink-0 size-6" />,
    selectedIcon: <PartySolidIcon className="shrink-0 size-6 text-c-90" />,
    href: "/parties",
  },
  {
    id: "applications",
    label: "Applications",
    icon: <PaperIcon className="shrink-0 size-6" />,
    selectedIcon: <PaperSolidIcon className="shrink-0 size-6 text-c-90" />,
    href: "/applications",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: <NotificationIcon className="shrink-0 size-6" />,
    selectedIcon: (
      <NotificationSolidIcon className="shrink-0 size-6 text-c-90" />
    ),
    href: "/notifications",
  },
];

function AuthenticatedRoutes() {
  const { userDetails } = Route.useRouteContext();
  const dispatch = useAppDispatch();

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.error(e);
    }
    dispatch(updateAuthState({ user: null }));
  };

  const handleSidebarStateChange = (sideBarState: "expanded" | "collapsed") => {
    dispatch(updateSiteState({ sideBarState }));
  };

  return (
    <div className="flex">
      <AppSidebarShell
        userDetails={userDetails}
        items={APP_SIDEBAR_ITEMS}
        onLogout={handleLogout}
        onSidebarStateChange={handleSidebarStateChange}
        homePageUrl={APP_URL.homePage}
      />
      <Outlet />
    </div>
  );
}
