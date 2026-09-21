import type { Party } from "#/lib/server/parties";

export interface OfficialInfo {
	title: string;
	name: string;
	since: string;
	avatar: string;
}

export interface PartyPreset {
	founded: number;
	members: string;
	coverImage?: string;
	coverPositionY?: number;
	chairman?: OfficialInfo;
	secretary?: OfficialInfo;
}

export const SKELETON_PLACEHOLDERS = [
	"party-skeleton-1",
	"party-skeleton-2",
	"party-skeleton-3",
	"party-skeleton-4",
	"party-skeleton-5",
	"party-skeleton-6",
];

export const MEMBER_AVATARS = [
	{
		id: "mem-1",
		url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&crop=face",
	},
	{
		id: "mem-2",
		url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
	},
	{
		id: "mem-3",
		url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face",
	},
	{
		id: "mem-4",
		url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=face",
	},
	{
		id: "mem-5",
		url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face",
	},
];

export const DEFAULT_COVER =
	"https://images.unsplash.com/photo-1624383045192-cf512eb9d78c?q=80&w=800&auto=format&fit=crop";

export const DEFAULT_OFFICIAL: OfficialInfo = {
	title: "Chairman",
	name: "Maurice Sam",
	since: "since 2013",
	avatar:
		"https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=160&h=160&fit=crop&crop=face",
};

export const PARTY_PRESETS: Record<string, PartyPreset> = {
	PDP: {
		founded: 1990,
		members: "300k",
		chairman: {
			title: "Chairman",
			name: "Maurice Sam",
			since: "since 2013",
			avatar:
				"https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=160&h=160&fit=crop&crop=face",
		},
		secretary: {
			title: "Chairman",
			name: "Maurice Sam",
			since: "since 2013",
			avatar:
				"https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=160&h=160&fit=crop&crop=face",
		},
	},
	APC: {
		founded: 2013,
		members: "550k",
		chairman: {
			title: "Chairman",
			name: "Abdullahi Ganduje",
			since: "since 2023",
			avatar:
				"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&h=160&fit=crop&crop=face",
		},
		secretary: {
			title: "Secretary",
			name: "Ajibola Basiru",
			since: "since 2023",
			avatar:
				"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&h=160&fit=crop&crop=face",
		},
	},
	LP: {
		founded: 2002,
		members: "420k",
		chairman: {
			title: "Chairman",
			name: "Julius Abure",
			since: "since 2021",
			avatar:
				"https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=160&h=160&fit=crop&crop=face",
		},
		secretary: {
			title: "Secretary",
			name: "Umar Farouk",
			since: "since 2022",
			avatar:
				"https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=160&h=160&fit=crop&crop=face",
		},
	},
	NNPP: {
		founded: 2001,
		members: "180k",
		chairman: {
			title: "Chairman",
			name: "Ajuji Ahmed",
			since: "since 2024",
			avatar:
				"https://images.unsplash.com/photo-1560250097-0b93528c311a?w=160&h=160&fit=crop&crop=face",
		},
		secretary: {
			title: "Secretary",
			name: "Ogbonna Oginni",
			since: "since 2023",
			avatar:
				"https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=160&h=160&fit=crop&crop=face",
		},
	},
	APGA: {
		founded: 2003,
		members: "150k",
		chairman: {
			title: "Chairman",
			name: "Sly Ezeokenwa",
			since: "since 2023",
			avatar:
				"https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=160&h=160&fit=crop&crop=face",
		},
		secretary: {
			title: "Secretary",
			name: "Muhyideen Imam",
			since: "since 2023",
			avatar:
				"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&h=160&fit=crop&crop=face",
		},
	},
	SDP: {
		founded: 1989,
		members: "120k",
		chairman: {
			title: "Chairman",
			name: "Shehu Gabam",
			since: "since 2022",
			avatar:
				"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&h=160&fit=crop&crop=face",
		},
		secretary: {
			title: "Secretary",
			name: "Olu Agunloye",
			since: "since 2020",
			avatar:
				"https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=160&h=160&fit=crop&crop=face",
		},
	},
};

export function getPartyMeta(party: Party) {
	const preset = PARTY_PRESETS[party.short_name.toUpperCase()];
	const foundedYear =
		(party.date_founded ? new Date(party.date_founded).getFullYear() : undefined) ??
		preset?.founded ??
		(party.created_at ? new Date(party.created_at).getFullYear() : 1998);
	const coverImage =
		party.cover_image || party.background_image || preset?.coverImage || DEFAULT_COVER;
	const coverPositionY = party.cover_position_y ?? preset?.coverPositionY ?? 50;
	const memberCount = preset?.members || "300k";
	const chairman = preset?.chairman || DEFAULT_OFFICIAL;
	const secretary = preset?.secretary || DEFAULT_OFFICIAL;

	return {
		foundedYear,
		coverImage,
		coverPositionY,
		memberCount,
		chairman,
		secretary,
	};
}
