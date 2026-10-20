/**
 * @file Agent Coverage Overview Page
 * @description Renders party agent coverage statistics across the Nigerian electoral hierarchy.
 * Displays staffing completeness, assigned supervisor readiness, and polling agent deployment percentages.
 * Supports interactive drill-down from national/state level down to polling units, plus direct routing
 * to assign supervisors or polling agents.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layout, PageHeader } from "@repo/ui/components/custom/AdminLayouts";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { AgentCoverageTable } from "#/components/Tables";
import type { AgentCoverageUnitItem } from "#/lib/server/agent-coverage";
import { getAgentCoverageBreakdown } from "#/lib/server/agent-coverage";
import { useUserParty } from "#/hooks/useUserParty";
import { useElection } from "#/hooks/useElection";
import { getPageHeader } from "#/lib/shared/meta";
import { CoverageHeaderRight } from "./-components";

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/coverage/",
)({
  head: () => getPageHeader({ title: "Agent Coverage" }),
  component: AgentCoveragePage,
});

/**
 * Agent Coverage Page Component
 * Manages hierarchy drill-down state, electoral scope selectors, search filters,
 * and passes aggregated unit coverage metrics to the AgentCoverageTable.
 */
function AgentCoveragePage() {
  const { partyShortName } = Route.useParams();
  const navigate = useNavigate();
  // Filter search query for unit name / code
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const { party } = useUserParty();
  const {
    selectedElection,
    selectedElectionGroup,
  } = useElection();

  const [drillDown, setDrillDown] = useState<{
    stateId?: number;
    districtId?: number;
    federalConstituencyId?: number;
    stateConstituencyId?: number;
    lgaId?: number;
    wardId?: number;
  }>({});

  // Reset local drill-down when active election or group changes
  useEffect(() => {
    setDrillDown({});
  }, [selectedElection?.id, selectedElectionGroup?.id]);

  const stateId = drillDown.stateId ?? (selectedElection?.state_id as number | undefined) ?? undefined;
  const districtId = drillDown.districtId ?? (selectedElection?.senatorial_district_id as number | undefined) ?? undefined;
  const federalConstituencyId = drillDown.federalConstituencyId ?? (selectedElection?.federal_constituency_id as number | undefined) ?? undefined;
  const stateConstituencyId = drillDown.stateConstituencyId ?? (selectedElection?.state_constituency_id as number | undefined) ?? undefined;
  const lgaId = drillDown.lgaId ?? (selectedElection?.lga_id as number | undefined) ?? undefined;
  const wardId = drillDown.wardId ?? (selectedElection?.ward_id as number | undefined) ?? undefined;

  const fetchBreakdown = useServerFn(getAgentCoverageBreakdown);

  // Fallback title based on scope
  const computedTitle = wardId
    ? "Polling Units"
    : stateConstituencyId || lgaId
      ? "Wards"
      : federalConstituencyId
        ? "LGAs"
        : districtId
          ? "Federal Constituencies"
          : stateId
            ? "Senatorial Districts"
            : "States";

  const { data, isLoading } = useQuery({
    queryKey: [
      "agent-coverage-breakdown",
      selectedElection?.id,
      selectedElectionGroup?.id,
      party?.id,
      wardId,
      lgaId,
      stateConstituencyId,
      federalConstituencyId,
      districtId,
      stateId,
    ],
    queryFn: async () => {
      if (!selectedElection?.id && !selectedElectionGroup?.id) return null;
      return fetchBreakdown({
        data: {
          electionId: selectedElection?.id,
          electionGroupId: selectedElectionGroup?.id,
          partyId: party?.id,
          stateId,
          senatorialDistrictId: districtId,
          federalConstituencyId,
          stateConstituencyId,
          lgaId,
          wardId,
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

  /**
   * Drill-down handler: updates the local geographic selection state to narrow the view
   * to children electoral units (e.g. clicking a State drills down to its Senatorial Districts).
   */
  const handleSelectUnit = (item: AgentCoverageUnitItem) => {
    const unitId = Number(item.id);
    if (!unitId) return;

    if (unitType === "states" || (!unitType && unitTitle === "States")) {
      setDrillDown({ stateId: unitId });
    } else if (
      unitType === "senatorial_districts" ||
      unitTitle === "Senatorial Districts"
    ) {
      setDrillDown((prev) => ({
        ...prev,
        districtId: unitId,
        federalConstituencyId: undefined,
        stateConstituencyId: undefined,
        lgaId: undefined,
        wardId: undefined,
      }));
    } else if (
      unitType === "federal_constituencies" ||
      unitTitle === "Federal Constituencies"
    ) {
      setDrillDown((prev) => ({
        ...prev,
        federalConstituencyId: unitId,
        stateConstituencyId: undefined,
        lgaId: undefined,
        wardId: undefined,
      }));
    } else if (
      unitType === "state_constituencies" ||
      unitTitle === "State Constituencies"
    ) {
      setDrillDown((prev) => ({
        ...prev,
        stateConstituencyId: unitId,
        wardId: undefined,
      }));
    } else if (unitType === "lgas" || unitTitle === "LGAs") {
      setDrillDown((prev) => ({
        ...prev,
        lgaId: unitId,
        wardId: undefined,
      }));
    } else if (unitType === "wards" || unitTitle === "Wards") {
      setDrillDown((prev) => ({
        ...prev,
        wardId: unitId,
      }));
    }
  };

  /**
   * Navigation handler to immediately assign supervisors or agents for the selected unit.
   * Directs to the appropriate supervisor roster or polling unit agent view.
   */
  const handleAssign = (item: AgentCoverageUnitItem) => {
    if (unitType === "states") {
      navigate({
        to: "/$partyShortName/agents/state-supervisor",
        params: { partyShortName },
      });
    } else if (unitType === "lgas") {
      navigate({
        to: "/$partyShortName/agents/lga-supervisor",
        params: { partyShortName },
      });
    } else if (unitType === "wards" || unitType === "state_constituencies") {
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
  const hasDrillDown = Object.values(drillDown).some((v) => v !== undefined);

  return (
    <Layout>
      <PageHeader
        title="Agent Coverage"
        activeTab=""
        rightComponent={<CoverageHeaderRight />}
      />

      {hasDrillDown && (
        <div className="flex items-center gap-2 py-2">
          <button
            type="button"
            onClick={() => setDrillDown({})}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border border-c-20 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors"
          >
            ← Reset to top-level view
          </button>
        </div>
      )}

      <div className="flex items-center justify-end gap-4 flex-wrap py-2">
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
