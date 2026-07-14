import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "./fetch";
import { API_URL } from "../config";


export const createFederalConstituency = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      name: string;
      state_id: number;
      senatorial_district_id: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(API_URL.federalConstituencies, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to create federal constituency: " + (error as Error).message };
    }
  });

export const updateFederalConstituency = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string | number;
      name: string;
      state_id: number;
      senatorial_district_id: number;
    }) => data,
  )
  .handler(async ({ data: { id, ...body } }) => {
    try {
      const response = await apiFetch(API_URL.federalConstituencyById(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to update federal constituency: " + (error as Error).message };
    }
  });

export const deleteFederalConstituency = createServerFn({ method: "POST" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      const response = await apiFetch(API_URL.federalConstituencyById(id), {
        method: "DELETE",
        });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to delete federal constituency: " + (error as Error).message };
    }
  });

export const getFederalConstituencyById = createServerFn({ method: "GET" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      const response = await apiFetch(API_URL.federalConstituencyById(id));
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch federal constituency details" };
    }
  });

export const getFederalConstituencies = createServerFn()
  .inputValidator((data: { stateId?: number; senatorialDistrictId?: number; limit?: number; cursor?: string | number }) => data)
  .handler(async ({ data: { stateId, senatorialDistrictId, limit, cursor } }) => {
    try {
      const response = await apiFetch(API_URL.getFederalConstituencies(stateId, senatorialDistrictId, limit, cursor));
      const data = await response.json();
      return data;
    } catch (error) {
      return { status: "failed", error: "Failed to fetch federal constituencies from API" };
    }
  });
