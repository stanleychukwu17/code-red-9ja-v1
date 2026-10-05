import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
	PartiesEmptyState,
	PartiesErrorState,
	PartiesHeader,
	PartyCard,
	PartySkeletonGrid,
} from "#/components/parties";
import { QUERY_KEYS } from "#/lib/config";
import { getParties, type Party } from "#/lib/server/parties";

export const Route = createFileRoute("/parties")({
	component: PartiesComponent,
});

function PartiesComponent() {
	const [searchQuery, setSearchQuery] = useState("");

	const {
		data: partiesRes,
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: QUERY_KEYS.parties,
		queryFn: async () => {
			const res = await getParties();
			if (res?.success) {
				return res;
			}
			throw new Error(res?.message || "Failed to fetch parties");
		},
	});

	const parties: Party[] = partiesRes?.data?.parties || [];

	const filteredParties = parties.filter(
		(party) =>
			party.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			party.short_name.toLowerCase().includes(searchQuery.toLowerCase())
	);

	return (
		<div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950 p-4 md:p-8">
			<div className="max-w-6xl mx-auto space-y-8">
				<PartiesHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />

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
							<PartyCard key={party.id} party={party} />
						))}
					</div>
				) : (
					<PartiesEmptyState searchQuery={searchQuery} />
				)}
			</div>
		</div>
	);
}
