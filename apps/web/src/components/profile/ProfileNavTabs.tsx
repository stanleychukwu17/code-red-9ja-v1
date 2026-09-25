import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, Home, Sparkles, Users, UserCheck } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { APP_URL } from "#/lib/config";

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

  return (
    <nav aria-label="Profile navigation tabs" className="w-full overflow-x-auto hide-scrollbar py-2">
      <div className="flex items-center gap-2 min-w-max">
        {PROFILE_NAV_TABS.map((tab) => {
          const tabHref = APP_URL.profile(username.toLowerCase(), tab.path);
          const isActive =
            currentPath.endsWith(`/${tab.path}`) ||
            (tab.path === "home" && currentPath === `/profile/${username.toLowerCase()}`);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.path}
              to={tabHref}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 cursor-pointer no-underline",
                isActive
                  ? "bg-hover-10 text-c-100 shadow-2xs"
                  : "text-c-70 hover:text-c-100 hover:bg-hover-5"
              )}
            >
              {Icon && <Icon className="size-4 stroke-[2]" />}
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
