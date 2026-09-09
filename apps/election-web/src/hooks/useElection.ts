import { useAppDispatch, useAppSelector } from "#/redux/hooks";
import {
	selectIsLive,
	selectIsLocked,
	selectSelectedElection,
	selectSelectedElectionGroup,
	setIsLive,
	setIsLocked,
	setSelectedElection as setSelectedElectionAction,
	setSelectedElectionGroup as setSelectedElectionGroupAction,
} from "#/redux/slice/electionSlice";

/**
 * Checks if a given election date string matches today's date in UTC (YYYY-MM-DD).
 *
 * @param electionDate - Optional ISO/date string of the election
 * @returns True if today is the scheduled election day, false otherwise
 */
export const isElectionDay = (electionDate?: string | null): boolean => {
	if (!electionDate) return false;
	const today = new Date().toISOString().split("T")[0];
	const d = new Date(electionDate).toISOString().split("T")[0];
	return today === d;
};

/**
 * Hook providing read/write access to the current election session in Redux.
 *
 * Exposes:
 * - `selectedElectionGroup`: The active election group (e.g. 2027 General Elections)
 * - `selectedElection`: The specific contest selected (e.g. Presidential, Gubernatorial)
 * - `isLive`: Whether real-time updates and live polling are currently enabled
 * - `isLock`: Whether scoped supervisor/agent boundaries are strictly locked
 * - `electionDay`: Boolean flag indicating if today is the election date
 * - Dispatch helpers: `setIsLive`, `setIsLocked`, `setSelectedElectionGroup`, `setSelectedElection`
 */
export const useElection = () => {
	const dispatch = useAppDispatch();
	const selectedElectionGroup = useAppSelector(selectSelectedElectionGroup);
	const selectedElection = useAppSelector(selectSelectedElection);
	const isLive = useAppSelector(selectIsLive);
	const isLock = useAppSelector(selectIsLocked);

	// Check if today matches the active election group's scheduled date
	const electionDay = isElectionDay(selectedElectionGroup?.election_date);

	return {
		selectedElectionGroup,
		selectedElection,
		isLive,
		isLock,
		electionDay,
		setIsLive: (v: boolean) => dispatch(setIsLive(v)),
		setIsLocked: (v: boolean) => dispatch(setIsLocked(v)),
		setSelectedElectionGroup: (group: any | null) => {
			dispatch(setSelectedElectionGroupAction(group));
		},
		setSelectedElection: (election: any | null) => {
			dispatch(setSelectedElectionAction(election));
		},
	};
};

/**
 * Intelligently determines the best default election group and election to auto-select.
 *
 * Selection Heuristics:
 * 1. Filtering: Filters for upcoming or current elections (today or in the future).
 *    If all elections are in the past, falls back to the full list.
 * 2. Date Proximity: Sorts elections by closest distance to today's date.
 * 3. Priority Rank: Uses `rank` as tie-breaker (lower number = higher priority, e.g. 1 over 2).
 * 4. Sub-election Selection: Selects the highest-ranked individual election contest for the group.
 *
 * @param groups - Array of election groups
 * @param elections - Array of specific election contests belonging to the selected group
 * @returns Object containing the best `{ selectedGroup, selectedElection }`
 */
export const getAutoSelectedSession = (groups: any[], elections: any[]) => {
	let selectedGroup = null;
	let selectedElection = null;

	if (groups.length > 0) {
		const now = new Date();
		now.setHours(0, 0, 0, 0);

		// Step 1: Prioritize upcoming or today's elections over past elections
		let validGroups = groups.filter((g: any) => {
			if (!g.election_date) return false;
			const d = new Date(g.election_date);
			d.setHours(0, 0, 0, 0);
			return d.getTime() >= now.getTime();
		});

		// Fallback: If no future/current election exists, evaluate all available groups
		if (validGroups.length === 0) validGroups = [...groups];

		// Step 2: Sort by date proximity to today, then by numerical rank
		validGroups.sort((a: any, b: any) => {
			if (a.election_date && b.election_date) {
				const dA = new Date(a.election_date);
				dA.setHours(0, 0, 0, 0);
				const dB = new Date(b.election_date);
				dB.setHours(0, 0, 0, 0);

				const diffA = Math.abs(dA.getTime() - now.getTime());
				const diffB = Math.abs(dB.getTime() - now.getTime());

				// Choose the date closest to today
				if (diffA !== diffB) {
					return diffA - diffB;
				}
			}

			// Step 3: Tie-breaker by priority rank (lower value = better rank, e.g. 1 over 2)
			return (a.rank ?? 999) - (b.rank ?? 999);
		});

		selectedGroup = validGroups[0] || null;
	}

	// Step 4: Pick the highest-priority sub-election for the chosen group
	if (elections.length > 0 && selectedGroup) {
		const sortedElections = [...elections].sort((a: any, b: any) => {
			return (a.rank ?? 999) - (b.rank ?? 999);
		});
		selectedElection = sortedElections[0] || null;
	}

	return { selectedGroup, selectedElection };
};
