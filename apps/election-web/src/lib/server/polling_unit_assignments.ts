import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "./fetch";
import { API_URL } from "#/lib/config";

export const getPollingUnitAssignments = createServerFn({ method: "GET" })
  .inputValidator(
    (
      data:
        | { user_id?: string | number; election_group_id?: string | number }
        | undefined,
    ) => data,
  )
  .handler(async ({ data }) => {
    try {
      const user_id = data?.user_id;
      const election_group_id = data?.election_group_id;
      const params = new URLSearchParams();
      if (user_id) params.append("user_id", String(user_id));
      if (election_group_id)
        params.append("election_group_id", String(election_group_id));
      const qs = params.toString();
      const url = `${API_URL.pollingUnitAssignments}${qs ? `?${qs}` : ""}`;
      const response = await apiFetch(url);
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch assignments: " + (error as Error).message,
      };
    }
  });

export const updateAssignmentTracking = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: number | string;
      arrived_at?: string;
      arrival_video_url?: string;
      election_started_at?: string;
      election_started_video_url?: string;
      election_ended_at?: string;
      election_ended_video_url?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const { id, ...trackingData } = data;
      const response = await apiFetch(API_URL.updateAssignmentTracking(id), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(trackingData),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to update tracking: " + (error as Error).message,
      };
    }
  });
