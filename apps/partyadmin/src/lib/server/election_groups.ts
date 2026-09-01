import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "./fetch";
import { API_URL } from "#/lib/config";

export const getElectionGroups = createServerFn({ method: "GET" })
  .inputValidator(
    (
      data:
        | {
            limit?: number;
            cursor?: string | number;
            partyId?: number;
            orderBy?: string;
            order?: string;
          }
        | undefined,
    ) => data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      if (data?.limit) params.append("limit", String(data.limit));
      if (data?.cursor) params.append("cursor", String(data.cursor));
      if (data?.partyId) params.append("party_id", String(data.partyId));
      if (data?.orderBy) params.append("orderBy", data.orderBy);
      if (data?.order) params.append("order", data.order);
      const qs = params.toString();
      const response = await apiFetch(`${API_URL.electionGroups}${qs ? `?${qs}` : ""}`);
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch election groups from API" };
    }
  });
