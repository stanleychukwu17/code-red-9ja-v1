import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "./fetch";
import { API_URL } from "../config";

export const createStateConstituency = createServerFn({
  method: "POST",
})
  .inputValidator(
    (data: {
      name: string;
      code?: string | null;
      lga_id: number;
      state_id: number;
      senatorial_district_id: number;
      federal_constituency_id: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(API_URL.stateAssemblyConstituencies, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message:
          "Failed to create state assembly constituency: " +
          (error as Error).message,
      };
    }
  });

export const updateStateConstituency = createServerFn({
  method: "POST",
})
  .inputValidator(
    (data: {
      id: string | number;
      name: string;
      code?: string | null;
      lga_id: number;
      state_id: number;
      senatorial_district_id: number;
      federal_constituency_id: number;
    }) => data,
  )
  .handler(async ({ data: { id, ...body } }) => {
    try {
      const response = await apiFetch(
        API_URL.stateAssemblyConstituencyById(id),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message:
          "Failed to update state assembly constituency: " +
          (error as Error).message,
      };
    }
  });

export const deleteStateConstituency = createServerFn({
  method: "POST",
})
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      const response = await apiFetch(
        API_URL.stateAssemblyConstituencyById(id),
        {
          method: "DELETE",
        },
      );
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message:
          "Failed to delete state assembly constituency: " +
          (error as Error).message,
      };
    }
  });

export const getStateConstituencyById = createServerFn({
  method: "GET",
})
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      const response = await apiFetch(
        API_URL.stateAssemblyConstituencyById(id),
      );
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch state assembly constituency details",
      };
    }
  });

export const getStateConstituencies = createServerFn()
  .inputValidator(
    (data: {
      stateId?: number;
      federalConstituencyId?: number;
      limit?: number;
      cursor?: string | number;
    }) => data,
  )
  .handler(
    async ({ data: { stateId, federalConstituencyId, limit, cursor } }) => {
      try {
        const response = await apiFetch(
          API_URL.getStateConstituencies(
            stateId,
            federalConstituencyId,
            limit,
            cursor,
          ),
        );
        const data = await response.json();
        return data;
      } catch (error) {
        return {
          status: "failed",
          error: "Failed to fetch state assembly constituencies from API",
        };
      }
    },
  );
