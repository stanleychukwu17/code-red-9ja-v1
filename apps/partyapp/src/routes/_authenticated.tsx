import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppSidebarShell, type AppSidebarItem } from "@repo/ui/components/custom/AppSidebar";
import { PollingAgentDialogProvider } from "#/components/dialogs/PollingAgentDialogContext";
import HomeIcon from "@repo/ui/icons/navbar/home-icon";
import HomeSolidIcon from "@repo/ui/icons/navbar/home-solid-icon";
import CalendarIcon from "@repo/ui/icons/navbar/calendar-icon";
import CalendarSolidIcon from "@repo/ui/icons/navbar/calendar-solid-icon";
import PaperIcon from "@repo/ui/icons/navbar/paper-icon";
import PaperSolidIcon from "@repo/ui/icons/navbar/paper-solid-icon";
import UserIcon from "@repo/ui/icons/navbar/user-icon";
import UserSolidIcon from "@repo/ui/icons/navbar/user-solid-icon";
import WalletIcon from "@repo/ui/icons/navbar/wallet-icon";
import WalletSolidIcon from "@repo/ui/icons/navbar/wallet-solid-icon";

import { useAppDispatch } from "@/redux/hooks";
import { updateSiteState } from "@/redux/slice/siteSlice";
import { updateAuthState } from "@/redux/slice/authSlice";
import { logoutUser } from "#/lib/server/auth/auth";
import { APP_URL } from "#/lib/config";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedRoutes,
  errorComponent: ({ error }) => <div>{error.message}</div>,
});

const APP_SIDEBAR_ITEMS: AppSidebarItem[] = [
  {
    id: "home",
    label: "Home",
    icon: <HomeIcon className="shrink-0 size-6" />,
    selectedIcon: <HomeSolidIcon className="shrink-0 size-6" />,
    href: "/home",
  },
  {
    id: "elections",
    label: "Elections",
    icon: <CalendarIcon className="shrink-0 size-6" />,
    selectedIcon: <CalendarSolidIcon className="shrink-0 size-6" />,
    href: "/elections",
  },
  {
    id: "applications",
    label: "Applications",
    icon: <PaperIcon className="shrink-0 size-6" />,
    selectedIcon: <PaperSolidIcon className="shrink-0 size-6" />,
    href: "/applications",
  },
  {
    id: "members",
    label: "Party members",
    icon: <UserIcon className="shrink-0 size-6" />,
    selectedIcon: <UserSolidIcon className="shrink-0 size-6" />,
    href: "/party-members",
  },
  {
    id: "wallet",
    label: "Wallet",
    icon: <WalletIcon className="shrink-0 size-6" />,
    selectedIcon: <WalletSolidIcon className="shrink-0 size-6" />,
    href: "/wallet",
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
    <PollingAgentDialogProvider>
      <div className="flex">
        <AppSidebarShell
          userDetails={userDetails}
          items={APP_SIDEBAR_ITEMS}
          logoBadge={
            <div className="flex size-10 items-center justify-center rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">
              <div className="flex size-8 items-center justify-center rounded-full bg-[#1f4b91] text-[11px] font-semibold text-white">
                NDP
              </div>
            </div>
          }
          onLogout={handleLogout}
          onSidebarStateChange={handleSidebarStateChange}
          homePageUrl={APP_URL.homePage}
        />
        <Outlet />
      </div>
    </PollingAgentDialogProvider>
  );
}
