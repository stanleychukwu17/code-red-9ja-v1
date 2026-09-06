import { createFileRoute } from "@tanstack/react-router";
import { Layout, PageHeader } from "@repo/ui/components/custom/AdminLayouts";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { OperationsTable } from "#/components/Tables";
import type { OperationsUnitItem } from "#/lib/server/election-operations";
import { getOperationsBreakdown } from "#/lib/server/election-operations";
import { useAppContext } from "#/hooks/useAppContext";
import { getPageHeader } from "#/lib/shared/meta";
import { ElectionRaceFilterBar, ElectionRaceHeaderRight } from "./-components";
import { getElectionRaceTabs } from "./-data";

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/election-race/operations",
)({
  head: () => getPageHeader({ title: "Election Race - Operations" }),
  component: OperationsPage,
});

function OperationsPage() {
  const { partyShortName } = Route.useParams();
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
    isLive,
    setIsLive,
  } = useAppContext();

  const fetchBreakdown = useServerFn(getOperationsBreakdown);

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
      "election-operations-breakdown",
      selectedElection?.id,
      selectedElectionGroup?.id,
      party?.id,
      selectedWardId,
      selectedLGAId,
      selectedStateConstituencyId,
      selectedFederalConstituencyId,
      selectedDistrictId,
      selectedStateId,
      isLive,
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
    refetchInterval: isLive ? 15000 : false,
  });
  console.log({ data });

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
        activeTab="operations"
        tabs={getElectionRaceTabs(partyShortName)}
        rightComponent={
          <ElectionRaceHeaderRight isLive={isLive} setIsLive={setIsLive} />
        }
      />
      <ElectionRaceFilterBar />
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
