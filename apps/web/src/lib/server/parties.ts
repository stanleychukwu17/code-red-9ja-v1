import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetchJson } from "./fetch";
export interface Party {
	id: number;
	short_name: string;
	name: string;
	logo: string;
	logo_file_id?: number | null;
	display_order?: number;
	status?: string;
	slots?: number;
	is_verified?: boolean;
	color_hex?: string | null;
	dark_color_hex?: string | null;
	created_at?: string;
	updated_at?: string;
	verifications?: unknown[];
}

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
