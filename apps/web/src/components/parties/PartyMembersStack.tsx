import { MEMBER_AVATARS } from "./party-constants";

interface PartyMembersStackProps {
	partyId: number;
	memberCount: string;
}

export function PartyMembersStack({ partyId, memberCount }: PartyMembersStackProps) {
	return (
		<div className="flex items-center justify-center mt-5">
			<div className="flex -space-x-2 overflow-hidden">
				{MEMBER_AVATARS.map((item) => (
					<img
						key={`member-${partyId}-${item.id}`}
						src={item.url}
						alt="Member"
						className="inline-block w-7 h-7 rounded-full ring-2 ring-[#4ade80] object-cover"
					/>
				))}
			</div>
			<div className="h-6 w-[2px] bg-neutral-200 dark:bg-neutral-700 mx-3 rounded-full" />
			<span className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">
				+{memberCount} members
			</span>
		</div>
	);
}
