import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { QUERY_KEYS } from "#/lib/config";
import { joinParty } from "#/lib/server/parties";

export type PartyActionButtonProps = {
	/** Whether the authenticated user is currently an active member */
	isUserMember: boolean;
	partyId: number;
	partyName: string;
	/** Optional specific party chapter ID to join */
	chapterId?: number;
	/** Optional callback fired when the party has been successfully joined */
	onJoinCompleted?: (partyId: number) => void;
};

/**
 * Action button:
 * Displays an active Checkmark / "Member" badge if the user is a member,
 * or an action button to join the party with loading state and mutation handling.
 */
export function PartyActionButton({ isUserMember, partyId, partyName, chapterId, onJoinCompleted }: PartyActionButtonProps) {
	const queryClient = useQueryClient();

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
			toast.success(`You have successfully joined ${partyName.toUpperCase()}!`);
			// Invalidate party card list queries to reflect updated member counts/statuses
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.partyCards });
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
				<button
					type="button"
					onClick={() => joinMutation.mutate()}
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
			)}
		</div>
	);
}

