import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetchJson } from "./fetch";

/**
 * Verification details badge associated with a registered political party.
 */
export type PartyVerification = {
	id: number;
	verification_type_id: number;
	verification_title?: string;
	verification_type?: string;
	verification_description?: string;
};

/**
 * Core Political Party database entity representation.
 */
export type Party = {
	id: number;
	short_name: string;
	name: string;
	logo: string;
	logo_file_id?: number | null;
	display_order?: number;
	status?: string;
	slots?: number;
	is_verified?: boolean;
	verified?: boolean;
	color_hex?: string | null;
	dark_color_hex?: string | null;
	date_founded?: string | null;
	cover_image?: string | null;
	background_image?: string | null;
	cover_position_y?: number | null;
	created_at?: string;
	updated_at?: string;
	verifications?: PartyVerification[];
};

/**
 * Leadership position or official assigned within a political party chapter.
 */
export type PartyOfficialCardInfo = {
	position_id?: number;
	position_name: string;
	rank_order?: number;
	user_id?: number | null;
	name?: string | null;
	username?: string | null;
	avatar?: string | null;
	since?: string | null;
	is_vacant: boolean;
};

/**
 * Lightweight member summary for rendering avatar stacks on party cards.
 */
export type PartySampleMember = {
	user_id: number;
	first_name: string;
	last_name: string;
	username: string;
	avatar: string;
};

/**
 * Hydrated party card data returned by `/parties/cards`, including member stats,
 * top leadership officials, and current user's membership status.
 */
export type PartyCardData = {
	id: number;
	short_name: string;
	name: string;
	logo: string;
	display_order?: number;
	status?: string;
	is_verified?: boolean;
	color_hex?: string | null;
	dark_color_hex?: string | null;
	date_founded?: string | null;
	cover_image?: string | null;
	cover_position_y?: number | null;
	chapter_id?: number;
	total_members: number;
	sample_members: PartySampleMember[];
	officials: PartyOfficialCardInfo[];
	is_user_member: boolean;
};

/**
 * Server function to fetch all party cards with aggregated metrics,
 * sample members, and officials for the public `/parties` directory.
 */
export const getPartyCards = createServerFn({ method: "GET" }).handler(async () => {
	try {
		return await apiFetchJson<{
			success: boolean;
			message?: string;
			data: { parties: PartyCardData[] };
		}>(API_URL.partyCards);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : "Failed to fetch party cards from API";
		return {
			success: false,
			message,
			data: { parties: [] },
		};
	}
});

/**
 * Server function to fetch the raw list of all registered political parties.
 */
export const getParties = createServerFn({ method: "GET" }).handler(async () => {
	try {
		return await apiFetchJson(API_URL.parties);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : "Failed to fetch parties from API";
		return {
			success: false,
			message,
		};
	}
});

/**
 * Sanitized public party profile attributes returned by `/parties/{party_id}/{short_name}/profile`.
 */
export type PublicPartyProfile = {
	id: number;
	short_name: string;
	name: string;
	logo: string;
	cover_image?: string | null;
	cover_position_y?: number | null;
	is_verified?: boolean;
	color_hex?: string | null;
	dark_color_hex?: string | null;
	date_founded?: string | null;
	verifications?: PartyVerification[];
};

/**
 * Server function to fetch full public profile data for a specific party,
 * including metrics, about info, leadership, and user membership status.
 */
export const getPartyProfile = createServerFn()
	.inputValidator((data: { partyId: number; shortName: string; chapterId?: number }) => data)
	.handler(async ({ data: { partyId, shortName, chapterId } }) => {
		try {
			return await apiFetchJson<{
				success: boolean;
				message?: string;
				data: {
					data: PublicPartyProfile;
					chapter?: any;
					chapter_type?: string;
					chapter_geo_name?: string;
					national_chapter_id?: number;
					national_member_count?: number;
					chapter_member_count?: number;
					national_followers_count?: number;
					is_chapter_member: boolean;
					is_following: boolean;
				};
			}>(API_URL.getPartyProfile(partyId, shortName, chapterId));
		} catch (error: unknown) {
			const message =
				error instanceof Error ? error.message : "Failed to fetch party profile from API";
			return { success: false, message };
		}
	});

export type PartyHierarchySelection = {
	partyId: number;
	chapterType: string;
	chapterId?: number;
};

/**
 * Server function to submit party chapter hierarchy selections for joining.
 */
export const joinPartyHierarchy = createServerFn({ method: "POST" })
	.inputValidator((data: { partyId: number; selections: PartyHierarchySelection[] }) => data)
	.handler(async ({ data: { partyId, selections } }) => {
		try {
			const res = await apiFetchJson<{ success: boolean; message: string; data: any }>(
				API_URL.joinPartyHierarchy(partyId),
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ selections }),
				}
			);
			return res;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Failed to join party hierarchy";
			return { success: false, message, data: null };
		}
	});

export type PartyAdminVerification = {
	id: number;
	verification_type_id: number;
	verification_title: string;
	verification_type: string;
};

