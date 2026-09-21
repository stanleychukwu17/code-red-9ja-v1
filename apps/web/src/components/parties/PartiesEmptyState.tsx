import { Flag } from "lucide-react";

interface PartiesEmptyStateProps {
	message?: string;
}

export function PartiesEmptyState({ message }: PartiesEmptyStateProps = {}) {
	return (
		<div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
			<div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
				<Flag className="w-8 h-8 text-neutral-400" />
			</div>
			<h3 className="text-lg font-semibold text-neutral-900 dark:text-white">No parties found</h3>
			<p className="text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm">
				{message || "There are currently no registered political parties to display."}
			</p>
		</div>
	);
}
