import { queryOptions, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "#/lib/config";
import { getSenatorialDistricts } from "#/lib/server/senatorial_districts";
import type { DistrictType } from "#/components/tiles/district-tile";

export type { DistrictType };

/**
 * Shared QueryOptions for Nigeria's 109 Senatorial Districts.
 * Ensures consistent cache key (`QUERY_KEYS.bodies.senatorialDistricts`) and standardized
 * return type (`DistrictType[]`).
 */
export const senatorialDistrictsQueryOptions = (options?: { enabled?: boolean }) =>
  queryOptions({
    queryKey: QUERY_KEYS.bodies.senatorialDistricts,
    queryFn: async (): Promise<DistrictType[]> => {
      const res = await getSenatorialDistricts({
        data: { limit: 150 },
      });
      if (res && (res.success || res.data?.districts)) {
        return (res.data?.districts ?? []) as DistrictType[];
      }
      if (!res?.success) {
        throw new Error(res?.error || res?.message || "Failed to fetch senatorial districts");
      }
      return [];
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
  });

/**
 * Custom hook to fetch all senatorial districts with standardized shared caching.
 */
export function useSenatorialDistricts(options?: { enabled?: boolean }) {
  return useQuery(senatorialDistrictsQueryOptions(options));
}
