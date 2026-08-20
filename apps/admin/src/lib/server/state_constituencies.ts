import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetchJson } from "./fetch";

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
      return await apiFetchJson(API_URL.stateAssemblyConstituencies, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      return {
        success: false,
        message:
          error?.message || "Failed to create state assembly constituency",
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
      return await apiFetchJson(API_URL.stateAssemblyConstituencyById(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (error: any) {
      return {
        success: false,
        message:
          error?.message || "Failed to update state assembly constituency",
      };
    }
  });

export const deleteStateConstituency = createServerFn({
  method: "POST",
})
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      return await apiFetchJson(API_URL.stateAssemblyConstituencyById(id), {
        method: "DELETE",
      });
    } catch (error: any) {
      return {
        success: false,
        message:
          error?.message || "Failed to delete state assembly constituency",
      };
    }
  });

export const getStateConstituencyById = createServerFn({
  method: "GET",
})
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      return await apiFetchJson(API_URL.stateAssemblyConstituencyById(id));
    } catch (error: any) {
      return {
        success: false,
        message:
          error?.message ||
          "Failed to fetch state assembly constituency details",
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
      search?: string;
    }) => data,
  )
  .handler(
    async ({
      data: { stateId, federalConstituencyId, limit, cursor, search },
    }) => {
      try {
        return await apiFetchJson(
          API_URL.getStateConstituencies(
            stateId,
            federalConstituencyId,
            limit,
            cursor,
            search,
          ),
        );
      } catch (error: any) {
        return {
          status: "failed",
          error:
            error?.message ||
            "Failed to fetch state assembly constituencies from API",
        };
      }
    },
  );
