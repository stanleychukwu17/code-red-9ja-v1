import type { OfficialInfo } from "./party-constants";

interface PartyOfficialsProps {
	chairman: OfficialInfo;
	secretary: OfficialInfo;
}

export function PartyOfficials({ chairman, secretary }: PartyOfficialsProps) {
	return (
		<div className="grid grid-cols-2 gap-6 mt-7 w-full px-6 max-w-xs mx-auto text-center">
			<div className="flex flex-col items-center">
				<img
					src={chairman.avatar}
					alt={chairman.name}
					className="w-14 h-14 rounded-full object-cover shadow-sm"
				/>
				<span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 mt-2">
					{chairman.title}
				</span>
				<span className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200 mt-0.5 line-clamp-1">
					{chairman.name}
				</span>
				<span className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
					{chairman.since}
				</span>
			</div>

			<div className="flex flex-col items-center">
				<img
					src={secretary.avatar}
					alt={secretary.name}
					className="w-14 h-14 rounded-full object-cover shadow-sm"
				/>
				<span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 mt-2">
					{secretary.title}
				</span>
				<span className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200 mt-0.5 line-clamp-1">
					{secretary.name}
				</span>
				<span className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
					{secretary.since}
				</span>
			</div>
		</div>
	);
}
