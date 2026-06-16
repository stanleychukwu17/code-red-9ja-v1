import {
  AppSidebarShell,
  type AppSidebarItem,
} from "@repo/ui/components/custom/AppSidebar";
import CalendarIcon from "@repo/ui/icons/navbar/calendar-icon";
import CalendarSolidIcon from "@repo/ui/icons/navbar/calendar-solid-icon";
import HomeIcon from "@repo/ui/icons/navbar/home-icon";
import HomeSolidIcon from "@repo/ui/icons/navbar/home-solid-icon";
import PaperIcon from "@repo/ui/icons/navbar/paper-icon";
import PaperSolidIcon from "@repo/ui/icons/navbar/paper-solid-icon";
import UserIcon from "@repo/ui/icons/navbar/user-icon";
import UserSolidIcon from "@repo/ui/icons/navbar/user-solid-icon";
import WalletIcon from "@repo/ui/icons/navbar/wallet-icon";
import WalletSolidIcon from "@repo/ui/icons/navbar/wallet-solid-icon";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { logoutUser } from "#/lib/server/auth/auth";
import { useAuth } from "#/providers/providers";
import { useAppDispatch } from "@/redux/hooks";
import { updateAuthState } from "@/redux/slice/authSlice";
import { updateSiteState } from "@/redux/slice/siteSlice";
import { PollingAgentApplicationDialog } from "#/components/dialogs/polling-agent-application-dialog";
import { PollingAgentDialogProvider } from "#/components/dialogs/PollingAgentDialogContext";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context }) => {
    const user = context.userDetails;
    if (
      !user ||
      user.role !== "partymember" ||
      !user.party ||
      !user.party.short_name
    ) {
      throw redirect({ to: "/auth/login" });
    }
  },
  component: AuthenticatedRoutes,
  errorComponent: ({ error }) => <div>{error.message}</div>,
});

function AuthenticatedRoutes() {
  const { userDetails } = Route.useRouteContext();
  const dispatch = useAppDispatch();
  const { party } = useAuth();
  const partyShortName = party.shortName;

  const sidebarItems: AppSidebarItem[] = [
    {
      id: "home",
      label: "Home",
      icon: <HomeIcon className="shrink-0 size-6" />,
      selectedIcon: <HomeSolidIcon className="shrink-0 size-6" />,
      href: `/${partyShortName}/home`,
    },
    {
      id: "elections",
      label: "Elections",
      icon: <CalendarIcon className="shrink-0 size-6" />,
      selectedIcon: <CalendarSolidIcon className="shrink-0 size-6" />,
      href: `/${partyShortName}/elections`,
    },
    {
      id: "applications",
      label: "Applications",
      icon: <PaperIcon className="shrink-0 size-6" />,
      selectedIcon: <PaperSolidIcon className="shrink-0 size-6" />,
      href: `/${partyShortName}/applications`,
    },
    {
      id: "members",
      label: "Party members",
      icon: <UserIcon className="shrink-0 size-6" />,
      selectedIcon: <UserSolidIcon className="shrink-0 size-6" />,
      href: `/${partyShortName}/party-members`,
    },
    {
      id: "wallet",
      label: "Wallet",
      icon: <WalletIcon className="shrink-0 size-6" />,
      selectedIcon: <WalletSolidIcon className="shrink-0 size-6" />,
      href: `/${partyShortName}/wallet`,
    },
  ];

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
          items={sidebarItems}
          onLogout={handleLogout}
          onSidebarStateChange={handleSidebarStateChange}
          homePageUrl={`/${partyShortName}/home`}
        />
        <Outlet />
      </div>
    </PollingAgentDialogProvider>
  );
}
