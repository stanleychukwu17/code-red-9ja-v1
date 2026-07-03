import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
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

interface PollingUnitInput {
  name: string;
  abbreviation?: string | null;
  units?: string | null;
  delimitation?: string | null;
  remark?: string | null;
  registration_area_id?: number | null;
  ward_id: number;
  state_id: number;
  lga_id: number;
  latitude?: number | null;
  longitude?: number | null;
  precise_location?: string | null;
  formatted_address?: string | null;
  google_place_id?: string | null;
}

export const createPollingUnit = createServerFn({ method: "POST" })
  .inputValidator((data: PollingUnitInput) => data)
  .handler(async ({ data }) => {
    try {
      const response = await fetch(API_URL.pollingUnits, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to create polling unit: " + (error as Error).message };
    }
  });

export const updatePollingUnit = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { id: string | number } & PollingUnitInput) => data,
  )
  .handler(async ({ data: { id, ...body } }) => {
    try {
      const response = await fetch(API_URL.pollingUnitById(id), {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to update polling unit: " + (error as Error).message };
    }
  });

export const deletePollingUnit = createServerFn({ method: "POST" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      const response = await fetch(API_URL.pollingUnitById(id), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to delete polling unit: " + (error as Error).message };
    }
  });

export const getPollingUnitById = createServerFn({ method: "GET" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      const response = await fetch(API_URL.pollingUnitById(id));
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch polling unit details" };
    }
  });

export const getPollingUnits = createServerFn()
  .inputValidator((data: { wardId?: number; localGovernmentId?: number; stateId?: number; limit?: number; cursor?: string | number }) => data)
  .handler(async ({ data: { wardId, localGovernmentId, stateId, limit, cursor } }) => {
    try {
      const response = await fetch(API_URL.getPollingUnits(wardId, localGovernmentId, stateId, limit, cursor));
      const data = await response.json();
      return data;
    } catch (error) {
      return { status: "failed", error: "Failed to fetch polling units from API" };
    }
  });
