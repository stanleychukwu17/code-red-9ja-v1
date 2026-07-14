import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "./fetch";
import { API_URL } from "#/lib/config";


type ListPollingUnitUpdatesInput = {
  electionGroupId?: number;
  partyId?: number;
  pollingUnitId?: number;
  userId?: number;
  stateId?: number;
  lgaId?: number;
  wardId?: number;
  senatorialDistrictId?: number;
  federalConstituencyId?: number;
  stateAssemblyConstituencyId?: number;
  isReport?: boolean;
  hasMedia?: boolean;
  cursor?: string | number;
  limit?: number;
};

export const getPollingUnitUpdates = createServerFn({
  method: "GET",
})
  .inputValidator((data: ListPollingUnitUpdatesInput) => data)
  .handler(async ({ data }) => {
    try {
      const queryParams = new URLSearchParams();
      if (data.electionGroupId)
        queryParams.append(
          "election_group_id",
          data.electionGroupId.toString(),
        );
      if (data.partyId) queryParams.append("party_id", data.partyId.toString());
      if (data.pollingUnitId)
        queryParams.append("polling_unit_id", data.pollingUnitId.toString());
      if (data.userId) queryParams.append("user_id", data.userId.toString());
      if (data.stateId) queryParams.append("state_id", data.stateId.toString());
      if (data.lgaId) queryParams.append("lga_id", data.lgaId.toString());
      if (data.wardId) queryParams.append("ward_id", data.wardId.toString());
      if (data.senatorialDistrictId)
        queryParams.append(
          "senatorial_district_id",
          data.senatorialDistrictId.toString(),
        );
      if (data.federalConstituencyId)
        queryParams.append(
          "federal_constituency_id",
          data.federalConstituencyId.toString(),
        );
      if (data.stateAssemblyConstituencyId)
        queryParams.append(
          "state_assembly_constituency_id",
          data.stateAssemblyConstituencyId.toString(),
        );
      if (data.isReport !== undefined)
        queryParams.append("is_report", data.isReport.toString());
      if (data.hasMedia !== undefined)
        queryParams.append("has_media", data.hasMedia.toString());
      if (data.cursor) queryParams.append("cursor", data.cursor.toString());
      if (data.limit) queryParams.append("limit", data.limit.toString());

      const url = `${API_URL.pollingUnitUpdates}?${queryParams.toString()}`;

      const res = await apiFetch(url, {
        method: "GET",
        });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch updates");
      }

      return await res.json();
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch updates: " + (error as Error).message,
      };
    }
  });
