import { VerificationBadge } from "@repo/ui/components/custom/verification-badge";
import { Link } from "@tanstack/react-router";
import { Check, Plus } from "lucide-react";
import { APP_URL } from "#/lib/config";
import type { PartyCardData } from "#/lib/server/parties";
import { PartyMembersStack } from "./PartyMembersStack";
import { PartyOfficials } from "./PartyOfficials";
import { DEFAULT_COVER, PARTY_PRESETS } from "./party-constants";

type PartyCardProps = {
	party: PartyCardData;
};

type PartyCoverProps = {
	coverImage: string;
	foundedYear: number;
	shortName: string;
	coverPositionY?: number;
	partyHref: string;
};

/**
 * Banner image section displaying the cover photo and founded year badge.
 */
export function PartyCover({
	coverImage,
	foundedYear,
	shortName,
	coverPositionY = 50,
	partyHref,
}: PartyCoverProps) {
	const posY = coverPositionY ?? 50;
	return (
		<Link
			to={partyHref}
			className="relative h-44 w-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 block"
		>
			<img
				src={coverImage}
				alt={`${shortName} banner`}
				style={{ objectPosition: `center ${posY}%` }}
				className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
			/>
			<div className="absolute top-3 right-3 bg-neutral-950/80 backdrop-blur-md text-white text-[11px] font-semibold px-3 py-1 rounded-full shadow-sm">
				Founded in {foundedYear}
			</div>
		</Link>
	);
}

/**
 * Centered overlapping avatar displaying the party's logo or short name initials.
 * Dynamically applies the party's brand color hex to the outer ring border.
 */
function PartyAvatar({ party, partyHref }: { party: PartyCardData; partyHref: string }) {
	const ringColor = party.color_hex || "#4ade80";

	return (
		<Link
			to={partyHref}
			className="-mt-12 relative z-10 size-26 rounded-full border-4 border-white dark:border-neutral-900 overflow-hidden bg-white dark:bg-neutral-800 flex items-center justify-center shrink-0 ring-2 transition-transform duration-200 hover:scale-105"
			style={{
				boxShadow: `0 0 0 2px ${ringColor}`,
			}}
		>
			{party.logo ? (
				<img src={party.logo} alt={party.short_name} className="w-full h-full object-contain" />
			) : (
				<span className="text-2xl font-black" style={{ color: ringColor }}>
					{party.short_name}
				</span>
			)}
		</Link>
	);
}

/**
 * Renders verification checkmark badge for verified parties.
 */
function PartyVerificationBadges({ party }: { party: PartyCardData }) {
	const isVerified = Boolean(party.is_verified);
	if (!isVerified) return null;

	return (
		<div className="flex items-center gap-1 shrink-0 relative -bottom-px">
			<VerificationBadge id={3} title="Verified Political Party" />
		</div>
	);
}

/**
 * Party headline title combining the party's short name and any verification badges.
 */
function PartyTitle({ party, partyHref }: { party: PartyCardData; partyHref: string }) {
	return (
		<div className="flex items-center justify-center gap-1.5 mt-3 px-4">
			<Link
				to={partyHref}
				className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-white text-center hover:opacity-80 transition-opacity"
			>
				{party.short_name}
			</Link>
			<PartyVerificationBadges party={party} />
		</div>
	);
}

/**
 * Action button at the bottom of the card:
 * Displays an active Checkmark / "Member" badge if the user is a member,
 * or the Plus button linking to the party profile if not.
 */
function PartyActionButton({
	isUserMember,
	partyHref,
}: {
	isUserMember: boolean;
	partyHref: string;
}) {
	return (
		<div className="mt-8 mb-2 flex justify-center">
			{isUserMember ? (
				<div
					title="You are a member of this party"
					className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 font-semibold text-xs border border-emerald-600/20 shadow-sm"
				>
					<div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
						<Check className="w-3.5 h-3.5 stroke-[3]" />
					</div>
					<span>Member</span>
				</div>
			) : (
				<Link
					to={partyHref}
					title="View party and join"
					className="w-12 h-12 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-transform duration-200"
				>
					<Plus className="w-6 h-6 stroke-[2.5]" />
				</Link>
			)}
		</div>
	);
}

/**
 * Interactive Party Card component representing an individual political party.
 * Displays banner, brand avatar, verification badges, member avatars stack,
 * party officials (or vacant indicators), and member checkmark / join action.
 */
export function PartyCard({ party }: PartyCardProps) {
	const preset = PARTY_PRESETS[party.short_name.toUpperCase()];
	const foundedYear =
		(party.date_founded ? new Date(party.date_founded).getFullYear() : undefined) ??
		preset?.founded ??
		1998;
	const coverImage = party.cover_image || preset?.coverImage || DEFAULT_COVER;
	const coverPositionY = party.cover_position_y ?? preset?.coverPositionY ?? 50;
	const partyHref = APP_URL.party(party.short_name.toLowerCase(), party.id.toString());

	return (
		<div className="group flex flex-col items-center bg-sidebar-mobile/50 dark:bg-neutral-900 rounded overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-xl hover:shadow-neutral-200/60 dark:hover:shadow-neutral-950/60 transition-all duration-300 pb-6">
			{/* Banner / Cover Header */}
			<PartyCover
				coverImage={coverImage}
				foundedYear={foundedYear}
				shortName={party.short_name}
				coverPositionY={coverPositionY}
				partyHref={partyHref}
			/>

			{/* Center Overlapping Brand Avatar */}
			<PartyAvatar party={party} partyHref={partyHref} />

			{/* Short Name & Verification Badges */}
			<PartyTitle party={party} partyHref={partyHref} />

			{/* Full Legal Party Name */}
			<Link
				to={partyHref}
				className="text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400 mt-0.5 text-center px-6 line-clamp-1 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
			>
				{party.name}
			</Link>

			{/* Active Members Avatar Stack */}
			<PartyMembersStack
				partyId={party.id}
				totalMembers={party.total_members}
				sampleMembers={party.sample_members}
				colorHex={party.color_hex}
			/>

			{/* Party Leadership (Top 2 National Positions or Vacant Indicators) */}
			<PartyOfficials officials={party.officials} />

			{/* Action Button (Member checkmark or Join plus) */}
			<PartyActionButton isUserMember={party.is_user_member} partyHref={partyHref} />
		</div>
	);
}

