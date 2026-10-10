/**
 * @file Party Positions Helpers
 * @description Helper functions and type definitions for party positions roster,
 * including tier selection validation and hierarchy checks.
 */

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getStates } from "#/lib/server/countries";

export type TierSelectionStatus = {
  isComplete: boolean;
  selectedTierId?: number;
  missingTarget: string;
  message: string;
};

export type TierSelectionStatusProps = {
  chapterType?: string;
  selectedCountryId?: number;
  selectedZonalId?: number;
  selectedStateId?: number;
  selectedLgaId?: number;
  selectedWardId?: number;
};

export type TierSelectionProps = TierSelectionStatusProps;

/**
 * Validates whether the required geographic hierarchy for the active tier is fully selected.
 */
export function getTierSelectionStatus({
  chapterType, selectedCountryId, selectedZonalId, selectedStateId, selectedLgaId, selectedWardId,
}: TierSelectionStatusProps): TierSelectionStatus {
  switch (chapterType) {
    case "national": {
      const countryId = selectedCountryId || 161;
      return {
        isComplete: Boolean(countryId),
        selectedTierId: countryId,
        missingTarget: "Country",
        message: "Please select a country to view national chapter officials.",
      };
    }
    case "zonal":
      return {
        isComplete: Boolean(selectedZonalId),
        selectedTierId: selectedZonalId,
        missingTarget: "Geopolitical Zone",
        message: "Please select a geopolitical zone to view zonal chapter officials.",
      };
    case "state":
      return {
        isComplete: Boolean(selectedStateId),
        selectedTierId: selectedStateId,
        missingTarget: "State",
        message: "Please select a state to view state chapter officials.",
      };
    case "lga":
      if (!selectedStateId) {
        return {
          isComplete: false,
          selectedTierId: undefined,
          missingTarget: "State",
          message: "Please select a state first to view LGA chapter officials.",
        };
      }

      return {
        isComplete: Boolean(selectedLgaId),
        selectedTierId: selectedLgaId,
        missingTarget: "LGA",
        message: "Please select a Local Government Area (LGA) to view LGA chapter officials.",
      };
    case "ward":
      if (!selectedStateId) {
        return {
          isComplete: false,
          selectedTierId: undefined,
          missingTarget: "State",
          message: "Please select a state first to view ward chapter officials.",
        };
      }

      if (!selectedLgaId) {
        return {
          isComplete: false,
          selectedTierId: undefined,
          missingTarget: "LGA",
          message: "Please select a Local Government Area (LGA) first to view ward chapter officials.",
        };
      }

      return {
        isComplete: Boolean(selectedWardId),
        selectedTierId: selectedWardId,
        missingTarget: "Ward",
        message: "Please select an electoral ward to view ward chapter officials.",
      };
    default:
      return {
        isComplete: false,
        selectedTierId: undefined,
        missingTarget: "Tier",
        message: "Please select a chapter tier.",
      };
  }
}

export type SelectedTierTitleProps = {
  chapterType?: string;
  selectedTierId?: number;
};

/**
 * Helper to resolve the name/title of a selected chapter tier directly from TanStack Query's cache.
 * If "national", returns undefined (ignored).
 * If "zonal", returns geopolitical zone name.
 * If "state", returns state name.
 * If "lga", returns LGA name.
 * If "ward", returns ward name.
 */
export function getSelectedTierTitle(
  queryClient: any,
  { chapterType, selectedTierId }: SelectedTierTitleProps,
): string | undefined {
  if (!selectedTierId || !chapterType || chapterType === "national") {
    return undefined;
  }

  // 1. Zonal: Check query cache ["geopolitical_zones"]
  if (chapterType === "zonal") {
    const zonesData = queryClient?.getQueryData?.(["geopolitical_zones"]) as
      | { data?: { zones?: Array<{ id: number; name: string }> } }
      | undefined;
    const match = zonesData?.data?.zones?.find((z) => Number(z.id) === Number(selectedTierId));
    return match?.name;
  }

  // 2. State: Check ["states"] queries in cache
  if (chapterType === "state") {
    const stateQueries = queryClient?.getQueriesData?.({ queryKey: ["states"] }) as
      | Array<[any, { data?: { states?: Array<{ id: number; name: string }> } }]>
      | undefined;

    return stateQueries
      ?.flatMap(([_, data]) => data?.data?.states || [])
      .find((s) => Number(s.id) === Number(selectedTierId))?.name;
  }

  // 3. LGA: Check ["lgas"] queries in cache
  if (chapterType === "lga") {
    const lgaQueries = queryClient?.getQueriesData?.({ queryKey: ["lgas"] }) as
      | Array<[any, { data?: { lgas?: Array<{ id: number; name: string }> } }]>
      | undefined;

    return lgaQueries
      ?.flatMap(([_, data]) => data?.data?.lgas || [])
      .find((l) => Number(l.id) === Number(selectedTierId))?.name;
  }

  // 4. Ward: Check ["wards"] queries in cache
  if (chapterType === "ward") {
    const wardQueries = queryClient?.getQueriesData?.({ queryKey: ["wards"] }) as
      | Array<[any, { data?: { wards?: Array<{ id: number; name: string }> } }]>
      | undefined;

    return wardQueries
      ?.flatMap(([_, data]) => data?.data?.wards || [])
      .find((w) => Number(w.id) === Number(selectedTierId))?.name;
  }

  return undefined;
}

/**
 * Hook to retrieve the name of the currently selected tier from TanStack Query's cache.
 */
export function useSelectedTierTitle({
  chapterType,
  selectedTierId,
}: SelectedTierTitleProps): string | undefined {
  const queryClient = useQueryClient();

  // If chapterType is state and not yet cached, fallback fetch with same key
  const isState = chapterType === "state" && Boolean(selectedTierId);
  const { data: fallbackStates } = useQuery({
    queryKey: ["states", 161],
    queryFn: async () => {
      const res = await getStates({ data: { countryId: 161 } });
      if (res && res.success && res.data) return res;
      throw new Error("Failed to fetch states");
    },
    enabled: isState && !queryClient.getQueryData(["states", 161]),
    staleTime: Infinity,
  });

  const cachedTitle = React.useMemo(() => {
    return getSelectedTierTitle(queryClient, { chapterType, selectedTierId });
  }, [queryClient, chapterType, selectedTierId, fallbackStates]);

  if (cachedTitle) return cachedTitle;

  // Check fallback states if resolved
  if (isState && fallbackStates?.data?.states) {
    const match = fallbackStates.data.states.find(
      (s: { id: number; name: string }) => Number(s.id) === Number(selectedTierId),
    );
    if (match?.name) return match.name;
  }

  return undefined;
}

