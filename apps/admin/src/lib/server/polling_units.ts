import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetchJson } from "./fetch";

interface PollingUnitInput {
  name: string;
  code?: string | null;
  pu_code?: string | null;
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
      return await apiFetchJson(API_URL.pollingUnits, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to create polling unit" };
    }
  });

export const updatePollingUnit = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { id: string | number } & PollingUnitInput) => data,
  )
  .handler(async ({ data: { id, ...body } }) => {
    try {
      return await apiFetchJson(API_URL.pollingUnitById(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to update polling unit" };
    }
  });

export const deletePollingUnit = createServerFn({ method: "POST" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      return await apiFetchJson(API_URL.pollingUnitById(id), {
        method: "DELETE",
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to delete polling unit" };
    }
  });

export const getPollingUnitById = createServerFn({ method: "GET" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      return await apiFetchJson(API_URL.pollingUnitById(id));
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to fetch polling unit details" };
    }
  });

export const getPollingUnits = createServerFn()
  .inputValidator((data: { wardId?: number; localGovernmentId?: number; stateId?: number; limit?: number; cursor?: string | number; search?: string }) => data)
  .handler(async ({ data: { wardId, localGovernmentId, stateId, limit, cursor, search } }) => {
    try {
      return await apiFetchJson(API_URL.getPollingUnits(wardId, localGovernmentId, stateId, limit, cursor, search));
    } catch (error: any) {
      return { status: "failed", error: error?.message || "Failed to fetch polling units from API" };
    }
  });

