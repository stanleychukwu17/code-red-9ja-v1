import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetchJson } from "./fetch";

export type WardInput = {
  name: string;
  code: string;
  lga_id: number;
  state_id: number;
};

export type GetWardsParams = {
  localGovernmentId?: number;
  lga_id?: number;
  stateId?: number;
  limit?: number;
  cursor?: string | number;
  search?: string;
};

export const createWard = createServerFn({ method: "POST" })
  .inputValidator((data: WardInput) => data)
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
    (data: { id: string | number } & WardInput) => data,
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
  .inputValidator((data?: GetWardsParams) => data)
  .handler(async ({ data }) => {
    try {
      const lgaId = data?.localGovernmentId ?? data?.lga_id;
      return await apiFetchJson(
        API_URL.getWards(
          lgaId,
          data?.stateId,
          data?.limit,
          data?.cursor,
          data?.search,
        ),
      );
    } catch (error: any) {
      return {
        status: "failed",
        error: error?.message || "Failed to fetch wards from API",
      };
    }
  });

export const getWardsPaginated = createServerFn()
  .inputValidator((data?: GetWardsParams) => data)
  .handler(async ({ data }) => {
    try {
      const lgaId = data?.localGovernmentId ?? data?.lga_id;
      return await apiFetchJson(
        API_URL.getWardsPaginated(
          lgaId,
          data?.stateId,
          data?.limit,
          data?.cursor,
          data?.search,
        ),
      );
    } catch (error: any) {
      return {
        status: "failed",
        error: error?.message || "Failed to fetch wards from API",
      };
    }
  });

