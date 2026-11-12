import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getElectionGroups } from "#/lib/server/election_groups";
import { getElectionsByGroup } from "#/lib/server/elections";
import { useAppDispatch, useAppSelector } from "#/redux/hooks";
import {
  selectSelectedElection,
  selectSelectedElectionGroup,
  setSelectedElection,
  setSelectedElectionGroup,
} from "#/redux/slice/electionSlice";
import { getAutoSelectedSession } from "#/hooks/useElection";

/**
 * Headless Election Session Coordinator.
 *
 * Runs in the background of authenticated routes to synchronize and maintain
 * election state in Redux:
 * 1. Fetches available election groups and auto-selects the closest active group.
 * 2. Fetches elections for the selected group and auto-selects the highest-ranked ballot.
 */
export default function LoadElectionSession() {
  const dispatch = useAppDispatch();
  const selectedElectionGroup = useAppSelector(selectSelectedElectionGroup);
  const selectedElection = useAppSelector(selectSelectedElection);

  // Server function callers for election data
  const fetchGroups = useServerFn(getElectionGroups);
  const fetchElections = useServerFn(getElectionsByGroup);

  // Fetch available election groups (cached indefinitely)
  const { data: groupsData } = useQuery({
    queryKey: ["election-groups"],
    queryFn: () => fetchGroups({ data: { limit: 50 } }),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const groups = groupsData?.data?.election_groups || [];

  // Auto-select group with closest date if none selected or if the currently selected one is invalid
  useEffect(() => {
    if (groups.length > 0) {
      const isGroupValid =
        selectedElectionGroup &&
        groups.some((g: any) => g.id === selectedElectionGroup.id);

      if (!isGroupValid) {
        const { selectedGroup } = getAutoSelectedSession(groups, []);
        if (selectedGroup) {
          dispatch(setSelectedElectionGroup(selectedGroup));
        }
      }
    }
  }, [groups, selectedElectionGroup, dispatch]);

  // Fetch all elections under the currently selected election group
  const { data: electionsData } = useQuery({
    queryKey: ["elections", selectedElectionGroup?.id],
    queryFn: () => fetchElections({ data: selectedElectionGroup?.id }),
    enabled: !!selectedElectionGroup?.id,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const elections = electionsData?.data?.elections || [];

  // Auto-select highest ranked election if none selected, group changed, or selection is invalid
  useEffect(() => {
    if (elections.length > 0 && selectedElectionGroup) {
      const isElectionValid =
        selectedElection &&
        elections.some((e: any) => e.id === selectedElection.id);

      if (!isElectionValid || selectedElection.election_group_id !== selectedElectionGroup.id) {
        const { selectedElection: newSelection } = getAutoSelectedSession(
          [selectedElectionGroup],
          elections,
        );

        if (newSelection) {
          dispatch(setSelectedElection(newSelection));
        }
      }
    }
  }, [elections, selectedElectionGroup, selectedElection, dispatch]);

  // Headless component produces no DOM nodes
  return null;
}
