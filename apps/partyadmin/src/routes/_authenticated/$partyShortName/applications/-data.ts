import type { PageHeaderTabProps } from "@repo/ui/components/custom/AdminLayouts";
import { APP_URL } from "#/lib/config";

export const getApplicationTabs = (
  partyShortName: string,
): PageHeaderTabProps[] => [
  {
    id: "pending",
    label: `Pending`,
    href: APP_URL.partyRoutes.applications(partyShortName),
  },
  {
    id: "accepted",
    label: `Accepted`,
    href: `${APP_URL.partyRoutes.applications(partyShortName)}/accepted`,
  },
  {
    id: "rejected",
    label: `Rejected`,
    href: `${APP_URL.partyRoutes.applications(partyShortName)}/rejected`,
  },
];
