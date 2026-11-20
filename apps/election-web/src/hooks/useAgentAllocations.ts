import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAgentAllocations } from "#/lib/server/practice_tests";
import { useElection } from "./useElection";
import { useAssignments } from "./useAssignments";

export type AllocationItem = {
	task_type: string;
	label: string;
	percentage: number;
	potential_payout_kobo: number;
};

export type AgentAllocationsData = {
	role_type: string;
	potential_payment_kobo: number;
	allocations: AllocationItem[];
	total_percentage: number;
};

/**
 * useAgentAllocations loads the entire task payout breakdown for the active agent / election in one single query.
 * Cached globally via TanStack React Query so multiple cards on the dashboard share the single response without N+1 requests.
 */
export function useAgentAllocations() {
	const { selectedElectionGroup } = useElection();
	const { pollingUnitAssignment } = useAssignments();
	const fetchAllocations = useServerFn(getAgentAllocations);

	const assignmentId = pollingUnitAssignment?.id;
	const electionGroupId = selectedElectionGroup?.id;

	const { data, isLoading, error } = useQuery({
		queryKey: ["agentAllocations", assignmentId ?? "no-assignment", electionGroupId ?? "no-group"],
		queryFn: async () => {
			const res = await fetchAllocations({
				data: {
					assignmentId: assignmentId ? Number(assignmentId) : undefined,
					electionGroupId: electionGroupId ? Number(electionGroupId) : undefined,
				},
			});
			if (!res?.success || !res?.data?.allocations) return null;
			return res.data.allocations as AgentAllocationsData;
		},
		staleTime: Infinity,
	});

	/**
	 * Helper to get payout amount in Naira for a specific task milestone (e.g. "attendance", "election_start", "results", "updates")
	 */
	const getPayoutNaira = (taskType: string): number | undefined => {
		if (!data?.allocations) return undefined;
		const item = data.allocations.find((a) => a.task_type === taskType);
		if (!item) return undefined;
		return item.potential_payout_kobo / 100;
	};

	return {
		allocations: data?.allocations ?? [],
		potentialPaymentNaira: data ? data.potential_payment_kobo / 100 : undefined,
		roleType: data?.role_type,
		getPayoutNaira,
		isLoading,
		error,
	};
}
