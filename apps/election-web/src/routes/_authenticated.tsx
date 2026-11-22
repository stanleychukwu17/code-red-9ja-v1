import { useEffect, useState } from "react";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AppSidebarShell, type AppSidebarItem } from "@repo/ui/components/custom/AppSidebar";
import HomeIcon from "@repo/ui/icons/navbar/home-icon";
import HomeSolidIcon from "@repo/ui/icons/navbar/home-solid-icon";
import PostIcon from "@repo/ui/icons/navbar/post-icon";
import PostSolidIcon from "@repo/ui/icons/navbar/post-solid-icon";
import { FileUp, Radio, AlertTriangle, BarChart3 } from "lucide-react";
import NotificationIcon from "@repo/ui/icons/navbar/notification-icon";
import NotificationSolidIcon from "@repo/ui/icons/navbar/notification-solid-icon";
import PaperIcon from "@repo/ui/icons/navbar/paper-icon";
import PaperSolidIcon from "@repo/ui/icons/navbar/paper-solid-icon";
import UserIcon from "@repo/ui/icons/navbar/user-icon";
import UserSolidIcon from "@repo/ui/icons/navbar/user-solid-icon";
import PartyIcon from "@repo/ui/icons/navbar/party-icon";
import PartySolidIcon from "@repo/ui/icons/navbar/party-solid-icon";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { updateSiteState } from "@/redux/slice/siteSlice";
import { updateAuthState } from "@/redux/slice/authSlice";
import { logoutUser, checkIfRefreshTokenInCookie } from "#/lib/server/auth/auth";
import { APP_URL } from "#/lib/config";
import LoadElectionSession from "#/components/LoadElectionSession";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    const res = await checkIfRefreshTokenInCookie();
    const isHome = location.pathname === "/" || location.pathname === "";

    if (!res.success) {
      // Allow open-world public access to the home page
      if (isHome) {
        return;
      }

      // For protected pages, redirect to login with target redirect
      throw redirect({
        to: APP_URL.auth.login,
        search: {
          redirect: location.href,
        },
      });
    }

    if (context.userDetails && !context.userDetails.username) {
      throw redirect({
        to: APP_URL.auth.onboarding,
        search: { step: "details", redirect: location.href },
      });
    }
  },
  component: AuthenticatedRoutes,
  errorComponent: ({ error }) => <div>{error.message}</div>,
});

const APP_SIDEBAR_ITEMS: AppSidebarItem[] = [
  {
    id: "home",
    label: "Home",
    icon: <HomeIcon />,
    selectedIcon: <HomeSolidIcon className="text-c-90" />,
    href: APP_URL.home,
  },
  {
    id: "give-update",
    label: "Post update",
    icon: <PostIcon />,
    selectedIcon: <PostSolidIcon className="text-c-90" />,
    href: APP_URL.giveUpdate,
  },
  {
    id: "upload-result",
    label: "Upload Result",
    icon: <FileUp className="size-5" />,
    selectedIcon: <FileUp className="size-5 text-c-90" />,
    href: APP_URL.uploadResult,
  },
  {
    id: "field-updates",
    label: "See Field Updates",
    icon: <Radio className="size-5" />,
    selectedIcon: <Radio className="size-5 text-c-90" />,
    href: APP_URL.fieldUpdates,
  },
  {
    id: "field-issues",
    label: "See Field Issues",
    icon: <AlertTriangle className="size-5" />,
    selectedIcon: <AlertTriangle className="size-5 text-c-90" />,
    href: APP_URL.fieldIssues,
  },
  {
    id: "field-stats",
    label: "See Field Stats",
    icon: <BarChart3 className="size-5" />,
    selectedIcon: <BarChart3 className="size-5 text-c-90" />,
    href: APP_URL.fieldStats,
  },
  {
    id: "applications",
    label: "Applications",
    icon: <PaperIcon />,
    selectedIcon: <PaperSolidIcon className="text-c-90" />,
    href: APP_URL.applications,
  },
  {
    id: "team",
    label: "Your Team",
    icon: <UserIcon />,
    selectedIcon: <UserSolidIcon className="text-c-90" />,
    href: APP_URL.team,
  },
  {
    id: "campaign-groups",
    label: "Campaign Groups",
    icon: <PartyIcon />,
    selectedIcon: <PartySolidIcon className="text-c-90" />,
    href: APP_URL.campaignGroups,
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: <NotificationIcon />,
    selectedIcon: <NotificationSolidIcon className="text-c-90" />,
    href: APP_URL.notifications,
  },
];

function AuthenticatedRoutes() {
  const [mounted, setMounted] = useState(false);
  const { userDetails, sitePreference: initialSitePreference } = Route.useRouteContext();
  const dispatch = useAppDispatch();
  const reduxSitePreference = useAppSelector((state) => state.site);

  // Use Redux state if populated, fallback to route context sitePreference (server loaded)
  const currentSitePreference = reduxSitePreference?.sideBarState
    ? reduxSitePreference
    : initialSitePreference;
  const isExpanded = currentSitePreference?.sideBarState !== "collapsed";

  // fades the page in after the page has been rendered
  useEffect(() => {
    setMounted(true);
  }, []);

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
    <>
      <LoadElectionSession />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: mounted ? 1 : 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="w-full"
      >
        <AppSidebarShell
          defaultOpen={isExpanded}
          userDetails={userDetails}
          items={APP_SIDEBAR_ITEMS}
          onLogout={handleLogout}
          onSidebarStateChange={handleSidebarStateChange}
          homePageUrl={APP_URL.home}
        >
          <div className="w-full min-h-svh">
            <Outlet />
          </div>
        </AppSidebarShell>
      </motion.div>
    </>
  );
}
