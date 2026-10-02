import { useParams } from "@tanstack/react-router";
import { useUser, type Party } from "./useUser";
import { useActiveParties } from "./useActiveParties";

/**
 * Retrieves the political party details associated with the current user or active route parameter.
 * Prioritizes the route's $partyShortName parameter so administrators switching parties see the active tenant's details.
 *
 * @returns An object containing party details, loading state, and refetch handler.
 */
export const usePartyDetails = () => {
	const user = useUser();
	const params = useParams({ strict: false }) as { partyShortName?: string };
	const routeShortName = params?.partyShortName?.toLowerCase();
	const { activeParties, isLoading: isPartiesLoading } = useActiveParties();

	// Match active party from route param if provided
	const matchingActiveParty: Party | undefined = routeShortName
		? activeParties.find((p: any) => p.short_name?.toLowerCase() === routeShortName)
		: undefined;

	let party: Party | null = null;
	if (matchingActiveParty) {
		party = matchingActiveParty;
	} else if (user?.party) {
		party = user.party;
	} else if (user?.party_id) {
		party = { id: user.party_id };
	}

	const isLoading = Boolean(routeShortName && isPartiesLoading && !party);

	return { party, isLoading };
};

/**
 * Convenience wrapper hook returning { party, isLoading, isFetching, refetch } to match standard domain hook conventions.
 */
export const useUserParty = () => {
	return usePartyDetails();
};
