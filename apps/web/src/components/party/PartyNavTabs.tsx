import { Link, useRouterState } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { PARTY_NAV_TABS } from "./types";

interface PartyNavTabsProps {
  partyName: string;
  partyId: string;
}

export function PartyNavTabs({ partyName, partyId }: PartyNavTabsProps) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <nav aria-label="Party navigation tabs" className="w-full overflow-x-auto hide-scrollbar py-2">
      <div className="flex items-center gap-2 min-w-max">
        {PARTY_NAV_TABS.map((tab) => {
          const tabHref = `/party/${partyName.toLowerCase()}/${partyId}/${tab.path}`;
          const isActive = currentPath.endsWith(`/${tab.path}`);

          return (
            <Link
              key={tab.path}
              to={tabHref}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer no-underline",
                isActive
                  ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900"
              )}
            >
              {tab.icon && <Sparkles className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" />}
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
