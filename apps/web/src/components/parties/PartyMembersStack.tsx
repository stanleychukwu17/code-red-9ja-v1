import type { PartySampleMember } from "#/lib/server/parties";

interface PartyMembersStackProps {
	partyId: number;
	totalMembers: number;
	sampleMembers?: PartySampleMember[];
	colorHex?: string | null;
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
	colorHex,
}: PartyMembersStackProps) {
	const ringColor = colorHex || "#4ade80";

	if (totalMembers === 0) {
		return (
			<div className="flex items-center justify-center mt-5 min-h-[36px]">
				<span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">
					No members yet
				</span>
			</div>
		);
	}

	return (
		<div className="flex items-center justify-center mt-5 min-h-[36px]">
			{sampleMembers.length > 0 && (
				<>
					<div className="flex -space-x-2 overflow-hidden py-1.5 px-0.5">
						{sampleMembers.map((item) => (
							<img
								key={`member-${partyId}-${item.user_id}`}
								src={item.avatar}
								alt={item.first_name || item.username || "Member"}
								className="inline-block size-9 rounded-full ring-2 object-cover bg-neutral-200 dark:bg-neutral-800"
								style={{
									boxShadow: `0 0 0 2px ${ringColor}`,
								}}
							/>
						))}
					</div>
					<div className="h-6 w-0.5 bg-neutral-200 dark:bg-neutral-700 mx-2 rounded-full" />
				</>
			)}
			<span className="text-xs sm:text-xs font-bold text-neutral-900 dark:text-white">
				{sampleMembers.length > 0 ? `+${formatMemberCount(totalMembers)} members` : `${formatMemberCount(totalMembers)} members`}
			</span>
		</div>
	);
}

