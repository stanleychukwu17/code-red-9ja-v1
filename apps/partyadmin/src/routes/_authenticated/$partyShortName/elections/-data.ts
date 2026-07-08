import type { PageHeaderTabProps } from "@repo/ui/components/custom/AdminLayouts";
import { APP_URL } from "#/lib/config";

export const getElectionTabs = (partyShortName: string): PageHeaderTabProps[] => [
  { id: "groups", label: "Groups", href: APP_URL.partyRoutes.elections(partyShortName) },
  { id: "instances", label: "Instances", href: `${APP_URL.partyRoutes.elections(partyShortName)}/instances` },
];
