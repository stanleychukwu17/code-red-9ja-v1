import { useAppDispatch, useAppSelector } from "#/redux/hooks";
import {
  selectIsLive,
  selectSelectedElection,
  selectSelectedElectionGroup,
  setIsLive,
  setSelectedElection,
  setSelectedElectionGroup,
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
 * Pure hook providing global election state, active contest selections,
 * geographic boundaries derived from the active election contest, and dispatch actions from Redux.
 */
export const useElection = () => {
  const dispatch = useAppDispatch();

  const selectedElectionGroup = useAppSelector(selectSelectedElectionGroup);
  const selectedElection = useAppSelector(selectSelectedElection);
  const isLive = useAppSelector(selectIsLive);

  const electionDay = isElectionDay(selectedElectionGroup?.election_date);

  return {
    selectedElectionGroup,
    setSelectedElectionGroup: (group: any | null) => dispatch(setSelectedElectionGroup(group)),
    selectedElection,
    setSelectedElection: (election: any | null) => dispatch(setSelectedElection(election)),
    // Inherent geographic jurisdiction derived from the active election contest
    selectedStateId: (selectedElection?.state_id as number | undefined) ?? undefined,
    selectedDistrictId: (selectedElection?.senatorial_district_id as number | undefined) ?? undefined,
    selectedFederalConstituencyId:
      (selectedElection?.federal_constituency_id as number | undefined) ?? undefined,
    selectedStateConstituencyId:
      (selectedElection?.state_constituency_id as number | undefined) ?? undefined,
    selectedLGAId: (selectedElection?.lga_id as number | undefined) ?? undefined,
    selectedWardId: (selectedElection?.ward_id as number | undefined) ?? undefined,
    isLive,
    setIsLive: (v: boolean) => dispatch(setIsLive(v)),
    electionDay,
  };
};
