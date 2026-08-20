import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "./fetch";
import { API_URL } from "../config";


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
      const response = await apiFetch(API_URL.wards, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to create ward: " + (error as Error).message };
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
      const response = await apiFetch(API_URL.wardById(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to update ward: " + (error as Error).message };
    }
  });

export const deleteWard = createServerFn({ method: "POST" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      const response = await apiFetch(API_URL.wardById(id), {
        method: "DELETE",
        });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to delete ward: " + (error as Error).message };
    }
  });

export const getWardById = createServerFn({ method: "GET" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      const response = await apiFetch(API_URL.wardById(id));
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch ward details" };
    }
  });

export const getWards = createServerFn()
  .inputValidator((data: { lga_id?: number; localGovernmentId?: number; stateId?: number; limit?: number; cursor?: string | number }) => data)
  .handler(async ({ data: { lga_id, localGovernmentId, stateId, limit, cursor } }) => {
    try {
      const response = await apiFetch(API_URL.getWards(lga_id || localGovernmentId, stateId, limit, cursor));
      const data = await response.json();
      return data;
    } catch (error) {
      return { status: "failed", error: "Failed to fetch wards from API" };
    }
  });
