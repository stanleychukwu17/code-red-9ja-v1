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

export const createWard = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      name: string;
      abbreviation: string;
      lga_id: number;
      state_id: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const response = await fetch(API_URL.wards, {
        method: "POST",
        headers: getAuthHeaders(),
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
      abbreviation: string;
      lga_id: number;
      state_id: number;
    }) => data,
  )
  .handler(async ({ data: { id, ...body } }) => {
    try {
      const response = await fetch(API_URL.wardById(id), {
        method: "PUT",
        headers: getAuthHeaders(),
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
      const response = await fetch(API_URL.wardById(id), {
        method: "DELETE",
        headers: getAuthHeaders(),
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
      const response = await fetch(API_URL.wardById(id));
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
      const response = await fetch(API_URL.getWards(lga_id || localGovernmentId, stateId, limit, cursor));
      const data = await response.json();
      return data;
    } catch (error) {
      return { status: "failed", error: "Failed to fetch wards from API" };
    }
  });
