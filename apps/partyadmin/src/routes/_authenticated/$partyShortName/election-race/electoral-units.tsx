import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Layout, PageHeader } from "@repo/ui/components/custom/AdminLayouts";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ElectoralUnitsTable } from "#/components/Tables";
import type { ElectoralUnitItem } from "#/components/tiles/candidate-result-tile";
import { useElection } from "#/hooks/useElection";
import { getElectoralUnitsBreakdown } from "#/lib/server/election-results";
import { getPageHeader } from "#/lib/shared/meta";
import { ElectionRaceHeaderRight } from "./-components";
import { getElectionRaceTabs } from "./-data";

/**
 * Electoral Units Results Hierarchy Breakdown
 *
 * Displays results aggregated across geographic electoral boundaries:
 * - Dynamically presents States, Senatorial Districts, Federal Constituencies, LGAs, Wards, or PUs.
 * - Interactive Drill-down: Clicking any unit row drills down into its constituent subunits.
 * - Periodic Polling: Refreshes every 15s when `isLive` mode is active.
 */
export const Route = createFileRoute(
  "/_authenticated/$partyShortName/election-race/electoral-units",
)({
  head: () => getPageHeader({ title: "Election Race - Electoral Units" }),
  component: ElectoralUnitsPage,
});

/**
 * ElectoralUnitsPage Component
 *
 * Queries geographic unit returns and renders the ElectoralUnitsTable.
 */
function ElectoralUnitsPage() {
  const { partyShortName } = Route.useParams();
  const {
    selectedElection,
    isLive,
    setIsLive,
  } = useElection();

  const [drillDown, setDrillDown] = useState<{
    stateId?: number;
    lgaId?: number;
    wardId?: number;
  }>({});

  // Reset local drill-down when active election changes
  useEffect(() => {
    setDrillDown({});
  }, [selectedElection?.id]);

  const stateId = drillDown.stateId ?? (selectedElection?.state_id as number | undefined) ?? undefined;
  const lgaId = drillDown.lgaId ?? (selectedElection?.lga_id as number | undefined) ?? undefined;
  const wardId = drillDown.wardId ?? (selectedElection?.ward_id as number | undefined) ?? undefined;

  const fetchBreakdown = useServerFn(getElectoralUnitsBreakdown);

  // Fallback title based on scope
  const computedTitle = wardId
    ? "Polling Units"
    : lgaId
      ? "Wards"
      : stateId
        ? "LGAs"
        : "States";

  const { data, isLoading } = useQuery({
    queryKey: [
      "electoral-units-breakdown",
      selectedElection?.id,
      wardId,
      lgaId,
      stateId,
      isLive,
    ],
    queryFn: async () => {
      if (!selectedElection?.id) return null;
      return fetchBreakdown({
        data: {
          electionId: selectedElection.id,
          stateId,
          lgaId,
          wardId,
          limit: 150,
        },
      });
    },
    enabled: !!selectedElection?.id,
    refetchInterval: isLive ? 15000 : false,
  });

  const rawData = (data as any)?.data || (data as any);
  const items: ElectoralUnitItem[] = Array.isArray(rawData?.units)
    ? rawData.units
    : [];

  const unitTitle = rawData?.unit_title || computedTitle;
  const unitType = (rawData?.unit_type || "").toLowerCase();

  const handleSelectUnit = (item: ElectoralUnitItem) => {
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

  const isDrillable =
    unitType !== "polling_units" && unitTitle !== "Polling Units";
  const hasDrillDown = Object.values(drillDown).some((v) => v !== undefined);

  return (
    <Layout>
      <PageHeader
        title="Electoral Race"
        activeTab="electoral-units"
        tabs={getElectionRaceTabs(partyShortName)}
        rightComponent={
          <ElectionRaceHeaderRight isLive={isLive} setIsLive={setIsLive} />
        }
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
      {isLoading ? (
        <div className="py-16 text-center text-c-50 text-[15px]">
          Loading electoral units results...
        </div>
      ) : !selectedElection?.id ? (
        <div className="py-16 text-center text-c-50 text-[15px]">
          Select an election to view electoral units results.
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-c-50 text-[15px]">
          No electoral unit results available for this scope.
        </div>
      ) : (
        <ElectoralUnitsTable
          items={items}
          unitTitle={unitTitle}
          isLive={isLive}
          onSelectUnit={isDrillable ? handleSelectUnit : undefined}
        />
      )}
    </Layout>
  );
}
