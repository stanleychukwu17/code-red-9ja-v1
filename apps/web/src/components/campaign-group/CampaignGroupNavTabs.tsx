import { useMemo } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Users, Sparkles, MessageSquare, AlertTriangle, FileText } from "lucide-react";
import { ScrollableNavTabs, type ScrollableTabItem } from "#/components/ScrollableNavTabs";
import { APP_URL } from "#/lib/config";

export type CampaignGroupTabId = "home" | "timeline" | "talks" | "issues" | "notes";

export type CampaignGroupNavTabsProps = {
  partyId?: string | number;
  groupId?: string | number;
  activeTab?: CampaignGroupTabId;
  onTabChange?: (tab: CampaignGroupTabId) => void;
  membersCount?: number;
  className?: string;
};

export const CAMPAIGN_GROUP_TABS: {
  id: CampaignGroupTabId;
  path: string;
  label: string;
  icon: typeof Users;
}[] = [
  { id: "home", path: "home", label: "Home", icon: Users },
  { id: "timeline", path: "timeline", label: "Feed", icon: Sparkles },
  { id: "talks", path: "talks", label: "Talks Room", icon: MessageSquare },
  { id: "issues", path: "issues", label: "Issues/Reports", icon: AlertTriangle },
  { id: "notes", path: "notes", label: "Notes", icon: FileText },
];

export function CampaignGroupNavTabs({
  partyId,
  groupId,
  activeTab,
  onTabChange,
  membersCount = 0,
  className = "flex justify-center",
}: CampaignGroupNavTabsProps) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const tabs: ScrollableTabItem[] = useMemo(() =>
    CAMPAIGN_GROUP_TABS.map((tab) => {
      const href = partyId && groupId ? APP_URL.group(partyId, groupId, tab.path) : undefined;
      const isPathActive =
        href
          ? currentPath === href ||
            currentPath.endsWith(`/${tab.path}`) ||
            (tab.path === "home" && currentPath === `/group/${partyId}/${groupId}`)
          : false;

      const isActive = activeTab !== undefined ? activeTab === tab.id : isPathActive;

      return {
        id: tab.id,
        path: tab.path,
        label: tab.label,
        icon: tab.icon,
        href,
        isActive,
        onClick: onTabChange ? () => onTabChange(tab.id) : undefined,
        badge:
          tab.id === "home" && membersCount > 0 ? (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs bg-muted text-muted-foreground font-bold">
              {membersCount}
            </span>
          ) : undefined,
      };
    }),
    [partyId, groupId, activeTab, onTabChange, membersCount, currentPath],
  );

  return (
    <div className={className}>
      <ScrollableNavTabs ariaLabel="Campaign group navigation tabs" tabs={tabs} />
    </div>
  );
}
