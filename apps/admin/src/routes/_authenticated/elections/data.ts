import type { PageHeaderTabProps } from "@repo/ui/components/custom/AdminLayouts";

export const ELECTION_TABS: PageHeaderTabProps[] = [
  { id: "groups", label: "Groups", href: "/elections" },
  { id: "instances", label: "Instances", href: "/elections/instances" },
  { id: "offices", label: "Offices", href: "/elections/offices" },
];
