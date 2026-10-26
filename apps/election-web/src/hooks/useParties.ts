import { queryOptions, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "#/lib/config";
import { getParties } from "#/lib/server/parties";
import type { PartyType } from "#/components/tiles/party-tile";

export type { PartyType };

/**
 * Shared QueryOptions for Nigeria's Registered Political Parties.
 * Standardizes:
 * 1. Consistent queryKey (`QUERY_KEYS.parties`).
 * 2. Standardized return type (`PartyType[]`).
 * 3. Shared cache with infinite staleTime.
 */
export const partiesQueryOptions = (options?: { enabled?: boolean }) => queryOptions({
  queryKey: QUERY_KEYS.parties,
  queryFn: async (): Promise<PartyType[]> => {
    const res = await getParties();
    if (res && res.success && res.data?.parties) {
      return res.data.parties as PartyType[];
    }
    if (!res?.success) {
      throw new Error(res?.message || "Failed to load parties");
    }
    return [];
  },
  staleTime: Infinity,
  gcTime: Infinity,
  refetchOnWindowFocus: false,
  enabled: options?.enabled ?? true,
});

/**
 * Custom hook to fetch all political parties with standardized shared caching.
 */
export function useParties(options?: { enabled?: boolean }) {
  return useQuery(partiesQueryOptions(options));
}
