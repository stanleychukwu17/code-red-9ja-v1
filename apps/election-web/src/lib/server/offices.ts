import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "./fetch";
import { API_URL } from "../config";


export const getOffices = createServerFn({ method: "GET" })
  .inputValidator((data: { limit?: number; cursor?: string | number } | undefined) => data)
  .handler(async ({ data }) => {
    try {
      const limit = data?.limit || 20;
      const cursor = data?.cursor || "";
      const response = await apiFetch(`${API_URL.offices}?limit=${limit}&cursor=${cursor}`);
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
      const response = await apiFetch(API_URL.officeById(id));
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
      const response = await apiFetch(API_URL.offices, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
      const response = await apiFetch(API_URL.officeById(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
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
      const response = await apiFetch(API_URL.officeById(id), {
        method: "DELETE",
        });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to delete office: " + (error as Error).message };
    }
  });
