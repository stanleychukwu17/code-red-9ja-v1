import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { useState } from "react";
import { Layout, PageHeader } from "@repo/ui/components/custom/AdminLayouts";
import { AgentsHeaderRight, AgentsFilterBar } from "./-components";
import { PollingAgentsTable } from "#/components/Tables";
import { getAgentsTabs } from "./-data";
import { useQuery } from "@tanstack/react-query";
import { getAgentPerformanceStats } from "#/lib/server/agents";
import { useUserParty } from "#/hooks/useUserParty";
import { useElection } from "#/hooks/useElection";

/**
 * Polling Unit Agents Performance Roster
 *
 * Displays a searchable, filterable table of party polling unit agents on the ground:
 * - Scoped dynamically by the active election, state, LGA, and ward.
 * - Tracks key performance metrics: PU assignment, arrival punctuality, accreditation confirmation,
 *   and EC8A result sheet upload status.
 * - Provides quick actions to call the agent, reassign roles, or deactivate assignments.
 */
export const Route = createFileRoute(
  "/_authenticated/$partyShortName/agents/polling-agent",
)({
  head: () => getPageHeader({ title: "Polling Agents - Performance" }),
  component: RouteComponent,
});

/**
 * RouteComponent (Polling Agents View)
 *
 * Manages search filter state, queries agent performance records, and renders the PollingAgentsTable.
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
      "polling_agent",
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
          roleType: "polling_agent",
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
  // console.log("DATA:", data);

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
        activeTab="polling-agent"
        tabs={getAgentsTabs(partyShortName)}
        rightComponent={<AgentsHeaderRight />}
      />
      <AgentsFilterBar search={search} setSearch={setSearch} />

      {isLoading ? (
        <div className="py-12 text-center text-c-50 text-[15px]">
          Loading polling agent performance stats...
        </div>
      ) : (
        <PollingAgentsTable items={items} refetch={refetch} />
      )}
    </Layout>
  );
}
