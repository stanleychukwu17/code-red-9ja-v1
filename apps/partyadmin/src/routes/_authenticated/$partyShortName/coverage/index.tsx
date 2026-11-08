/**
 * @file Agent Coverage Overview Page
 * @description Renders party agent coverage statistics across the Nigerian electoral hierarchy.
 * Displays staffing completeness, assigned supervisor readiness, and polling agent deployment percentages.
 * Supports interactive drill-down from national/state level down to polling units, plus direct routing
 * to assign supervisors or polling agents.
 */

import { createFileRoute } from "@tanstack/react-router";
import { Layout, PageHeader } from "@repo/ui/components/custom/AdminLayouts";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Search, X } from "lucide-react";
import { AgentCoverageTable } from "#/components/Tables";
import type { AgentCoverageUnitItem } from "#/lib/server/agent-coverage";
import { getAgentCoverageBreakdown } from "#/lib/server/agent-coverage";
import { useUserParty } from "#/hooks/useUserParty";
import { useApplicationsFilters } from "#/hooks/useApplicationsFilters";
import { getPageHeader } from "#/lib/shared/meta";
import { ApplicationsFilterBar } from "#/components/applications/ApplicationsFilterBar";
import { validateApplicationsSearch } from "../applications/-data";

export const Route = createFileRoute("/_authenticated/$partyShortName/coverage/")({
  head: () => getPageHeader({ title: "Agent Coverage" }),
  validateSearch: validateApplicationsSearch,
  component: AgentCoveragePage,
});

/**
 * Agent Coverage Page Component
 * Manages geographic hierarchy drill-down state (State -> LGA -> Ward -> Polling Unit),
 * search filtering, and renders aggregated unit coverage metrics.
 */
function AgentCoveragePage() {
  const { partyShortName } = Route.useParams();

  // Search input state for filtering units
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Active party context
  const { party } = useUserParty();

  // Geographic and election group filters synchronized to URL search params
  const {
    electionGroupId,
    stateId,
    lgaId,
    wardId,
    pollingUnitId,
    handleFiltersChange,
  } = useApplicationsFilters();

  // Server function to fetch agent coverage breakdown
  const fetchBreakdown = useServerFn(getAgentCoverageBreakdown);

  // Fetch coverage metrics for the current geographic scope and party
  const { data, isLoading } = useQuery({
    queryKey: [
      "agent-coverage-breakdown",
      party?.id,
      electionGroupId,
      wardId,
      lgaId,
      stateId,
      pollingUnitId,
    ],
    queryFn: async () => {
      return await fetchBreakdown({
        data: {
          partyId: party?.id,
          electionGroupId,
          stateId,
          lgaId,
          wardId,
          pollingUnitId,
        },
      });
    },
    enabled: Boolean(party?.id && electionGroupId),
    staleTime: Infinity,
  });

  // Normalize API response structure
  const payload = (data as any)?.data || data;
  const rawData = payload?.data || payload;
  const items: AgentCoverageUnitItem[] = Array.isArray(rawData?.units) ? rawData.units : [];

  // Metadata describing the current hierarchical level
  const unitTitle = rawData?.unit_title || "";
  const unitType = (rawData?.unit_type || "").toLowerCase();
  const supervisorTitle = rawData?.supervisor_title || "State Supervisor";
  const isPU = unitType === "polling_units" || unitTitle === "Polling Units";

  // Filter unit list by search term (name or code)
  const filteredItems = search ? items.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.code?.toLowerCase().includes(search.toLowerCase()),
  ) : items;

  // Drill down into child units when clicking a row
  const handleSelectUnit = (item: AgentCoverageUnitItem) => {
    const unitId = Number(item.id);
    if (!unitId) return;

    if (unitType === "states" || (!unitType && unitTitle === "States")) {
      handleFiltersChange({
        electionGroupId,
        stateId: unitId,
        lgaId: undefined,
        wardId: undefined,
        pollingUnitId: undefined,
      });
    } else if (unitType === "lgas" || unitTitle === "LGAs") {
      handleFiltersChange({
        electionGroupId,
        stateId,
        lgaId: unitId,
        wardId: undefined,
        pollingUnitId: undefined,
      });
    } else if (unitType === "wards" || unitTitle === "Wards") {
      handleFiltersChange({
        electionGroupId,
        stateId,
        lgaId,
        wardId: unitId,
        pollingUnitId: undefined,
      });
    }
  };

  // UI state flags for navigation and drill-down controls
  const isDrillAble = !isPU;

  return (
    <Layout>
      {/* Page header */}
      <PageHeader
        title="Agent Coverage"
        activeTab=""
      />

      {/* Cascaded Geographic & Election Group Filter Bar and Search Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap py-2">
        <ApplicationsFilterBar
          electionGroupId={electionGroupId}
          stateId={stateId}
          lgaId={lgaId}
          wardId={wardId}
          pollingUnitId={pollingUnitId}
          onFiltersChange={handleFiltersChange}
          showAcceptAll={false}
        />

        <div className="flex items-center gap-2">
          {/* Collapsible search bar */}
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
          {/* Toggle search input button */}
          <button
            type="button"
            aria-label="Search"
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-lg border border-c-20 text-c-60 hover:text-c-90 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${showSearch ? "bg-neutral-100 dark:bg-neutral-800 text-c-90" : ""
              }`}
          >
            <Search className="size-4" />
          </button>
        </div>
      </div>

      {/* Data states: prompt selection, loading, empty results, or data table */}
      {!electionGroupId ? (
        <div className="py-16 text-center text-c-50 text-[15px]">
          Please select an Election Group above to view agent coverage.
        </div>
      ) : isLoading ? (
        <div className="py-16 text-center text-c-50 text-[15px]">
          Loading agent coverage statistics...
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
          onSelectUnit={isDrillAble ? handleSelectUnit : undefined}
        />
      )}
    </Layout>
  );
}
