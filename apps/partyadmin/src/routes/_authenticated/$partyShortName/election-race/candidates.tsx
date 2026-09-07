import { Layout, PageHeader } from "@repo/ui/components/custom/AdminLayouts";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CandidateResultsTable } from "#/components/Tables";
import type { CandidateResultItem } from "#/components/tiles/candidate-result-tile";
import { useAppContext } from "#/hooks/useAppContext";
import { getScopedElectionResult } from "#/lib/server/election-results";
import { getPageHeader } from "#/lib/shared/meta";
import { ElectionRaceFilterBar, ElectionRaceHeaderRight } from "./-components";
import { getElectionRaceTabs } from "./-data";

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/election-race/candidates",
)({
  head: () => getPageHeader({ title: "Election Race - Candidates" }),
  component: CandidatesPage,
});

function CandidatesPage() {
  const { partyShortName } = Route.useParams();
  const {
    selectedElection,
    selectedStateId,
    selectedDistrictId,
    selectedFederalConstituencyId,
    selectedStateConstituencyId,
    selectedLGAId,
    selectedWardId,
    isLive,
    setIsLive,
  } = useAppContext();

  const fetchScopedResult = useServerFn(getScopedElectionResult);

  const { data, isLoading } = useQuery({
    queryKey: [
      "scoped-election-result",
      selectedElection?.id,
      selectedStateId,
      selectedDistrictId,
      selectedFederalConstituencyId,
      selectedStateConstituencyId,
      selectedLGAId,
      selectedWardId,
      isLive,
    ],
    queryFn: async () => {
      if (!selectedElection?.id) return null;
      return fetchScopedResult({
        data: {
          electionId: selectedElection.id,
          stateId: selectedStateId || undefined,
          senatorialDistrictId: selectedDistrictId || undefined,
          federalConstituencyId: selectedFederalConstituencyId || undefined,
          stateConstituencyId: selectedStateConstituencyId || undefined,
          lgaId: selectedLGAId || undefined,
          wardId: selectedWardId || undefined,
        },
      });
    },
    enabled: !!selectedElection?.id,
    refetchInterval: isLive ? 15000 : false,
  });
  const finalResult =
    (data as any)?.data?.final_result || (data as any)?.final_result;
  const items: CandidateResultItem[] =
    (isLive && finalResult?.candidate_results_live?.length
      ? finalResult.candidate_results_live
      : finalResult?.candidate_results) ?? [];

  return (
    <Layout>
      <PageHeader
        title="Electoral Race"
        activeTab="candidates"
        tabs={getElectionRaceTabs(partyShortName)}
        rightComponent={
          <ElectionRaceHeaderRight isLive={isLive} setIsLive={setIsLive} />
        }
      />
      <ElectionRaceFilterBar />

      {isLoading ? (
        <div className="py-16 text-center text-c-50 text-[15px]">
          Loading candidate results...
        </div>
      ) : !selectedElection?.id ? (
        <div className="py-16 text-center text-c-50 text-[15px]">
          Select an election to view candidate results.
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-c-50 text-[15px]">
          No candidate results available for this scope.
        </div>
      ) : (
        <CandidateResultsTable items={items} />
      )}
    </Layout>
  );
}
