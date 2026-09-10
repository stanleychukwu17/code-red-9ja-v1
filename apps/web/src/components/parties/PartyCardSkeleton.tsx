import { Skeleton } from "@repo/ui/components/skeleton";
import { SKELETON_PLACEHOLDERS } from "./party-constants";

export function PartyCardSkeleton() {
	return (
		<div className="flex flex-col items-center bg-sidebar-mobile dark:bg-neutral-900 rounded overflow-hidden pb-6 shadow-sm">
			<Skeleton className="h-44 w-full rounded-none" />
			<Skeleton className="-mt-12 w-24 h-24 rounded-full border-4 border-white dark:border-neutral-900 shadow-md" />
			<Skeleton className="w-24 h-6 rounded-md mt-4" />
			<Skeleton className="w-44 h-4 rounded-md mt-2" />
			<Skeleton className="w-48 h-7 rounded-full mt-5" />
			<div className="grid grid-cols-2 gap-6 mt-7 w-full px-8 max-w-xs">
				<div className="flex flex-col items-center space-y-2">
					<Skeleton className="w-14 h-14 rounded-full" />
					<Skeleton className="w-14 h-3 rounded" />
					<Skeleton className="w-20 h-4 rounded" />
					<Skeleton className="w-12 h-3 rounded" />
				</div>
				<div className="flex flex-col items-center space-y-2">
					<Skeleton className="w-14 h-14 rounded-full" />
					<Skeleton className="w-14 h-3 rounded" />
					<Skeleton className="w-20 h-4 rounded" />
					<Skeleton className="w-12 h-3 rounded" />
				</div>
			</div>
			<Skeleton className="w-12 h-12 rounded-full mt-7" />
		</div>
	);
}

export function PartySkeletonGrid() {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{SKELETON_PLACEHOLDERS.map((placeholderKey) => (
				<PartyCardSkeleton key={placeholderKey} />
			))}
		</div>
	);
}
