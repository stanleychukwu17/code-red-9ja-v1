import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyPollingUnitAssignment } from "#/lib/server/polling_unit_assignments";
import { useUser } from "./useUser";
import { useElection } from "./useElection";

// Active supervisor assignment scoped to state, LGA, or ward level
export type SupervisorAssignment = {
	type: "state" | "lga" | "ward";
	data: any;
};

// Hook to fetch and resolve election duty assignments (polling unit & supervisor)
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
	const pollingUnitAssignment = assignmentsData?.polling_unit_assignment ?? null;
	const role_type:
		| "state_election_supervisor"
		| "lga_election_supervisor"
		| "ward_election_supervisor"
		| "polling_agent"
		| null = assignmentsData?.role_type ?? null;

	// 2. Supervisor assignments payload (State, LGA, or Ward level)
	const supervisorAssignmentsData = assignmentsData?.supervisor_assignments ?? null;

	// 3. Normalize supervisor role using role_type
	let supervisorAssignment: SupervisorAssignment | null = null;
	if (role_type === "state_election_supervisor") {
		supervisorAssignment = {
			type: "state",
			data: supervisorAssignmentsData?.state_supervisor,
		};
	} else if (role_type === "lga_election_supervisor") {
		supervisorAssignment = {
			type: "lga",
			data: supervisorAssignmentsData?.lga_supervisor,
		};
	} else if (role_type === "ward_election_supervisor") {
		supervisorAssignment = {
			type: "ward",
			data: supervisorAssignmentsData?.ward_supervisor,
		};
	}

	// 4. Resolve effective polling unit ID (assigned unit takes precedence over profile default)
	const pollingUnitId = pollingUnitAssignment?.polling_unit_id ?? user?.polling_unit_id ?? null;

	const hasActiveAssignment = assignmentsData?.has_active_assignment ?? false;

	// 5. Active assignment political party ID
	const partyId: number | null = assignmentsData?.party_id ?? null;

	return {
		hasActiveAssignment,
		pollingUnitAssignment,
		supervisorAssignment,
		rawSupervisorAssignments: supervisorAssignmentsData,
		pollingUnitId,
		role_type,
		partyId,
		isLoading,
	};
};
