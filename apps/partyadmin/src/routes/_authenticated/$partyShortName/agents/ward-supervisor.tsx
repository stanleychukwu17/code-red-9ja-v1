import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { useState } from "react";
import { Layout, PageHeader } from "@repo/ui/components/custom/AdminLayouts";
import { AgentsHeaderRight, AgentsFilterBar } from "./-components";
import { WardSupervisorsTable } from "#/components/Tables";
import { getAgentsTabs } from "./-data";
import { useQuery } from "@tanstack/react-query";
import { getAgentPerformanceStats } from "#/lib/server/agents";
import { useUserParty } from "#/hooks/useUserParty";
import { useElection } from "#/hooks/useElection";

/**
 * Ward Collation Supervisors Performance Roster
 *
 * Displays party supervisors coordinating polling units across Registration Areas (Wards):
 * - Scoped by state, LGA, and ward hierarchy.
 * - Tracks ward coverage completeness, agent attendance readiness, and collation progress.
 */
export const Route = createFileRoute(
  "/_authenticated/$partyShortName/agents/ward-supervisor",
)({
  head: () => getPageHeader({ title: "Ward Supervisors - Performance" }),
  component: RouteComponent,
});

/**
 * RouteComponent (Ward Supervisors View)
 *
 * Queries ward supervisor rosters and renders the WardSupervisorsTable.
 */
function RouteComponent() {
  const { party } = useUserParty();
  const {
    selectedElectionGroup,
    selectedElection,
    selectedStateId,
    selectedLGAId,
    selectedWardId,
  } = useElection();
  const partyId = party?.id;
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: [
      "agent-performance",
      "ward_supervisor",
      partyId,
      selectedElectionGroup?.id,
      selectedElection?.id,
      selectedStateId,
      selectedLGAId,
      selectedWardId,
      search,
    ],
    queryFn: async () => {
      const res = await getAgentPerformanceStats({
        data: {
          roleType: "ward_supervisor",
          partyId,
          electionGroupId: selectedElectionGroup?.id,
          electionId: selectedElection?.id,
          stateId: selectedStateId,
          lgaId: selectedLGAId,
          wardId: selectedWardId,
          search,
        },
      });
      return res;
    },
  });

  const items = Array.isArray(data?.data?.items)
    ? data.data.items
    : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data)
        ? data
        : [];

  const { partyShortName } = Route.useParams();

  return (
    <Layout>
      <PageHeader
        title="Election Agents"
        activeTab="ward-supervisor"
        tabs={getAgentsTabs(partyShortName)}
        rightComponent={<AgentsHeaderRight />}
      />
      <AgentsFilterBar search={search} setSearch={setSearch} />

      {isLoading ? (
        <div className="py-12 text-center text-c-50 text-[15px]">
          Loading ward supervisor performance stats...
        </div>
      ) : (
        <WardSupervisorsTable items={items} refetch={refetch} />
      )}
    </Layout>
  );
}
