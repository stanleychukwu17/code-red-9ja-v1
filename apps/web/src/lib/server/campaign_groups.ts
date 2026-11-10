import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetchJson } from "./fetch";
import type {
  CampaignGroupDetails,
  CampaignGroupMemberItem,
  CampaignGroupStats,
  CampaignGroupResponse,
  CampaignGroupMembersResponse,
  SyncOfficialsResponse,
  SwitchCampaignGroupInput,
  FindCampaignGroupResponse,
} from "#/components/campaign-group/types";

// Re-export all types for backward compatibility
export type {
  CampaignGroupDetails,
  CampaignGroupMemberItem,
  CampaignGroupStats,
  CampaignGroupResponse,
  CampaignGroupMembersResponse,
  SyncOfficialsResponse,
  SwitchCampaignGroupInput,
  FindCampaignGroupResponse,
};

export function getCampaignGroupTitle(
  group?: CampaignGroupDetails | null,
  partyShortName?: string | null,
): string {
  const party = (partyShortName || "Party").toUpperCase();
  if (!group) return `${party} Campaign Group`;

  switch (group.scope) {
    case "national":
      return `${party} National Group`;
    case "state":
      return `${party} ${group.state_name ? `${group.state_name} State` : "State"} Group`;
    case "lga":
      return `${party} ${group.lga_name ? `${group.lga_name} LGA` : "LGA"} Group`;
    case "ward":
      return `${party} ${group.ward_name ? `${group.ward_name} Ward` : "Ward"} Group`;
    default:
      return `${party} ${group.scope.toUpperCase()} Group`;
  }
}

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

/**
 * Handle switching to a campaign group by target territorial IDs.
 */
export const switchCampaignGroup = createServerFn({ method: "POST" })
  .inputValidator((data: SwitchCampaignGroupInput) => data)
  .handler(async ({ data }) => {
    try {
      const res = await apiFetchJson<FindCampaignGroupResponse>(
        API_URL.campaignGroups.findGroup,
        {
          method: "POST",
          body: JSON.stringify({
            party_id: Number(data.partyId),
            state_id: data.stateId ? Number(data.stateId) : 0,
            lga_id: data.lgaId ? Number(data.lgaId) : 0,
            ward_id: data.wardId ? Number(data.wardId) : 0,
          }),
        },
      );
      return res;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to find campaign group";
      return { success: false, message, data: undefined };
    }
  });
