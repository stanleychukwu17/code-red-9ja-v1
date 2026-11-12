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
	const userPartyMatchesRoute = Boolean(
		routeShortName &&
		user?.party?.short_name &&
		user.party.short_name.toLowerCase() === routeShortName
	);

	// Only query public parties if on a different party route than the user's current party
	const shouldFetchActiveParties = Boolean(routeShortName && !userPartyMatchesRoute);

	// if the routeShortName exists and the user's party does not match the routeShortName,
	// then fetch the public parties, else don't fetch
	const { activeParties, isLoading: isPartiesLoading } = useActiveParties({
		enabled: shouldFetchActiveParties,
	});

	// Match active party from route param if provided
	const matchingActiveParty: Party | undefined = userPartyMatchesRoute
		? user?.party
		: routeShortName
			? activeParties.find((p: any) => p.short_name?.toLowerCase() === routeShortName)
			: undefined;

	let party: Party | null = null;
	if (routeShortName) {
		party = matchingActiveParty || null;
	} else if (user?.party) {
		party = user.party;
	} else if (user?.party_id) {
		party = { id: user.party_id };
	}

	const isLoading = Boolean(shouldFetchActiveParties && isPartiesLoading && !party);

	return { party, isLoading };
};

/**
 * Convenience wrapper hook returning { party, isLoading, isFetching, refetch } to match standard domain hook conventions.
 */
export const useUserParty = () => {
	return usePartyDetails();
};
