import { queryOptions, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "#/lib/config";
import { getLGAs } from "#/lib/server/lgas";
import type { LgaType } from "#/components/tiles/lga-tile";

export type { LgaType };

/**
 * Shared QueryOptions for Nigeria's 774 Local Government Areas.
 * Ensures consistent cache key (`[...QUERY_KEYS.bodies.lgas, "all"]`) and standardized
 * return type (`LgaType[]`).
 */
export const lgasQueryOptions = (options?: { enabled?: boolean }) =>
  queryOptions({
    queryKey: [...QUERY_KEYS.bodies.lgas, "all"],
    queryFn: async (): Promise<LgaType[]> => {
      const res = await getLGAs({ data: { limit: 800 } });
      if (res && (res.success || res.data?.lgas)) {
        return (res.data?.lgas ?? []) as LgaType[];
      }
      if (!res?.success) {
        throw new Error(res?.error || res?.message || "Failed to fetch LGAs");
      }
      return [];
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
  });

/**
 * Custom hook to fetch all LGAs with standardized shared caching.
 */
export function useLGAs(options?: { enabled?: boolean }) {
  return useQuery(lgasQueryOptions(options));
}
