import { useState } from "react";
import { Check, Plus } from "lucide-react";
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
 * or an action button opening a confirmation modal to join the party.
 */
export function PartyActionButton({
	isUserMember,
	partyId,
	partyName,
	partyLogo,
	chapterId,
	onJoinCompleted,
}: PartyActionButtonProps) {
	const [isDialogOpen, setIsDialogOpen] = useState(false);

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
				/* Not a member: render interactive join button */
				<>
					<button
						type="button"
						onClick={() => setIsDialogOpen(true)}
						title={`Join ${partyName}`}
						aria-label={`Join ${partyName}`}
						className="w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center shadow-md hover:scale-110 active:scale-95 hover:bg-foreground/90 transition-transform duration-200 cursor-pointer"
					>
						<Plus className="w-6 h-6 stroke-[2.5]" />
					</button>

					{/* Confirmation and Chapter Enrollment Modal */}
					<JoinPartyDialog
						open={isDialogOpen}
						onOpenChange={setIsDialogOpen}
						partyId={partyId}
						partyName={partyName}
						partyLogo={partyLogo}
						chapterId={chapterId}
						onJoinSuccess={onJoinCompleted}
					/>
				</>
			)}
		</div>
	);
}


