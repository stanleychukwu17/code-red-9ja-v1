import type { PartySampleMember } from "#/lib/server/parties";

interface PartyMembersStackProps {
	partyId: number;
	totalMembers: number;
	sampleMembers?: PartySampleMember[];
}

function formatMemberCount(count: number): string {
	if (!count || count <= 0) return "0";
	if (count >= 1_000_000) {
		return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
	}
	if (count >= 1_000) {
		return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
	}
	return count.toLocaleString();
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
			<span className="text-xs font-bold text-foreground">
				{sampleMembers.length > 0 ? `+${formatMemberCount(totalMembers)} members` : `${formatMemberCount(totalMembers)} members`}
			</span>
		</div>
	);
}

