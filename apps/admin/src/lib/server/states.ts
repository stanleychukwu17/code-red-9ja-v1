import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetchJson } from "./fetch";

export const createState = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      name: string;
      country_id: number;
      country_code: string;
      latitude: number;
      longitude: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(API_URL.states, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to create state" };
    }
  });

export const updateState = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string | number;
      name: string;
      country_id: number;
      country_code: string;
      latitude: number;
      longitude: number;
    }) => data,
  )
  .handler(async ({ data: { id, ...body } }) => {
    try {
      return await apiFetchJson(API_URL.stateById(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to update state" };
    }
  });

export const deleteState = createServerFn({ method: "POST" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      return await apiFetchJson(API_URL.stateById(id), {
        method: "DELETE",
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to delete state" };
    }
  });

export const getStateById = createServerFn({ method: "GET" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      return await apiFetchJson(API_URL.stateById(id));
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to fetch state details" };
    }
  });

export const getStates = createServerFn()
  .inputValidator((data: { countryId: number; limit?: number; cursor?: string | number; search?: string }) => data)
  .handler(async ({ data: { countryId, limit, cursor, search } }) => {
    try {
      return await apiFetchJson(API_URL.getStates(countryId, limit, cursor, search));
    } catch (error: any) {
      return { status: "failed", error: error?.message || "Failed to fetch states from API, Maybe the backend server is currently down" };
    }
  });

export const recalculateBodies = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      return await apiFetchJson(API_URL.recalculateBodies, {
        method: "POST",
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to recalculate bodies" };
    }
  });

export const syncElectoralUnits = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      return await apiFetchJson(API_URL.syncElectoralUnits, {
        method: "POST",
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to sync electoral units" };
    }
  });

export const syncElectoralUnitsStateFlow = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      return await apiFetchJson(API_URL.syncElectoralUnitsStateFlow, {
        method: "POST",
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to sync electoral units (State Flow)" };
    }
  });



