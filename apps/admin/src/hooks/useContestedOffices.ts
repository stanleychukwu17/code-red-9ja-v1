import { queryOptions, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "#/lib/config";
import { getContestedOffices } from "#/lib/server/offices";
import type { OfficeType } from "#/components/tiles/office-tile";

export type { OfficeType };

/**
 * Shared QueryOptions for Contested Offices.
 * Standardizes:
 * 1. Consistent queryKey (`QUERY_KEYS.offices.contested`).
 * 2. Consistent data structure (`OfficeType[]` array).
 * 3. Shared cache across all election creation and filter dialogs.
 */
export const contestedOfficesQueryOptions = (options?: { enabled?: boolean }) =>
  queryOptions({
    queryKey: QUERY_KEYS.offices.contested,
    queryFn: async (): Promise<OfficeType[]> => {
      const res = await getContestedOffices({ data: { limit: 100 } });
      if (res && res.success && res.data?.offices) {
        return res.data.offices as OfficeType[];
      }
      if (!res?.success) {
        throw new Error(res?.message || "Failed to load contested offices");
      }
      return [];
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
  });

/**
 * Custom hook to fetch available contested offices for election configuration and filtering.
 */
export function useContestedOffices(options?: { enabled?: boolean }) {
  return useQuery(contestedOfficesQueryOptions(options));
}
