import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "./fetch";
import { API_URL } from "../config";

export type SupervisorUpdateMediaInput = {
  file_id?: number;
  url: string;
  media_type: "image" | "video" | "audio";
  thumbnail_url?: string;
  duration_seconds?: number;
  file_size_bytes?: number;
};

export type CreateSupervisorUpdateInput = {
  election_group_id: number;
  category_type: string;
  stage: string;
  title?: string;
  message: string;
  polling_unit_id?: number;
  media?: SupervisorUpdateMediaInput[];
  latitude?: number;
  longitude?: number;
  accuracy_meters?: number;
};

// Submit a supervisor situational or collation report
export const createSupervisorUpdate = createServerFn({ method: "POST" })
  .inputValidator((data: CreateSupervisorUpdateInput) => data)
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(API_URL.supervisorUpdates, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      return resData;
    } catch (error: any) {
      return { success: false, message: error.message || "Failed to create supervisor update" };
    }
  });

// Fetch supervisor reports list
export const getSupervisorUpdates = createServerFn({ method: "GET" })
  .inputValidator((data?: { election_group_id?: number; category_type?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      if (data?.election_group_id) params.append("election_group_id", String(data.election_group_id));
      if (data?.category_type) params.append("category_type", data.category_type);
      const url = `${API_URL.supervisorUpdates}?${params.toString()}`;
      const response = await apiFetch(url);
      const resData = await response.json();
      return resData;
    } catch (error: any) {
      return { success: false, message: error.message || "Failed to fetch supervisor updates", data: [] };
    }
  });
