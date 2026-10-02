import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
	PartiesEmptyState,
	PartiesErrorState,
	PartiesHeader,
	PartyCard,
	PartySkeletonGrid,
} from "#/components/parties";
import { QUERY_KEYS } from "#/lib/config";
import { getPartyCards, type PartyCardData } from "#/lib/server/parties";
import { getPageHeader } from "#/lib/shared/meta";

// Route definition with page metadata
export const Route = createFileRoute("/parties")({
	head: () =>
		getPageHeader({
			title: "Political Parties",
			description: "Explore registered political parties and details.",
		}),

	component: PartiesComponent,
});

function PartiesComponent() {
	// Access user context and local search filter state
	const { userDetails } = Route.useRouteContext();
	const hasUserParty = Boolean(userDetails?.party_id);
	const [searchQuery, setSearchQuery] = useState("");

	// Fetch party cards data
	const { data: partiesRes, isLoading, error, refetch, data } = useQuery({
		queryKey: QUERY_KEYS.partyCards,
		queryFn: async () => {
			const res = await getPartyCards();
			if (res?.success) {
				return res;
			}
			throw new Error(res?.message || "Failed to fetch parties");
		},
		staleTime: Infinity
	});

	const parties: PartyCardData[] = partiesRes?.data?.parties || [];

	// Filter parties by name or short code matching search query
	const filteredParties = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return parties;
		return parties.filter((p) => {
			const matchShortName = p.short_name?.toLowerCase().includes(q);
			const matchName = p.name?.toLowerCase().includes(q);
			return matchShortName || matchName;
		});
	}, [parties, searchQuery]);

	return (
		<div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950 p-4 md:p-8">
			<div className="max-w-6xl mx-auto space-y-8">
				{/* Search bar and header */}
				<PartiesHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />

				{/* Loading skeleton, error state, party cards grid, or empty state */}
				{isLoading ? (
					<PartySkeletonGrid />
				) : error ? (
					<PartiesErrorState
						message={error instanceof Error ? error.message : undefined}
						onRetry={refetch}
					/>
				) : filteredParties.length > 0 ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{filteredParties.map((party) => (
							<PartyCard key={party.id} party={party} hasUserParty={hasUserParty} />
						))}
					</div>
				) : (
					<PartiesEmptyState
						message={
							searchQuery.trim()
								? `No political parties found matching "${searchQuery.trim()}".` : undefined
						}
					/>
				)}
			</div>
		</div>
	);
}
