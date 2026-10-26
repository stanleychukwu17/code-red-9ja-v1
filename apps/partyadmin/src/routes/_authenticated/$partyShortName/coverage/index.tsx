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
import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { AgentCoverageTable } from "#/components/Tables";
import type { AgentCoverageUnitItem } from "#/lib/server/agent-coverage";
import { getAgentCoverageBreakdown } from "#/lib/server/agent-coverage";
import { useUserParty } from "#/hooks/useUserParty";
import { getPageHeader } from "#/lib/shared/meta";

export const Route = createFileRoute("/_authenticated/$partyShortName/coverage/")({
  head: () => getPageHeader({ title: "Agent Coverage" }),
  component: AgentCoveragePage,
});

/**
 * Agent Coverage Page Component
 * Manages geographic hierarchy drill-down state (State -> LGA -> Ward -> Polling Unit),
 * search filtering, and renders aggregated unit coverage metrics.
 */
function AgentCoveragePage() {
  const { partyShortName } = Route.useParams();
  const navigate = useNavigate();

  // Search input state for filtering units
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Active party context
  const { party } = useUserParty();

  // Hierarchical geographic drill-down filter state (State -> LGA -> Ward)
  const [drillDown, setDrillDown] = useState<{
    stateId?: number;
    lgaId?: number;
    wardId?: number;
  }>({});

  const stateId = drillDown.stateId;
  const lgaId = drillDown.lgaId;
  const wardId = drillDown.wardId;

  // Server function to fetch agent coverage breakdown
  const fetchBreakdown = useServerFn(getAgentCoverageBreakdown);

  // Fallback title when server does not provide unit_title
  const computedTitle = wardId
    ? "Polling Units"
    : lgaId
      ? "Wards"
      : stateId
        ? "LGAs"
        : "States";

  // Fetch coverage metrics for the current geographic scope and party
  const { data, isLoading } = useQuery({
    queryKey: ["agent-coverage-breakdown", party?.id, wardId, lgaId, stateId],
    queryFn: async () => {
      return fetchBreakdown({
        data: {
          partyId: party?.id,
          stateId,
          lgaId,
          wardId,
          limit: 150,
        },
      });
    },
    enabled: !!party?.id,
  });

  // Normalize API response structure
  const payload = (data as any)?.data || data;
  const rawData = payload?.data || payload;
  const items: AgentCoverageUnitItem[] = Array.isArray(rawData?.units)
    ? rawData.units
    : [];

  // Metadata describing the current hierarchical level
  const unitTitle = rawData?.unit_title || computedTitle;
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
      setDrillDown({ stateId: unitId });
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

  // Route to the corresponding agent assignment page by tier
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

  // UI state flags for navigation and drill-down controls
  const isDrillable = !isPU;
  const hasDrillDown = Object.values(drillDown).some((v) => v !== undefined);

  return (
    <Layout>
      {/* Page header */}
      <PageHeader
        title="Agent Coverage"
        activeTab=""
      />

      {/* Button to clear active drill-down and return to top-level overview */}
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

      {/* Toolbar for search input and filter toggles */}
      <div className="flex items-center justify-end gap-4 flex-wrap py-2">
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
          {/* Filter button */}
          <button
            type="button"
            aria-label="Filter"
            className="p-2 rounded-lg border border-c-20 text-c-60 hover:text-c-90 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <SlidersHorizontal className="size-4" />
          </button>
        </div>
      </div>

      {/* Data states: loading, empty results, or data table */}
      {isLoading ? (
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
          onSelectUnit={isDrillable ? handleSelectUnit : undefined}
          onAssign={handleAssign}
        />
      )}
    </Layout>
  );
}
