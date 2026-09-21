import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetchJson } from "./fetch";
export type PartyVerification = {
	id: number;
	verification_type_id: number;
	verification_title?: string;
	verification_type?: string;
	verification_description?: string;
};

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

export type PartySampleMember = {
	user_id: number;
	first_name?: string | null;
	last_name?: string | null;
	username?: string | null;
	avatar: string;
};

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
	total_members: number;
	sample_members: PartySampleMember[];
	officials: PartyOfficialCardInfo[];
	is_user_member: boolean;
};

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

