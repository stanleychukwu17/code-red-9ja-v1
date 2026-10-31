import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getElectionGroups } from "#/lib/server/election_groups";
import { useElection } from "./useElection";

export interface ElectionGroupItem {
  id: number;
  name: string;
  election_date?: string;
  active?: boolean;
}

/**
 * Hook to retrieve available election groups and access the currently selected election group.
 */
export const useElectionGroup = (options?: { activeOnly?: boolean }) => {
  const fetchGroups = useServerFn(getElectionGroups);
  const { selectedElectionGroup, setSelectedElectionGroup } = useElection();

  const {
    data: electionGroupsData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["election-groups", options?.activeOnly],
    queryFn: () =>
      fetchGroups({
        data: options?.activeOnly ? { active: true } : undefined,
      }),
    staleTime: 5 * 60 * 1000,
  });

  const electionGroups: ElectionGroupItem[] =
    (electionGroupsData as any)?.data?.election_groups || [];

  return {
    electionGroups,
    selectedElectionGroup,
    setSelectedElectionGroup,
    isLoading,
    isFetching,
    refetch,
  };
};

