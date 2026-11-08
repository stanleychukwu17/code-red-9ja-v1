import { useNavigate, useSearch } from "@tanstack/react-router";
import type { ApplicationsFilterValues } from "#/components/applications/ApplicationsFilterBar";

/**
 * Parses and sanitizes a query parameter into a positive integer.
 */
export const parseNumberParam = (val: unknown): number | undefined => {
  if (val === undefined || val === null || val === "") return undefined;
  const num = Number(val);
  return !isNaN(num) && num > 0 ? num : undefined;
};

/**
 * Custom hook to synchronize and persist geographic hierarchy and election group
 * filter selections directly to TanStack Router URL search parameters.
 */
export function useApplicationsFilters() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as Record<string, unknown>;

  const electionGroupId = parseNumberParam(search?.election_group_id);
  const stateId = parseNumberParam(search?.state_id);
  const lgaId = parseNumberParam(search?.lga_id);
  const wardId = parseNumberParam(search?.ward_id);
  const pollingUnitId = parseNumberParam(search?.polling_unit_id);

  const handleFiltersChange = (
    filters: ApplicationsFilterValues,
    options?: { replace?: boolean },
  ) => {
    (navigate as any)({
      search: (prev: any) => {
        const next = {
          ...prev,
          election_group_id: filters.electionGroupId,
          state_id: filters.stateId,
          lga_id: filters.lgaId,
          ward_id: filters.wardId,
          polling_unit_id: filters.pollingUnitId,
        };

        // Strip undefined or empty keys to keep the URL clean
        Object.keys(next).forEach((k) => {
          if (next[k] === undefined || next[k] === null || next[k] === "") {
            delete next[k];
          }
        });

        return next;
      },
      replace: options?.replace ?? false,
    });
  };

  return {
    electionGroupId,
    stateId,
    lgaId,
    wardId,
    pollingUnitId,
    handleFiltersChange,
  };
}

