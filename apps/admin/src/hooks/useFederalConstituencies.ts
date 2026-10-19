import { queryOptions, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "#/lib/config";
import { getFederalConstituencies } from "#/lib/server/federal_constituencies";
import type { FederalConstituencyType } from "#/components/tiles/federal-constituency-tile";

export type { FederalConstituencyType };

/**
 * Shared QueryOptions for Nigeria's 360 Federal Constituencies.
 * Ensures consistent cache key (`[...QUERY_KEYS.bodies.federalConstituencies, "all"]`)
 * and standardized return type (`FederalConstituencyType[]`).
 */
export const federalConstituenciesQueryOptions = (options?: { enabled?: boolean }) =>
  queryOptions({
    queryKey: [...QUERY_KEYS.bodies.federalConstituencies, "all"],
    queryFn: async (): Promise<FederalConstituencyType[]> => {
      const res = await getFederalConstituencies({ data: { limit: 400 } });
      if (res && (res.success || res.data?.constituencies)) {
        return (res.data?.constituencies ?? []) as FederalConstituencyType[];
      }
      if (!res?.success) {
        throw new Error(res?.error || res?.message || "Failed to fetch federal constituencies");
      }
      return [];
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
  });

/**
 * Custom hook to fetch all federal constituencies with standardized shared caching.
 */
export function useFederalConstituencies(options?: { enabled?: boolean }) {
  return useQuery(federalConstituenciesQueryOptions(options));
}
