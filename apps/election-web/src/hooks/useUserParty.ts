import { useQuery } from "@tanstack/react-query";
import { getPartyById } from "#/lib/server/parties";
import { useUser } from "./useUser";

/**
 * Normalized party data structure used across client UI components.
 * Supports both camelCase and snake_case access for backward compatibility.
 */
export interface PartyDetails {
	id?: number;
	shortName: string;
	short_name?: string;
	name: string;
	logo?: string;
	slots?: number;
	agentPaymentBalanceKobo?: number;
	agentPaymentAllocation?: Record<string, number>;
}

/**
 * Raw political party schema returned directly by the backend API.
 */
export interface BackendParty {
	id: number;
	short_name: string;
	name: string;
	logo?: string;
	slots?: number;
	agent_payment_balance_kobo?: number;
	agent_payment_allocation?: Record<string, number>;
	created_at?: string;
	updated_at?: string;
}

/**
 * API response envelope for party retrieval endpoints.
 */
export interface GetPartyResponse {
	success: boolean;
	message: string;
	data?: {
		party: BackendParty;
	};
}

/**
 * Null-object fallback to prevent undefined/null errors in UI components
 * when a user has no assigned party or data is still loading.
 */
const DEFAULT_PARTY: PartyDetails = {
	id: undefined,
	shortName: "",
	short_name: "",
	name: "",
	logo: undefined,
	slots: 0,
	agentPaymentBalanceKobo: 0,
	agentPaymentAllocation: {},
};

/**
 * Hook to fetch, cache, and normalize the political party of the current authenticated user.
 *
 * Behavior & Fallback Hierarchy:
 * 1. Reads `partyId` from the active user session (`user.party.id` or `user.party_id`).
 * 2. Fetches full party details via TanStack Query (cached by `["party", partyId]`).
 * 3. Formats and normalizes the party data using a 4-tier fallback:
 *    - Tier 1: Freshly fetched `BackendParty` data from the server.
 *    - Tier 2: Pre-existing party snapshot already in the user session (`user.party`).
 *    - Tier 3: Bare `party_id` with empty fields.
 *    - Tier 4: `DEFAULT_PARTY` placeholder.
 *
 * @returns Object containing:
 * - `party`: Guaranteed non-null `PartyDetails` object with safe defaults.
 * - `rawParty`: Direct `BackendParty` response from API (or null).
 * - `isLoading`: Boolean indicating whether the party query is in flight.
 * - `error`: Query Error object if fetch failed.
 */
export const useUserParty = () => {
	const user = useUser();
	const partyId = user?.party?.id ?? user?.party_id;

	// Query party details by ID with TanStack Query caching
	const {
		data: fetchedParty,
		isLoading,
		error,
	} = useQuery<BackendParty | null, Error>({
		queryKey: ["party", partyId],
		queryFn: async () => {
			if (!partyId) return null;
			const res = (await getPartyById({ data: partyId })) as GetPartyResponse;
			if (res && res.success && res.data?.party) {
				return res.data.party;
			}
			throw new Error(res?.message || "Failed to fetch party details");
		},
		enabled: !!partyId,
	});

	// Normalize party details across all possible data states
	const party: PartyDetails = fetchedParty
		? {
				// Tier 1: Remote API data
				id: fetchedParty.id,
				shortName: fetchedParty.short_name,
				short_name: fetchedParty.short_name,
				name: fetchedParty.name || "",
				logo: fetchedParty.logo,
				slots: fetchedParty.slots || 0,
				agentPaymentBalanceKobo: fetchedParty.agent_payment_balance_kobo || 0,
				agentPaymentAllocation: fetchedParty.agent_payment_allocation || {},
			}
		: user?.party?.short_name
			? {
					// Tier 2: User session embedded party data
					id: user.party.id ?? user.party_id,
					shortName: user.party.short_name,
					short_name: user.party.short_name,
					name: user.party.name || "",
					logo: user.party.logo,
					slots: user.party.slots || 0,
					agentPaymentBalanceKobo: user.party.agent_payment_balance_kobo || 0,
					agentPaymentAllocation: user.party.agent_payment_allocation || {},
				}
			: user?.party_id
				? {
						// Tier 3: Known ID with unpopulated metadata
						id: user.party_id,
						shortName: "",
						short_name: "",
						name: "",
						slots: 0,
						agentPaymentBalanceKobo: 0,
						agentPaymentAllocation: {},
					}
				: DEFAULT_PARTY; // Tier 4: Safe default empty object

	return {
		party,
		rawParty: fetchedParty,
		isLoading,
		error,
	};
};
