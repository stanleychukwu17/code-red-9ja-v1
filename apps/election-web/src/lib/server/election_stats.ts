import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { API_URL } from "#/lib/config";

function getAuthHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const accessToken = getCookie("access_token");
  const refreshToken = getCookie("refresh_token");

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
    headers["Cookie"] = `accessToken=${accessToken}; refreshToken=${refreshToken || ""}`;
  }

  return headers;
}

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
      const response = await fetch(url, { headers: getAuthHeaders() });
      return await response.json();
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch state stats: " + (error as Error).message,
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
      const response = await fetch(url, { headers: getAuthHeaders() });
      return await response.json();
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch LGA stats: " + (error as Error).message,
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
      const response = await fetch(url, { headers: getAuthHeaders() });
      return await response.json();
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch Ward stats: " + (error as Error).message,
      };
    }
  });
