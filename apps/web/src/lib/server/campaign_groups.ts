import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetchJson } from "./fetch";

export type CampaignGroupMemberItem = {
  id: number;
  party_id: number;
  election_group_id: number;
  group_id: number;
  user_id: number;
  role: "candidate" | "party_official" | "state_supervisor" | "lga_supervisor" | "ward_supervisor" | "agent" | string;
  can_broadcast: boolean;
  joined_at: string;
  fake_id?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  avatar?: string;
};

export type CampaignGroupDetails = {
  id: number;
  party_id: number;
  election_group_id: number;
  scope: "national" | "state" | "lga" | "ward" | string;
  state_id?: number | null;
  lga_id?: number | null;
  ward_id?: number | null;
  name?: string | null;
  status: string;
  officials_added: boolean;
  created_at: string;
  updated_at: string;
};

export type CampaignGroupResponse = {
  success: boolean;
  message?: string;
  data?: {
    group: CampaignGroupDetails;
  };
};

export type CampaignGroupMembersResponse = {
  success: boolean;
  message?: string;
  data?: {
    members: CampaignGroupMemberItem[];
  };
};

export type SyncOfficialsResponse = {
  success: boolean;
  message?: string;
  data?: {
    result: any;
  };
};

/**
 * Fetch campaign group metadata by group ID.
 */
export const getCampaignGroup = createServerFn()
  .inputValidator((data: { groupId: number | string }) => data)
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson<CampaignGroupResponse>(
        API_URL.campaignGroups.getGroup(data.groupId),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch campaign group";
      return { success: false, message, data: undefined };
    }
  });

/**
 * Fetch all enrolled members of a campaign group.
 */
export const getCampaignGroupMembers = createServerFn()
  .inputValidator((data: { groupId: number | string }) => data)
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson<CampaignGroupMembersResponse>(
        API_URL.campaignGroups.getMembers(data.groupId),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch group members";
      return { success: false, message, data: { members: [] } };
    }
  });

/**
 * Synchronize party chapter officials into the campaign group.
 */
export const syncCampaignGroupOfficials = createServerFn({ method: "POST" })
  .inputValidator((data: { groupId: number | string }) => data)
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson<SyncOfficialsResponse>(
        API_URL.campaignGroups.syncOfficials(data.groupId),
        { method: "POST" },
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sync party officials";
      return { success: false, message, data: undefined };
    }
  });
