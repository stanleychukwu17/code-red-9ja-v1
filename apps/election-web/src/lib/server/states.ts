import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "./fetch";
import { API_URL } from "../config";


export const createState = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      name: string;
      country_id: number;
      country_code: string;
      latitude: number;
      longitude: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(API_URL.states, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to create state: " + (error as Error).message };
    }
  });

export const updateState = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string | number;
      name: string;
      country_id: number;
      country_code: string;
      latitude: number;
      longitude: number;
    }) => data,
  )
  .handler(async ({ data: { id, ...body } }) => {
    try {
      const response = await apiFetch(API_URL.stateById(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to update state: " + (error as Error).message };
    }
  });

export const deleteState = createServerFn({ method: "POST" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      const response = await apiFetch(API_URL.stateById(id), {
        method: "DELETE",
        });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to delete state: " + (error as Error).message };
    }
  });

export const getStateById = createServerFn({ method: "GET" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      const response = await apiFetch(API_URL.stateById(id));
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch state details" };
    }
  });

export const getStates = createServerFn()
  .inputValidator((data: { countryId: number; limit?: number; cursor?: string | number }) => data)
  .handler(async ({ data: { countryId, limit, cursor } }) => {
    try {
      const response = await apiFetch(API_URL.getStates(countryId, limit, cursor));
      const data = await response.json();
      return data;
    } catch (error) {
      return { status: "failed", error: "Failed to fetch states from API, Maybe the backend server is currently down" };
    }
  });
