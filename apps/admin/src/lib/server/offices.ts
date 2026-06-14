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

export const getOffices = createServerFn({ method: "GET" })
  .inputValidator((data: { limit?: number; cursor?: string | number } | undefined) => data)
  .handler(async ({ data }) => {
    try {
      const limit = data?.limit || 20;
      const cursor = data?.cursor || "";
      const response = await fetch(`${API_URL.offices}?limit=${limit}&cursor=${cursor}`);
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch offices from API" };
    }
  });

export const getOfficeById = createServerFn({ method: "GET" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      const response = await fetch(API_URL.officeById(id));
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch office details" };
    }
  });

export const createOffice = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; election: string; scope: string; rank: number }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await fetch(API_URL.offices, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to create office: " + (error as Error).message };
    }
  });

export const updateOffice = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string | number; name: string; election: string; scope: string; rank: number }) => data)
  .handler(async ({ data: { id, ...body } }) => {
    try {
      const response = await fetch(API_URL.officeById(id), {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to update office: " + (error as Error).message };
    }
  });

export const deleteOffice = createServerFn({ method: "POST" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      const response = await fetch(API_URL.officeById(id), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to delete office: " + (error as Error).message };
    }
  });
