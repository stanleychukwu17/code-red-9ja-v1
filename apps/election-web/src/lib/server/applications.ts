import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { API_URL } from "#/lib/config";

function getAuthHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const accessToken = getCookie("access_token");
  const refreshToken = getCookie("refresh_token");

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
    headers["Cookie"] =
      `accessToken=${accessToken}; refreshToken=${refreshToken || ""}`;
  }

  return headers;
}

export const getApplications = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { status?: string; limit?: number; cursor?: number; user_id?: string | number } | undefined) =>
      data,
  )
  .handler(async ({ data }) => {
    try {
      const status = data?.status || "";
      const limit = data?.limit || 100;
      const cursor = data?.cursor;
      const user_id = data?.user_id;

      const params = new URLSearchParams();
      if (status) params.append("status", status);
      params.append("limit", String(limit));
      if (cursor) params.append("cursor", String(cursor));
      if (user_id) params.append("user_id", String(user_id));
      const url = `${API_URL.pollingAgentApplications}?${params.toString()}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
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
    (data: { id: number; pollingUnitID?: number; roleType?: string }) => data,
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
      const response = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(),
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
      const response = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(),
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

export const cancelApplication = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    try {
      const url = API_URL.cancelApplication(data.id);
      const response = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to cancel application: " + (error as Error).message,
      };
    }
  });

export const getPollingUnits = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { wardID?: number; lgaID?: number; stateID?: number } | undefined) =>
      data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      if (data?.wardID) params.append("ward_id", String(data.wardID));
      if (data?.lgaID) params.append("lga_id", String(data.lgaID));
      if (data?.stateID) params.append("state_id", String(data.stateID));
      const qs = params.toString();

      const url = `${API_URL.pollingUnits}${qs ? `?${qs}` : ""}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
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
    (data: { stateID?: number } | undefined) => data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      if (data?.stateID) params.append("state_id", String(data.stateID));
      params.append("limit", "200");
      const qs = params.toString();

      const url = `${API_URL.getLGAs}${qs ? `?${qs}` : ""}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
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
    (data: { lgaID?: number; stateID?: number } | undefined) => data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      if (data?.lgaID) params.append("lga_id", String(data.lgaID));
      if (data?.stateID) params.append("state_id", String(data.stateID));
      params.append("limit", "200");
      const qs = params.toString();

      const url = `${API_URL.getWards}${qs ? `?${qs}` : ""}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
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
      pollingUnitID?: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      params.append("party_id", String(data.partyID));
      params.append("election_group_id", String(data.electionGroupID));
      if (data.lgaID) params.append("lga_id", String(data.lgaID));
      if (data.pollingUnitID)
        params.append("polling_unit_id", String(data.pollingUnitID));

      const url = `${API_URL.pollingAgentRecommendations}?${params.toString()}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message:
          "Failed to fetch recommendations: " + (error as Error).message,
      };
    }
  });

export const submitPollingAgentApplication = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      party_id: number;
      election_group_ids: number[];
      polling_unit_id: number;
      avatar: string;
      vin?: string;
      voters_card_image?: string;
      current_country: number;
      current_state: number;
      current_lga: number;
      current_ward?: number;
      current_city: number;
      bank_account_number: string;
      bank_code: string;
      whatsapp_phone: string;
      data_phone: string;
      educational_status: string;
      highest_degree: string;
      graduation_year: string;
      school_name: string;
      phone: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const response = await fetch(API_URL.pollingAgentApplications, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message:
          "Failed to submit polling agent application: " +
          (error as Error).message,
      };
    }
  });

