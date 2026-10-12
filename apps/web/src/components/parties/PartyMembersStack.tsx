import type { PartySampleMember } from "#/lib/server/parties";
import { formatNumber } from "@repo/ui/lib/number";

interface PartyMembersStackProps {
	partyId: number;
	totalMembers: number;
	sampleMembers?: PartySampleMember[];
}

export function PartyMembersStack({
	partyId,
	totalMembers,
	sampleMembers = [],
}: PartyMembersStackProps) {
	if (totalMembers === 0) {
		return (
			<div className="flex items-center justify-center mt-5 min-h-9">
				<span className="text-xs text-muted-foreground font-medium">
					No members yet
				</span>
			</div>
		);
	}

	return (
		<div className="flex items-center justify-center mt-5 min-h-9">
			{sampleMembers.length > 0 && (
				<>
					<div className="flex -space-x-2 overflow-hidden py-1.5 px-0.5">
						{sampleMembers.map((item) => (
							<img
								key={`member-${partyId}-${item.user_id}`}
								src={item.avatar}
								alt={item.first_name || item.username || "Member"}
								className="inline-block size-9 rounded-full ring-2 ring-background object-cover bg-muted"
							/>
						))}
					</div>
					<div className="h-6 w-0.5 bg-border mx-2 rounded-full" />
				</>
			)}
			<span className="text-xs font-medium text-foreground">
				{sampleMembers.length > 0 ? `+${formatNumber(totalMembers)} members` : `${formatNumber(totalMembers)} members`}
			</span>
		</div>
	);
}

