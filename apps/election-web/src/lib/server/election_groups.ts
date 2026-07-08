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

export const getElectionGroups = createServerFn({ method: "GET" })
  .inputValidator((data: { limit?: number; cursor?: string | number; upcoming?: boolean } | undefined) => data)
  .handler(async ({ data }) => {
    try {
      const limit = data?.limit || 20;
      const cursor = data?.cursor || "";
      let url = `${API_URL.electionGroups}?limit=${limit}&cursor=${cursor}`;
      if (data?.upcoming) {
        url += `&upcoming=true`;
      }
      const response = await fetch(url);
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch election groups from API" };
    }
  });

export const getElectionGroupById = createServerFn({ method: "GET" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      const response = await fetch(API_URL.electionGroupById(id));
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch election group details" };
    }
  });

export const createElectionGroup = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; rank: number; elections_count: number; states_count: number; election_date: string }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await fetch(API_URL.electionGroups, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to create election group: " + (error as Error).message };
    }
  });

export const updateElectionGroup = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string | number; name: string; rank: number; elections_count: number; states_count: number; election_date: string }) => data)
  .handler(async ({ data: { id, ...body } }) => {
    try {
      const response = await fetch(API_URL.electionGroupById(id), {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to update election group: " + (error as Error).message };
    }
  });

export const deleteElectionGroup = createServerFn({ method: "POST" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      const response = await fetch(API_URL.electionGroupById(id), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to delete election group: " + (error as Error).message };
    }
  });
