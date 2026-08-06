import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetchJson } from "./fetch";

export const createSenatorialDistrict = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      name: string;
      description: string;
      coalition_center: string;
      state_id: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(API_URL.senatorialDistricts, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to create senatorial district" };
    }
  });

export const updateSenatorialDistrict = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string | number;
      name: string;
      description: string;
      coalition_center: string;
      state_id: number;
    }) => data,
  )
  .handler(async ({ data: { id, ...body } }) => {
    try {
      return await apiFetchJson(API_URL.senatorialDistrictById(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to update senatorial district" };
    }
  });

export const deleteSenatorialDistrict = createServerFn({ method: "POST" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      return await apiFetchJson(API_URL.senatorialDistrictById(id), {
        method: "DELETE",
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to delete senatorial district" };
    }
  });

export const getSenatorialDistrictById = createServerFn({ method: "GET" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      return await apiFetchJson(API_URL.senatorialDistrictById(id));
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to fetch senatorial district details" };
    }
  });

export const getSenatorialDistricts = createServerFn()
  .inputValidator((data: { stateId?: number; limit?: number; cursor?: string | number }) => data)
  .handler(async ({ data: { stateId, limit, cursor } }) => {
    try {
      return await apiFetchJson(API_URL.getSenatorialDistricts(stateId, limit, cursor));
    } catch (error: any) {
      return { status: "failed", error: error?.message || "Failed to fetch senatorial districts from API" };
    }
  });

