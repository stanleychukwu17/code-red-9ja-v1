import { Skeleton } from "@repo/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, ChevronRight, Flag, Search } from "lucide-react";
import { useState } from "react";
import { APP_URL, QUERY_KEYS } from "#/lib/config";
import { getParties, type Party } from "#/lib/server/parties";

export const Route = createFileRoute("/parties")({
	component: PartiesComponent,
});

const SKELETON_PLACEHOLDERS = [
	"party-skeleton-1",
	"party-skeleton-2",
	"party-skeleton-3",
	"party-skeleton-4",
	"party-skeleton-5",
	"party-skeleton-6",
];

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
				{/* Header Section */}
				<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
					<div>
						<h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
							Political Parties
						</h1>
						<p className="text-neutral-500 dark:text-neutral-400 mt-2 text-lg">
							Explore and learn about all registered political parties in Nigeria.
						</p>
					</div>

					<div className="relative w-full md:w-72">
						<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<Search className="h-5 w-5 text-neutral-400" />
						</div>
						<input
							type="text"
							placeholder="Search parties..."
							className="block w-full pl-10 pr-3 py-2.5 border border-neutral-200 dark:border-neutral-800 rounded-full bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 shadow-sm"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
				</div>

				{/* Loading State */}
				{isLoading ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{SKELETON_PLACEHOLDERS.map((placeholderKey) => (
							<div
								key={placeholderKey}
								className="flex flex-col bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden p-6 space-y-4"
							>
								<div className="flex justify-between items-start">
									<Skeleton className="w-14 h-14 rounded-2xl" />
									<Skeleton className="w-16 h-6 rounded-full" />
								</div>
								<Skeleton className="w-3/4 h-6 rounded-md" />
								<Skeleton className="w-1/4 h-4 rounded-md" />
								<div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
									<Skeleton className="w-24 h-4 rounded-md" />
									<Skeleton className="w-8 h-8 rounded-full" />
								</div>
							</div>
						))}
					</div>
				) : error ? (
					/* Error State */
					<div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6">
						<AlertCircle className="w-12 h-12 text-red-500 mb-3" />
						<h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
							Failed to load political parties
						</h3>
						<p className="text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm text-sm">
							{error instanceof Error ? error.message : "An error occurred while fetching parties."}
						</p>
						<button
							type="button"
							onClick={() => refetch()}
							className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
						>
							Try again
						</button>
					</div>
				) : filteredParties.length > 0 ? (
					/* Grid Section */
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{filteredParties.map((party) => (
							<Link
								key={party.id}
								to={APP_URL.party(party.short_name.toLowerCase(), party.id.toString())}
								className="group flex flex-col bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1"
							>
								{/* Card Header with Color Banner */}
								<div
									className="h-2 w-full"
									style={{ backgroundColor: party.color_hex || "#16a34a" }}
								/>

								<div className="p-6 flex-1 flex flex-col">
									<div className="flex justify-between items-start mb-4">
										<div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm overflow-hidden p-2 border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-800">
											{party.logo ? (
												<img
													src={party.logo}
													alt={party.short_name}
													className="w-full h-full object-contain"
												/>
											) : (
												<span
													className="text-xl font-bold"
													style={{ color: party.color_hex || "inherit" }}
												>
													{party.short_name}
												</span>
											)}
										</div>
										{party.is_verified ? (
											<span className="bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 px-3 py-1 rounded-full text-xs font-semibold">
												Verified
											</span>
										) : party.created_at ? (
											<span className="bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full text-xs font-medium text-neutral-600 dark:text-neutral-300">
												Est. {new Date(party.created_at).getFullYear()}
											</span>
										) : (
											<span className="bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full text-xs font-medium text-neutral-600 dark:text-neutral-300 capitalize">
												{party.status || "Active"}
											</span>
										)}
									</div>

									<h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-1 line-clamp-1 group-hover:text-primary transition-colors duration-200">
										{party.name}
									</h3>

									<p className="text-neutral-500 dark:text-neutral-400 text-sm font-medium mb-6">
										{party.short_name}
									</p>

									<div className="flex items-center justify-between pt-4 mt-auto border-t border-neutral-100 dark:border-neutral-800">
										<span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 group-hover:text-primary transition-colors">
											View Party Details
										</span>

										<div className="w-8 h-8 rounded-full bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300">
											<ChevronRight className="w-4 h-4" />
										</div>
									</div>
								</div>
							</Link>
						))}
					</div>
				) : (
					/* Empty Search Results */
					<div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
						<div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
							<Flag className="w-8 h-8 text-neutral-400" />
						</div>
						<h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
							No parties found
						</h3>
						<p className="text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm">
							We couldn't find any political parties matching "{searchQuery}". Try adjusting your
							search.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
