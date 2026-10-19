import { queryOptions, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "#/lib/config";
import { getStates } from "#/lib/server/states";
import type { StateType } from "#/components/tiles/state-tile";

export type { StateType };

/**
 * Shared QueryOptions for Nigeria States (countryId: 161).
 * Having a single centralized query options definition ensures that:
 * 1. The queryKey is always consistent (`QUERY_KEYS.states`).
 * 2. The cached data structure is ALWAYS `StateType[]` (an array).
 * 3. Components across the admin app share the same cache and never trigger type errors.
 */
export const nigeriaStatesQueryOptions = (options?: { enabled?: boolean }) => queryOptions({
  queryKey: QUERY_KEYS.states,
  queryFn: async (): Promise<StateType[]> => {
    const res = await getStates({ data: { countryId: 161 } });
    if (res && res.success && res.data?.states) {
      return res.data.states as StateType[];
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
