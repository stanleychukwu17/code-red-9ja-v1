import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getPartyPositions,
  type PartyPositionItem,
} from "#/lib/server/parties";
import { useUserParty } from "./useUserParty";

export interface UsePartyPositionsOptions {
  partyId?: number;
  enabled?: boolean;
}

/**
 * Hook to retrieve party positions (both constitutional default positions and custom party positions).
 *
 * Caches position catalogs with `staleTime: Infinity` because positions are static or infrequently modified.
 * Only re-fetches when query is explicitly invalidated (e.g. after creating, updating, or deleting a custom position).
 *
 * Automatically resolves `partyId` from `useUserParty` if not explicitly passed.
 */
export const usePartyPositions = (
  explicitPartyIdOrOptions?: number | UsePartyPositionsOptions,
  options?: { enabled?: boolean },
) => {
  const { party } = useUserParty();

  let targetPartyId: number | undefined;
  let isEnabled = true;

  if (typeof explicitPartyIdOrOptions === "number") {
    targetPartyId = explicitPartyIdOrOptions;
    isEnabled = options?.enabled ?? true;
  } else if (
    typeof explicitPartyIdOrOptions === "object" &&
    explicitPartyIdOrOptions !== null
  ) {
    targetPartyId = explicitPartyIdOrOptions.partyId;
    isEnabled = explicitPartyIdOrOptions.enabled ?? true;
  }

  const partyId = targetPartyId ?? party?.id;
  const fetchPartyPositions = useServerFn(getPartyPositions);

  const {
    data: positionsRes,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["partyPositions", partyId],
    queryFn: () => fetchPartyPositions({ data: { partyId: partyId! } }),
    enabled: !!partyId && isEnabled,
    staleTime: Infinity,
  });

  const defaultPositions: PartyPositionItem[] =
    positionsRes?.data?.default || [];
  const customPositions: PartyPositionItem[] =
    positionsRes?.data?.custom || [];
  const positions: PartyPositionItem[] =
    positionsRes?.data?.positions || [...defaultPositions, ...customPositions];

  return {
    positionsRes,
    positions,
    defaultPositions,
    customPositions,
    isLoading,
    isFetching,
    error,
    refetch,
    partyId,
  };
};
