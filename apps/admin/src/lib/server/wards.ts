import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetchJson } from "./fetch";

export const createWard = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      name: string;
      code: string;
      lga_id: number;
      state_id: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(API_URL.wards, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to create ward" };
    }
  });

export const updateWard = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string | number;
      name: string;
      code: string;
      lga_id: number;
      state_id: number;
    }) => data,
  )
  .handler(async ({ data: { id, ...body } }) => {
    try {
      return await apiFetchJson(API_URL.wardById(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to update ward" };
    }
  });

export const deleteWard = createServerFn({ method: "POST" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      return await apiFetchJson(API_URL.wardById(id), {
        method: "DELETE",
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to delete ward" };
    }
  });

export const getWardById = createServerFn({ method: "GET" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      return await apiFetchJson(API_URL.wardById(id));
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to fetch ward details" };
    }
  });

export const getWards = createServerFn()
  .inputValidator((data: { localGovernmentId?: number; stateId?: number; limit?: number; cursor?: string | number; search?: string }) => data)
  .handler(async ({ data: { localGovernmentId, stateId, limit, cursor, search } }) => {
    try {
      return await apiFetchJson(API_URL.getWards(localGovernmentId, stateId, limit, cursor, search));
    } catch (error: any) {
      return { status: "failed", error: error?.message || "Failed to fetch wards from API" };
    }
  });

