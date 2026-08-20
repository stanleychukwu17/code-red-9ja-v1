import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetchJson } from "./fetch";

export const createLga = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      name: string;
      code: string;
      state_id: number;
      senatorial_district_id: number;
      federal_constituency_id: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(API_URL.lgas, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to create LGA" };
    }
  });

export const updateLga = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string | number;
      name: string;
      code: string;
      state_id: number;
      senatorial_district_id: number;
      federal_constituency_id: number;
    }) => data,
  )
  .handler(async ({ data: { id, ...body } }) => {
    try {
      return await apiFetchJson(API_URL.lgaById(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to update LGA" };
    }
  });

export const deleteLga = createServerFn({ method: "POST" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      return await apiFetchJson(API_URL.lgaById(id), {
        method: "DELETE",
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to delete LGA" };
    }
  });

export const getLgaById = createServerFn({ method: "GET" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      return await apiFetchJson(API_URL.lgaById(id));
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to fetch LGA details" };
    }
  });


export const getLGAs = createServerFn()
  .inputValidator((data: { stateId?: number; limit?: number; cursor?: string | number; search?: string }) => data)
  .handler(async ({ data: { stateId, limit, cursor, search } }) => {
    try {
      return await apiFetchJson(API_URL.getLGAs(stateId, limit, cursor, search));
    } catch (error: any) {
      return { status: 'failed', error: error?.message || 'Failed to fetch LGAs from API, Maybe the backend server is currently down' };
    }
  });


