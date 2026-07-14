import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "./fetch";
import { API_URL } from "../config";

export type CandidateResultInput = {
  party_short_name: string;
  vote_count: number;
  agent_name: number;
  has_signature: number;
};

export const submitPollingUnitResult = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      assignment_id?: number;
      election_id: number;
      election_group_id: number;
      polling_unit_id: number;
      party_id?: number;
      result_sheet_image_url?: string;
      result_sheet_video_url?: string;
      uploaded_by_inec?: boolean;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(API_URL.pollingUnitResults, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      return resData;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to submit result",
      };
    }
  });

export const getPollingUnitResults = createServerFn({ method: "GET" })
  .inputValidator(
    (
      data:
        | {
            election_id?: number;
            election_group_id?: number;
            party_id?: number;
            polling_unit_id?: number;
            status?: string;
            cursor?: number;
            limit?: number;
          }
        | undefined,
    ) => data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      if (data?.election_id)
        params.append("election_id", String(data.election_id));
      if (data?.election_group_id)
        params.append("election_group_id", String(data.election_group_id));
      if (data?.party_id) params.append("party_id", String(data.party_id));
      if (data?.polling_unit_id)
        params.append("polling_unit_id", String(data.polling_unit_id));
      if (data?.status) params.append("status", data.status);
      if (data?.cursor) params.append("cursor", String(data.cursor));
      if (data?.limit) params.append("limit", String(data.limit));
      const qs = params.toString();
      const url = `${API_URL.pollingUnitResults}${qs ? `?${qs}` : ""}`;
      const response = await apiFetch(url);
      const resData = await response.json();
      return resData;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to fetch results",
      };
    }
  });

export const getFinalResult = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { election_id: number; polling_unit_id: number }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(
        `${API_URL.pollingUnitResults}/final?election_id=${data.election_id}&polling_unit_id=${data.polling_unit_id}`,
      );
      const resData = await response.json();
      return resData;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to fetch final result",
      };
    }
  });
