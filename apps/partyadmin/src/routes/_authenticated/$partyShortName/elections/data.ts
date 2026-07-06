import type { PageHeaderTabProps } from "@repo/ui/components/custom/AdminLayouts";

export const getElectionTabs = (partyShortName: string): PageHeaderTabProps[] => [
  { id: "groups", label: "Groups", href: `/${partyShortName}/elections` },
  { id: "instances", label: "Instances", href: `/${partyShortName}/elections/instances` },
];
