import type { PageHeaderTabProps } from "@repo/ui/components/custom/AdminLayouts";
import { APP_URL } from "#/lib/config";

export const getPartyAdminsTabs = (partyShortName: string): PageHeaderTabProps[] => [
  {
    id: "all",
    label: "Members",
    href: APP_URL.partyRoutes.members(partyShortName),
  },
  {
    id: "party-admin",
    label: "Party admins",
    href: APP_URL.partyRoutes.partyAdmins(partyShortName),
  },
  {
    id: "party-positions",
    label: "Party positions",
    href: APP_URL.partyRoutes.partyPositions(partyShortName),
  },
  {
    id: "suspended",
    label: "Suspended",
    href: APP_URL.partyRoutes.suspendedUsers(partyShortName),
  },
  {
    id: "blocked",
    label: "Blocked",
    href: APP_URL.partyRoutes.blockedUsers(partyShortName),
  },
  {
    id: "search-users",
    label: "Search users",
    href: APP_URL.partyRoutes.searchUsers(partyShortName),
  },
];

