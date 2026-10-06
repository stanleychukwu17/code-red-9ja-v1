import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getPartyPositions,
  type PartyPositionItem,
} from "#/lib/server/parties";
import { useUserParty } from "./useUserParty";

export interface UsePartyPositionsOptions {
  enabled?: boolean;
}

/**
 * Hook to retrieve party positions (both constitutional default positions and custom party positions).
 *
 * Caches position catalogs with `staleTime: Infinity` because positions are static or infrequently modified.
 * Only re-fetches when query is explicitly invalidated (e.g. after creating, updating, or deleting a custom position).
 *
 * Resolves `partyId` directly from the `useUserParty` hook.
 */
export const usePartyPositions = (options?: UsePartyPositionsOptions) => {
  const { party } = useUserParty();
  const partyId = party?.id;
  const isEnabled = options?.enabled ?? true;
  const fetchPartyPositions = useServerFn(getPartyPositions);

  const { data: positionsRes, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["partyPositions", partyId],
    queryFn: () => fetchPartyPositions({ data: { partyId: partyId! } }),
    // !! casts partyId to a strict boolean so we only query when partyId is present and enabled by caller
    // if partyId is undefined, then !!partyId becomes false, and query is disabled
    enabled: !!partyId && isEnabled,
    staleTime: Infinity,
  });

  const defaultPositions: PartyPositionItem[] = positionsRes?.data?.default || [];
  const customPositions: PartyPositionItem[] = positionsRes?.data?.custom || [];
  const positions: PartyPositionItem[] = positionsRes?.data?.positions || [...defaultPositions, ...customPositions];

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
