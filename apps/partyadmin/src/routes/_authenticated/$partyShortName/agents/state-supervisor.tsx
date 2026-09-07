import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { useState } from "react";
import { Layout, PageHeader } from "@repo/ui/components/custom/AdminLayouts";
import { AgentsHeaderRight, AgentsFilterBar } from "./-components";
import { StateSupervisorsTable } from "#/components/Tables";
import { getAgentsTabs } from "./-data";
import { useQuery } from "@tanstack/react-query";
import { getAgentPerformanceStats } from "#/lib/server/agents";
import { useAppContext } from "#/hooks/useAppContext";

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/agents/state-supervisor",
)({
  head: () => getPageHeader({ title: "State Supervisors - Performance" }),
  component: RouteComponent,
});

function RouteComponent() {
  const { party, selectedElectionGroup, selectedElection, selectedStateId } = useAppContext();
  const partyId = party?.id;
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: [
      "agent-performance",
      "state_supervisor",
      partyId,
      selectedElectionGroup?.id,
      selectedElection?.id,
      selectedStateId,
      search,
    ],
    queryFn: async () => {
      const res = await getAgentPerformanceStats({
        data: {
          roleType: "state_supervisor",
          partyId,
          electionGroupId: selectedElectionGroup?.id,
          electionId: selectedElection?.id,
          stateId: selectedStateId,
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
        activeTab="state-supervisor"
        tabs={getAgentsTabs(partyShortName)}
        rightComponent={<AgentsHeaderRight />}
      />
      <AgentsFilterBar search={search} setSearch={setSearch} />

      {isLoading ? (
        <div className="py-12 text-center text-c-50 text-[15px]">
          Loading state supervisor performance stats...
        </div>
      ) : (
        <StateSupervisorsTable items={items} refetch={refetch} />
      )}
    </Layout>
  );
}
