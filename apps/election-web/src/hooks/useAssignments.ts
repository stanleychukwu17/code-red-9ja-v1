import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyPollingUnitAssignment } from "#/lib/server/polling_unit_assignments";
import { useUser } from "./useUser";
import { useElection } from "./useElection";

/**
 * Represents an active supervisor assignment for an election.
 * Can be scoped to state, LGA (Local Government Area), or ward level.
 */
export interface SupervisorAssignment {
	type: "state" | "lga" | "ward";
	data: any;
}

/**
 * Hook to fetch and resolve election duty assignments for the active user.
 *
 * Exposes:
 * - Polling agent assignments scoped to current user & selected election group
 * - Supervisor assignments across hierarchy levels (State -> LGA -> Ward)
 * - Effective `pollingUnitId` resolved from assignment or profile fallback
 *
 * @returns Object containing:
 * - `pollingUnitAssignment`: Primary polling agent assignment (first entry or null)
 * - `supervisorAssignment`: Active supervisor role details (`{ type, data }` or null)
 * - `rawSupervisorAssignments`: Raw supervisor payload from the server
 * - `pollingUnitId`: Effective polling unit ID for tasks, arrivals, and results
 * - `isLoading`: Combined query loading state
 */
export const useAssignments = (electionGroupId?: number | string) => {
	const user = useUser();
	const { selectedElectionGroup } = useElection();

	const targetElectionGroupId = electionGroupId !== undefined ? electionGroupId : selectedElectionGroup?.id;

	// 1. Fetch authenticated user's election duty assignments (polling unit & supervisor) in a single request
	const fetchMyAssignment = useServerFn(getMyPollingUnitAssignment);
	const { data: assignmentsData, isLoading } = useQuery({
		queryKey: ["myPollingUnitAssignment", targetElectionGroupId ?? "auto"],
		queryFn: async () => {
			const res = await fetchMyAssignment({
				data: targetElectionGroupId
					? {
							election_group_id: targetElectionGroupId,
						}
					: undefined,
			});
			if (!res?.success || !res.data) return null;
			return res.data;
		},
		staleTime: Infinity,
	});

	// Primary polling agent assignment (single assignment per user per election group)
	const pollingUnitAssignment = assignmentsData?.assignment ?? null;

	// 2. Supervisor assignments payload (State, LGA, or Ward level)
	const supervisorAssignmentsData = assignmentsData?.supervisor_assignments ?? null;

	// 3. Normalize supervisor role with hierarchy priority: State > LGA > Ward
	let supervisorAssignment: SupervisorAssignment | null = null;
	if (supervisorAssignmentsData) {
		if (supervisorAssignmentsData.state_supervisor) {
			supervisorAssignment = {
				type: "state",
				data: supervisorAssignmentsData.state_supervisor,
			};
		} else if (supervisorAssignmentsData.lga_supervisor) {
			supervisorAssignment = {
				type: "lga",
				data: supervisorAssignmentsData.lga_supervisor,
			};
		} else if (supervisorAssignmentsData.ward_supervisor) {
			supervisorAssignment = {
				type: "ward",
				data: supervisorAssignmentsData.ward_supervisor,
			};
		}
	}

	// 4. Resolve effective polling unit ID (assigned unit takes precedence over profile default)
	const pollingUnitId = pollingUnitAssignment?.polling_unit_id ?? user?.polling_unit_id ?? null;

	const hasActiveAssignment = !!pollingUnitAssignment || !!supervisorAssignment;

	return {
		hasActiveAssignment,
		pollingUnitAssignment,
		supervisorAssignment,
		rawSupervisorAssignments: supervisorAssignmentsData,
		pollingUnitId,
		isLoading,
	};
};
