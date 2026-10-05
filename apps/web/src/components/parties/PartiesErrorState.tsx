import { AlertCircle } from "lucide-react";

interface PartiesErrorStateProps {
	message?: string;
	onRetry: () => void;
}

export function PartiesErrorState({
	message = "An error occurred while fetching parties.",
	onRetry,
}: PartiesErrorStateProps) {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6">
			<AlertCircle className="w-12 h-12 text-red-500 mb-3" />
			<h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
				Failed to load political parties
			</h3>
			<p className="text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm text-sm">{message}</p>
			<button
				type="button"
				onClick={onRetry}
				className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
			>
				Try again
			</button>
		</div>
	);
}
