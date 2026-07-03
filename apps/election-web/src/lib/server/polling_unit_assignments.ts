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

export const getPollingUnitAssignments = createServerFn({ method: "GET" })
  .inputValidator((data: { user_id?: string | number } | undefined) => data)
  .handler(async ({ data }) => {
    try {
      const user_id = data?.user_id;
      const params = new URLSearchParams();
      if (user_id) params.append("user_id", String(user_id));
      const url = `${API_URL.pollingUnitAssignments}${user_id ? `?${params.toString()}` : ""}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch assignments: " + (error as Error).message,
      };
    }
  },
);

export const updateAssignmentTracking = createServerFn({ method: "POST" })
  .inputValidator((data: { 
    id: number | string;
    arrived_at?: string;
    arrival_video_url?: string;
    election_started_at?: string;
    election_started_video_url?: string;
    election_ended_at?: string;
    election_ended_video_url?: string;
  }) => data)
  .handler(async ({ data }) => {
    try {
      const { id, ...trackingData } = data;
      const response = await fetch(API_URL.updateAssignmentTracking(id), {
        method: "PATCH",
        headers: getAuthHeaders(),
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
