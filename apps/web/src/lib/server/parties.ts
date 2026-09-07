import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetchJson } from "./fetch";

export const getPartyProfile = createServerFn()
  .inputValidator((data: { partyId: number; shortName: string }) => data)
  .handler(async ({ data: { partyId, shortName } }) => {
    try {
      return await apiFetchJson(API_URL.getPartyProfile(partyId, shortName));
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to fetch party profile from API" };
    }
  });
