import type { PartyOfficialCardInfo } from "#/lib/server/parties";
import { VacantOfficialAvatar } from "@repo/ui/components/vacant-avatar";

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
							<VacantOfficialAvatar />
							<span className="text-[11px] font-medium text-muted-foreground mt-2 line-clamp-1"> {official.position_name}</span>
							<span className="text-xs lg:text-sm font-semibold text-muted-foreground mt-0.5 italic"> Vacant</span>
							<span className="text-[10px] text-muted-foreground/70 mt-0.5"> Unassigned</span>
						</div>
					);
				}

				return (
					<div key={`official-${official.position_name}`} className="flex flex-col items-center">
						<img
							src={official?.avatar as string}
							alt={official.name || official.position_name}
							className="w-14 h-14 rounded-full object-cover bg-muted"
						/>
						<span className="text-[11px] font-medium text-muted-foreground mt-2 line-clamp-1">
							{official.position_name}
						</span>
						<span className="text-xs sm:text-sm font-medium text-foreground mt-0.5 line-clamp-1">
							{official.name}
						</span>
						<span className="text-[10px] text-muted-foreground mt-0.5">
							{official.since || "Active"}
						</span>
					</div>
				);
			})}
		</div>
	);
}

