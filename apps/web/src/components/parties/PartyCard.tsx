import { VerificationBadge } from "@repo/ui/components/custom/verification-badge";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { APP_URL } from "#/lib/config";
import type { Party } from "#/lib/server/parties";
import { PartyMembersStack } from "./PartyMembersStack";
import { PartyOfficials } from "./PartyOfficials";
import { getPartyMeta } from "./party-constants";

type PartyCardProps = {
	party: Party;
};

type PartyCoverProps = {
	coverImage: string;
	foundedYear: number;
	shortName: string;
	coverPositionY?: number;
};

/**
 * Banner image section displaying the cover photo and founded year badge.
 */
export function PartyCover({ coverImage, foundedYear, shortName, coverPositionY = 50 }: PartyCoverProps) {
	const posY = coverPositionY ?? 50;
	return (
		<div className="relative h-44 w-full overflow-hidden bg-neutral-200 dark:bg-neutral-800">
			<img
				src={coverImage}
				alt={`${shortName} banner`}
				style={{ objectPosition: `center ${posY}%` }}
				className="w-full h-full object-cover"
			/>
			<div className="absolute top-3 right-3 bg-neutral-950/80 backdrop-blur-md text-white text-[11px] font-semibold px-3 py-1 rounded-full shadow-sm">
				Founded in {foundedYear}
			</div>
		</div>
	);
}

/**
 * Centered overlapping avatar displaying the party's logo or short name initials.
 * Dynamically applies the party's brand color hex to the outer ring border.
 */
function PartyAvatar({ party }: { party: Party }) {
	const ringColor = party.color_hex || "#4ade80";

	return (
		<div
			className="-mt-12 relative z-10 size-26 rounded-full border-4 border-white dark:border-neutral-900 overflow-hidden bg-white dark:bg-neutral-800 flex items-center justify-center shrink-0 ring-2"
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
		</div>
	);
}

/**
 * Renders verification checkmark badge for verified parties.
 */
function PartyVerificationBadges({ party }: { party: Party }) {
	const isVerified = Boolean(party.is_verified ?? party.verified);
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
function PartyTitle({ party }: { party: Party }) {
	return (
		<div className="flex items-center justify-center gap-1.5 mt-3 px-4">
			<h3 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-white text-center">
				{party.short_name}
			</h3>
			<PartyVerificationBadges party={party} />
		</div>
	);
}

/**
 * Floating circular plus action button at the bottom of the party card.
 */
function PartyActionPlus() {
	return (
		<div className="mt-8 mb-2 flex justify-center">
			<div className="w-12 h-12 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center shadow-md group-hover:scale-110 active:scale-95 transition-transform duration-200">
				<Plus className="w-6 h-6 stroke-[2.5]" />
			</div>
		</div>
	);
}

/**
 * Interactive Party Card component representing an individual political party.
 * Navigates to the party's detail page and displays banner, brand avatar,
 * verification badges, member avatars stack, party officials, and action button.
 */
export function PartyCard({ party }: PartyCardProps) {
	const { foundedYear, coverImage, coverPositionY, memberCount, chairman, secretary } = getPartyMeta(party);

	return (
		<Link
			to={APP_URL.party(party.short_name.toLowerCase(), party.id.toString())}
			className="group flex flex-col items-center bg-sidebar-mobile/50 dark:bg-neutral-900 rounded overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-xl hover:shadow-neutral-200/60 dark:hover:shadow-neutral-950/60 transition-all duration-300 hover:-translate-y-1 pb-6"
		>
			{/* Banner / Cover Header */}
			<PartyCover
				coverImage={coverImage}
				foundedYear={foundedYear}
				shortName={party.short_name}
				coverPositionY={coverPositionY}
			/>

			{/* Center Overlapping Brand Avatar */}
			<PartyAvatar party={party} />

			{/* Short Name & Verification Badges */}
			<PartyTitle party={party} />

			{/* Full Legal Party Name */}
			<p className="text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400 mt-0.5 text-center px-6 line-clamp-1">
				{party.name}
			</p>

			{/* Active Members Avatar Stack */}
			<PartyMembersStack partyId={party.id} memberCount={memberCount} colorHex={party.color_hex} />

			{/* Party Leadership (Chairman & Secretary) */}
			<PartyOfficials chairman={chairman} secretary={secretary} />

			{/* Action Plus Button */}
			<PartyActionPlus />
		</Link>
	);
}
