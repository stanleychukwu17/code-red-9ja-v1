import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetchJson } from "./fetch";

export const getElectionGroups = createServerFn({ method: "GET" })
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
      const orderBy = data?.orderBy || "";
      const order = data?.order || "";
      let url = `${API_URL.electionGroups}?limit=${limit}&cursor=${cursor}`;
      if (orderBy) url += `&order_by=${orderBy}`;
      if (order) url += `&order=${order}`;
      return await apiFetchJson(url);
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to fetch election groups from API",
      };
    }
  });

export const getElectionGroupById = createServerFn({ method: "GET" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      return await apiFetchJson(API_URL.electionGroupById(id));
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to fetch election group details",
      };
    }
  });

export const createElectionGroup = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      name: string;
      rank: number;
      elections_count: number;
      states_count: number;
      election_date: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(API_URL.electionGroups, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to create election group",
      };
    }
  });

export const updateElectionGroup = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string | number;
      name: string;
      rank: number;
      elections_count: number;
      states_count: number;
      election_date: string;
    }) => data,
  )
  .handler(async ({ data: { id, ...body } }) => {
    try {
      return await apiFetchJson(API_URL.electionGroupById(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to update election group",
      };
    }
  });

export const deleteElectionGroup = createServerFn({ method: "POST" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      return await apiFetchJson(API_URL.electionGroupById(id), {
        method: "DELETE",
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to delete election group",
      };
    }
  });

