import { useMemo } from "react";
import { Users, Sparkles, MessageSquare, AlertTriangle, FileText } from "lucide-react";
import { ScrollableNavTabs, type ScrollableTabItem } from "#/components/ScrollableNavTabs";

export type CampaignGroupTabId = "home" | "timeline" | "talks" | "issues" | "notes";

export type CampaignGroupNavTabsProps = {
  activeTab: CampaignGroupTabId;
  onTabChange: (tab: CampaignGroupTabId) => void;
  membersCount?: number;
  className?: string;
};

export const CAMPAIGN_GROUP_TABS: {
  id: CampaignGroupTabId;
  label: string;
  icon: typeof Users;
}[] = [
  { id: "home", label: "Home", icon: Users },
  { id: "timeline", label: "Feed", icon: Sparkles },
  { id: "talks", label: "Talks Room", icon: MessageSquare },
  { id: "issues", label: "Issues/Reports", icon: AlertTriangle },
  { id: "notes", label: "Notes", icon: FileText },
];

export function CampaignGroupNavTabs({
  activeTab,
  onTabChange,
  membersCount = 0,
  className = "flex justify-center",
}: CampaignGroupNavTabsProps) {
  const tabs: ScrollableTabItem[] = useMemo(
    () =>
      CAMPAIGN_GROUP_TABS.map((tab) => ({
        id: tab.id,
        label: tab.label,
        icon: tab.icon,
        isActive: activeTab === tab.id,
        onClick: () => onTabChange(tab.id),
        badge:
          tab.id === "home" ? (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs bg-muted text-muted-foreground font-bold">
              {membersCount}
            </span>
          ) : undefined,
      })),
    [activeTab, onTabChange, membersCount],
  );

  return (
    <div className={className}>
      <ScrollableNavTabs ariaLabel="Campaign group navigation tabs" tabs={tabs} />
    </div>
  );
}
