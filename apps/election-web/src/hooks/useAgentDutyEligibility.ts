import { toast } from "sonner";
import { useAssignments } from "./useAssignments";
import { useElection } from "./useElection";

export type UseAgentDutyEligibilityOptions = {
	dutyName?: string;
};

export function useAgentDutyEligibility(options: UseAgentDutyEligibilityOptions = {}) {
	const { dutyName = "Updates" } = options;
	const { selectedElectionGroup, electionDay, daysLeft, diffDays } = useElection();
	const { pollingUnitAssignment, isLoading: isAssignmentsLoading } = useAssignments();

	// Check for election group mismatch
	const isElectionMismatch = Boolean(
		selectedElectionGroup?.id &&
		pollingUnitAssignment?.election_group_id &&
		selectedElectionGroup.id !== pollingUnitAssignment.election_group_id
	);

	// Determine eligibility & error message
	let errorMessage: string | null = null;
	if (!pollingUnitAssignment && !isAssignmentsLoading) {
		errorMessage = "No active polling unit assignment detected.";
	} else if (isElectionMismatch) {
		errorMessage = "Active election does not match your assigned polling unit election.";
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
		selectedElectionGroup,
		isLoading: isAssignmentsLoading,
	};
}
