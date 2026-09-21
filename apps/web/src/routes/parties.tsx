import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import {
	PartiesEmptyState,
	PartiesErrorState,
	PartiesHeader,
	PartyCard,
	PartySkeletonGrid,
} from "#/components/parties";
import { QUERY_KEYS } from "#/lib/config";
import { getPartyCards, type PartyCardData } from "#/lib/server/parties";

export const Route = createFileRoute("/parties")({
	head: () =>
		getPageHeader({
			title: "Political Parties",
			description: "Explore registered political parties and details.",
		}),

	component: PartiesComponent,
});

function PartiesComponent() {
	const { data: partiesRes, isLoading, error, refetch } = useQuery({
		queryKey: QUERY_KEYS.partyCards,
		queryFn: async () => {
			const res = await getPartyCards();
			if (res?.success) {
				return res;
			}
			throw new Error(res?.message || "Failed to fetch parties");
		},
	});

	const parties: PartyCardData[] = partiesRes?.data?.parties || [];

	return (
		<div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950 p-4 md:p-8">
			<div className="max-w-6xl mx-auto space-y-8">
				<PartiesHeader />

				{isLoading ? (
					<PartySkeletonGrid />
				) : error ? (
					<PartiesErrorState
						message={error instanceof Error ? error.message : undefined}
						onRetry={refetch}
					/>
				) : parties.length > 0 ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{parties.map((party) => (
							<PartyCard key={party.id} party={party} />
						))}
					</div>
				) : (
					<PartiesEmptyState />
				)}
			</div>
		</div>
	);
}
