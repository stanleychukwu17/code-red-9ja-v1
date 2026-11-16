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
  .handler(async () => {
    try {
      const url = API_URL.campaignGroups.myGroups;
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
