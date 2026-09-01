import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetchJson } from "./fetch";

export const getOffices = createServerFn({ method: "GET" })
  .inputValidator(
    (
      data:
        | {
            limit?: number;
            cursor?: string | number;
            orderBy?: string;
            order?: string;
          }
        | undefined,
    ) => data,
  )
  .handler(async ({ data }) => {
    try {
      const limit = data?.limit || 20;
      const cursor = data?.cursor || "";
      return await apiFetchJson(
        `${API_URL.offices}?limit=${limit}&cursor=${cursor}`,
      );
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to fetch offices from API" };
    }
  });

export const getOfficeById = createServerFn({ method: "GET" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      return await apiFetchJson(API_URL.officeById(id));
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to fetch office details" };
    }
  });

export const createOffice = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      name: string;
      election: string;
      scope: string;
      rank: number;
      inec_election_type_id?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(API_URL.offices, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to create office",
      };
    }
  });

export const updateOffice = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string | number;
      name: string;
      election: string;
      scope: string;
      rank: number;
      inec_election_type_id?: string;
    }) => data,
  )
  .handler(async ({ data: { id, ...body } }) => {
    try {
      return await apiFetchJson(API_URL.officeById(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to update office",
      };
    }
  });

export const deleteOffice = createServerFn({ method: "POST" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      return await apiFetchJson(API_URL.officeById(id), {
        method: "DELETE",
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to delete office",
      };
    }
  });
