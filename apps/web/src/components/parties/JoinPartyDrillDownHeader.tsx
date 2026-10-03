import React from "react";
import { Search, X } from "lucide-react";
import type { StateItem, LGAItem, WardItem } from "#/lib/server/polling_units";

export type LevelTier = "national" | "state" | "lga" | "ward";

export type JoinPartyDrillDownHeaderProps = {
	currentLevel: LevelTier;
	onLevelChange: (level: LevelTier) => void;
	selectedState: StateItem | null;
	selectedLga: LGAItem | null;
	selectedWard: WardItem | null;
	searchQuery: string;
	onSearchChange: (query: string) => void;
	className?: string;
};

export function JoinPartyDrillDownHeader({
	currentLevel,
	onLevelChange,
	selectedState,
	selectedLga,
	selectedWard,
	searchQuery,
	onSearchChange,
	className = "",
}: JoinPartyDrillDownHeaderProps) {

	// The level title
	const levelHeading = {
		national: "National level",
		state: "State level",
		lga: "Lga level",
		ward: "Ward level",
	}[currentLevel];

	const handleSelectTier = (tier: LevelTier) => {
		onLevelChange(tier);
		onSearchChange("");
	};

	return (
		<div className={`px-6 sm:px-10 pt-7 pb-4 ${className}`}>
			<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
				{/* Top Left: Title & Breadcrumbs */}
				<div>
					<h2 className="text-3xl sm:text-4xl font-medium text-foreground flex items-baseline">
						<span>Drill it down</span>
						<span className="relative inline-block">
							<span className="absolute left-0 -bottom-1 w-[120%] h-2.5 bg-[#bef264] rounded-full -z-10" />
						</span>
					</h2>

					<div className="mt-3 space-y-1">
						<p className="text-xs font-medium text-foreground">Select your chapters:</p>
						<div className="flex items-center gap-3 text-xs text-muted-foreground">
							<button
								type="button"
								onClick={() => handleSelectTier("national")}
								className={`cursor-pointer hover:text-foreground transition-colors
									${currentLevel === "national" ? "font-medium text-foreground" : ""}`}
							>
								National
							</button>
							<span>›</span>
							<button
								type="button"
								onClick={() => handleSelectTier("state")}
								className={`cursor-pointer hover:text-foreground transition-colors
									${currentLevel === "state" ?
										"font-medium text-foreground"
										: selectedState ? "text-foreground font-medium" : ""
									}`}
							>
								State
							</button>
							<span>›</span>
							<button
								type="button"
								disabled={!selectedState}
								onClick={() => handleSelectTier("lga")}
								className={`cursor-pointer hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed
									${currentLevel === "lga" ?
										"font-medium text-foreground"
										: selectedLga ? "text-foreground font-medium" : ""
									}`}
							>
								Lga
							</button>
							<span>›</span>
							<button
								type="button"
								disabled={!selectedLga}
								onClick={() => handleSelectTier("ward")}
								className={`cursor-pointer hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed
									${currentLevel === "ward" ? "font-medium text-foreground"
										: selectedWard ? "text-foreground font-medium" : ""
									}`}
							>
								ward
							</button>
							<span>›</span>
						</div>
					</div>
				</div>

				{/* Top Right: Level Indicator & Search */}
				<div className="flex flex-col items-start sm:items-end gap-1">
					<h3 className="text-2xl sm:text-3xl font-medium text-foreground">
						{levelHeading}
					</h3>

					{/* Search input */}
					<div className="relative w-full sm:w-60">
						<Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => onSearchChange(e.target.value)}
							placeholder={`Search ${currentLevel} chapters...`}
							className="w-full pl-9 pr-8 py-2.5 text-xs bg-sidebar-softer rounded-full focus:outline-hidden focus:ring-1 focus:ring-foreground transition-all"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => onSearchChange("")}
								className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
							>
								<X className="size-3.5" />
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
