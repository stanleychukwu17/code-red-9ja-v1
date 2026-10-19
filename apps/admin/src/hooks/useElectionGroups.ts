import { queryOptions, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "#/lib/config";
import { getElectionGroups } from "#/lib/server/election_groups";
import type { ElectionGroupType } from "#/components/tiles/election-group-tile";

export type { ElectionGroupType };

/**
 * Shared QueryOptions for Election Groups.
 * Ensures consistent cache key (`QUERY_KEYS.electionGroups.all`) and standardized
 * return type (`ElectionGroupType[]`), resolving previous object vs array cache collisions.
 */
export const electionGroupsQueryOptions = (options?: { enabled?: boolean }) =>
  queryOptions({
    queryKey: QUERY_KEYS.electionGroups.all,
    queryFn: async (): Promise<ElectionGroupType[]> => {
      const res = await getElectionGroups({
        data: { limit: 100, orderBy: "election_date", order: "DESC" },
      });
      if (res && res.success && res.data?.election_groups) {
        return res.data.election_groups as ElectionGroupType[];
      }
      if (!res?.success) {
        throw new Error(res?.message || "Failed to fetch election groups");
      }
      return [];
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
  });

/**
 * Custom hook to fetch all election groups with standardized shared caching.
 */
export function useElectionGroups(options?: { enabled?: boolean }) {
  return useQuery(electionGroupsQueryOptions(options));
}
