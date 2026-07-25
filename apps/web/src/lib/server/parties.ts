import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { respondError, respondSuccess } from "@/lib/shared/response";
import { apiFetch } from "./fetch";

export const getPartyProfile = createServerFn()
  .inputValidator((data: { partyId: number; shortName: string }) => data)
  .handler(async ({ data: { partyId, shortName } }) => {
    try {
      const response = await apiFetch(API_URL.getPartyProfile(partyId, shortName));
      const data = await response.json();
      return respondSuccess(data);
    } catch (error) {
      return respondError("Failed to fetch party profile from API");
    }
  });
