import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "./fetch";
import { API_URL } from "#/lib/config";

export const getApplications = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { status?: string; limit?: number; cursor?: number } | undefined) =>
      data,
  )
  .handler(async ({ data }) => {
    try {
      const status = data?.status || "";
      const limit = data?.limit || 100;
      const cursor = data?.cursor;

      const params = new URLSearchParams();
      params.append("status", status);
      params.append("limit", String(limit));
      if (cursor) params.append("cursor", String(cursor));
      const url = `${API_URL.partyApplications}?${params.toString()}`;
      const response = await apiFetch(url);
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch applications: " + (error as Error).message,
      };
    }
  });

export const approveApplication = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: number;
      pollingUnitID?: number;
      roleType?: string;
      stateId?: number;
      lgaId?: number;
      wardId?: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const url = API_URL.approveApplication(data.id);
      const body: Record<string, any> = {
        role_type: data.roleType || "polling_agent",
      };
      if (data.pollingUnitID !== undefined) {
        body.polling_unit_id = data.pollingUnitID;
      }
      if (data.stateId !== undefined) body.state_id = data.stateId;
      if (data.lgaId !== undefined) body.lga_id = data.lgaId;
      if (data.wardId !== undefined) body.ward_id = data.wardId;
      const response = await apiFetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to approve application: " + (error as Error).message,
      };
    }
  });

export const rejectApplication = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number; reason: string }) => data)
  .handler(async ({ data }) => {
    try {
      const url = API_URL.rejectApplication(data.id);
      const response = await apiFetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: data.reason,
        }),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to reject application: " + (error as Error).message,
      };
    }
  });

export const getPollingUnits = createServerFn({ method: "GET" })
  .inputValidator(
    (
      data:
        | {
            wardID?: number;
            lgaID?: number;
            stateID?: number;
            limit?: number;
            cursor?: string | number;
          }
        | undefined,
    ) => data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      if (data?.wardID) params.append("ward_id", String(data.wardID));
      if (data?.lgaID) params.append("lga_id", String(data.lgaID));
      if (data?.stateID) params.append("state_id", String(data.stateID));
      if (data?.limit) params.append("limit", String(data.limit));
      if (data?.cursor) params.append("cursor", String(data.cursor));
      const qs = params.toString();

      const url = `${API_URL.pollingUnits}${qs ? `?${qs}` : ""}`;
      const response = await apiFetch(url);
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch polling units: " + (error as Error).message,
      };
    }
  });

export const getLGAs = createServerFn({ method: "GET" })
  .inputValidator(
    (
      data:
        | {
            stateId?: number;
            federalConstituencyId?: number;
            limit?: number;
            cursor?: string;
          }
        | undefined,
    ) => data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      if (data?.stateId) params.append("state_id", String(data.stateId));
      if (data?.federalConstituencyId)
        params.append(
          "federal_constituency_id",
          String(data.federalConstituencyId),
        );
      if (data?.limit) params.append("limit", String(data.limit));
      else params.append("limit", "200");
      if (data?.cursor) params.append("cursor", String(data.cursor));
      const qs = params.toString();

      const url = `${API_URL.getLGAs}${qs ? `?${qs}` : ""}`;
      const response = await apiFetch(url);
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch LGAs: " + (error as Error).message,
      };
    }
  });

export const getWards = createServerFn({ method: "GET" })
  .inputValidator(
    (
      data:
        | {
            lga_id?: number;
            stateId?: number;
            stateConstituencyId?: number;
            limit?: number;
            cursor?: string;
          }
        | undefined,
    ) => data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      if (data?.lga_id) params.append("lga_id", String(data.lga_id));
      if (data?.stateId) params.append("state_id", String(data.stateId));
      if (data?.stateConstituencyId)
        params.append(
          "state_constituency_id",
          String(data.stateConstituencyId),
        );
      if (data?.limit) params.append("limit", String(data.limit));
      else params.append("limit", "200");
      if (data?.cursor) params.append("cursor", String(data.cursor));
      const qs = params.toString();

      const url = `${API_URL.getWards}${qs ? `?${qs}` : ""}`;
      const response = await apiFetch(url);
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch wards: " + (error as Error).message,
      };
    }
  });

export const getPollingUnitRecommendations = createServerFn({ method: "GET" })
  .inputValidator(
    (data: {
      partyID: number;
      electionGroupID: number;
      lgaID?: number;
      wardID?: number;
      pollingUnitID?: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      params.append("party_id", String(data.partyID));
      params.append("election_group_id", String(data.electionGroupID));
      if (data.lgaID) params.append("lga_id", String(data.lgaID));
      if (data.wardID) params.append("ward_id", String(data.wardID));
      if (data.pollingUnitID)
        params.append("polling_unit_id", String(data.pollingUnitID));

      const url = `${API_URL.partyApplicationsRecommendations}?${params.toString()}`;
      const response = await apiFetch(url);
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch recommendations: " + (error as Error).message,
      };
    }
  });
