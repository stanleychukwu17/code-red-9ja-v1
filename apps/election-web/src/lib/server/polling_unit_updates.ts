import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "./fetch";
import { API_URL } from "../config";

export const createPollingUnitUpdate = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      polling_unit_id: number;
      election_group_id: number;
      assignment_id?: number;
      party_id?: number;
      message: string;
      media_urls?: string[];
      is_report: boolean;
      report_types?: string[];
    }) => data,
  )
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
