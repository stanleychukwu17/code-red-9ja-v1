import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "./fetch";
import { API_URL } from "../config";

export type PollingUnitUpdateMediaInput = {
  url: string;
  media_type: "image" | "video" | "audio";
  duration_seconds?: number;
  file_size_bytes?: number;
};

export type CreatePollingUnitUpdateInput = {
  polling_unit_id: number;
  election_group_id: number;
  assignment_id?: number;
  party_id?: number;
  status_category_id?: number;
  status_option_id?: number;
  has_issues: boolean;
  issue_action?: "none" | "link_existing" | "create_new";
  existing_issue_ids?: number[];
  new_issue_option_ids?: number[];
  title?: string;
  message: string;
  media?: PollingUnitUpdateMediaInput[];
  latitude?: number;
  longitude?: number;
  accuracy_meters?: number;
};

export const createPollingUnitUpdate = createServerFn({ method: "POST" })
  .inputValidator((data: CreatePollingUnitUpdateInput) => data)
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(API_URL.pollingUnitUpdates, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  });

export const getActivePollingUnitIssues = createServerFn({ method: "GET" })
  .inputValidator((data: { polling_unit_id: number }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(
        `${API_URL.pollingUnitUpdates}/issues?polling_unit_id=${data.polling_unit_id}`,
        { method: "GET" },
      );
      return await response.json();
    } catch (error: any) {
      return { success: false, message: error.message, data: [] };
    }
  });
