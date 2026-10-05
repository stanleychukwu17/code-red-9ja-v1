import { useAppDispatch, useAppSelector } from "#/redux/hooks";
import {
	selectIsLive,
	selectSelectedCountryId,
	selectSelectedDistrictId,
	selectSelectedElection,
	selectSelectedElectionGroup,
	selectSelectedFederalConstituencyId,
	selectSelectedLGAId,
	selectSelectedStateConstituencyId,
	selectSelectedStateId,
	selectSelectedWardId,
	setIsLive,
	setSelectedCountryId,
	setSelectedDistrictId,
	setSelectedElection,
	setSelectedElectionGroup,
	setSelectedFederalConstituencyId,
	setSelectedLGAId,
	setSelectedStateConstituencyId,
	setSelectedStateId,
	setSelectedWardId,
} from "#/redux/slice/electionSlice";

/**
 * Returns true if today matches the given electionDate string (YYYY-MM-DD).
 */
export const isElectionDay = (electionDate?: string | null): boolean => {
	if (!electionDate) return false;
	const today = new Date().toISOString().split("T")[0];
	const d = new Date(electionDate).toISOString().split("T")[0];
	return today === d;
};

/**
 * Returns true if current local time is before 4:00 PM.
 */
export const isBeforeEndOfDay = (): boolean => {
	return new Date().getHours() < 16;
};

/**
 * Hook providing global election state, geographic electoral scopes,
 * active contest selections, and dispatch actions from Redux.
 */
export const useElection = () => {
	const dispatch = useAppDispatch();

	const selectedElectionGroup = useAppSelector(selectSelectedElectionGroup);
	const selectedElection = useAppSelector(selectSelectedElection);
	const selectedCountryId = useAppSelector(selectSelectedCountryId);
	const selectedStateId = useAppSelector(selectSelectedStateId);
	const selectedDistrictId = useAppSelector(selectSelectedDistrictId);
	const selectedFederalConstituencyId = useAppSelector(selectSelectedFederalConstituencyId);
	const selectedStateConstituencyId = useAppSelector(selectSelectedStateConstituencyId);
	const selectedLGAId = useAppSelector(selectSelectedLGAId);
	const selectedWardId = useAppSelector(selectSelectedWardId);
	const isLive = useAppSelector(selectIsLive);

	const electionDay = isElectionDay(selectedElectionGroup?.election_date);

	return {
		selectedElectionGroup,
		setSelectedElectionGroup: (group: any | null) => dispatch(setSelectedElectionGroup(group)),
		selectedElection,
		setSelectedElection: (election: any | null) => dispatch(setSelectedElection(election)),
		selectedCountryId,
		setSelectedCountryId: (id: number | undefined) => dispatch(setSelectedCountryId(id)),
		selectedStateId,
		setSelectedStateId: (id: number | undefined) => dispatch(setSelectedStateId(id)),
		selectedDistrictId,
		setSelectedDistrictId: (id: number | undefined) => dispatch(setSelectedDistrictId(id)),
		selectedFederalConstituencyId,
		setSelectedFederalConstituencyId: (id: number | undefined) =>
			dispatch(setSelectedFederalConstituencyId(id)),
		selectedStateConstituencyId,
		setSelectedStateConstituencyId: (id: number | undefined) =>
			dispatch(setSelectedStateConstituencyId(id)),
		selectedLGAId,
		setSelectedLGAId: (id: number | undefined) => dispatch(setSelectedLGAId(id)),
		selectedWardId,
		setSelectedWardId: (id: number | undefined) => dispatch(setSelectedWardId(id)),
		isLive,
		setIsLive: (v: boolean) => dispatch(setIsLive(v)),
		electionDay,
	};
};
