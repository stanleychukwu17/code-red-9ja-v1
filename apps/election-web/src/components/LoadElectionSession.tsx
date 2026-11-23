import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getElectionGroups } from "#/lib/server/election_groups";
import { useAppDispatch, useAppSelector } from "#/redux/hooks";
import { selectSelectedElectionGroup, setSelectedElectionGroup } from "#/redux/slice/electionSlice";
import { getAutoSelectedSession } from "#/hooks/useElection";

/**
 * Headless Election Session Coordinator.
 *
 * Runs in the background of authenticated routes to synchronize and maintain
 * the active election group in Redux:
 * Fetches election groups and auto-selects the closest active group.
 */
export default function LoadElectionSession() {
  const dispatch = useAppDispatch();
  const selectedElectionGroup = useAppSelector(selectSelectedElectionGroup);

  // Server function caller for election groups
  const fetchGroups = useServerFn(getElectionGroups);

  // Fetch election groups (cached indefinitely)
  const { data: groupsData } = useQuery({
    queryKey: ["election-groups"],
    queryFn: () => fetchGroups({ data: { limit: 50 } }),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const groups: any[] = groupsData?.data?.election_groups || [];

  // Synchronize active election group in Redux
  useEffect(() => {
    if (groups.length === 0) return;

    // Identify active group (keep existing if valid, otherwise auto-select closest)
    const currentGroup =
      selectedElectionGroup &&
      groups.find((g: any) => g.id === selectedElectionGroup.id);

    const activeGroup =
      currentGroup || getAutoSelectedSession(groups, []).selectedGroup;

    if (!activeGroup) return;

    if (!currentGroup || selectedElectionGroup?.id !== activeGroup.id) {
      dispatch(setSelectedElectionGroup(activeGroup));
    }
  }, [groups, selectedElectionGroup, dispatch]);

  // Headless component produces no DOM nodes
  return null;
}
