import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "./fetch";
import { API_URL } from "#/lib/config";

export interface UserCampaignGroupItem {
  id: number;
  party_id: number;
  scope: "national" | "state" | "lga" | "ward";
  title: string;
  description: string;
  state_id?: number;
  state_name?: string;
  lga_id?: number;
  lga_name?: string;
  ward_id?: number;
  ward_name?: string;
}

export interface GetMyCampaignGroupsResponse {
  success: boolean;
  message: string;
  data?: {
    role: string;
    groups: UserCampaignGroupItem[];
  };
}

export const getMyCampaignGroups = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { party_id?: number | string } | undefined) => data,
  )
  .handler(async ({ data }) => {
    try {
      const party_id = data?.party_id;
      const params = new URLSearchParams();
      if (party_id) {
        params.append("party_id", String(party_id));
      }
      const qs = params.toString();
      const url = `${API_URL.campaignGroups.myGroups}${qs ? `?${qs}` : ""}`;
      const res = await apiFetch(url);
      const resData: GetMyCampaignGroupsResponse = await res.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message:
          "Failed to fetch campaign groups: " + (error as Error).message,
      };
    }
  });
