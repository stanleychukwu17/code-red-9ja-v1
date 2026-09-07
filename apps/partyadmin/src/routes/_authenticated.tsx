import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
import BalonIcon from "@repo/ui/icons/navbar/balon-icon";
import BalonSolidIcon from "@repo/ui/icons/navbar/balon-solid-icon";
import FeedIcon from "@repo/ui/icons/navbar/feed-icon";
import FeedSolidIcon from "@repo/ui/icons/navbar/feed-solid-icon";
import { ShieldCheck } from "lucide-react";
import {
  createFileRoute,
  Outlet,
  redirect,
  useParams,
} from "@tanstack/react-router";

import { APP_URL } from "#/lib/config";
import {
  logoutUser,
  checkIfRefreshTokenInCookie,
  getUserDetailsCookie,
} from "#/lib/server/auth/auth";
import { useAuth } from "#/hooks/useAppContext";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { updateAuthState } from "@/redux/slice/authSlice";
import { updateSiteState } from "@/redux/slice/siteSlice";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const res = await checkIfRefreshTokenInCookie();
    const user = await getUserDetailsCookie();

    if (!res.success) {
      throw redirect({ to: APP_URL.auth.login });
    }

    if (
      !user?.roles?.includes("super_party_admin") &&
      !user?.roles?.includes("party_admin") &&
      !user?.roles?.includes("super_admin")
    ) {
      throw new Error("You do not have access to this platform.");
    }
  },
  component: AuthenticatedRoutes,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-destructive">{error.message}</div>
  ),
});

function AuthenticatedRoutes() {
  const [mounted, setMounted] = useState(false);
  const { userDetails, sitePreference: initialSitePreference } =
    Route.useRouteContext() as any;

  //redux site state
  const dispatch = useAppDispatch();
  const reduxSitePreference = useAppSelector((state) => state.site);
  const currentSitePreference = reduxSitePreference?.sideBarState
    ? reduxSitePreference
    : initialSitePreference;
  const isExpanded = currentSitePreference?.sideBarState !== "collapsed";

  //party shortname
  const params = useParams({ strict: false });
  const { party } = useAuth();
  const partyShortName =
    party?.shortName || (params as any).partyShortName || "party";

  //sidebar items
  const sidebarItems: AppSidebarItem[] = [
    {
      id: "home",
      label: "Home",
      icon: <HomeIcon className="shrink-0 size-6" />,
      selectedIcon: <HomeSolidIcon className="shrink-0 size-6" />,
      href: APP_URL.partyRoutes.home(partyShortName),
    },
    {
      id: "elections",
      label: "Elections",
      icon: <CalendarIcon className="shrink-0 size-6" />,
      selectedIcon: <CalendarSolidIcon className="shrink-0 size-6" />,
      href: APP_URL.partyRoutes.elections(partyShortName),
    },
    {
      id: "applications",
      label: "Applications",
      icon: <PaperIcon className="shrink-0 size-6" />,
      selectedIcon: <PaperSolidIcon className="shrink-0 size-6" />,
      href: APP_URL.partyRoutes.applications(partyShortName),
    },
    {
      id: "party-members",
      label: "Party members",
      icon: <UserIcon className="shrink-0 size-6" />,
      selectedIcon: <UserSolidIcon className="shrink-0 size-6" />,
      href: APP_URL.partyRoutes.members(partyShortName),
    },
    {
      id: "wallet",
      label: "Wallet",
      icon: <WalletIcon className="shrink-0 size-6" />,
      selectedIcon: <WalletSolidIcon className="shrink-0 size-6" />,
      href: APP_URL.partyRoutes.wallet(partyShortName),
    },
    {
      id: "marketing",
      label: "Marketing",
      icon: <BalonIcon className="shrink-0 size-6" />,
      selectedIcon: <BalonSolidIcon className="shrink-0 size-6" />,
      href: APP_URL.partyRoutes.marketing(partyShortName),
    },
    {
      id: "agents",
      label: "Election Agents",
      icon: <UserIcon className="shrink-0 size-6" />,
      selectedIcon: <UserSolidIcon className="shrink-0 size-6" />,
      href: APP_URL.partyRoutes.agents(partyShortName),
    },
    {
      id: "coverage",
      label: "Agent Coverage",
      icon: <ShieldCheck className="shrink-0 size-6" />,
      selectedIcon: <ShieldCheck className="shrink-0 size-6 text-c-90" />,
      href: APP_URL.partyRoutes.coverage(partyShortName),
    },
    {
      id: "election-race",
      label: "Electoral Race",
      icon: <FeedIcon className="shrink-0 size-6" />,
      selectedIcon: <FeedSolidIcon className="shrink-0 size-6" />,
      href: APP_URL.partyRoutes.electionRace(partyShortName),
    },
  ];

  // handles the mounting of the component
  useEffect(() => {
    setMounted(true);
  }, []);

  // handles the user logging out
  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.error(e);
    }
    dispatch(updateAuthState({ user: null }));
  };

  // This logic persists the sidebar's expanded/collapsed state to Redux (and subsequently cookies)
  // so that the user's preference is retained across page reloads.
  const handleSidebarStateChange = (sideBarState: "expanded" | "collapsed") => {
    dispatch(updateSiteState({ sideBarState }));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: mounted ? 1 : 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="flex"
    >
      <AppSidebarShell
        defaultOpen={isExpanded}
        userDetails={userDetails}
        items={sidebarItems}
        onLogout={handleLogout}
        onSidebarStateChange={handleSidebarStateChange}
        homePageUrl={APP_URL.partyRoutes.home(partyShortName)}
      />
      <div className="flex flex-col flex-1 w-full min-w-0 h-full">
        {/* Main content expands to push footer down */}
        <main className="flex-1 min-h-svh">
          <Outlet />
        </main>
        {/* Footer stays at the bottom */}
        <footer className="p-4 border-t text-center font-bold">Free9ja</footer>
      </div>
    </motion.div>
  );
}
