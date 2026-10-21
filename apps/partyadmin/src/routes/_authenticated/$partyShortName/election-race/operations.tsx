import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Layout, PageHeader } from "@repo/ui/components/custom/AdminLayouts";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { OperationsTable } from "#/components/Tables";
import type { OperationsUnitItem } from "#/lib/server/election-operations";
import { getOperationsBreakdown } from "#/lib/server/election-operations";
import { useUserParty } from "#/hooks/useUserParty";
import { useElection } from "#/hooks/useElection";
import { getPageHeader } from "#/lib/shared/meta";
import { ElectionRaceHeaderRight } from "./-components";
import { getElectionRaceTabs } from "./-data";

/**
 * Election Operations Breakdown View
 *
 * Operational drill-down table tracking party readiness across geographical units:
 * - Dynamic Geographic Zoom: Automatically presents States, Senatorial Districts,
 *   Federal Constituencies, LGAs, or Wards based on the active scope.
 * - Interactive Drill-down: Clicking any unit row (`onSelectUnit`) focuses the dashboard
 *   downwards to inspect its constituent subunits.
 * - Live Polling: Auto-refreshes every 15s during active election day (`isLive`).
 */
export const Route = createFileRoute("/_authenticated/$partyShortName/election-race/operations")({
  head: () => getPageHeader({ title: "Election Race - Operations" }),
  component: OperationsPage,
});

/**
 * OperationsPage Component
 *
 * Coordinates operational statistics queries, scope drill-down handlers, and table presentation.
 */
function OperationsPage() {
  const { partyShortName } = Route.useParams();
  const { party } = useUserParty();
  const {
    selectedElection,
    selectedElectionGroup,
    isLive,
    setIsLive,
  } = useElection();

  const [drillDown, setDrillDown] = useState<{
    stateId?: number;
    lgaId?: number;
    wardId?: number;
  }>({});

  // Reset local drill-down when active election or group changes
  useEffect(() => {
    setDrillDown({});
  }, [selectedElection?.id, selectedElectionGroup?.id]);

  const stateId = drillDown.stateId ?? (selectedElection?.state_id as number | undefined) ?? undefined;
  const lgaId = drillDown.lgaId ?? (selectedElection?.lga_id as number | undefined) ?? undefined;
  const wardId = drillDown.wardId ?? (selectedElection?.ward_id as number | undefined) ?? undefined;

  const fetchBreakdown = useServerFn(getOperationsBreakdown);

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
      "election-operations-breakdown",
      selectedElection?.id,
      selectedElectionGroup?.id,
      party?.id,
      wardId,
      lgaId,
      stateId,
      isLive,
    ],
    queryFn: async () => {
      if (!selectedElection?.id && !selectedElectionGroup?.id) return null;
      return fetchBreakdown({
        data: {
          electionId: selectedElection?.id,
          electionGroupId: selectedElectionGroup?.id,
          partyId: party?.id,
          stateId,
          lgaId,
          wardId,
          limit: 150,
        },
      });
    },
    enabled: !!(selectedElection?.id || selectedElectionGroup?.id),
    refetchInterval: isLive ? 15000 : false,
  });

  const payload = (data as any)?.data || data;
  const rawData = payload?.data || payload;
  const items: OperationsUnitItem[] = Array.isArray(rawData?.units)
    ? rawData.units
    : [];

  const unitTitle = rawData?.unit_title || computedTitle;
  const unitType = (rawData?.unit_type || "").toLowerCase();
  const supervisorTitle = rawData?.supervisor_title || "State Supervisors";

  const handleSelectUnit = (item: OperationsUnitItem) => {
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
        activeTab="operations"
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
          Loading election operations statistics...
        </div>
      ) : !selectedElection?.id && !selectedElectionGroup?.id ? (
        <div className="py-16 text-center text-c-50 text-[15px]">
          Select an election to view operations statistics.
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-c-50 text-[15px]">
          No election operations data available for this scope.
        </div>
      ) : (
        <OperationsTable
          items={items}
          unitTitle={unitTitle}
          unitType={unitType}
          supervisorTitle={supervisorTitle}
          onSelectUnit={isDrillable ? handleSelectUnit : undefined}
        />
      )}
    </Layout>
  );
}
