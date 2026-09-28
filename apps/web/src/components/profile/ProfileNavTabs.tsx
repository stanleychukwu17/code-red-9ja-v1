import { useRouterState } from "@tanstack/react-router";
import { Activity, Home, Sparkles, Users, UserCheck } from "lucide-react";
import { APP_URL } from "#/lib/config";
import { ScrollableNavTabs } from "#/components/ScrollableNavTabs";

export interface ProfileNavTabItem {
  id: string;
  label: string;
  path: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export const PROFILE_NAV_TABS: ProfileNavTabItem[] = [
  { id: "home", label: "Home", path: "home", icon: Home },
  { id: "timeline", label: "Timeline", path: "timeline", icon: Sparkles },
  { id: "history", label: "Party history", path: "history", icon: Activity },
  { id: "followers", label: "Followers", path: "followers", icon: Users },
  { id: "following", label: "Following", path: "following", icon: UserCheck },
];

interface ProfileNavTabsProps {
  username: string;
}

export function ProfileNavTabs({ username }: ProfileNavTabsProps) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const normalizedUser = username.toLowerCase();

  const tabs = PROFILE_NAV_TABS.map((tab) => {
    const href = APP_URL.profile(normalizedUser, tab.path);
    const isActive =
      currentPath.endsWith(`/${tab.path}`) || (tab.path === "home" && currentPath === `/profile/${normalizedUser}`);

    return {
      id: tab.id,
      path: tab.path,
      label: tab.label,
      icon: tab.icon,
      href,
      isActive,
    };
  });

  return (
    <ScrollableNavTabs
      ariaLabel="Profile navigation tabs"
      className="w-full max-w-full"
      tabs={tabs}
    />
  );
}
