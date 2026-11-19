import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "./fetch";
import { API_URL } from "../config";

export type PollingUnitUpdateMediaInput = {
  file_id?: number;
  url: string;
  media_type: "image" | "video" | "audio";
  duration_seconds?: number;
  file_size_bytes?: number;
};

export type CreatePollingUnitUpdateInput = {
  assignment_id: number;
  polling_unit_id: number;
  election_group_id: number;
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

// Submit a situation update or report with media and issue tracking
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
      const resData = await response.json();
      return resData;
    } catch (error: any) {
      return { success: false, message: error.message || "Failed to create polling unit update" };
    }
  });

// Fetch active unresolved issues for a specific polling unit
export const getActivePollingUnitIssues = createServerFn({ method: "GET" })
  .inputValidator((data: { polling_unit_id: number }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(API_URL.pollingUnitIssues(data.polling_unit_id));
      const resData = await response.json();
      return resData;
    } catch (error: any) {
      return { success: false, message: error.message || "Failed to fetch active polling unit issues", data: [] };
    }
  });
