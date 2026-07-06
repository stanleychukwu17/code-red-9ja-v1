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
import {
  createFileRoute,
  Outlet,
  redirect,
  useParams,
} from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";

import { logoutUser, refreshUserToken } from "#/lib/server/auth/auth";
import { useAuth } from "#/providers/providers";
import { useAppDispatch } from "@/redux/hooks";
import { updateAuthState } from "@/redux/slice/authSlice";
import { updateSiteState } from "@/redux/slice/siteSlice";
import { PollingAgentDialogProvider } from "#/components/dialogs/PollingAgentDialogContext";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const res = await refreshUserToken();
    console.log("✌️ RES:", res);

    if (!res.success || res.data?.user?.role !== "partymember") {
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
  console.log("userDetails", userDetails);
  console.log("party short name", party?.shortName);
  const params = useParams({ strict: false });
  const partyShortName =
    party?.shortName || (params as any).partyShortName || "party";

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

  const logoutMutation = useMutation({
    mutationFn: () => logoutUser(),
    onSuccess: () => {
      dispatch(updateAuthState({ user: null }));
    },
    onError: (e) => {
      console.error(e);
      dispatch(updateAuthState({ user: null }));
    }
  });

  const handleLogout = () => {
    logoutMutation.mutate();
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
