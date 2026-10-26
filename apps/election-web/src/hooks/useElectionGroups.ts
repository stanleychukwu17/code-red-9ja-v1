import { queryOptions, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "#/lib/config";
import { getElectionGroups } from "#/lib/server/election_groups";
import type { ElectionGroupType } from "#/components/tiles/election-group-tile";

export type { ElectionGroupType };

export type FormattedElectionGroup = {
  id: number;
  name: string;
  date: string;
  election_date?: string;
};

export type UseElectionGroupsOptions = {
  enabled?: boolean;
};

/**
 * Shared QueryOptions for Election Groups.
 */
export const electionGroupsQueryOptions = (options?: UseElectionGroupsOptions) =>
  queryOptions({
    queryKey: QUERY_KEYS.electionGroups,
    queryFn: async (): Promise<FormattedElectionGroup[]> => {
      const res = await getElectionGroups();

      if (
        res?.success &&
        res.data?.election_groups &&
        res.data.election_groups.length > 0
      ) {
        return res.data.election_groups.map((group: any) => ({
          id: group.id,
          name: group.name,
          election_date: group.election_date,
          date: group.election_date
            ? new Date(group.election_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
            : "TBD",
        }));
      }
      return [];
    },

    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
  });

/**
 * Custom hook to fetch election groups with standardized shared caching.
 */
export function useElectionGroups(options?: UseElectionGroupsOptions) {
  return useQuery(electionGroupsQueryOptions(options));
}
