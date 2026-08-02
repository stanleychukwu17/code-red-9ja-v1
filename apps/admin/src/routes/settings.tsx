import {
  AppSidebarShell,
  type AppSidebarItem,
} from "@repo/ui/components/custom/AppSidebar";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { APP_URL } from "#/lib/config";
import {
  checkIfRefreshTokenInCookie,
  getUserDetailsCookie,
  logoutUser,
} from "#/lib/server/auth/auth";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { updateAuthState } from "@/redux/slice/authSlice";
import { updateSiteState } from "@/redux/slice/siteSlice";
import FilterIcon from "@repo/ui/icons/navbar/filter-icon";
import FilterSolidIcon from "@repo/ui/icons/navbar/filter-solid-icon";
import BalonIcon from "@repo/ui/icons/navbar/balon-icon";
import BalonSolidIcon from "@repo/ui/icons/navbar/balon-solid-icon";
import ArrowHandleIcon from "@repo/ui/icons/arrow-handle-icon";

export const Route = createFileRoute("/settings")({
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
    id: "general",
    label: "General",
    icon: <FilterIcon className={ICON_CLASS} />,
    selectedIcon: <FilterSolidIcon className={SELECTED_ICON_CLASS} />,
    href: APP_URL.settings.general,
  },
  {
    id: "partyadmin",
    label: "Partyadmin",
    icon: <BalonIcon className={ICON_CLASS} />,
    selectedIcon: <BalonSolidIcon className={SELECTED_ICON_CLASS} />,
    href: APP_URL.settings.partyadmin,
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
        showSidebarFooter={false}
        logoIcon={<ArrowHandleIcon className="size-6 rotate-180" />}
        logoText="Settings"
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
