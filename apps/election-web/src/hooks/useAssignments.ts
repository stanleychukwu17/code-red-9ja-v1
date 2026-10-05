import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPollingUnitAssignments } from "#/lib/server/polling_unit_assignments";
import { getSupervisorAssignments } from "#/lib/server/supervisor_assignments";
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
 * - `selectedAssignment`: Primary polling agent assignment (first entry or null)
 * - `assignments`: Full array of polling agent assignments
 * - `selectedSupervisorAssignment`: Active supervisor role details (`{ type, data }` or null)
 * - `rawSupervisorAssignments`: Raw supervisor payload from the server
 * - `pollingUnitId`: Effective polling unit ID for tasks, arrivals, and results
 * - `isLoading`: Combined query loading state
 */
export const useAssignments = () => {
	const user = useUser();
	const { selectedElectionGroup } = useElection();

	// 1. Fetch Polling Unit Agent assignments for the active election group
	const fetchAssignments = useServerFn(getPollingUnitAssignments);
	const { data: assignmentsData, isLoading: isAssignmentsLoading } = useQuery({
		queryKey: ["pollingAgentAssignments", user?.id, selectedElectionGroup?.id],
		enabled: !!user?.id && !!selectedElectionGroup?.id,
		queryFn: async () => {
			const res = await fetchAssignments({
				data: {
					user_id: user?.id,
					election_group_id: selectedElectionGroup?.id,
				},
			});
			if (!res?.success || !res.data?.assignments) return [];
			return res.data.assignments;
		},
	});

	// Primary polling agent assignment (if user is assigned to one or more units)
	const selectedAssignment =
		assignmentsData && assignmentsData.length > 0 ? assignmentsData[0] : null;

	// 2. Fetch Supervisor assignments (State, LGA, or Ward level)
	const fetchSupervisorAssignments = useServerFn(getSupervisorAssignments);
	const { data: supervisorAssignmentsData, isLoading: isSupervisorLoading } = useQuery({
		queryKey: ["supervisorAssignments", user?.id, selectedElectionGroup?.id],
		enabled: !!user?.id && !!selectedElectionGroup?.id,
		queryFn: async () => {
			const res = await fetchSupervisorAssignments({
				data: {
					user_id: user?.id,
					election_group_id: selectedElectionGroup?.id,
				},
			});
			if (!res?.success || !res.data?.assignments) return null;
			return res.data.assignments;
		},
	});

	// 3. Normalize supervisor role with hierarchy priority: State > LGA > Ward
	let selectedSupervisorAssignment: SupervisorAssignment | null = null;
	if (supervisorAssignmentsData) {
		if (supervisorAssignmentsData.state_supervisor) {
			selectedSupervisorAssignment = {
				type: "state",
				data: supervisorAssignmentsData.state_supervisor,
			};
		} else if (supervisorAssignmentsData.lga_supervisor) {
			selectedSupervisorAssignment = {
				type: "lga",
				data: supervisorAssignmentsData.lga_supervisor,
			};
		} else if (supervisorAssignmentsData.ward_supervisor) {
			selectedSupervisorAssignment = {
				type: "ward",
				data: supervisorAssignmentsData.ward_supervisor,
			};
		}
	}

	// 4. Resolve effective polling unit ID (assigned unit takes precedence over profile default)
	const pollingUnitId = selectedAssignment?.polling_unit_id ?? user?.polling_unit_id ?? null;

	return {
		selectedAssignment,
		assignments: assignmentsData || [],
		selectedSupervisorAssignment,
		rawSupervisorAssignments: supervisorAssignmentsData,
		pollingUnitId,
		isLoading: isAssignmentsLoading || isSupervisorLoading,
	};
};
