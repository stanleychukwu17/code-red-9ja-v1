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
	position_code: string;
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
	is_user_blocked?: boolean;
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
 * Server function to fetch full public profile data for a specific party,
 * including metrics, about info, leadership, and user membership status.
 */
export const getPartyProfile = createServerFn()
	.inputValidator((data: { partyId: number; shortName: string }) => data)
	.handler(async ({ data: { partyId, shortName } }) => {
		try {
			return await apiFetchJson(API_URL.getPartyProfile(partyId, shortName));
		} catch (error: unknown) {
			const message =
				error instanceof Error ? error.message : "Failed to fetch party profile from API";
			return { success: false, message };
		}
	});

/**
 * Server function to request joining a political party.
 * chapterId is optional; if omitted, backend auto-resolves to user's registered ward/location chapter.
 */
export const joinParty = createServerFn({ method: "POST" })
	.inputValidator((data: { partyId: number; chapterId?: number }) => data)
	.handler(async ({ data: { partyId, chapterId } }) => {
		try {
			const res = await apiFetchJson<{ success: boolean; message: string; data: any }>(API_URL.joinParty(partyId), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(chapterId ? { chapter_id: chapterId } : {}),
			});
			return res;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Failed to join party";
			return { success: false, message, data: null };
		}
	});

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
				data: { admins: any[] };
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

