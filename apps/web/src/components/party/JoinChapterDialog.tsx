import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import { Check, AlertTriangle, ShieldAlert, Landmark, Building2, MapPin, Flag } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "#/lib/config";
import { useAppSelector } from "#/redux/hooks";
import {
	joinPartyHierarchy,
	type PartyCardData,
	type ChapterHierarchyInfo,
} from "#/lib/server/parties";

export type JoinChapterDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	partyId: number;
	partyName: string;
	partyLogo?: string;
	chapterId?: number;
	chapterType?: string;
	chapterGeoName?: string;
	chapterHierarchy?: ChapterHierarchyInfo;
	onJoinSuccess?: (partyId: number) => void;
};

export function JoinChapterDialog({
	open,
	onOpenChange,
	partyId,
	partyName,
	partyLogo,
	chapterId,
	chapterType,
	chapterGeoName,
	chapterHierarchy,
	onJoinSuccess,
}: JoinChapterDialogProps) {
	const queryClient = useQueryClient();
	const user = useAppSelector((state) => state.auth.user);
	const [isResolving, setIsResolving] = useState(false);

	// Check if user is affiliated with a DIFFERENT party
	const isDifferentPartyMember = Boolean(
		user?.party_id && user.party_id > 0 && user.party_id !== partyId
	);
	const userPartyName = user?.party?.short_name || user?.party?.name || "another political party";

	// User's active chapters in this party from auth state
	const userChapters = user?.chapters || [];
	const existingNational = userChapters.find((c) => c.chapter_type === "national");
	const existingState = userChapters.find((c) => c.chapter_type === "state");
	const existingLga = userChapters.find((c) => c.chapter_type === "lga");
	const existingWard = userChapters.find((c) => c.chapter_type === "ward");

	// Build the chain of chapters the user will join
	const hierarchyChain = useMemo(() => {
		const chain: Array<{
			tier: "national" | "state" | "lga" | "ward";
			title: string;
			subtitle: string;
			isAlreadyMember: boolean;
			conflictWith?: string;
		}> = [];

		// 1. National Level
		const isNationalMember = Boolean(existingNational || user?.party_id === partyId);
		chain.push({
			tier: "national",
			title: chapterHierarchy?.country_name || "Nigeria",
			subtitle: "National Chapter",
			isAlreadyMember: isNationalMember,
		});

		// 2. State Level
		if (chapterType === "state" || chapterType === "lga" || chapterType === "ward") {
			const stateName =
				chapterHierarchy?.state_name ||
				(chapterType === "state" ? chapterGeoName : "") ||
				"State";
			const isStateMember = Boolean(
				existingState &&
				(existingState.id === chapterId ||
					(chapterHierarchy?.state_id && existingState.state_id === chapterHierarchy.state_id))
			);
			const hasStateConflict = Boolean(
				existingState &&
				!isStateMember &&
				chapterHierarchy?.state_id &&
				existingState.state_id !== chapterHierarchy.state_id
			);

			chain.push({
				tier: "state",
				title: stateName,
				subtitle: "State Chapter",
				isAlreadyMember: isStateMember,
				conflictWith: hasStateConflict
					? existingState?.state_name || "another State"
					: undefined,
			});
		}

		// 3. LGA Level
		if (chapterType === "lga" || chapterType === "ward") {
			const lgaName =
				chapterHierarchy?.lga_name ||
				(chapterType === "lga" ? chapterGeoName : "") ||
				"LGA";
			const isLgaMember = Boolean(
				existingLga &&
				(existingLga.id === chapterId ||
					(chapterHierarchy?.lga_id && existingLga.lga_id === chapterHierarchy.lga_id))
			);
			const hasLgaConflict = Boolean(
				existingLga &&
				!isLgaMember &&
				chapterHierarchy?.lga_id &&
				existingLga.lga_id !== chapterHierarchy.lga_id
			);

			chain.push({
				tier: "lga",
				title: lgaName,
				subtitle: "LGA Chapter",
				isAlreadyMember: isLgaMember,
				conflictWith: hasLgaConflict
					? existingLga?.lga_name || "another LGA"
					: undefined,
			});
		}

		// 4. Ward Level
		if (chapterType === "ward") {
			const wardName =
				chapterHierarchy?.ward_name || chapterGeoName || "Ward";
			const isWardMember = Boolean(
				existingWard &&
				(existingWard.id === chapterId ||
					(chapterHierarchy?.ward_id && existingWard.ward_id === chapterHierarchy.ward_id))
			);
			const hasWardConflict = Boolean(
				existingWard &&
				!isWardMember &&
				chapterHierarchy?.ward_id &&
				existingWard.ward_id !== chapterHierarchy.ward_id
			);

			chain.push({
				tier: "ward",
				title: wardName,
				subtitle: "Ward Chapter",
				isAlreadyMember: isWardMember,
				conflictWith: hasWardConflict
					? existingWard?.ward_name || "another Ward"
					: undefined,
			});
		}

		return chain;
	}, [
		chapterType,
		chapterHierarchy,
		chapterGeoName,
		existingNational,
		existingState,
		existingLga,
		existingWard,
		user?.party_id,
		chapterId,
		partyId,
	]);

	// Check if any chapter in the chain conflicts with user's existing memberships
	const conflictItem = hierarchyChain.find((c) => c.conflictWith);

	const handleConfirmJoin = async () => {
		if (!chapterId || !chapterType) return;
		setIsResolving(true);

		try {
			// Submit ONLY the specific chapter ID to the backend; backend completes ancestors upwards
			const res = await joinPartyHierarchy({
				data: {
					partyId,
					selections: [{ partyId, chapterType, chapterId }],
				},
			});
			if (!res?.success) {
				throw new Error(res?.message || "Failed to join party chapter");
			}

			toast.success(`You have successfully joined ${partyName.toUpperCase()}!`);

			// Update party card cache
			queryClient.setQueryData(
				QUERY_KEYS.partyCards,
				(oldData: { success: boolean; message?: string; data: { parties: PartyCardData[] } } | undefined) => {
					if (!oldData?.data?.parties) return oldData;
					return {
						...oldData,
						data: {
							...oldData.data,
							parties: oldData.data.parties.map((p) => {
								if (p.id === partyId) {
									return {
										...p,
										is_user_member: true,
										total_members: (p.total_members || 0) + 1,
									};
								}
								return p.is_user_member ? { ...p, is_user_member: false } : p;
							}),
						},
					};
				}
			);

			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth.session }); // Refresh user session to sync user.chapters & party_id
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.partyProfile.root }); // Refresh header counts, membership badge & follow status
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.partyMembers.root }); // Refresh chapter members roster in the members tab

			onJoinSuccess?.(partyId);
			onOpenChange(false);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Failed to join party chapter. Please try again.";
			toast.error(message);
		} finally {
			setIsResolving(false);
		}
	};

	const getTierIcon = (tier: string) => {
		switch (tier) {
			case "national":
				return <Flag className="size-4 text-emerald-500" />;
			case "state":
				return <Landmark className="size-4 text-amber-500" />;
			case "lga":
				return <Building2 className="size-4 text-blue-500" />;
			case "ward":
				return <MapPin className="size-4 text-lime-500" />;
			default:
				return <Flag className="size-4 text-muted-foreground" />;
		}
	};

	return (
		<Dialog open={open} onOpenChange={(val) => !isResolving && onOpenChange(val)}>
			<DialogContent className="max-w-lg w-[92vw] p-0 overflow-hidden border border-border shadow-2xl rounded-3xl bg-background flex flex-col">
				{/* 1. GUARD: User belongs to a DIFFERENT Party */}
				{isDifferentPartyMember ? (
					<div className="p-6 sm:p-8 flex flex-col items-center text-center">
						<DialogTitle className="sr-only">Party Membership Conflict</DialogTitle>
						<div className="size-16 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
							<ShieldAlert className="size-8 stroke-[2.2]" />
						</div>

						<h3 className="text-xl sm:text-2xl font-bold text-foreground">
							Active Membership Conflict
						</h3>

						<p className="mt-3 text-sm text-muted-foreground leading-relaxed">
							You are already an active registered member of{" "}
							<span className="font-semibold text-foreground">{userPartyName}</span>.
							Electoral law restricts membership to one political party at a time.
						</p>

						<div className="mt-4 p-3.5 rounded-xl bg-muted/50 border border-border/80 text-xs text-muted-foreground text-left w-full space-y-1">
							<p className="font-medium text-foreground">How to switch parties:</p>
							<p>1. Navigate to your profile or current party page.</p>
							<p>2. Leave your existing party chapters.</p>
							<p>3. Return here to join {partyName.toUpperCase()}.</p>
						</div>

						<div className="mt-6 flex w-full justify-end gap-3">
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
								className="w-full sm:w-auto"
							>
								Understood
							</Button>
						</div>
					</div>
				) : (
					/* 2. Show Direct Hierarchy Chain for this Chapter */
					<div className="p-6 sm:p-8 flex flex-col">
						<DialogTitle className="sr-only">Join Chapter Hierarchy</DialogTitle>
						<div className="flex items-start gap-4">
							<div className="size-12 rounded-2xl bg-muted border border-border/70 flex items-center justify-center shrink-0">
								{partyLogo ? (
									<img
										src={partyLogo}
										alt={partyName}
										className="size-8 rounded-full object-cover"
									/>
								) : (
									<Landmark className="size-6 text-foreground" />
								)}
							</div>
							<div>
								<h3 className="text-xl sm:text-2xl font-bold text-foreground capitalize">
									Join {chapterGeoName || chapterType} Chapter
								</h3>
								<p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
									{partyName.toUpperCase()} &bull; Review the chapter chain you will be enrolled into:
								</p>
							</div>
						</div>

						{/* Chain of chapters */}
						<div className="mt-6 space-y-2.5">
							{hierarchyChain.map((step) => (
								<div
									key={step.tier}
									className={`relative p-3.5 rounded-2xl border transition-colors flex items-center justify-between gap-3 ${step.conflictWith
										? "bg-destructive/5 border-destructive/40 text-foreground"
										: step.isAlreadyMember
											? "bg-muted/40 border-border/70 text-foreground"
											: "bg-muted/70 border-lime-500/30 text-foreground"
										}`}
								>
									<div className="flex items-center gap-3">
										<div className="size-8 rounded-xl bg-background border border-border/60 flex items-center justify-center shrink-0">
											{getTierIcon(step.tier)}
										</div>
										<div>
											<p className="text-sm font-semibold capitalize text-foreground flex items-center gap-1.5">
												<span>{step.title}</span>
											</p>
											<p className="text-[11px] text-muted-foreground capitalize">
												{step.subtitle}
											</p>
										</div>
									</div>

									{/* Status badge */}
									<div>
										{step.conflictWith ? (
											<span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium text-destructive bg-destructive/10 px-2.5 py-1 rounded-full">
												<AlertTriangle className="size-3" />
												Member of {step.conflictWith}
											</span>
										) : step.isAlreadyMember ? (
											<span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 px-2.5 py-1 rounded-full">
												<Check className="size-3 stroke-[2.5]" />
												Already a member
											</span>
										) : (
											<span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold text-lime-700 bg-lime-500/15 dark:text-lime-400 px-2.5 py-1 rounded-full">
												+ Will be enrolled
											</span>
										)}
									</div>
								</div>
							))}
						</div>

						{/* Conflict warning or enrollment notice */}
						{conflictItem ? (
							<div className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2">
								<AlertTriangle className="size-4 shrink-0 mt-0.5" />
								<span>
									You cannot join this chapter because you are already a member of{" "}
									<strong className="underline">{conflictItem.conflictWith}</strong>. You must leave that chapter first.
								</span>
							</div>
						) : (
							<p className="mt-4 text-xs text-muted-foreground">
								Enrolling in this chapter automatically maintains your parent memberships in {partyName.toUpperCase()}.
							</p>
						)}

						{/* Bottom Actions */}
						<div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-border/60">
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
								disabled={isResolving}
								className="rounded-xl text-xs sm:text-sm font-semibold"
							>
								Cancel
							</Button>

							<Button
								type="button"
								variant="black"
								onClick={handleConfirmJoin}
								loading={isResolving}
								disabled={isResolving || Boolean(conflictItem)}
								className="rounded-xl text-xs sm:text-sm font-semibold px-4"
							>
								Confirm & Join
							</Button>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

