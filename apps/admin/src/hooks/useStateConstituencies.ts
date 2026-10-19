import { queryOptions, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "#/lib/config";
import { getStateConstituencies } from "#/lib/server/state_constituencies";
import type { StateConstituencyType } from "#/components/tiles/state-constituency-tile";

export type { StateConstituencyType };

/**
 * Shared QueryOptions for Nigeria's 993 State House of Assembly Constituencies.
 * Ensures consistent cache key (`[...QUERY_KEYS.bodies.stateConstituencies, "all"]`)
 * and standardized return type (`StateConstituencyType[]`).
 */
export const stateConstituenciesQueryOptions = (options?: { enabled?: boolean }) =>
  queryOptions({
    queryKey: [...QUERY_KEYS.bodies.stateConstituencies, "all"],
    queryFn: async (): Promise<StateConstituencyType[]> => {
      const res = await getStateConstituencies({ data: { limit: 1000 } });
      if (res && (res.success || res.data?.constituencies)) {
        return (res.data?.constituencies ?? []) as StateConstituencyType[];
      }
      if (!res?.success) {
        throw new Error(res?.error || res?.message || "Failed to fetch state constituencies");
      }
      return [];
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
  });

/**
 * Custom hook to fetch all state constituencies with standardized shared caching.
 */
export function useStateConstituencies(options?: { enabled?: boolean }) {
  return useQuery(stateConstituenciesQueryOptions(options));
}
