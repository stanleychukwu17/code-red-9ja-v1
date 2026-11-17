import { useQuery } from "@tanstack/react-query";
import { getPartyById } from "#/lib/server/parties";
import { useUser } from "./useUser";

// Normalized party data structure
export type PartyDetails = {
	id?: number;
	shortName: string;
	short_name?: string;
	name: string;
	logo?: string;
	slots?: number;
	agentPaymentBalanceKobo?: number;
	agentPaymentAllocation?: Record<string, number>;
};

// Raw political party schema from API
export type BackendParty = {
	id: number;
	short_name: string;
	name: string;
	logo?: string;
	slots?: number;
	agent_payment_balance_kobo?: number;
	agent_payment_allocation?: Record<string, number>;
	created_at?: string;
	updated_at?: string;
};

// API response envelope
export type GetPartyResponse = {
	success: boolean;
	message: string;
	data?: {
		party: BackendParty;
	};
};

// Fallback when party is unassigned or loading
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

// Hook to fetch and normalize the active user's political party
export const useUserParty = () => {
	const user = useUser();
	const partyId = user?.party?.id ?? user?.party_id;

	const { data: fetchedParty, isLoading, error } = useQuery<BackendParty | null, Error>({
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
		staleTime: Infinity,
		gcTime: Infinity,
		refetchOnWindowFocus: false,
	});

	// Normalize party across remote, session, and default states
	const party: PartyDetails = fetchedParty
		? {
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
				id: user.party.id ?? user.party_id,
				shortName: user.party.short_name,
				short_name: user.party.short_name,
				name: user.party.name || "",
				logo: user.party.logo,
				slots: user.party.slots || 0,
				agentPaymentBalanceKobo: user.party.agent_payment_balance_kobo || 0,
				agentPaymentAllocation: user.party.agent_payment_allocation || {},
			}
			: DEFAULT_PARTY;

	return {
		party,
		rawParty: fetchedParty,
		isLoading,
		error,
	};
};
