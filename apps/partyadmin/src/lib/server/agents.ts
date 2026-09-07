import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "./fetch";

export type AgentPerformanceItem = {
  id: number;
  user_id: number;
  party_id?: number;
  election_group_id?: number;
  state_id?: number;
  lga_id?: number;
  ward_id?: number;
  polling_unit_id?: number;
  user_name: string;
  avatar_url?: string;
  role_type: string;
  readiness_pct: number;
  arrived_at?: string;
  election_started_at?: string;
  election_ended_at?: string;
  updates_given: number;
  reports_given: number;
  live_voters_referred: number;
  results_uploaded: string;
  earnings_kobo: number;
  earnings_formatted: string;
  completion_status: boolean;
  requested_payout: boolean;
  paid: boolean;
  state_name: string;
  lga_name?: string;
  ward_name?: string;
  polling_unit_name?: string;
  polling_unit_code?: string;
  agents_at_post?: string;
  pu_coverage?: string;
  pu_agent_coverage?: string;
  avg_arrival_time?: string;
  election_started_in?: string;
  election_ended_in?: string;
  reported_pus?: number;
};

export const getAgentPerformanceStats = createServerFn({ method: "GET" })
  .inputValidator(
    (
      data:
        | {
            roleType: "polling_agent" | "ward_supervisor" | "lga_supervisor" | "state_supervisor";
            partyId?: number;
            electionGroupId?: number;
            electionId?: number;
            stateId?: number;
            lgaId?: number;
            wardId?: number;
            search?: string;
            limit?: number;
            cursor?: string;
          }
        | undefined,
    ) => data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      if (data?.roleType) params.append("role_type", data.roleType);
      if (data?.partyId) params.append("party_id", String(data.partyId));
      if (data?.electionGroupId) params.append("election_group_id", String(data.electionGroupId));
      if (data?.electionId) params.append("election_id", String(data.electionId));
      if (data?.stateId) params.append("state_id", String(data.stateId));
      if (data?.lgaId) params.append("lga_id", String(data.lgaId));
      if (data?.wardId) params.append("ward_id", String(data.wardId));
      if (data?.search) params.append("search", data.search);
      if (data?.limit) params.append("limit", String(data.limit));
      if (data?.cursor) params.append("cursor", data.cursor);

      const API_BASE = import.meta.env.VITE_API_URL || "";
      const url = `${API_BASE}/api/v1/agent-performance?${params.toString()}`;
      const response = await apiFetch(url);
      const resData = await response.json();
      if (!response.ok) {
        console.error("agent-performance error:", resData);
        return { success: false, data: [] };
      }
      return resData;
    } catch (error) {
      return { success: false, data: [] };
    }
  });

export const changeAgentRole = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      userId: number;
      partyId: number;
      electionGroupId: number;
      currentRoleType: string;
      newRoleType: string;
      stateId?: number;
      lgaId?: number;
      wardId?: number;
      pollingUnitId?: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || "";
      const url = `${API_BASE}/api/v1/agents/change-role`;
      const response = await apiFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: data.userId,
          party_id: data.partyId,
          election_group_id: data.electionGroupId,
          current_role_type: data.currentRoleType,
          new_role_type: data.newRoleType,
          state_id: data.stateId,
          lga_id: data.lgaId,
          ward_id: data.wardId,
          polling_unit_id: data.pollingUnitId,
        }),
      });
      const resData = await response.json();
      return resData;
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to change agent role" };
    }
  });

export const revokeAgentAssignment = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: number;
      roleType: string;
      partyId?: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || "";
      const params = new URLSearchParams();
      params.append("role_type", data.roleType);
      if (data.partyId) params.append("party_id", String(data.partyId));

      const url = `${API_BASE}/api/v1/agents/${data.id}?${params.toString()}`;
      const response = await apiFetch(url, {
        method: "DELETE",
      });
      const resData = await response.json();
      return resData;
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to revoke assignment" };
    }
  });
