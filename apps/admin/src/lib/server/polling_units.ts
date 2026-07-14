import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetch } from "./fetch";

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
      const response = await apiFetch(API_URL.pollingUnits, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
      const response = await apiFetch(API_URL.pollingUnitById(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
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
      const response = await apiFetch(API_URL.pollingUnitById(id), {
        method: "DELETE",
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
      const response = await apiFetch(API_URL.pollingUnitById(id));
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
      const response = await apiFetch(API_URL.getPollingUnits(wardId, localGovernmentId, stateId, limit, cursor));
      const data = await response.json();
      return data;
    } catch (error) {
      return { status: "failed", error: "Failed to fetch polling units from API" };
    }
  });
