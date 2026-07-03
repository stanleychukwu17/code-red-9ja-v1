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
      const response = await fetch(API_URL.senatorialDistricts, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to create senatorial district: " + (error as Error).message };
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
      const response = await fetch(API_URL.senatorialDistrictById(id), {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to update senatorial district: " + (error as Error).message };
    }
  });

export const deleteSenatorialDistrict = createServerFn({ method: "POST" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      const response = await fetch(API_URL.senatorialDistrictById(id), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to delete senatorial district: " + (error as Error).message };
    }
  });

export const getSenatorialDistrictById = createServerFn({ method: "GET" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      const response = await fetch(API_URL.senatorialDistrictById(id));
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch senatorial district details" };
    }
  });

export const getSenatorialDistricts = createServerFn()
  .inputValidator((data: { stateId?: number; limit?: number; cursor?: string | number }) => data)
  .handler(async ({ data: { stateId, limit, cursor } }) => {
    try {
      const response = await fetch(API_URL.getSenatorialDistricts(stateId, limit, cursor));
      const data = await response.json();
      return data;
    } catch (error) {
      return { status: "failed", error: "Failed to fetch senatorial districts from API" };
    }
  });
