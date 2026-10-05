/**
 * @file Election Race Tab Navigation Configuration
 * @description Provides navigation tab definitions for the Election Race section:
 * Overview (Head-to-head / scope leaderboard), Candidates (all candidate tallies),
 * Electoral Units (geographical unit breakdown), and Operations (drilldown table).
 */

import type { PageHeaderTabProps } from "@repo/ui/components/custom/AdminLayouts";
import { APP_URL } from "#/lib/config";

/**
 * Returns navigation tabs for the Election Race module parameterized by party slug.
 */
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
