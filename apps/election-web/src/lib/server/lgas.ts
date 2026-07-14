import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "./fetch";
import { API_URL } from "../config";


export const createLga = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      name: string;
      abbreviation: string;
      state_id: number;
      senatorial_district_id: number;
      federal_constituency_id: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(API_URL.lgas, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to create LGA: " + (error as Error).message };
    }
  });

export const updateLga = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string | number;
      name: string;
      abbreviation: string;
      state_id: number;
      senatorial_district_id: number;
      federal_constituency_id: number;
    }) => data,
  )
  .handler(async ({ data: { id, ...body } }) => {
    try {
      const response = await apiFetch(API_URL.lgaById(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to update LGA: " + (error as Error).message };
    }
  });

export const deleteLga = createServerFn({ method: "POST" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      const response = await apiFetch(API_URL.lgaById(id), {
        method: "DELETE",
        });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to delete LGA: " + (error as Error).message };
    }
  });

export const getLgaById = createServerFn({ method: "GET" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      const response = await apiFetch(API_URL.lgaById(id));
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch LGA details" };
    }
  });
