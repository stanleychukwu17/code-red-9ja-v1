import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "#/lib/config";
import { apiFetch } from "./fetch";

export type AgentSupervisorItem = {
  id: number;
  name: string;
  avatar?: string;
};

export type AgentCoverageUnitItem = {
  id: number | string;
  name: string;
  code?: string;
  polling_agents?: string;
  ward_supervisors?: string;
  lga_supervisors?: string;
  state_supervisors?: string;
  overall_readiness?: number;
  supervisors?: AgentSupervisorItem[];
  pu_agents?: AgentSupervisorItem[];
};

export type AgentCoverageBreakdownResponse = {
  total: number;
  unit_title: string;
  unit_type: string;
  supervisor_title?: string;
  units: AgentCoverageUnitItem[];
};

export const getAgentCoverageBreakdown = createServerFn({ method: "GET" })
  .inputValidator(
    (data: {
      electionId?: number;
      electionGroupId?: number;
      partyId?: number;
      stateId?: number;
      senatorialDistrictId?: number;
      federalConstituencyId?: number;
      stateConstituencyId?: number;
      lgaId?: number;
      wardId?: number;
      pollingUnitId?: number;
      limit?: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      if (data.electionId) params.append("election_id", String(data.electionId));
      if (data.electionGroupId)
        params.append("election_group_id", String(data.electionGroupId));
      if (data.partyId) params.append("party_id", String(data.partyId));
      if (data.pollingUnitId)
        params.append("polling_unit_id", String(data.pollingUnitId));
      if (data.stateId) params.append("state_id", String(data.stateId));
      if (data.senatorialDistrictId)
        params.append("senatorial_district_id", String(data.senatorialDistrictId));
      if (data.federalConstituencyId)
        params.append(
          "federal_constituency_id",
          String(data.federalConstituencyId),
        );
      if (data.stateConstituencyId)
        params.append("state_constituency_id", String(data.stateConstituencyId));
      if (data.lgaId) params.append("lga_id", String(data.lgaId));
      if (data.wardId) params.append("ward_id", String(data.wardId));

      const response = await apiFetch(
        `${API_URL.agentCoverageBreakdown}?${params.toString()}`,
      );
      return response.json();
    } catch (error) {
      return {
        success: false,
        message:
          "Failed to fetch agent coverage breakdown: " + (error as Error).message,
      };
    }
  });
