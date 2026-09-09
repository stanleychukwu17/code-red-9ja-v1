import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPartyMarketingCampaigns } from "#/lib/server/parties";
import { useUserParty } from "./useUserParty";

/**
 * Hook to retrieve active marketing campaigns for the party.
 * Queries campaigns only when invoked on the marketing or readiness dashboards.
 */
export const useMarketingCampaigns = (explicitPartyId?: number) => {
	const { party } = useUserParty();
	const partyId = explicitPartyId ?? party?.id;
	const fetchMarketingCampaignsFn = useServerFn(getPartyMarketingCampaigns);

	const { data: activeMarketingCampaigns, isLoading } = useQuery({
		queryKey: ["activeMarketingCampaigns", partyId],
		enabled: !!partyId,
		queryFn: async () => {
			const res = await fetchMarketingCampaignsFn({
				data: partyId as number,
			});
			if (res?.success && res.data?.campaigns) {
				return res.data.campaigns.filter((c: any) => {
					if (!c.end_date) return true;
					return new Date(c.end_date) > new Date();
				});
			}
			return [];
		},
	});

	return {
		activeMarketingCampaigns: activeMarketingCampaigns || [],
		isLoading,
	};
};
