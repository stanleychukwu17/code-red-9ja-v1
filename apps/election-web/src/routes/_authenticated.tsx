import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import {
  AppSidebarShell,
  type AppSidebarItem,
} from "@repo/ui/components/custom/AppSidebar";
import HomeIcon from "@repo/ui/icons/navbar/home-icon";
import HomeSolidIcon from "@repo/ui/icons/navbar/home-solid-icon";
import NotificationIcon from "@repo/ui/icons/navbar/notification-icon";
import NotificationSolidIcon from "@repo/ui/icons/navbar/notification-solid-icon";
import PaperIcon from "@repo/ui/icons/navbar/paper-icon";
import PaperSolidIcon from "@repo/ui/icons/navbar/paper-solid-icon";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { updateSiteState } from "@/redux/slice/siteSlice";
import { updateAuthState } from "@/redux/slice/authSlice";
import {
  logoutUser,
  checkIfRefreshTokenInCookie,
  getUserDetailsCookie,
} from "#/lib/server/auth/auth";
import { APP_URL } from "#/lib/config";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const res = await checkIfRefreshTokenInCookie();
    const user = await getUserDetailsCookie();

    if (res.status != "success" || user?.role != "admin") {
      throw redirect({ to: APP_URL.auth.login });
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
  const { userDetails, sitePreference: initialSitePreference } = Route.useRouteContext();
  const dispatch = useAppDispatch();
  const reduxSitePreference = useAppSelector((state) => state.site);

  // Use Redux state if populated, fallback to route context sitePreference (server loaded)
  const currentSitePreference = reduxSitePreference?.sideBarState ? reduxSitePreference : initialSitePreference;
  const isExpanded = currentSitePreference?.sideBarState !== "collapsed";

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
        defaultOpen={isExpanded}
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
