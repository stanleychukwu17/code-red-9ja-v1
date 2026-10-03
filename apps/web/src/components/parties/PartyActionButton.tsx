import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { QUERY_KEYS } from "#/lib/config";
import { joinParty } from "#/lib/server/parties";
import { JoinPartyDialog } from "./JoinPartyDialog";

export type PartyActionButtonProps = {
	/** Whether the authenticated user is currently an active member */
	isUserMember: boolean;
	partyId: number;
	partyName: string;
	partyFullName?: string;
	partyLogo?: string;
	colorHex?: string | null;
	/** Optional specific party chapter ID to join */
	chapterId?: number;
	/** Optional user location summary for confirmation modal */
	userLocation?: {
		stateName?: string;
		cityName?: string;
	};
	/** Whether user is currently authenticated */
	isAuthenticated?: boolean;
	/** Optional callback fired when the party has been successfully joined */
	onJoinCompleted?: (partyId: number) => void;
};

/**
 * Action button:
 * Displays an active Checkmark / "Member" badge if the user is a member,
 * or an action button opening a confirmation modal to join the party with loading state and mutation handling.
 */
export function PartyActionButton({
	isUserMember,
	partyId,
	partyName,
	partyFullName,
	partyLogo,
	colorHex,
	chapterId,
	userLocation,
	isAuthenticated = true,
	onJoinCompleted,
}: PartyActionButtonProps) {
	const queryClient = useQueryClient();
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	// Handles party enrollment, toast notifications, and cache invalidation
	const joinMutation = useMutation({
		mutationFn: async () => {
			const res = await joinParty({ data: { partyId, chapterId } });
			if (!res?.success) {
				throw new Error(res?.message || "Failed to join party");
			}
			return res;
		},
		onSuccess: () => {
			setIsDialogOpen(false);
			toast.success(`You have successfully joined ${partyName.toUpperCase()}!`);
			// Invalidate party card list queries and auth session to reflect updated member counts/statuses
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.partyCards });
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth.session });
			onJoinCompleted?.(partyId);
		},
		onError: (err: Error) => {
			toast.error(err.message || "Failed to join party. Please try again.");
		},
	});

	const isJoining = joinMutation.isPending;

	return (
		<div className="mt-8 mb-2 flex justify-center">
			{/* Already a member: display badge */}
			{isUserMember ? (
				<div
					title="You are a member of this party"
					className="flex items-center gap-2 px-4 py-2 rounded-full bg-card text-primary dark:bg-primary/10 dark:text-light-green font-semibold text-xs border border-primary/20 shadow-sm"
				>
					<div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
						<Check className="w-3.5 h-3.5 stroke-3" />
					</div>
					<span>Member</span>
				</div>
			) : (
				/* Not a member: render interactive join button with loading state */
				<>
					<button
						type="button"
						onClick={() => setIsDialogOpen(true)}
						disabled={isJoining}
						title={`Join ${partyName}`}
						aria-label={`Join ${partyName}`}
						className="w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center shadow-md hover:scale-110 active:scale-95 hover:bg-foreground/90 disabled:opacity-60 disabled:hover:scale-100 disabled:cursor-not-allowed transition-transform duration-200 cursor-pointer"
					>
						{isJoining ? (
							<Loader2 className="w-5 h-5 animate-spin" />
						) : (
							<Plus className="w-6 h-6 stroke-[2.5]" />
						)}
					</button>

					{/* Confirmation and Chapter Enrollment Modal */}
					<JoinPartyDialog
						open={isDialogOpen}
						onOpenChange={setIsDialogOpen}
						partyId={partyId}
						partyName={partyName}
						partyFullName={partyFullName}
						partyLogo={partyLogo}
						colorHex={colorHex}
						isJoining={isJoining}
						onConfirmJoin={() => joinMutation.mutate()}
						userLocation={userLocation}
						isAuthenticated={isAuthenticated}
					/>
				</>
			)}
		</div>
	);
}


