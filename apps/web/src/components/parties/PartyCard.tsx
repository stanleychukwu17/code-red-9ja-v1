import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { APP_URL } from "#/lib/config";
import type { Party } from "#/lib/server/parties";
import { PartyMembersStack } from "./PartyMembersStack";
import { PartyOfficials } from "./PartyOfficials";
import { getPartyMeta } from "./party-constants";

type PartyCardProps = {
	party: Party;
}

function PartyCover({ coverImage, foundedYear, shortName }: {
	coverImage: string;
	foundedYear: number;
	shortName: string;
}) {
	return (
		<div className="relative h-44 w-full overflow-hidden bg-neutral-200 dark:bg-neutral-800">
			<img
				src={coverImage}
				alt={`${shortName} banner`}
				className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
			/>
			<div className="absolute top-3 right-3 bg-neutral-950/80 backdrop-blur-md text-white text-[11px] font-semibold px-3 py-1 rounded-full shadow-sm">
				Founded in {foundedYear}
			</div>
		</div>
	);
}

function PartyAvatar({ party }: { party: Party }) {
	return (
		<div className="-mt-12 relative z-10 w-24 h-24 rounded-full border-4 border-white dark:border-neutral-900 shadow-md overflow-hidden bg-white dark:bg-neutral-800 flex items-center justify-center shrink-0">
			{party.logo ? (
				<img src={party.logo} alt={party.short_name} className="w-full h-full object-contain p-2" />
			) : (
				<span className="text-2xl font-black" style={{ color: party.color_hex || "inherit" }}>
					{party.short_name}
				</span>
			)}
		</div>
	);
}

function PartyActionPlus() {
	return (
		<div className="mt-8 mb-2 flex justify-center">
			<div className="w-12 h-12 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center shadow-md group-hover:scale-110 active:scale-95 transition-transform duration-200">
				<Plus className="w-6 h-6 stroke-[2.5]" />
			</div>
		</div>
	);
}

export function PartyCard({ party }: PartyCardProps) {
	const { foundedYear, coverImage, memberCount, chairman, secretary } = getPartyMeta(party);

	return (
		<Link
			to={APP_URL.party(party.short_name.toLowerCase(), party.id.toString())}
			className="group flex flex-col items-center bg-[#F1F2F6] dark:bg-neutral-900 rounded overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-xl hover:shadow-neutral-200/60 dark:hover:shadow-neutral-950/60 transition-all duration-300 hover:-translate-y-1 pb-6"
		>
			<PartyCover coverImage={coverImage} foundedYear={foundedYear} shortName={party.short_name} />

			<PartyAvatar party={party} />

			<h3 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-white mt-3 text-center">
				{party.short_name}
			</h3>
			<p className="text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400 mt-0.5 text-center px-6 line-clamp-1">
				{party.name}
			</p>

			<PartyMembersStack partyId={party.id} memberCount={memberCount} />

			<PartyOfficials chairman={chairman} secretary={secretary} />

			<PartyActionPlus />
		</Link>
	);
}
