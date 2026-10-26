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
      // Temporary fake data to preview UI layout and drill-downs
      if (wardId) {
        return {
          unit_title: "Polling Units",
          unit_type: "polling_units",
          supervisor_title: "PU Agents",
          units: [
            {
              id: 1001,
              name: "PU 001 - Community Primary School I",
              code: "LA/04/01/001",
              polling_agents: "2",
              overall_readiness: 100,
              pu_agents: [
                { id: 1, name: "Ibrahim Musa", avatar: "" },
                { id: 2, name: "Ngozi Eze", avatar: "" },
              ],
            },
            {
              id: 1002,
              name: "PU 002 - Town Hall Square",
              code: "LA/04/01/002",
              polling_agents: "1",
              overall_readiness: 50,
              pu_agents: [{ id: 3, name: "Babatunde Adeleke", avatar: "" }],
            },
            {
              id: 1003,
              name: "PU 003 - Health Centre Gate",
              code: "LA/04/01/003",
              polling_agents: "0",
              overall_readiness: 0,
              pu_agents: [],
            },
          ],
        };
      }

      if (lgaId) {
        return {
          unit_title: "Wards",
          unit_type: "wards",
          supervisor_title: "Ward Supervisor",
          units: [
            {
              id: 201,
              name: "Ward 01 - Alausa / Secretariat",
              polling_agents: "48 (96%)",
              ward_supervisors: "1",
              overall_readiness: 94,
              supervisors: [{ id: 11, name: "Kolawole Sanwo", avatar: "" }],
            },
            {
              id: 202,
              name: "Ward 02 - Oregun / Ojota",
              polling_agents: "30 (60%)",
              ward_supervisors: "1",
              overall_readiness: 62,
              supervisors: [{ id: 12, name: "Fatima Bello", avatar: "" }],
            },
            {
              id: 203,
              name: "Ward 03 - Agidingbi",
              polling_agents: "10 (20%)",
              ward_supervisors: "0",
              overall_readiness: 15,
              supervisors: [],
            },
          ],
        };
      }

      if (stateId) {
        return {
          unit_title: "LGAs",
          unit_type: "lgas",
          supervisor_title: "LGA Supervisor",
          units: [
            {
              id: 101,
              name: "Ikeja",
              polling_agents: "380 (95%)",
              ward_supervisors: "11 (100%)",
              lga_supervisors: "1",
              overall_readiness: 92,
              supervisors: [{ id: 21, name: "Adewale Tinubu", avatar: "" }],
            },
            {
              id: 102,
              name: "Alimosho",
              polling_agents: "820 (78%)",
              ward_supervisors: "18 (85%)",
              lga_supervisors: "1",
              overall_readiness: 76,
              supervisors: [{ id: 22, name: "Chidi Obi", avatar: "" }],
            },
            {
              id: 103,
              name: "Eti-Osa",
              polling_agents: "210 (45%)",
              ward_supervisors: "5 (50%)",
              lga_supervisors: "0",
              overall_readiness: 38,
              supervisors: [],
            },
            {
              id: 104,
              name: "Ikorodu",
              polling_agents: "120 (22%)",
              ward_supervisors: "3 (25%)",
              lga_supervisors: "0",
              overall_readiness: 18,
              supervisors: [],
            },
          ],
        };
      }

      // Top level: States
      return {
        unit_title: "States",
        unit_type: "states",
        supervisor_title: "State Supervisor",
        units: [
          {
            id: 25,
            name: "Lagos",
            polling_agents: "11,840 (88%)",
            ward_supervisors: "360 (96%)",
            lga_supervisors: "20 (100%)",
            state_supervisors: "1",
            overall_readiness: 91,
            supervisors: [
              { id: 1, name: "Olumide Akpata", avatar: "" },
              { id: 2, name: "Amina Yusuf", avatar: "" },
            ],
          },
          {
            id: 20,
            name: "Kano",
            polling_agents: "9,420 (74%)",
            ward_supervisors: "410 (84%)",
            lga_supervisors: "44 (100%)",
            state_supervisors: "1",
            overall_readiness: 78,
            supervisors: [{ id: 3, name: "Rabiu Kwankwaso", avatar: "" }],
          },
          {
            id: 33,
            name: "Rivers",
            polling_agents: "4,200 (62%)",
            ward_supervisors: "280 (87%)",
            lga_supervisors: "19 (82%)",
            state_supervisors: "1",
            overall_readiness: 65,
            supervisors: [{ id: 4, name: "Nyesom Nwike", avatar: "" }],
          },
          {
            id: 15,
            name: "FCT (Abuja)",
            polling_agents: "2,600 (92%)",
            ward_supervisors: "62 (100%)",
            lga_supervisors: "6 (100%)",
            state_supervisors: "1",
            overall_readiness: 95,
            supervisors: [{ id: 5, name: "Zainab Ahmed", avatar: "" }],
          },
          {
            id: 4,
            name: "Anambra",
            polling_agents: "1,450 (32%)",
            ward_supervisors: "110 (34%)",
            lga_supervisors: "8 (38%)",
            state_supervisors: "0",
            overall_readiness: 28,
            supervisors: [],
          },
          {
            id: 7,
            name: "Borno",
            polling_agents: "0 (0%)",
            ward_supervisors: "0 (0%)",
            lga_supervisors: "0 (0%)",
            state_supervisors: "0",
            overall_readiness: 0,
            supervisors: [],
          },
        ],
      };
    },
    enabled: true,
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
