import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "./fetch";
import { API_URL } from "#/lib/config";

// Query params for team members listing
export interface GetTeamMembersParams {
  tab?: string;
  election_group_id?: number | string | null;
  state_id?: number | string | null;
  lga_id?: number | string | null;
  ward_id?: number | string | null;
  polling_unit_id?: number | string | null;
}

// Server function to fetch scoped team members
export const getTeamMembers = createServerFn({ method: "GET" })
  .inputValidator((data: GetTeamMembersParams | undefined) => data)
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      if (data?.tab) params.append("tab", String(data.tab));
      if (data?.election_group_id) params.append("election_group_id", String(data.election_group_id));
      if (data?.state_id) params.append("state_id", String(data.state_id));
      if (data?.lga_id) params.append("lga_id", String(data.lga_id));
      if (data?.ward_id) params.append("ward_id", String(data.ward_id));
      if (data?.polling_unit_id) params.append("polling_unit_id", String(data.polling_unit_id));

      const qs = params.toString();
      const url = `${API_URL.teamMembers}${qs ? `?${qs}` : ""}`;
      const response = await apiFetch(url);
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch team members: " + (error as Error).message,
      };
    }
  });
