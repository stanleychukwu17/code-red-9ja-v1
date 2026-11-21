import { toast } from "sonner";
import { useAssignments } from "./useAssignments";
import { useElection } from "./useElection";

export type UseAgentDutyEligibilityOptions = {
	dutyName?: string;
	roleType?: "agent" | "supervisor" | "any";
};

export function useAgentDutyEligibility(options: UseAgentDutyEligibilityOptions = {}) {
	const { dutyName = "Updates", roleType = "agent" } = options;
	const { selectedElectionGroup, electionDay, daysLeft, diffDays } = useElection();
	const { pollingUnitAssignment, supervisorAssignment, isLoading: isAssignmentsLoading } = useAssignments();

	const hasAssignment =
		roleType === "supervisor"
			? Boolean(supervisorAssignment)
			: roleType === "any"
				? Boolean(pollingUnitAssignment || supervisorAssignment)
				: Boolean(pollingUnitAssignment);

	const activeAssignmentElectionGroupId =
		roleType === "supervisor"
			? supervisorAssignment?.data?.election_group_id
			: pollingUnitAssignment?.election_group_id ?? supervisorAssignment?.data?.election_group_id;

	// Check for election group mismatch
	const isElectionMismatch = Boolean(
		selectedElectionGroup?.id &&
		activeAssignmentElectionGroupId &&
		selectedElectionGroup.id !== activeAssignmentElectionGroupId
	);

	// Determine eligibility & error message
	let errorMessage: string | null = null;
	if (!hasAssignment && !isAssignmentsLoading) {
		errorMessage = roleType === "supervisor" ? "No active supervisor assignment detected." : "No active polling unit assignment detected.";
	} else if (isElectionMismatch) {
		errorMessage = "Active election does not match your assigned duty election.";
	} else if (!electionDay) {
		errorMessage = `${dutyName} can only be submitted on election day.`;
	}

	const isEligible = !isAssignmentsLoading && errorMessage === null;

	/**
	 * Checks eligibility and fires a toast notification if ineligible.
	 * Returns true if eligible, false otherwise.
	 */
	const validateEligibility = (): boolean => {
		if (isAssignmentsLoading) {
			toast.info("Loading assignment details, please wait...");
			return false;
		}

		if (!isEligible && errorMessage) {
			toast.error(errorMessage);
			return false;
		}

		return true;
	};

	return {
		isEligible,
		errorMessage,
		validateEligibility,
		isElectionMismatch,
		electionDay,
		daysLeft,
		diffDays,
		pollingUnitAssignment,
		supervisorAssignment,
		selectedElectionGroup,
		isLoading: isAssignmentsLoading,
	};
}
