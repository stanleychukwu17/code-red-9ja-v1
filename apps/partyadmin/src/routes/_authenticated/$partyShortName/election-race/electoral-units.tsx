import { createFileRoute } from "@tanstack/react-router";
import { Layout, PageHeader } from "@repo/ui/components/custom/AdminLayouts";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ElectoralUnitsTable } from "#/components/Tables";
import type { ElectoralUnitItem } from "#/components/tiles/candidate-result-tile";
import { useAppContext } from "#/hooks/useAppContext";
import { getElectoralUnitsBreakdown } from "#/lib/server/election-results";
import { getPageHeader } from "#/lib/shared/meta";
import { ElectionRaceFilterBar, ElectionRaceHeaderRight } from "./-components";
import { getElectionRaceTabs } from "./-data";

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/election-race/electoral-units",
)({
  head: () => getPageHeader({ title: "Election Race - Electoral Units" }),
  component: ElectoralUnitsPage,
});

function ElectoralUnitsPage() {
  const { partyShortName } = Route.useParams();
  const {
    selectedElection,
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
    isLive,
    setIsLive,
  } = useAppContext();

  const fetchBreakdown = useServerFn(getElectoralUnitsBreakdown);

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
      "electoral-units-breakdown",
      selectedElection?.id,
      selectedWardId,
      selectedLGAId,
      selectedStateConstituencyId,
      selectedFederalConstituencyId,
      selectedDistrictId,
      selectedStateId,
      isLive,
    ],
    queryFn: async () => {
      if (!selectedElection?.id) return null;
      return fetchBreakdown({
        data: {
          electionId: selectedElection.id,
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

  const isDrillable =
    unitType !== "polling_units" && unitTitle !== "Polling Units";

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
      <ElectionRaceFilterBar />
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
