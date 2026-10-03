import React from "react";
import { Button } from "@repo/ui/components/button";
import type { StateItem, LGAItem, WardItem } from "#/lib/server/polling_units";
import type { LevelTier } from "./JoinPartyDrillDownHeader";

export type JoinPartyDrillDownFooterProps = {
	partyName: string;
	partyLogo?: string;
	selectedState: StateItem | null;
	selectedLga: LGAItem | null;
	selectedWard: WardItem | null;
	onLevelChange: (level: LevelTier) => void;
	onCancel: () => void;
	onSaveAndContinue: () => void;
	isBusy?: boolean;
	className?: string;
};

export function JoinPartyDrillDownFooter({
	partyName,
	partyLogo,
	selectedState,
	selectedLga,
	selectedWard,
	onLevelChange,
	onCancel,
	onSaveAndContinue,
	isBusy = false,
	className = "",
}: JoinPartyDrillDownFooterProps) {
	return (
		<div
			className={`bg-muted/30 border-t border-border/70 px-6 sm:px-10 py-5 flex flex-col items-center ${className}`}
		>
			<h4 className="text-base sm:text-lg font-bold text-foreground mb-4">Selected</h4>

			{/* 4 Selected Chapter Slots */}
			<div className="flex items-center justify-center gap-6 sm:gap-12 mb-6">
				{/* 1. National */}
				<button
					type="button"
					onClick={() => onLevelChange("national")}
					className="flex flex-col items-center text-center cursor-pointer group focus:outline-hidden"
				>
					<div className="size-9 mb-1 flex items-center justify-center transition-transform group-hover:scale-110">
						<img src={partyLogo} alt={partyName} className="size-8 aspect-square rounded-full object-cover border border-border/40" />
					</div>
					<span className="text-xs sm:text-sm font-bold text-foreground">Nigeria</span>
					<span className="text-[10px] sm:text-xs text-muted-foreground">national chapter</span>
				</button>

				{/* 2. State */}
				<button
					type="button"
					onClick={() => onLevelChange("state")}
					className="flex flex-col items-center text-center cursor-pointer group focus:outline-hidden"
				>
					<div className="size-9 mb-1 flex items-center justify-center transition-transform group-hover:scale-110">
						{selectedState ? (
							<img src={partyLogo} alt={partyName} className="size-8 aspect-square rounded-full object-cover border border-border/40" />
						) : (
							<div className="size-8 rounded-full border-2 border-dashed border-border/80 flex items-center justify-center text-muted-foreground text-xs group-hover:border-foreground transition-colors">
								+
							</div>
						)}
					</div>
					<span className="text-xs sm:text-sm font-bold text-foreground">
						{selectedState ? selectedState.name : "State"}
					</span>
					<span className="text-[10px] sm:text-xs text-muted-foreground">state chapter</span>
				</button>

				{/* 3. LGA */}
				<button
					type="button"
					disabled={!selectedState}
					onClick={() => selectedState && onLevelChange("lga")}
					className="flex flex-col items-center text-center cursor-pointer group disabled:cursor-not-allowed disabled:opacity-40 focus:outline-hidden"
				>
					<div className="size-9 mb-1 flex items-center justify-center transition-transform group-hover:scale-110">
						{selectedLga ? (
							<img src={partyLogo} alt={partyName} className="size-8 aspect-square rounded-full object-cover border border-border/40" />
						) : (
							<div className="size-8 rounded-full border-2 border-dashed border-border/80 flex items-center justify-center text-muted-foreground text-xs group-hover:border-foreground transition-colors">
								+
							</div>
						)}
					</div>
					<span className="text-xs sm:text-sm font-bold text-foreground">
						{selectedLga ? selectedLga.name : "LGA"}
					</span>
					<span className="text-[10px] sm:text-xs text-muted-foreground">LGA chapter</span>
				</button>

				{/* 4. Ward */}
				<button
					type="button"
					disabled={!selectedLga}
					onClick={() => selectedLga && onLevelChange("ward")}
					className="flex flex-col items-center text-center cursor-pointer group disabled:cursor-not-allowed disabled:opacity-40 focus:outline-hidden"
				>
					<div className="size-9 mb-1 flex items-center justify-center transition-transform group-hover:scale-110">
						{selectedWard ? (
							<img src={partyLogo} alt={partyName} className="size-8 aspect-square rounded-full object-cover border border-border/40" />
						) : (
							<div className="size-8 rounded-full border-2 border-dashed border-border/80 flex items-center justify-center text-muted-foreground text-xs group-hover:border-foreground transition-colors">
								+
							</div>
						)}
					</div>
					<span className="text-xs sm:text-sm font-bold text-foreground">
						{selectedWard ? selectedWard.name : "Ward"}
					</span>
					<span className="text-[10px] sm:text-xs text-muted-foreground">ward chapter</span>
				</button>
			</div>

			{/* Action Buttons */}
			<div className="flex items-center justify-center gap-3.5">
				<Button
					type="button"
					variant="outline"
					size="lg"
					onClick={onCancel}
					disabled={isBusy}
					className="px-6 rounded-sm text-xs sm:text-sm font-semibold"
				>
					Cancel
				</Button>

				<Button
					type="button"
					variant="black"
					size="lg"
					onClick={onSaveAndContinue}
					loading={isBusy}
					disabled={isBusy || !selectedState}
					className="px-5 rounded-sm text-xs sm:text-sm font-semibold shadow-xs"
				>
					Save & Continue
				</Button>
			</div>
		</div>
	);
}
