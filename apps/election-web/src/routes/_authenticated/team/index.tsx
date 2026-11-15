import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Users, UserCheck, ShieldCheck, UserCog } from "lucide-react";
import { ScrollableNavTabs, type ScrollableTabItem } from "@repo/ui/components/custom/ScrollableNavTabs";
import { PageHeader } from "#/components/Headers";
import { getPageHeader } from "#/lib/shared/meta";

export const Route = createFileRoute("/_authenticated/team/")({
  head: () => getPageHeader({ title: "Your Team" }),
  component: TeamPage,
});

const TEAM_TABS = [
  { id: "all", label: "All Members", icon: Users },
  { id: "polling-agents", label: "Polling Agents", icon: UserCheck },
  { id: "supervisors", label: "Supervisors", icon: ShieldCheck },
  { id: "coordinators", label: "Coordinators", icon: UserCog },
];

function TeamPage() {
  const [activeTab, setActiveTab] = useState("all");

  const tabs: ScrollableTabItem[] = TEAM_TABS.map((tab) => ({
    id: tab.id,
    label: tab.label,
    icon: tab.icon,
    isActive: activeTab === tab.id,
    onClick: () => setActiveTab(tab.id),
  }));

  return (
    <div className="flex flex-col flex-1 pb-24 px-4">
      <PageHeader title="Your Team" hideBackButton />

      {/* NavBar */}
      <div className="mt-2">
        <ScrollableNavTabs ariaLabel="Team navigation tabs" tabs={tabs} />
      </div>

      <div className="flex-1 mt-4">

      </div>
    </div>
  );
}
