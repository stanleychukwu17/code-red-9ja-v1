import { useAppDispatch, useAppSelector } from "#/redux/hooks";
import {
	selectSelectedElection,
	selectSelectedElectionGroup,
	setSelectedElection as setSelectedElectionAction,
	setSelectedElectionGroup as setSelectedElectionGroupAction,
} from "#/redux/slice/electionSlice";

// Checks if election date matches today (UTC)
export const isElectionDay = (electionDate?: string | null): boolean => {
	if (!electionDate) return false;
	try {
		const parsed = new Date(electionDate);
		if (isNaN(parsed.getTime())) return false;
		const today = new Date().toISOString().split("T")[0];
		const d = parsed.toISOString().split("T")[0];
		return today === d;
	} catch {
		return false;
	}
};

// Calculates countdown days remaining until election date
export const calculateDaysLeft = (
	electionDate?: string | null,
): { daysLeft?: number; diffDays?: number } => {
	if (!electionDate) return {};
	try {
		const d = new Date(electionDate);
		if (isNaN(d.getTime())) return {};
		d.setHours(0, 0, 0, 0);
		const now = new Date();
		now.setHours(0, 0, 0, 0);
		const diffTime = d.getTime() - now.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return {
			diffDays,
			daysLeft: diffDays >= 0 ? diffDays : undefined,
		};
	} catch {
		return {};
	}
};

// Current election session state and dispatch helpers
export const useElection = () => {
	const dispatch = useAppDispatch();
	const selectedElectionGroup = useAppSelector(selectSelectedElectionGroup);
	const selectedElection = useAppSelector(selectSelectedElection);

	// Check if today matches the active election group's scheduled date
	const electionDay = isElectionDay(selectedElectionGroup?.election_date);
	// const { daysLeft, diffDays } = calculateDaysLeft(selectedElectionGroup?.election_date);
	const daysLeft = 0;
	const diffDays = 0;

	return {
		selectedElectionGroup,
		selectedElection,
		electionDay,
		daysLeft,
		diffDays,
		setSelectedElectionGroup: (group: any | null) => {
			dispatch(setSelectedElectionGroupAction(group));
		},
		setSelectedElection: (election: any | null) => {
			dispatch(setSelectedElectionAction(election));
		},
	};
};

// Auto-selects default election group and election based on proximity and rank
export const getAutoSelectedSession = (groups: any[], elections: any[]) => {
	let selectedGroup = null;
	let selectedElection = null;

	if (groups.length > 0) {
		const now = new Date();
		now.setHours(0, 0, 0, 0);

		// Prioritize upcoming or today's elections over past elections
		let validGroups = groups.filter((g: any) => {
			if (!g.election_date) return false;
			const d = new Date(g.election_date);
			d.setHours(0, 0, 0, 0);
			return d.getTime() >= now.getTime();
		});

		if (validGroups.length === 0) validGroups = [...groups];

		// Sort by date proximity to today, then priority rank
		validGroups.sort((a: any, b: any) => {
			if (a.election_date && b.election_date) {
				const dA = new Date(a.election_date);
				dA.setHours(0, 0, 0, 0);
				const dB = new Date(b.election_date);
				dB.setHours(0, 0, 0, 0);

				const diffA = Math.abs(dA.getTime() - now.getTime());
				const diffB = Math.abs(dB.getTime() - now.getTime());

				if (diffA !== diffB) {
					return diffA - diffB;
				}
			}

			return (a.rank ?? 999) - (b.rank ?? 999);
		});

		selectedGroup = validGroups[0] || null;
	}

	// Pick the highest-priority sub-election for the chosen group
	if (elections.length > 0 && selectedGroup) {
		const sortedElections = [...elections].sort((a: any, b: any) => {
			return (a.rank ?? 999) - (b.rank ?? 999);
		});
		selectedElection = sortedElections[0] || null;
	}

	return { selectedGroup, selectedElection };
};
