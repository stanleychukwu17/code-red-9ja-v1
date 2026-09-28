import { Search, X } from "lucide-react";

interface PartiesHeaderProps {
	searchQuery?: string;
	onSearchChange?: (query: string) => void;
}

export function PartiesHeader({ searchQuery = "", onSearchChange }: PartiesHeaderProps) {
	return (
		<div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
			<div>
				<h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
					Political Parties
				</h1>
				<p className="text-muted-foreground mt-2 text-lg">
					Explore and learn about all registered political parties in Nigeria.
				</p>
			</div>

			{onSearchChange && (
				<div className="w-full md:w-80 relative">
					<div className="flex h-11 items-center gap-2.5 rounded-xl border border-transparent dark:border-border bg-sidebar-mobile px-3.5 transition-colors focus-within:border-border">
						<Search className="size-4 shrink-0 text-muted-foreground" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => onSearchChange(e.target.value)}
							placeholder="Search parties..."
							className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => onSearchChange("")}
								aria-label="Clear search"
								className="shrink-0 p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors cursor-pointer"
							>
								<X className="size-3.5" />
							</button>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
