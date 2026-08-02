import * as React from "react";
import {
  createFileRoute,
  Outlet,
  useParams,
  useLocation,
  Link,
} from "@tanstack/react-router";
import { useAppContext } from "#/hooks/useAppContext";
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
import { APP_URL } from "#/lib/config";

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/home/results",
)({
  head: () => getPageHeader({ title: "Election Results" }),
  component: ResultsLayoutComponent,
});

function ResultsLayoutComponent() {
  const { partyShortName } = useParams({ strict: false });
  const {
    party,
    selectedElectionGroup,
    setSelectedElectionGroup,
    setSelectedElection,
  } = useAppContext();
  const partyId = party?.id;

  const fetchGroups = useServerFn(getElectionGroups);
  const fetchElectionsByGroup = useServerFn(getElectionsByGroup);
  const location = useLocation();

  const isMediaOnly = location.pathname.endsWith("/media-only");

  return (
    <DashboardLayout>
      <div className="flex flex-col">
        {/* Header Row */}
        <PageHeader
          title="Results"
          activeTab="all"
          // tabs={[
          //   { id: "all", label: "All", href: `${APP_URL.partyRoutes.home((partyShortName as string) || "party")}/results` },
          //   { id: "updates", label: "Updates", href: `${APP_URL.partyRoutes.home((partyShortName as string) || "party")}/updates` },
          //   { id: "reports", label: "Reports", href: `${APP_URL.partyRoutes.home((partyShortName as string) || "party")}/updates?is_report=true` },
          // ]}
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
                href: `${APP_URL.partyRoutes.home((partyShortName as string) || "party")}/results`,
              },
              {
                id: "media",
                label: "Media Only",
                href: `${APP_URL.partyRoutes.home((partyShortName as string) || "party")}/results/media-only`,
              },
            ]}
            activeTabClassName="bg-c-90 text-white shadow"
            containerClassName="h-10 bg-c-10 p-1"
          />
        </div>

        {/* Child Content (Table or Grid) */}
        <div className="pt-2">
          <Outlet />
        </div>
      </div>
    </DashboardLayout>
  );
}
