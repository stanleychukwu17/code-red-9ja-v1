/**
 * @file Authenticated Layout Route Shell for Control Center
 * @description Master Situation Room Layout incorporating Free9ja's AppSidebarShell
 * with full support for both Light and Dark themes.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
  Link,
  useParams,
} from "@tanstack/react-router";
import {
  AppSidebarShell,
  type AppSidebarItem,
} from "@repo/ui/components/custom/AppSidebar";
import { SidebarTrigger } from "@repo/ui/components/sidebar";
import HomeIcon from "@repo/ui/icons/navbar/home-icon";
import HomeSolidIcon from "@repo/ui/icons/navbar/home-solid-icon";
import UserIcon from "@repo/ui/icons/navbar/user-icon";
import UserSolidIcon from "@repo/ui/icons/navbar/user-solid-icon";
import BalonIcon from "@repo/ui/icons/navbar/balon-icon";
import BalonSolidIcon from "@repo/ui/icons/navbar/balon-solid-icon";
import {
  Layers,
  AlertTriangle,
  RefreshCw,
  Activity,
  Tv,
  Radio,
  Clock,
  Maximize,
  Minimize,
  Sun,
  Moon,
  ShieldCheck,
} from "lucide-react";

import { APP_URL } from "#/lib/config";
import {
  logoutUser,
  checkIfRefreshTokenInCookie,
  getUserDetailsCookie,
} from "#/lib/server/auth/auth";
import { useUserParty } from "#/hooks/useUserParty";
import { useUser } from "#/hooks/useUser";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { updateAuthState } from "@/redux/slice/authSlice";
import { updateSiteState } from "@/redux/slice/siteSlice";
import { useTheme } from "@repo/ui/hooks/use-theme";
import { cn } from "@repo/ui/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const res = await checkIfRefreshTokenInCookie();
    const user = await getUserDetailsCookie();

    if (!res.success) {
      throw redirect({
        to: APP_URL.auth.login,
        search: { redirect: location.href },
      });
    }

    if (
      !user?.roles?.includes("super_party_admin") &&
      !user?.roles?.includes("party_admin") &&
      !user?.roles?.includes("admin") &&
      !user?.roles?.includes("super_admin")
    ) {
      throw new Error(
        "Access restricted. Only authorized party personnel or system administrators can enter the Control Center."
      );
    }
  },

  component: ControlCenterShell,
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-md w-full p-6 rounded-2xl bg-destructive/10 border border-destructive/20 text-center">
        <h2 className="text-lg font-bold text-destructive mb-2">Access Denied</h2>
        <p className="text-xs text-destructive/80 mb-4">{error.message}</p>
        <Link
          to={APP_URL.auth.login}
          className="inline-block px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Return to Login
        </Link>
      </div>
    </div>
  ),
});

function ControlCenterShell() {
  const [mounted, setMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const { userDetails, sitePreference: initialSitePreference } =
    Route.useRouteContext() as any;

  const dispatch = useAppDispatch();
  const reduxSitePreference = useAppSelector((state) => state.site);
  const currentSitePreference = reduxSitePreference?.sideBarState
    ? reduxSitePreference
    : initialSitePreference;
  const isExpanded = currentSitePreference?.sideBarState !== "collapsed";

  const user = useUser();
  const { party } = useUserParty();
  const partyShortName = party?.short_name || user?.party?.short_name || "party";

  const { theme, setTheme } = useTheme();

  const isAdminOrSuperAdmin = Boolean(
    user?.roles?.includes("admin") || user?.roles?.includes("super_admin")
  );

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-GB", {
          timeZone: "Africa/Lagos",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " WAT"
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
  };

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

  const sidebarItems: AppSidebarItem[] = [
    {
      id: "home",
      label: "Situation Room",
      icon: <HomeIcon />,
      selectedIcon: <HomeSolidIcon />,
      href: APP_URL.controlCenter.home(partyShortName),
    },
    {
      id: "collation",
      label: "Collation Waterfall",
      icon: <Layers className="size-5" />,
      selectedIcon: <Layers className="size-5 text-primary" />,
      href: APP_URL.controlCenter.collation(partyShortName),
    },
    {
      id: "discrepancies",
      label: "Discrepancy Matrix",
      icon: <AlertTriangle className="size-5" />,
      selectedIcon: <AlertTriangle className="size-5 text-primary" />,
      href: APP_URL.controlCenter.discrepancies(partyShortName),
    },
    {
      id: "inec-sync",
      label: "INEC Scraper Sync",
      icon: <RefreshCw className="size-5" />,
      selectedIcon: <RefreshCw className="size-5 text-primary" />,
      href: APP_URL.controlCenter.inecSync(partyShortName),
    },
    {
      id: "agent-telemetry",
      label: "Agent Deployment",
      icon: <UserIcon />,
      selectedIcon: <UserSolidIcon />,
      href: APP_URL.controlCenter.agentTelemetry(partyShortName),
    },
    {
      id: "incidents",
      label: "Incident & SOS Desk",
      icon: <Activity className="size-5" />,
      selectedIcon: <Activity className="size-5 text-primary" />,
      href: APP_URL.controlCenter.incidents(partyShortName),
    },
    {
      id: "war-room",
      label: "Wall Display Mode",
      icon: <Tv className="size-5" />,
      selectedIcon: <Tv className="size-5 text-primary" />,
      href: APP_URL.controlCenter.warRoom(partyShortName),
    },
    ...(isAdminOrSuperAdmin
      ? [
          {
            id: "parties",
            label: "Switch Party",
            icon: <BalonIcon />,
            selectedIcon: <BalonSolidIcon />,
            href: APP_URL.parties,
          },
        ]
      : []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: mounted ? 1 : 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      className="flex min-h-screen bg-background text-foreground"
    >
      <AppSidebarShell
        defaultOpen={isExpanded}
        userDetails={userDetails}
        items={sidebarItems}
        logoText="Control Center"
        onLogout={handleLogout}
        onSidebarStateChange={handleSidebarStateChange}
        homePageUrl={APP_URL.controlCenter.home(partyShortName)}
      />

      <div className="flex flex-col flex-1 w-full min-w-0 min-h-screen">
        {/* Top Situation Room Operational Command Bar */}
        <header className="sticky top-0 z-30 h-14 bg-background/90 backdrop-blur-md border-b border-border px-4 md:px-6 flex items-center justify-between gap-4">
          {/* Left: Sidebar trigger & Active Party Pill */}
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

            <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-sidebar-softer border border-border">
              {party?.logo ? (
                <img
                  src={party.logo}
                  alt={party.short_name}
                  className="size-5 rounded-full object-cover"
                />
              ) : (
                <span className="size-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center uppercase">
                  {partyShortName.slice(0, 2)}
                </span>
              )}
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                {partyShortName}
              </span>
              {isAdminOrSuperAdmin && (
                <Link
                  to={APP_URL.parties}
                  className="text-[10px] text-muted-foreground hover:text-primary transition-colors ml-1 underline decoration-dotted"
                >
                  Change
                </Link>
              )}
            </div>
          </div>

          {/* Center: Live stream indicator & WAT Clock */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
              <span>LIVE OPERATIONAL FEED</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono bg-muted/60 px-3 py-1 rounded-lg border border-border">
              <Clock className="size-3.5 text-muted-foreground" />
              <span>{currentTime || "--:--:-- WAT"}</span>
            </div>
          </div>

          {/* Right: Actions (Theme Toggle, Fullscreen, User Indicator) */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              className="p-2 rounded-lg bg-card hover:bg-muted border border-border text-foreground transition-colors cursor-pointer"
            >
              {theme === "dark" ? (
                <Sun className="size-4 text-amber-400" />
              ) : (
                <Moon className="size-4 text-neutral-600" />
              )}
            </button>

            <button
              onClick={toggleFullscreen}
              aria-label="Toggle Fullscreen"
              className="p-2 rounded-lg bg-card hover:bg-muted border border-border text-foreground transition-colors cursor-pointer"
            >
              {isFullscreen ? (
                <Minimize className="size-4" />
              ) : (
                <Maximize className="size-4" />
              )}
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 w-full p-4 md:p-6 max-w-7xl mx-auto">
          <Outlet />
        </main>

        {/* Persistent Bottom Footer */}
        <footer className="p-4 border-t border-border text-center text-xs text-muted-foreground font-medium">
          Free9ja Control Center &bull; Operational Command &bull; {partyShortName.toUpperCase()}
        </footer>
      </div>
    </motion.div>
  );
}
