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

    // console.log(user)

    if (res.status != "success") {
      throw redirect({ to: APP_URL.auth.login });
    }

    if (
      !user?.roles?.includes("admin") &&
      !user?.roles?.includes("super_admin")
    ) {
      throw new Error("You do not have access to this platform.");
    }
  },
  component: AuthenticatedRoutes,
  errorComponent: ({ error }) => (
    <div className="text-destructive">{error.message}</div>
  ),
});

const ICON_CLASS = "shrink-0 size-6";
const SELECTED_ICON_CLASS = `${ICON_CLASS} text-c-90`;
const APP_SIDEBAR_ITEMS: AppSidebarItem[] = [
  {
    id: "home",
    label: "Home",
    icon: <HomeIcon className={ICON_CLASS} />,
    selectedIcon: <HomeSolidIcon className={SELECTED_ICON_CLASS} />,
    href: APP_URL.home,
  },
  {
    id: "elections",
    label: "Elections",
    icon: <CubeIcon className={ICON_CLASS} />,
    selectedIcon: <CubeSolidIcon className={SELECTED_ICON_CLASS} />,
    href: APP_URL.elections,
  },
  {
    id: "bodies",
    label: "Bodies",
    icon: <CalendarIcon className={ICON_CLASS} />,
    selectedIcon: <CalendarSolidIcon className={SELECTED_ICON_CLASS} />,
    href: APP_URL.bodies,
  },
  {
    id: "users",
    label: "Users",
    icon: <UserIcon className={ICON_CLASS} />,
    selectedIcon: <UserSolidIcon className={SELECTED_ICON_CLASS} />,
    href: APP_URL.users.admins,
  },
  {
    id: "parties",
    label: "Parties",
    icon: <PartyIcon className={ICON_CLASS} />,
    selectedIcon: <PartySolidIcon className={SELECTED_ICON_CLASS} />,
    href: APP_URL.parties,
  },
  {
    id: "applications",
    label: "Applications",
    icon: <PaperIcon className={ICON_CLASS} />,
    selectedIcon: <PaperSolidIcon className={SELECTED_ICON_CLASS} />,
    href: APP_URL.applications,
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: <NotificationIcon className={ICON_CLASS} />,
    selectedIcon: <NotificationSolidIcon className={SELECTED_ICON_CLASS} />,
    href: APP_URL.notifications,
  },
];

function AuthenticatedRoutes() {
  const { userDetails } = Route.useRouteContext();
  const dispatch = useAppDispatch();
  const sitePreference = useAppSelector((state) => state.site);
  const isExpanded = sitePreference?.sideBarState !== "collapsed";

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {}
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

      {/* 2. A flex column container for the rest of the page */}
      <div className="flex flex-col flex-1 w-full min-w-0 h-full">
        {/* Main content expands to push footer down */}
        <main className="flex-1 min-h-svh">
          <Outlet />
        </main>
        {/* Footer stays at the bottom */}
        <footer className="p-4 border-t text-center font-bold">Free9ja</footer>
      </div>
    </div>
  );
}
