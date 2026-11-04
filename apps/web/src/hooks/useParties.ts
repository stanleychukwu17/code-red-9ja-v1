import { queryOptions, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "#/lib/config";
import { getParties, type Party } from "#/lib/server/parties";

export type { Party };

/**
 * Shared QueryOptions for Political Parties.
 * Having a single centralized query options definition ensures that:
 * 1. The queryKey is always consistent (`QUERY_KEYS.parties`).
 * 2. The cached data structure is ALWAYS `Party[]` (an array).
 * 3. Components across the web app share the same cache and never trigger type errors.
 */
export const partiesQueryOptions = (options?: { enabled?: boolean }) =>
  queryOptions({
    queryKey: QUERY_KEYS.parties,
    queryFn: async (): Promise<Party[]> => {
      const res = await getParties();
      const raw = res as any;

      if (Array.isArray(raw)) {
        return raw as Party[];
      }
      if (Array.isArray(raw?.data?.parties)) {
        return raw.data.parties as Party[];
      }
      if (Array.isArray(raw?.parties)) {
        return raw.parties as Party[];
      }
      if (Array.isArray(raw?.data)) {
        return raw.data as Party[];
      }
      return [];
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
  });

/**
 * Custom hook to retrieve registered political parties with shared caching and safe array guarantees.
 */
export function useParties(options?: { enabled?: boolean }) {
  const query = useQuery(partiesQueryOptions(options));
  const raw = query.data as any;

  // Defensive array extraction: guarantees parties is always an Array even with un-normalized cache data
  const parties: Party[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data?.parties)
      ? raw.data.parties
      : Array.isArray(raw?.parties)
        ? raw.parties
        : Array.isArray(raw?.data)
          ? raw.data
          : [];

  return {
    ...query,
    parties,
  };
}
