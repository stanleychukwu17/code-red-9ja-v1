import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { useState } from "react";
import { Layout, PageHeader } from "@repo/ui/components/custom/AdminLayouts";
import { AgentsHeaderRight, AgentsFilterBar } from "./-components";
import { PollingAgentsTable } from "#/components/Tables";
import { getAgentsTabs } from "./-data";
import { useQuery } from "@tanstack/react-query";
import { getAgentPerformanceStats } from "#/lib/server/agents";
import { useAppContext } from "#/hooks/useAppContext";

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/agents/polling-agent",
)({
  head: () => getPageHeader({ title: "Polling Agents - Performance" }),
  component: RouteComponent,
});

function RouteComponent() {
  const {
    party,
    selectedElectionGroup,
    selectedElection,
    selectedStateId,
    selectedLGAId,
    selectedWardId,
  } = useAppContext();
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
  console.log("DATA:", {
    roleType: "polling_agent",
    partyId,
    electionGroupId: selectedElectionGroup?.id,
    electionId: selectedElection?.id,
    stateId: selectedStateId,
    lgaId: selectedLGAId,
    wardId: selectedWardId,
    search,
  });
  console.log("DATA:", data);

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
