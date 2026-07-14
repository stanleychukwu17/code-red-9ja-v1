import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "./fetch";
import { API_URL } from "#/lib/config";

export const getElectionGroups = createServerFn({ method: "GET" })
  .inputValidator((data: { limit?: number; cursor?: string | number; partyId?: number } | undefined) => data)
  .handler(async ({ data }) => {
    try {
      const limit = data?.limit || 20;
      const cursor = data?.cursor || "";
      const partyId = data?.partyId || "";
      const response = await apiFetch(`${API_URL.electionGroups}?limit=${limit}&cursor=${cursor}&party_id=${partyId}`);
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch election groups from API" };
    }
  });
