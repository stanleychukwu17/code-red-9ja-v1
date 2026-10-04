import { ScrollableNavTabs } from "#/components/ScrollableNavTabs";
import { PARTY_NAV_TABS } from "./types";

interface PartyNavTabsProps {
  partyName: string;
  partyId: string;
  chapterId?: number;
}

export function PartyNavTabs({ partyName, partyId, chapterId }: PartyNavTabsProps) {
  const query = chapterId ? `?chapterId=${chapterId}` : "";
  const tabs = PARTY_NAV_TABS.map((tab) => ({
    path: tab.path,
    label: tab.label,
    icon: tab.icon,
    href: `/party/${partyName.toLowerCase()}/${partyId}/${tab.path}${query}`,
  }));

  return <ScrollableNavTabs ariaLabel="Party navigation tabs" tabs={tabs} />;
}
