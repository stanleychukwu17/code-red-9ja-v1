import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layout, PageHeader } from "@repo/ui/components/custom/AdminLayouts";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { AgentCoverageTable } from "#/components/Tables";
import type { AgentCoverageUnitItem } from "#/lib/server/agent-coverage";
import { getAgentCoverageBreakdown } from "#/lib/server/agent-coverage";
import { useAppContext } from "#/hooks/useAppContext";
import { getPageHeader } from "#/lib/shared/meta";
import { AgentsHeaderRight } from "./-components";
import { getAgentsTabs } from "./-data";
import { ElectionScopeSelector } from "../home/components/-election-scope-selector";

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/agents/coverage",
)({
  head: () => getPageHeader({ title: "Election Agents - Agent Coverage" }),
  component: AgentCoveragePage,
});

function AgentCoveragePage() {
  const { partyShortName } = Route.useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const {
    party,
    selectedElection,
    selectedElectionGroup,
    selectedStateId,
    setSelectedStateId,
    selectedDistrictId,
    setSelectedDistrictId,
    selectedFederalConstituencyId,
    setSelectedFederalConstituencyId,
    selectedStateConstituencyId,
    setSelectedStateConstituencyId,
    selectedLGAId,
    setSelectedLGAId,
    selectedWardId,
    setSelectedWardId,
  } = useAppContext();

  const fetchBreakdown = useServerFn(getAgentCoverageBreakdown);

  // Fallback title based on scope
  const computedTitle = selectedWardId
    ? "Polling Units"
    : selectedStateConstituencyId || selectedLGAId
      ? "Wards"
      : selectedFederalConstituencyId
        ? "LGAs"
        : selectedDistrictId
          ? "Federal Constituencies"
          : selectedStateId
            ? "Senatorial Districts"
            : "States";

  const { data, isLoading } = useQuery({
    queryKey: [
      "agent-coverage-breakdown",
      selectedElection?.id,
      selectedElectionGroup?.id,
      party?.id,
      selectedWardId,
      selectedLGAId,
      selectedStateConstituencyId,
      selectedFederalConstituencyId,
      selectedDistrictId,
      selectedStateId,
    ],
    queryFn: async () => {
      if (!selectedElection?.id && !selectedElectionGroup?.id) return null;
      return fetchBreakdown({
        data: {
          electionId: selectedElection?.id,
          electionGroupId: selectedElectionGroup?.id,
          partyId: party?.id,
          stateId: selectedStateId || undefined,
          senatorialDistrictId: selectedDistrictId || undefined,
          federalConstituencyId: selectedFederalConstituencyId || undefined,
          stateConstituencyId: selectedStateConstituencyId || undefined,
          lgaId: selectedLGAId || undefined,
          wardId: selectedWardId || undefined,
          limit: 150,
        },
      });
    },
    enabled: !!(selectedElection?.id || selectedElectionGroup?.id),
  });

  const payload = (data as any)?.data || data;
  const rawData = payload?.data || payload;
  const items: AgentCoverageUnitItem[] = Array.isArray(rawData?.units)
    ? rawData.units
    : [];

  const unitTitle = rawData?.unit_title || computedTitle;
  const unitType = (rawData?.unit_type || "").toLowerCase();
  const supervisorTitle = rawData?.supervisor_title || "State Supervisor";
  const isPU = unitType === "polling_units" || unitTitle === "Polling Units";

  const filteredItems = search
    ? items.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.code?.toLowerCase().includes(search.toLowerCase()),
      )
    : items;

  const handleSelectUnit = (item: AgentCoverageUnitItem) => {
    const unitId = Number(item.id);
    if (!unitId) return;

    if (unitType === "states" || (!unitType && unitTitle === "States")) {
      setSelectedStateId(unitId);
      setSelectedDistrictId(undefined);
      setSelectedFederalConstituencyId(undefined);
      setSelectedStateConstituencyId(undefined);
      setSelectedLGAId(undefined);
      setSelectedWardId(undefined);
    } else if (
      unitType === "senatorial_districts" ||
      unitTitle === "Senatorial Districts"
    ) {
      setSelectedDistrictId(unitId);
      setSelectedFederalConstituencyId(undefined);
      setSelectedStateConstituencyId(undefined);
      setSelectedLGAId(undefined);
      setSelectedWardId(undefined);
    } else if (
      unitType === "federal_constituencies" ||
      unitTitle === "Federal Constituencies"
    ) {
      setSelectedFederalConstituencyId(unitId);
      setSelectedStateConstituencyId(undefined);
      setSelectedLGAId(undefined);
      setSelectedWardId(undefined);
    } else if (
      unitType === "state_constituencies" ||
      unitTitle === "State Constituencies"
    ) {
      setSelectedStateConstituencyId(unitId);
      setSelectedWardId(undefined);
    } else if (unitType === "lgas" || unitTitle === "LGAs") {
      setSelectedLGAId(unitId);
      setSelectedWardId(undefined);
    } else if (unitType === "wards" || unitTitle === "Wards") {
      setSelectedWardId(unitId);
    }
  };

  const handleAssign = (item: AgentCoverageUnitItem) => {
    const unitId = Number(item.id);
    if (unitType === "states") {
      setSelectedStateId(unitId);
      navigate({
        to: "/$partyShortName/agents/state-supervisor",
        params: { partyShortName },
      });
    } else if (unitType === "lgas") {
      setSelectedLGAId(unitId);
      navigate({
        to: "/$partyShortName/agents/lga-supervisor",
        params: { partyShortName },
      });
    } else if (unitType === "wards" || unitType === "state_constituencies") {
      setSelectedWardId(unitId);
      navigate({
        to: "/$partyShortName/agents/ward-supervisor",
        params: { partyShortName },
      });
    } else {
      navigate({
        to: "/$partyShortName/agents/polling-agent",
        params: { partyShortName },
      });
    }
  };

  const isDrillable = !isPU;

  return (
    <Layout>
      <PageHeader
        title="Agent Coverage"
        activeTab="coverage"
        tabs={getAgentsTabs(partyShortName)}
        rightComponent={<AgentsHeaderRight />}
      />

      <div className="flex items-center justify-between gap-4 flex-wrap py-2">
        <ElectionScopeSelector />
        <div className="flex items-center gap-2">
          {showSearch && (
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Filter by name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 py-1.5 pr-8 text-sm rounded-lg border border-c-20 bg-transparent text-c-80 focus:outline-none focus:border-c-60 transition-colors"
                autoFocus
              />
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearch("");
                  setShowSearch(false);
                }}
                className="absolute right-2 text-c-40 hover:text-c-80"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}
          <button
            type="button"
            aria-label="Search"
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-lg border border-c-20 text-c-60 hover:text-c-90 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${
              showSearch ? "bg-neutral-100 dark:bg-neutral-800 text-c-90" : ""
            }`}
          >
            <Search className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Filter"
            className="p-2 rounded-lg border border-c-20 text-c-60 hover:text-c-90 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <SlidersHorizontal className="size-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-c-50 text-[15px]">
          Loading agent coverage statistics...
        </div>
      ) : !selectedElection?.id && !selectedElectionGroup?.id ? (
        <div className="py-16 text-center text-c-50 text-[15px]">
          Select an election to view agent coverage statistics.
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 text-center text-c-50 text-[15px]">
          {search
            ? "No electoral units match your search query."
            : "No agent coverage data available for this scope."}
        </div>
      ) : (
        <AgentCoverageTable
          items={filteredItems}
          unitTitle={unitTitle}
          unitType={unitType}
          supervisorTitle={supervisorTitle}
          onSelectUnit={isDrillable ? handleSelectUnit : undefined}
          onAssign={handleAssign}
        />
      )}
    </Layout>
  );
}
