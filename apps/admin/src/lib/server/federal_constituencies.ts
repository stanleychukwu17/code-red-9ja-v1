import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetchJson } from "./fetch";

export const createFederalConstituency = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      name: string;
      code?: string;
      state_id: number;
      senatorial_district_id: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(API_URL.federalConstituencies, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to create federal constituency" };
    }
  });

export const updateFederalConstituency = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string | number;
      name: string;
      code?: string;
      state_id: number;
      senatorial_district_id: number;
    }) => data,
  )
  .handler(async ({ data: { id, ...body } }) => {
    try {
      return await apiFetchJson(API_URL.federalConstituencyById(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to update federal constituency" };
    }
  });

export const deleteFederalConstituency = createServerFn({ method: "POST" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      return await apiFetchJson(API_URL.federalConstituencyById(id), {
        method: "DELETE",
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to delete federal constituency" };
    }
  });

export const getFederalConstituencyById = createServerFn({ method: "GET" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      return await apiFetchJson(API_URL.federalConstituencyById(id));
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to fetch federal constituency details" };
    }
  });

export const getFederalConstituencies = createServerFn()
  .inputValidator((data: { stateId?: number; senatorialDistrictId?: number; limit?: number; cursor?: string | number; search?: string }) => data)
  .handler(async ({ data: { stateId, senatorialDistrictId, limit, cursor, search } }) => {
    try {
      return await apiFetchJson(API_URL.getFederalConstituencies(stateId, senatorialDistrictId, limit, cursor, search));
    } catch (error: any) {
      return { status: "failed", error: error?.message || "Failed to fetch federal constituencies from API" };
    }
  });

