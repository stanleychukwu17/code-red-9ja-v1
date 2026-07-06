import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import axios from "axios";
import { API_URL } from "../config";

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
      const headers = getAuthHeaders();
      const res = await axios.post(
        API_URL.pollingUnitUpdates,
        data,
        { headers },
      );
      return res.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      return { success: false, message: error.message };
    }
  });
