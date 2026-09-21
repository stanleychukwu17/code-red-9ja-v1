import { User } from "lucide-react";
import type { PartyOfficialCardInfo } from "#/lib/server/parties";

interface PartyOfficialsProps {
	officials?: PartyOfficialCardInfo[];
}

export function PartyOfficials({ officials = [] }: PartyOfficialsProps) {
	// Always render 2 slots (first 2 officials, or fill remaining with vacant)
	const slots: (PartyOfficialCardInfo | { position_name: string; is_vacant: boolean })[] = [
		officials[0] || { position_name: "Chairman", is_vacant: true },
		officials[1] || { position_name: "Secretary", is_vacant: true },
	];

	return (
		<div className="grid grid-cols-2 gap-6 mt-7 w-full px-6 max-w-xs mx-auto text-center">
			{slots.map((official, idx) => {
				const isVacant = official.is_vacant || !("name" in official && official.name);

				if (isVacant) {
					return (
						<div key={`official-${official.position_name}`} className="flex flex-col items-center">
							<div className="w-14 h-14 rounded-full border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-100/60 dark:bg-neutral-800/40 flex items-center justify-center text-neutral-400 dark:text-neutral-500 shadow-inner">
								<User className="w-6 h-6 stroke-[1.5]" />
							</div>
							<span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 mt-2 line-clamp-1">
								{official.position_name}
							</span>
							<span className="text-xs sm:text-sm font-semibold text-neutral-400 dark:text-neutral-500 mt-0.5 italic">
								Vacant
							</span>
							<span className="text-[10px] text-neutral-400/70 dark:text-neutral-600 mt-0.5">
								Unassigned
							</span>
						</div>
					);
				}

				return (
					<div key={`official-${official.position_name}`} className="flex flex-col items-center">
						{official.avatar ? (
							<img
								src={official.avatar}
								alt={official.name || official.position_name}
								className="w-14 h-14 rounded-full object-cover shadow-sm bg-neutral-200 dark:bg-neutral-800 ring-1 ring-black/5 dark:ring-white/10"
							/>
						) : (
							<div className="w-14 h-14 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 font-bold text-base shadow-sm">
								{(official.name || official.position_name).charAt(0).toUpperCase()}
							</div>
						)}
						<span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 mt-2 line-clamp-1">
							{official.position_name}
						</span>
						<span className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200 mt-0.5 line-clamp-1">
							{official.name}
						</span>
						<span className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
							{official.since || "Active"}
						</span>
					</div>
				);
			})}
		</div>
	);
}