export type PartyAdmin = {
	id: number;
	first_name: string;
	last_name: string;
	full_name: string;
	username: string;
	avatar?: string | null;
	email?: string | null;
	state_name?: string | null;
	is_verified: boolean;
	is_super_admin: boolean;
	verifications: PartyAdminVerification[];
};

/**
 * Server function to fetch administrators for a political party.
 */
export const getPartyAdmins = createServerFn({ method: "GET" })
	.inputValidator((data: { partyId: number | string }) => data)
	.handler(async ({ data: { partyId } }) => {
		try {
			return await apiFetchJson<{
				success: boolean;
				message?: string;
				data: { admins: PartyAdmin[] };
			}>(API_URL.partyAdmins(partyId));
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Failed to fetch party admins";
			return {
				success: false,
				message,
				data: { admins: [] },
			};
		}
	});



export type PartyHomeLeaderOfficial = {
	id: string;
	name: string;
	role: string;
	avatar?: string | null;
	since?: string | null;
	username?: string | null;
	is_vacant: boolean;
};

export type PartyHomeData = {
	national_leaders: PartyHomeLeaderOfficial[];
	dynamic_leaders: {
		title: string;
		chapter_type: string;
		chapter_name?: string;
		leaders: PartyHomeLeaderOfficial[];
	};
};

/**
 * Server function to fetch primary data for the party home tab:
 * National leaders, dynamic chapter leaders, upcoming events, etc.
 */
export const getPartyHome = createServerFn({ method: "GET" })
	.inputValidator((data: { partyId: number | string; chapterId?: number }) => data)
	.handler(async ({ data: { partyId, chapterId } }) => {
		try {
			return await apiFetchJson<{
				success: boolean;
				message?: string;
				data: PartyHomeData;
			}>(API_URL.partyHome(partyId, chapterId));
		} catch (error: unknown) {
			const message =
				error instanceof Error ? error.message : "Failed to fetch party home data";
			return {
				success: false,
				message,
				data: {
					national_leaders: [],
					dynamic_leaders: {
						title: "State leaders",
						chapter_type: "national",
						leaders: [],
					},
				},
			};
		}
	});

// ========================================================
// PARTY POSITIONS & OFFICIALS (LEADERSHIP)
// ========================================================

export type PartyPositionItem = {
	id: number;
	party_id?: number | null;
	name: string;
	position_type: "default" | "custom";
	description?: string;
	allowed_levels: string[];
	rank_order: number;
	max_occupants: number;
	created_at?: string;
};

export type PartyOfficialItem = {
	assignment_id: number;
	party_id: number;
	chapter_id: number;
	position_id: number;
	user_id: number;
	appointment_type: "substantive" | "acting" | "caretaker" | "interim";
	assignment_status: "active" | "suspended" | "vacated" | "past";
	tenure_start?: string;
	tenure_end?: string;
	assigned_at?: string;
	position_name: string;
	position_type: "default" | "custom";
	rank_order: number;
	max_occupants: number;
	first_name?: string;
	last_name?: string;
	middle_name?: string;
	username?: string;
	avatar?: string;
	email?: string;
	phone?: string;
	chapter_type: "national" | "zonal" | "state" | "lga" | "ward";
	geo_name?: string;
	display_title?: string;
};

/**
 * Server function to fetch constitutional and custom positions configured for a party.
 */
export const getPartyPositions = createServerFn({ method: "GET" })
	.inputValidator((data: { partyId: number | string }) => data)
	.handler(async ({ data: { partyId } }) => {
		try {
			return await apiFetchJson<{
				success: boolean;
				message?: string;
				data: {
					default: PartyPositionItem[];
					custom: PartyPositionItem[];
					positions: PartyPositionItem[];
				};
			}>(API_URL.partyPositions(partyId));
		} catch (error: unknown) {
			const message =
				error instanceof Error ? error.message : "Failed to fetch party positions";
			return {
				success: false,
				message,
				data: { default: [], custom: [], positions: [] },
			};
		}
	});

/**
 * Server function to fetch party officials roster matching active chapter filter criteria.
 */
export const getPartyOfficials = createServerFn({ method: "GET" })
	.inputValidator(
		(data: {
			partyId: number | string;
			chapterId?: number;
			countryId?: number;
			zonalId?: number;
			stateId?: number;
			lgaId?: number;
			wardId?: number;
		}) => data,
	)
	.handler(async ({ data }) => {
		try {
			return await apiFetchJson<{
				success: boolean;
				message?: string;
				data: {
					chapter_id: number;
					officials: PartyOfficialItem[];
				};
			}>(
				API_URL.partyOfficials(data.partyId, {
					chapter_id: data.chapterId,
					country_id: data.countryId,
					zonal_id: data.zonalId,
					state_id: data.stateId,
					lga_id: data.lgaId,
					ward_id: data.wardId,
				}),
			);
		} catch (error: unknown) {
			const message =
				error instanceof Error ? error.message : "Failed to fetch party officials";
			return {
				success: false,
				message,
				data: { chapter_id: 0, officials: [] },
			};
		}
	});
