import type { PageHeaderTabProps } from "@repo/ui/components/custom/AdminLayouts";
import { APP_URL } from "#/lib/config";

export const getElectionTabs = (
  partyShortName: string,
  search?: Record<string, unknown> | number,
): PageHeaderTabProps[] => [
  { id: "groups", label: "Groups", href: APP_URL.partyRoutes.elections(partyShortName) },
  {
    id: "instances",
    label: "Instances",
    href: APP_URL.partyRoutes.electionInstances(partyShortName),
    search: search
      ? typeof search === "object"
        ? search
        : { election_group_id: search }
      : undefined,
  },
];
