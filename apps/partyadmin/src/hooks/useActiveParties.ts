import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicParties } from "#/lib/server/parties";

/**
 * Hook to retrieve registered political parties from the public directory.
 * Only queried on Election Day views where live comparison across all parties is needed.
 */
export const useActiveParties = () => {
	const fetchPublicParties = useServerFn(getPublicParties);

	const { data: publicPartiesData, isLoading } = useQuery({
		queryKey: ["public-parties"],
		queryFn: () => fetchPublicParties(),
		staleTime: 5 * 60 * 1000,
	});

	const activeParties = publicPartiesData?.data?.parties || [];

	return {
		activeParties,
		isLoading,
	};
};
