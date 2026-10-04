import React, { useState, useMemo } from "react";
import { useRouter } from "@tanstack/react-router";
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS, APP_URL } from "#/lib/config";
import {
	getStatesForNigeria,
	getLGAsByState,
	getWardsByLGA,
	type StateItem,
	type LGAItem,
	type WardItem,
} from "#/lib/server/polling_units";
import { joinPartyHierarchy } from "#/lib/server/parties";
import { JoinPartyDrillDownHeader, type LevelTier } from "./JoinPartyDrillDownHeader";
import { JoinPartyChapterCard } from "./JoinPartyChapterCard";
import { JoinPartyDrillDownFooter } from "./JoinPartyDrillDownFooter";

export type JoinPartyDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	partyId: number;
	partyName: string;
	partyLogo?: string;
	chapterId?: number;
	onJoinSuccess?: (partyId: number) => void;
};

export function JoinPartyDialog({
	open,
	onOpenChange,
	partyId,
	partyName,
	partyLogo,
	chapterId,
	onJoinSuccess,
}: JoinPartyDialogProps) {
	const queryClient = useQueryClient();
	const router = useRouter();

	// Active level tier in the drill-down flow (starts at state level as in design mockup)
	const [currentLevel, setCurrentLevel] = useState<LevelTier>("state");
	const [searchQuery, setSearchQuery] = useState("");
	const [isResolving, setIsResolving] = useState(false);

	// Selections
	const [selectedState, setSelectedState] = useState<StateItem | null>(null);
	const [selectedLga, setSelectedLga] = useState<LGAItem | null>(null);
	const [selectedWard, setSelectedWard] = useState<WardItem | null>(null);

	// 1. Fetch States (National / Nigeria)
	const { data: statesRes, isLoading: statesLoading } = useQuery({
		queryKey: ["nigeria-states"],
		queryFn: () => getStatesForNigeria(),
		enabled: open,
	});
	const states: StateItem[] = statesRes?.data?.states || statesRes?.data || [];

	// 2. Fetch LGAs when state is selected
	const { data: lgasRes, isLoading: lgasLoading } = useQuery({
		queryKey: ["lgas", selectedState?.id],
		queryFn: () =>
			getLGAsByState({
				data: { stateId: Number(selectedState?.id) },
			}),
		enabled: open && Boolean(selectedState?.id),
	});
	const lgas: LGAItem[] = lgasRes?.data?.lgas || lgasRes?.data || [];

	// 3. Fetch Wards when LGA is selected
	const { data: wardsRes, isLoading: wardsLoading } = useQuery({
		queryKey: ["wards", selectedLga?.id, selectedState?.id],
		queryFn: () =>
			getWardsByLGA({
				data: {
					lgaId: Number(selectedLga?.id),
					stateId: selectedState?.id ? Number(selectedState.id) : undefined,
				},
			}),
		enabled: open && Boolean(selectedLga?.id),
	});
	const wards: WardItem[] = wardsRes?.data?.wards || wardsRes?.data || [];

	// Filtered items based on search query
	const filteredStates = useMemo(() => {
		if (!searchQuery.trim()) return states;
		return states.filter((s) =>
			s.name.toLowerCase().includes(searchQuery.toLowerCase().trim()),
		);
	}, [states, searchQuery]);

	const filteredLgas = useMemo(() => {
		if (!searchQuery.trim()) return lgas;
		return lgas.filter((l) =>
			l.name.toLowerCase().includes(searchQuery.toLowerCase().trim()),
		);
	}, [lgas, searchQuery]);

	const filteredWards = useMemo(() => {
		if (!searchQuery.trim()) return wards;
		return wards.filter((w) =>
			w.name.toLowerCase().includes(searchQuery.toLowerCase().trim()),
		);
	}, [wards, searchQuery]);

	// Handlers for selecting chapters
	const handleSelectNational = () => {
		setCurrentLevel("state");
	};

	const handleSelectState = (state: StateItem) => {
		setSelectedState(state);
		setSelectedLga(null);
		setSelectedWard(null);
		setSearchQuery("");
		setCurrentLevel("lga");
	};

	const handleSelectLga = (lga: LGAItem) => {
		setSelectedLga(lga);
		setSelectedWard(null);
		setSearchQuery("");
		setCurrentLevel("ward");
	};

	const handleSelectWard = (ward: WardItem) => {
		setSelectedWard(ward);
	};

	// Save & Continue: resolve hierarchy and confirm join
	const handleSaveAndContinue = async () => {
		// Show loading state while the join request is in flight
		setIsResolving(true);

		// Build the full chapter hierarchy selection (ward → lga → state → national)
		const AllSelected = [
			{ partyId, chapterType: "ward", chapterId: selectedWard?.id },
			{ partyId, chapterType: "lga", chapterId: selectedLga?.id },
			{ partyId, chapterType: "state", chapterId: selectedState?.id },
			{ partyId, chapterType: "national", chapterId: chapterId },
		];

		try {
			// Submit all chapter-level memberships in a single request
			const res = await joinPartyHierarchy({
				data: { partyId, selections: AllSelected },
			});
			if (!res?.success) {
				throw new Error(res?.message || "Failed to join party");
			}
			toast.success(`You have successfully joined ${partyName.toUpperCase()}!`);

			// Refresh party cards and session so UI reflects the new membership
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.partyCards });
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth.session });
			onJoinSuccess?.(partyId);

			await router.navigate({ to: APP_URL.party(partyName.toLowerCase(), String(partyId)) });
			onOpenChange(false);

		} catch (err: unknown) {
			// Surface a readable error message from the API or a generic fallback
			const message = err instanceof Error ? err.message : "Failed to join party. Please try again.";
			toast.error(message);

		} finally {
			// Always clear the loading state regardless of outcome
			setIsResolving(false);
		}
	};

	const isBusy = isResolving;

	return (
		<Dialog open={open} onOpenChange={(val) => !isBusy && onOpenChange(val)}>
			<DialogContent className="min-w-[96vw] max-h-[95vh] p-0 overflow-hidden border border-border shadow-2xl rounded-3xl bg-background flex flex-col">
				<DialogTitle className="sr-only">Drill it down - Select your chapters</DialogTitle>

				{/* Top Section Header */}
				<JoinPartyDrillDownHeader
					currentLevel={currentLevel}
					onLevelChange={setCurrentLevel}
					selectedState={selectedState}
					selectedLga={selectedLga}
					selectedWard={selectedWard}
					searchQuery={searchQuery}
					onSearchChange={setSearchQuery}
				/>

				{/* Middle Cards Grid */}
				<div className="px-6 sm:px-10 py-3 flex-1 overflow-y-auto min-h-75 max-h-[46vh]">
					{/* National Level */}
					{currentLevel === "national" && (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-2">
							<JoinPartyChapterCard
								title="Nigeria"
								appendix="national chapter"
								partyLogo={partyLogo}
								isSelected={true}
								onSelect={handleSelectNational}
							/>
						</div>
					)}

					{/* State Level */}
					{currentLevel === "state" && (
						<>
							{statesLoading ? (
								<div className="w-full h-48 flex items-center justify-center">
									<Loader2 className="size-8 animate-spin text-muted-foreground" />
								</div>
							) : filteredStates.length === 0 ? (
								<div className="w-full py-16 text-center text-xs text-muted-foreground">
									No state chapters found matching &ldquo;{searchQuery}&rdquo;.
								</div>
							) : (
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-5 py-2">
									{filteredStates.map((state) => (
										<JoinPartyChapterCard
											key={state.id}
											title={state.name}
											appendix="state chapter"
											partyLogo={partyLogo}
											isSelected={selectedState?.id === state.id}
											onSelect={() => handleSelectState(state)}
										/>
									))}
								</div>
							)}
						</>
					)}

					{/* LGA Level */}
					{currentLevel === "lga" && (
						<>
							{lgasLoading ? (
								<div className="w-full h-48 flex items-center justify-center">
									<Loader2 className="size-8 animate-spin text-muted-foreground" />
								</div>
							) : filteredLgas.length === 0 ? (
								<div className="w-full py-16 text-center text-xs text-muted-foreground">
									{selectedState
										? `No LGA chapters found in ${selectedState.name}.`
										: "Please select a state first."}
								</div>
							) : (
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-5 py-2">
									{filteredLgas.map((lga) => (
										<JoinPartyChapterCard
											key={lga.id}
											title={lga.name}
											appendix="LGA chapter"
											partyLogo={partyLogo}
											isSelected={selectedLga?.id === lga.id}
											onSelect={() => handleSelectLga(lga)}
										/>
									))}
								</div>
							)}
						</>
					)}

					{/* Ward Level */}
					{currentLevel === "ward" && (
						<>
							{wardsLoading ? (
								<div className="w-full h-48 flex items-center justify-center">
									<Loader2 className="size-8 animate-spin text-muted-foreground" />
								</div>
							) : filteredWards.length === 0 ? (
								<div className="w-full py-16 text-center text-xs text-muted-foreground">
									{selectedLga
										? `No ward chapters found in ${selectedLga.name}.`
										: "Please select an LGA first."}
								</div>
							) : (
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-5 py-2">
									{filteredWards.map((ward) => (
										<JoinPartyChapterCard
											key={ward.id}
											title={ward.name}
											appendix="ward chapter"
											partyLogo={partyLogo}
											isSelected={selectedWard?.id === ward.id}
											onSelect={() => handleSelectWard(ward)}
										/>
									))}
								</div>
							)}
						</>
					)}
				</div>

				{/* Bottom Selected Bar Footer */}
				<JoinPartyDrillDownFooter
					partyName={partyName}
					partyLogo={partyLogo}
					selectedState={selectedState}
					selectedLga={selectedLga}
					selectedWard={selectedWard}
					onLevelChange={setCurrentLevel}
					onCancel={() => onOpenChange(false)}
					onSaveAndContinue={handleSaveAndContinue}
					isBusy={isBusy}
				/>
			</DialogContent>
		</Dialog>
	);
}
