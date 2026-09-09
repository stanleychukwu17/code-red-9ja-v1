import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createPartyWallet, getPartyWallet } from "#/lib/server/parties";
import { useUserParty } from "./useUserParty";

/**
 * Hook to retrieve or lazily provision a party wallet.
 */
export const usePartyWallet = (explicitPartyId?: number) => {
	const { party } = useUserParty();
	const partyId = explicitPartyId ?? party?.id;

	const fetchPartyWallet = useServerFn(getPartyWallet);
	const createPartyWalletFn = useServerFn(createPartyWallet);

	const { data: partyWallet, isLoading } = useQuery({
		queryKey: ["partyWallet", partyId],
		enabled: !!partyId,
		queryFn: async () => {
			const res = await fetchPartyWallet({ data: partyId as number });
			if (res?.success && res.data?.wallet) {
				return res.data.wallet;
			}

			// If wallet not found, attempt to create it automatically
			if (partyId) {
				const createRes = await createPartyWalletFn({ data: partyId });
				if (createRes?.success && createRes.data?.wallet) {
					return createRes.data.wallet;
				}
			}
			return null;
		},
	});

	return {
		partyWallet,
		isLoading,
	};
};
