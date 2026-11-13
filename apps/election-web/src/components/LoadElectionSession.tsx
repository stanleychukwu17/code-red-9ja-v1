import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getElectionGroups } from "#/lib/server/election_groups";
import { useAppDispatch, useAppSelector } from "#/redux/hooks";
import { selectSelectedElection, selectSelectedElectionGroup, setSelectedElection, setSelectedElectionGroup } from "#/redux/slice/electionSlice";
import { getAutoSelectedSession } from "#/hooks/useElection";

/**
 * Headless Election Session Coordinator.
 *
 * Runs in the background of authenticated routes to synchronize and maintain
 * election state in Redux:
 * Single query fetches election groups with nested child elections and auto-selects
 * both the closest active group and its highest-ranked ballot in one pass.
 */
export default function LoadElectionSession() {
  const dispatch = useAppDispatch();
  const selectedElectionGroup = useAppSelector(selectSelectedElectionGroup);
  const selectedElection = useAppSelector(selectSelectedElection);

  // Server function caller for election groups and nested elections
  const fetchGroups = useServerFn(getElectionGroups);

  // Single query: Fetch election groups including their child elections (cached indefinitely)
  const { data: groupsData } = useQuery({
    queryKey: ["election-groups", { includeElections: true }],
    queryFn: () => fetchGroups({ data: { limit: 50, includeElections: true } }),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const groups: any[] = groupsData?.data?.election_groups || [];

  // Synchronize election group and ballot contest in Redux
  useEffect(() => {
    if (groups.length === 0) return;

    // 1. Identify active group (keep existing if valid, otherwise auto-select closest)
    const currentGroup =
      selectedElectionGroup &&
      groups.find((g: any) => g.id === selectedElectionGroup.id);

    const activeGroup =
      currentGroup || getAutoSelectedSession(groups, []).selectedGroup;

    if (!activeGroup) return;

    if (!currentGroup || selectedElectionGroup?.id !== activeGroup.id) {
      dispatch(setSelectedElectionGroup(activeGroup));
    }

    // 2. Identify active election ballot from the chosen group's child elections
    const groupElections: any[] = activeGroup.elections || [];
    if (groupElections.length === 0) return;

    const isElectionValid =
      selectedElection &&
      selectedElection.election_group_id === activeGroup.id &&
      groupElections.some((e: any) => e.id === selectedElection.id);

    if (!isElectionValid) {
      const { selectedElection: newSelection } = getAutoSelectedSession(
        [activeGroup],
        groupElections,
      );

      if (newSelection) {
        dispatch(setSelectedElection(newSelection));
      }
    }
  }, [groups, selectedElectionGroup, selectedElection, dispatch]);

  // Headless component produces no DOM nodes
  return null;
}
