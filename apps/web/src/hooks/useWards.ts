import { queryOptions, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "#/lib/config";
import { getWardsByLGA, type WardItem } from "#/lib/server/polling_units";

export type { WardItem };

export type UseWardsOptions = {
  enabled?: boolean;
};

/**
 * Shared QueryOptions for Electoral Wards by LGA ID and optional State ID.
 * Standardizes cache key, staleTime: Infinity, and returns WardItem[] directly.
 */
export const wardsQueryOptions = (
  lgaId?: number | "",
  stateId?: number | "",
  options?: UseWardsOptions,
) => {
  const numericLgaId = lgaId ? Number(lgaId) : undefined;
  const numericStateId = stateId ? Number(stateId) : undefined;
  const isEnabled = (options?.enabled ?? true) && Boolean(numericLgaId);

  return queryOptions({
    queryKey: QUERY_KEYS.wards(numericLgaId, numericStateId),
    queryFn: async (): Promise<WardItem[]> => {
      if (!numericLgaId) return [];
      const res = await getWardsByLGA({
        data: {
          lgaId: numericLgaId,
          stateId: numericStateId,
        },
      });
      if (res && res.success && res.data?.wards) {
        return res.data.wards as WardItem[];
      }
      if (Array.isArray(res?.data)) {
        return res.data as WardItem[];
      }
      if (!res?.success) {
        throw new Error(res?.message || (res as any)?.error || "Failed to fetch Wards");
      }
      return [];
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    enabled: isEnabled,
  });
};

/**
 * Custom hook to fetch Wards for a given LGA with shared caching.
 */
export function useWards(
  lgaId?: number | "",
  stateId?: number | "",
  options?: UseWardsOptions,
) {
  return useQuery(wardsQueryOptions(lgaId, stateId, options));
}
