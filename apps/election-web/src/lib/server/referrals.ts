import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "./fetch";
import { API_URL } from "#/lib/config";

export const getReferralStats = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { electionGroupId?: number; partyId?: number } | undefined) => data,
  )
  .handler(async ({ data }) => {
    try {
      const url = API_URL.referrals.stats(data?.electionGroupId, data?.partyId);
      const response = await apiFetch(url);
      const json = await response.json();
      return json;
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch referral stats: " + (error as Error).message,
      };
    }
  });

export const getReferredUsers = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { electionGroupId?: number; cursor?: number; limit?: number } | undefined) => data,
  )
  .handler(async ({ data }) => {
    try {
      const url = API_URL.referrals.list(
        data?.electionGroupId,
        data?.cursor,
        data?.limit,
      );
      const response = await apiFetch(url);
      const json = await response.json();
      return json;
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch referred users: " + (error as Error).message,
      };
    }
  });
