import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getElectionCandidates } from "#/lib/server/elections";
import { getElectionScopedFinalResult } from "#/lib/server/final-results";
import { useElection } from "./useElection";
import { useAssignments } from "./useAssignments";

/**
 * Optional configuration overrides for `useElectionResults`.
 * Allows components (such as Leaderboard or custom analytics cards) to customize
 * the election context, geographic scope, or polling behavior.
 */
export interface UseElectionResultsOptions {
	/** Election ID to fetch results for. Defaults to `selectedElection.id` */
	electionId?: number;
	/** Whether to strictly filter results to the user's supervisor/agent jurisdiction. Defaults to `electionState.isLock` */
	isLock?: boolean;
	/** Whether to enable 15-second live polling. Defaults to `electionState.isLive` */
	isLive?: boolean;
	/** Supervisor assignment override for geographic scoping */
	selectedSupervisorAssignment?: any;
	/** Polling unit ID override for unit-level scoping */
	pollingUnitId?: number | null;
}

/**
 * Hook to fetch candidate rosters and scoped final election results.
 *
 * Key Behaviors:
 * 1. Candidates: Fetches the roster of candidates participating in the election contest.
 * 2. Scoped Results Resolution:
 *    - Unlocked Mode (`!isLock`): Returns broader election-wide results without geographic constraints.
 *    - Locked Mode (`isLock`): Scopes tally numbers to the user's assigned jurisdiction:
 *      - State Supervisor: Scoped to State ID
 *      - LGA Supervisor: Scoped to LGA ID
 *      - Ward Supervisor: Scoped to Ward ID
 *      - Polling Agent: Scoped to Polling Unit ID
 * 3. Controlled Polling: Activates a 15-second `refetchInterval` ONLY when `isLive` is true,
 *    preventing unnecessary network traffic on non-result pages.
 *
 * @param options - Optional overrides for election ID, scoping, and polling
 * @returns Object containing:
 * - `electionCandidates`: Array of registered candidates for the contest
 * - `finalResultObj`: Scoped election vote breakdown and winner status
 * - `scopedResultData`: Raw API response object
 * - `isResultLoading`: Query loading status
 */
export const useElectionResults = (options?: UseElectionResultsOptions) => {
	// Read defaults from ambient election and assignment hooks
	const electionState = useElection();
	const assignmentState = useAssignments();

	const electionId = options?.electionId ?? electionState.selectedElection?.id;
	const isLock = options?.isLock ?? electionState.isLock;
	const isLive = options?.isLive ?? electionState.isLive;
	const selectedSupervisorAssignment =
		options?.selectedSupervisorAssignment ?? assignmentState.selectedSupervisorAssignment;
	const pollingUnitId = options?.pollingUnitId ?? assignmentState.pollingUnitId;

	// 1. Fetch registered candidates running in this contest
	const fetchElectionCandidates = useServerFn(getElectionCandidates);
	const { data: candidatesData } = useQuery({
		queryKey: ["election-candidates", electionId],
		queryFn: () =>
			fetchElectionCandidates({
				data: { electionId: electionId as number },
			}),
		enabled: !!electionId,
	});
	const electionCandidates = candidatesData?.data?.candidates || candidatesData?.candidates || [];

	// 2. Fetch scoped final results based on election, lock status, and user jurisdiction
	const fetchScopedFinalResultFn = useServerFn(getElectionScopedFinalResult);

	const { data: scopedResultData, isLoading: isResultLoading } = useQuery({
		queryKey: [
			"election-scoped-final-result",
			electionId,
			isLock,
			selectedSupervisorAssignment?.type,
			selectedSupervisorAssignment?.data?.state_id,
			selectedSupervisorAssignment?.data?.lga_id,
			selectedSupervisorAssignment?.data?.ward_id,
			pollingUnitId,
			isLive,
		],
		queryFn: async () => {
			// When lock is disabled, query broader contest-level results without geographic filters
			if (!isLock) {
				return fetchScopedFinalResultFn({
					data: {
						electionId: electionId as number,
					},
				});
			}

			// When locked, filter results to supervisor's specific operational boundary
			if (selectedSupervisorAssignment) {
				if (selectedSupervisorAssignment.type === "state") {
					return fetchScopedFinalResultFn({
						data: {
							electionId: electionId as number,
							stateId: selectedSupervisorAssignment.data.state_id,
						},
					});
				}
				if (selectedSupervisorAssignment.type === "lga") {
					return fetchScopedFinalResultFn({
						data: {
							electionId: electionId as number,
							lgaId: selectedSupervisorAssignment.data.lga_id,
						},
					});
				}
				if (selectedSupervisorAssignment.type === "ward") {
					return fetchScopedFinalResultFn({
						data: {
							electionId: electionId as number,
							wardId: selectedSupervisorAssignment.data.ward_id,
						},
					});
				}
			}

			// If user is assigned to a polling unit, scope results directly to that unit
			if (pollingUnitId) {
				return fetchScopedFinalResultFn({
					data: {
						electionId: electionId as number,
						pollingUnitId: Number(pollingUnitId),
					},
				});
			}

			// Fallback: Default contest-level results
			return fetchScopedFinalResultFn({
				data: {
					electionId: electionId as number,
				},
			});
		},
		enabled: !!electionId,
		// Auto-poll every 15s strictly when isLive is active
		refetchInterval: isLive ? 15000 : false,
	});

	const finalResultObj = scopedResultData?.data?.final_result || null;

	return {
		electionCandidates,
		finalResultObj,
		scopedResultData,
		isResultLoading,
	};
};
