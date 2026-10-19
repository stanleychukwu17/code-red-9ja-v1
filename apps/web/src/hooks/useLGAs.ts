import { queryOptions, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "#/lib/config";
import { getLGAsByState, type LGAItem } from "#/lib/server/polling_units";

export type { LGAItem };

export type UseLGAsOptions = {
  enabled?: boolean;
};

/**
 * Shared QueryOptions for Local Government Areas (LGAs) by State ID.
 * Standardizes cache key, staleTime: Infinity, and returns LGAItem[] directly.
 */
export const lgasQueryOptions = (stateId?: number | "", options?: UseLGAsOptions) => {
  const numericStateId = stateId ? Number(stateId) : undefined;
  const isEnabled = (options?.enabled ?? true) && Boolean(numericStateId);

  return queryOptions({
    queryKey: QUERY_KEYS.lgas(numericStateId),
    queryFn: async (): Promise<LGAItem[]> => {
      if (!numericStateId) return [];
      const res = await getLGAsByState({ data: { stateId: numericStateId } });
      if (res && res.success && res.data?.lgas) {
        return res.data.lgas as LGAItem[];
      }
      if (Array.isArray(res?.data)) {
        return res.data as LGAItem[];
      }
      if (!res?.success) {
        throw new Error(res?.message || (res as any)?.error || "Failed to fetch LGAs");
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
 * Custom hook to fetch LGAs for a given state with shared caching.
 */
export function useLGAs(stateId?: number | "", options?: UseLGAsOptions) {
  return useQuery(lgasQueryOptions(stateId, options));
}
