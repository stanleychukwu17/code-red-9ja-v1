import { useQuery } from "@tanstack/react-query";
import { getParty } from "#/lib/server/parties";
import { useUser } from "./useUser";

export interface PartyDetails {
	id?: number;
	shortName: string;
	name: string;
	logo?: string;
	slots?: number;
	agentPaymentBalanceKobo?: number;
	agentPaymentAllocation?: Record<string, number>;
}

export interface BackendParty {
	id: number;
	short_name: string;
	name: string;
	logo?: string;
	slots?: number;
	agent_payment_balance_kobo?: number;
	agent_payment_allocation_kobo?: Record<string, number>;
	created_at?: string;
	updated_at?: string;
}

export interface GetPartyResponse {
	success: boolean;
	message: string;
	data?: {
		party: BackendParty;
	};
}

/**
 * Retrieves and normalizes the political party details associated with the current user.
 *
 * @returns The normalized PartyDetails object, or null if no party is associated.
 */
export const usePartyDetails = (): PartyDetails | null => {
	const user = useUser();
	const partyId = user?.party?.id ?? user?.party_id;

	const { data: fetchedParty } = useQuery<BackendParty | null, Error>({
		queryKey: ["party", partyId],
		queryFn: async () => {
			if (!partyId) return null;
			const res = (await getParty({ data: partyId })) as GetPartyResponse;
			if (res && res.success && res.data?.party) {
				return res.data.party;
			}
			throw new Error(res?.message || "Failed to fetch party details");
		},
		enabled: !!partyId,
	});

	if (fetchedParty) {
		return {
			id: fetchedParty.id,
			shortName: fetchedParty.short_name,
			name: fetchedParty.name || "",
			logo: fetchedParty.logo,
			slots: fetchedParty.slots || 0,
			agentPaymentBalanceKobo: fetchedParty.agent_payment_balance_kobo || 0,
			agentPaymentAllocation: fetchedParty.agent_payment_allocation_kobo || {},
		};
	}

	if (user?.party?.short_name) {
		return {
			id: user.party.id ?? user.party_id,
			shortName: user.party.short_name,
			name: user.party.name || "",
			logo: user.party.logo,
			slots: user.party.slots || 0,
			agentPaymentBalanceKobo: user.party.agent_payment_balance_kobo || 0,
			agentPaymentAllocation: user.party.agent_payment_allocation_kobo || {},
		};
	}

	if (user?.party_id) {
		return {
			id: user.party_id,
			shortName: "",
			name: "",
			slots: 0,
			agentPaymentBalanceKobo: 0,
			agentPaymentAllocation: {},
		};
	}

	return null;
};

/**
 * Convenience wrapper hook returning { party } to match standard domain hook conventions.
 */
export const useUserParty = () => {
	const party = usePartyDetails();
	return { party };
};
