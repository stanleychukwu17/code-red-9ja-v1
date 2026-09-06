import type { PageHeaderTabProps } from "@repo/ui/components/custom/AdminLayouts";
import { APP_URL } from "#/lib/config";

export const getElectionRaceTabs = (
  partyShortName: string,
): PageHeaderTabProps[] => [
  {
    id: "overview",
    label: "Overview",
    href: `${APP_URL.partyRoutes.electionRace(partyShortName)}`,
  },
  {
    id: "candidates",
    label: "Candidates",
    href: `${APP_URL.partyRoutes.electionRace(partyShortName)}/candidates`,
  },
  {
    id: "electoral-units",
    label: "Electoral units",
    href: `${APP_URL.partyRoutes.electionRace(partyShortName)}/electoral-units`,
  },
  {
    id: "operations",
    label: "Operations",
    href: `${APP_URL.partyRoutes.electionRace(partyShortName)}/operations`,
  },
];
