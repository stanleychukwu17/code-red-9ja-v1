/**
 * @file Authenticated Layout Route Shell for Control Center
 * @description Master Situation Room Layout for party leadership and election operators.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
  useLocation,
  Link,
} from "@tanstack/react-router";
import {
  Radio,
  Layers,
  AlertTriangle,
  RefreshCw,
  Users,
  Tv,
  LogOut,
  Building2,
  Clock,
  Maximize,
  Minimize,
  Activity,
  CheckCircle2,
} from "lucide-react";

import { APP_URL } from "#/lib/config";
import {
  logoutUser,
  checkIfRefreshTokenInCookie,
  getUserDetailsCookie,
} from "#/lib/server/auth/auth";
import { useUserParty } from "#/hooks/useUserParty";
import { useUser } from "#/hooks/useUser";
import { useAppDispatch } from "@/redux/hooks";
import { updateAuthState } from "@/redux/slice/authSlice";
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
      throw new Error("Access restricted. Only authorized party personnel or system administrators can enter the Control Center.");
    }
  },

  component: ControlCenterShell,
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full p-6 rounded-2xl bg-red-950/30 border border-red-800 text-center">
        <h2 className="text-lg font-bold text-red-400 mb-2">Access Denied</h2>
        <p className="text-xs text-red-300 mb-4">{error.message}</p>
        <Link
          to={APP_URL.auth.login}
          className="inline-block px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white"
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
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const user = useUser();
  const { party } = useUserParty();
  const partyShortName = party?.short_name || user?.party?.short_name || "party";

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

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.error(e);
    }
    dispatch(updateAuthState({ user: null }));
    navigate({ to: APP_URL.auth.login });
  };

  const navItems = [
    {
      id: "home",
      label: "Situation Room",
      icon: Radio,
      href: APP_URL.controlCenter.home(partyShortName),
    },
    {
      id: "collation",
      label: "Collation Waterfall",
      icon: Layers,
      href: APP_URL.controlCenter.collation(partyShortName),
    },
    {
      id: "discrepancies",
      label: "Discrepancy Matrix",
      icon: AlertTriangle,
      href: APP_URL.controlCenter.discrepancies(partyShortName),
    },
    {
      id: "inec-sync",
      label: "INEC Scraper Command",
      icon: RefreshCw,
      href: APP_URL.controlCenter.inecSync(partyShortName),
    },
    {
      id: "agent-telemetry",
      label: "Agent Deployment & Live Telemetry",
      icon: Users,
      href: APP_URL.controlCenter.agentTelemetry(partyShortName),
    },
    {
      id: "incidents",
      label: "Incident & SOS Desk",
      icon: Activity,
      href: APP_URL.controlCenter.incidents(partyShortName),
    },
    {
      id: "war-room",
      label: "Big-Screen Wall",
      icon: Tv,
      href: APP_URL.controlCenter.warRoom(partyShortName),
    },
    ...(isAdminOrSuperAdmin
      ? [
          {
            id: "parties",
            label: "Switch Party",
            icon: Building2,
            href: APP_URL.parties,
          },
        ]
      : []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: mounted ? 1 : 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100 selection:bg-emerald-500/30"
    >
      {/* Top Command Bar */}
      <header className="sticky top-0 z-40 h-16 bg-neutral-950/90 border-b border-neutral-800/80 backdrop-blur-md px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Left: Branding & Active Party Pill */}
        <div className="flex items-center gap-3">
          <Link to={APP_URL.controlCenter.home(partyShortName)} className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Radio className="size-5 animate-pulse" />
            </div>
            <div className="hidden sm:block">
              <span className="font-extrabold text-sm tracking-tight text-white block">
                Free9ja <span className="text-emerald-400 font-bold">Control Center</span>
              </span>
              <span className="text-[10px] text-neutral-400 font-medium block">
                Election Situation Room
              </span>
            </div>
          </Link>

          <div className="h-6 w-px bg-neutral-800 mx-1 hidden sm:block" />

          {/* Active Party Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800">
            {party?.logo ? (
              <img
                src={party.logo}
                alt={party.short_name}
                className="size-5 rounded-full object-cover"
              />
            ) : (
              <span className="size-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center uppercase">
                {partyShortName.slice(0, 2)}
              </span>
            )}
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {partyShortName}
            </span>
            {isAdminOrSuperAdmin && (
              <Link
                to={APP_URL.parties}
                className="text-[10px] text-neutral-400 hover:text-emerald-400 transition-colors ml-1 underline decoration-dotted"
              >
                Change
              </Link>
            )}
          </div>
        </div>

        {/* Center: Live Stream Status & Clock */}
        <div className="hidden lg:flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/50 text-[11px] font-semibold text-emerald-400">
            <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
            <span>LIVE OPERATIONAL FEED</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono bg-neutral-900 px-3 py-1 rounded-lg border border-neutral-800">
            <Clock className="size-3.5 text-neutral-500" />
            <span>{currentTime || "--:--:-- WAT"}</span>
          </div>
        </div>

        {/* Right: Actions (Fullscreen, User, Logout) */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            aria-label="Toggle Fullscreen"
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors"
          >
            {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs">
            <span className="size-2 rounded-full bg-emerald-400" />
            <span className="font-medium text-neutral-200 hidden md:inline truncate max-w-[120px]">
              {user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : user?.username || "Operator"}
            </span>
          </div>

          <button
            onClick={handleLogout}
            aria-label="Logout"
            className="p-2 rounded-lg bg-red-950/30 hover:bg-red-900/50 border border-red-800/50 text-red-400 transition-colors"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      {/* Subnav Ribbon for situation room modules */}
      <nav className="bg-neutral-900/80 border-b border-neutral-800/80 px-4 md:px-6 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.id}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                  isActive
                    ? "bg-emerald-500 text-neutral-950 font-bold shadow-sm"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                )}
              >
                <Icon className={cn("size-3.5", isActive ? "text-neutral-950" : "text-neutral-400")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Command Room Outlet */}
      <main className="flex-1 p-4 md:p-6 w-full max-w-[1600px] mx-auto">
        <Outlet />
      </main>

      {/* Control Center Footer */}
      <footer className="px-6 py-4 border-t border-neutral-900 bg-neutral-950 text-neutral-500 text-xs flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          <span>Parallel Dataset &bull; Form EC8 Tracking Waterfall</span>
        </div>
        <div>
          Free9ja Operational Situation Room &bull; Confidential &amp; Scoped to {partyShortName.toUpperCase()}
        </div>
      </footer>
    </motion.div>
  );
}
