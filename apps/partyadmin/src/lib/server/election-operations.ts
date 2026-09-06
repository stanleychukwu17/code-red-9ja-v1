import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "#/lib/config";
import { apiFetch } from "./fetch";

export type SupervisorItem = {
  id: number;
  name: string;
  avatar?: string;
};

export type OperationsUnitItem = {
  id: number | string;
  name: string;
  code?: string;
  agents_at_pu?: string;
  pu_agents_in_attendance?: number;
  pu_agents_count?: number;
  avg_agent_arrival_time?: string;
  election_started_in?: string;
  election_ended_in?: string;
  avg_ele_start_time?: string;
  avg_ele_end_time?: string;
  updates_given?: number;
  reports_given?: number;
  reported_pus?: number;
  pus_with_updates?: number;
  avg_update_time_interval?: string;
  live_voters_referred?: number;
  results_uploaded?: number;
  results_expected?: string | number;
  pus_with_all_results?: number;
  pus_with_1_agent?: string;
  total_agents?: string;
  total_pus?: number;
  overall_readiness?: number;
  uploaded_all_results?: boolean;
  supervisors?: SupervisorItem[];
  pu_agents?: SupervisorItem[];
};

export type OperationsBreakdownResponse = {
  total: number;
  unit_title: string;
  unit_type: string;
  supervisor_title?: string;
  units: OperationsUnitItem[];
};

export const getOperationsBreakdown = createServerFn({ method: "GET" })
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
        `${API_URL.electionOperationsBreakdown}?${params.toString()}`,
      );
      return response.json();
    } catch (error) {
      return {
        success: false,
        message:
          "Failed to fetch operations breakdown: " + (error as Error).message,
      };
    }
  });
