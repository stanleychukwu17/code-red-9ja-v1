import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getElectionCandidates } from "#/lib/server/elections";
import { getElectionScopedFinalResult } from "#/lib/server/final-results";
import { useElection } from "./useElection";

/**
 * Hook to fetch candidates fielded for the currently active election.
 */
export const useElectionCandidates = () => {
	const { selectedElection } = useElection();
	const fetchElectionCandidates = useServerFn(getElectionCandidates);

	const { data: candidatesData } = useQuery({
		queryKey: ["election-candidates", selectedElection?.id],
		queryFn: () =>
			fetchElectionCandidates({
				data: { electionId: selectedElection?.id as number },
			}),
		enabled: !!selectedElection?.id,
	});

	return candidatesData?.data?.candidates || candidatesData?.candidates || [];
};

/**
 * Hook to fetch scoped final consensus results for the active election and geographic scope.
 * Isolates the 15-second live polling interval strictly to components displaying results.
 */
export const useElectionScopedFinalResult = () => {
	const {
		selectedElection,
		selectedStateId,
		selectedDistrictId,
		selectedFederalConstituencyId,
		selectedStateConstituencyId,
		selectedLGAId,
		selectedWardId,
		isLive,
	} = useElection();

	const fetchScopedFinalResultFn = useServerFn(getElectionScopedFinalResult);

	const { data: scopedResultData, isLoading: isResultLoading } = useQuery({
		queryKey: [
			"election-scoped-final-result",
			selectedElection?.id,
			selectedStateId,
			selectedDistrictId,
			selectedFederalConstituencyId,
			selectedStateConstituencyId,
			selectedLGAId,
			selectedWardId,
			isLive,
		],
		queryFn: () =>
			fetchScopedFinalResultFn({
				data: {
					electionId: selectedElection?.id as number,
					wardId: selectedWardId,
					stateConstituencyId: selectedStateConstituencyId,
					lgaId: selectedLGAId,
					federalConstituencyId: selectedFederalConstituencyId,
					senatorialDistrictId: selectedDistrictId,
					stateId: selectedStateId,
				},
			}),
		enabled: !!selectedElection?.id,
		refetchInterval: isLive ? 15000 : false,
	});

	const finalResultObj = scopedResultData?.data?.final_result || null;

	return { finalResultObj, isResultLoading };
};

/**
 * Combined results hook providing both candidate lists and live scoped consensus returns.
 */
export const useElectionResults = () => {
	const electionCandidates = useElectionCandidates();
	const { finalResultObj, isResultLoading } = useElectionScopedFinalResult();

	return {
		electionCandidates,
		finalResultObj,
		isResultLoading,
	};
};
