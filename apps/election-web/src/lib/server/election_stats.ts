import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "#/lib/config";
import { apiFetchJson } from "./fetch";

export const getSingleStateStats = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { election_group_id: string | number; state_id: string | number; party_id?: string | number }) => data
  )
  .handler(async ({ data }) => {
    try {
      const url = API_URL.electionStats.singleStateStats(
        data.election_group_id,
        data.state_id,
        data.party_id
      );
      return await apiFetchJson(url);
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to fetch state stats",
      };
    }
  });

export const getSingleLgaStats = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { election_group_id: string | number; lga_id: string | number; party_id?: string | number }) => data
  )
  .handler(async ({ data }) => {
    try {
      const url = API_URL.electionStats.singleLGAStats(
        data.election_group_id,
        data.lga_id,
        data.party_id
      );
      return await apiFetchJson(url);
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to fetch LGA stats",
      };
    }
  });

export const getSingleWardStats = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { election_group_id: string | number; ward_id: string | number; party_id?: string | number }) => data
  )
  .handler(async ({ data }) => {
    try {
      const url = API_URL.electionStats.singleWardStats(
        data.election_group_id,
        data.ward_id,
        data.party_id
      );
      return await apiFetchJson(url);
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to fetch Ward stats",
      };
    }
  });
