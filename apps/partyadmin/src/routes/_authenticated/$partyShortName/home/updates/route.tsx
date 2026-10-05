import * as React from "react";
import {
  createFileRoute,
  Outlet,
  useParams,
  useLocation,
} from "@tanstack/react-router";
import { useUserParty } from "#/hooks/useUserParty";
import { useElection } from "#/hooks/useElection";
import { getElectionGroups } from "#/lib/server/election_groups";
import { getElectionsByGroup } from "#/lib/server/elections";
import { useServerFn } from "@tanstack/react-start";
import {
  SelectElectionGroupAndElection,
  type Election,
  type ElectionGroup,
} from "@repo/ui/components/selects/election-group-and-election-select";
import { ElectionScopeSelector } from "../components/-election-scope-selector";
import {
  DashboardLayout,
  HeaderTabs,
  PageHeader,
} from "@repo/ui/components/custom/AdminLayouts";
import { getPageHeader } from "#/lib/shared/meta";
import { cn } from "@repo/ui/lib/utils";
import { APP_URL } from "#/lib/config";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

/** Schema for validating URL query parameters: filters between general updates and formal incident reports */
const updatesSearchSchema = z.object({
  is_report: z.union([z.boolean(), z.literal("true"), z.literal("false")])
    .transform((val) => val === "true" || val === true)
    .optional(),
});

/**
 * Polling Unit Updates & Incidents Route Layout
 *
 * Master layout wrapper for field reports submitted by accredited polling agents:
 * - Query Filters: `?is_report=true` (critical incidents) vs `?is_report=false` (routine updates).
 * - Geographic Hierarchy Filter: Mounts `ElectionScopeSelector` for scoping by State/LGA/Ward.
 * - Sub-view Tabs: Switches between chronological incident stream (`/updates`) and
 *   evidence photos/videos gallery (`/updates/media-only`).
 */
export const Route = createFileRoute(
  "/_authenticated/$partyShortName/home/updates",
)({
  validateSearch: zodValidator(updatesSearchSchema),
  head: () => getPageHeader({ title: "Polling Unit Updates" }),
  component: UpdatesLayoutComponent,
});

/**
 * UpdatesLayoutComponent
 *
 * Coordinates header navigation, report categorization tabs, and geographical scope filters.
 */
function UpdatesLayoutComponent() {
  const { partyShortName } = useParams({ strict: false });
  const { is_report } = Route.useSearch();
  const { party } = useUserParty();
  const {
    selectedElectionGroup,
    setSelectedElectionGroup,
    setSelectedElection,
  } = useElection();
  const partyId = party?.id;

  const fetchGroups = useServerFn(getElectionGroups);
  const fetchElectionsByGroup = useServerFn(getElectionsByGroup);
  const location = useLocation();

  const isMediaOnly = location.pathname.endsWith("/media-only");

  const activeHeaderTab =
    is_report === true ? "reports" : is_report === false ? "updates" : "all";

  return (
    <DashboardLayout>
      <div className="flex flex-col">
        {/* Header Row */}
        <PageHeader
          title="Issues"
          activeTab={activeHeaderTab}
          tabs={[
            {
              id: "all",
              label: "All",
              href: `${APP_URL.partyRoutes.home((partyShortName as string) || "party")}/updates`,
            },
            {
              id: "updates",
              label: "Updates",
              href: `${APP_URL.partyRoutes.home((partyShortName as string) || "party")}/updates?is_report=false`,
            },
            {
              id: "reports",
              label: "Reports",
              href: `${APP_URL.partyRoutes.home((partyShortName as string) || "party")}/updates?is_report=true`,
            },
          ]}
          rightComponent={
            <SelectElectionGroupAndElection
              fetchElectionGroups={fetchGroups}
              fetchElectionsByGroup={fetchElectionsByGroup}
              selectedId={selectedElectionGroup?.id}
              update={(group) => setSelectedElectionGroup(group)}
              onElectionSelect={(group: ElectionGroup, election: Election) => {
                setSelectedElectionGroup(group);
                setSelectedElection(election);
              }}
              partyId={partyId}
            />
          }
        />

        {/* Filter and Toggle Row */}
        <div className="flex items-center justify-between">
          <div className="flex-1 py-3">
            <ElectionScopeSelector />
          </div>

          {/* Toggle buttons */}
          <HeaderTabs
            activeTab={isMediaOnly ? "media" : "all"}
            tabs={[
              {
                id: "all",
                label: "All",
                href: `${APP_URL.partyRoutes.home((partyShortName as string) || "party")}/updates${is_report !== undefined ? `?is_report=${is_report}` : ""}`,
              },
              {
                id: "media",
                label: "Media Only",
                href: `${APP_URL.partyRoutes.home((partyShortName as string) || "party")}/updates/media-only${is_report !== undefined ? `?is_report=${is_report}` : ""}`,
              },
            ]}
            activeTabClassName="bg-c-90 text-white shadow"
            containerClassName="h-10 bg-c-10 p-1"
          />
        </div>

        {/* Child Content (Feed or Grid) */}
        <div className="pt-2">
          <Outlet />
        </div>
      </div>
    </DashboardLayout>
  );
}
