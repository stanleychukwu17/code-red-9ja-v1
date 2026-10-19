import { queryOptions, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "#/lib/config";
import { getStatesForNigeria, type StateItem } from "#/lib/server/polling_units";

export type { StateItem };

/**
 * Shared QueryOptions for Nigeria States (countryId: 161).
 * Having a single centralized query options definition ensures that:
 * 1. The queryKey is always consistent (`QUERY_KEYS.nigeriaStates`).
 * 2. The cached data structure is ALWAYS `StateItem[]` (an array).
 * 3. Components across the web app share the same cache and never trigger type errors.
 */
export const nigeriaStatesQueryOptions = (options?: { enabled?: boolean }) =>
  queryOptions({
    queryKey: QUERY_KEYS.nigeriaStates,
    queryFn: async (): Promise<StateItem[]> => {
      const res = await getStatesForNigeria();
      if (res && res.success && res.data?.states) {
        return res.data.states as StateItem[];
      }
      if (Array.isArray(res?.data)) {
        return res.data as StateItem[];
      }
      if (!res?.success) {
        throw new Error(res?.message || (res as any)?.error || "Failed to fetch states");
      }
      return [];
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
  });

/**
 * Custom hook to fetch all 37 states of Nigeria with shared caching.
 */
export function useNigeriaStates(options?: { enabled?: boolean }) {
  return useQuery(nigeriaStatesQueryOptions(options));
}
