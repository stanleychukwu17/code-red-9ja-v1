import { Search } from "lucide-react";

interface PartiesHeaderProps {
	searchQuery: string;
	onSearchChange: (query: string) => void;
}

export function PartiesHeader({ searchQuery, onSearchChange }: PartiesHeaderProps) {
	return (
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
					onChange={(e) => onSearchChange(e.target.value)}
				/>
			</div>
		</div>
	);
}
