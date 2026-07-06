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

export const getElections = createServerFn({ method: "GET" })
  .inputValidator((data: { limit?: number; cursor?: string | number } | undefined) => data)
  .handler(async ({ data }) => {
    try {
      const limit = data?.limit || 20;
      const cursor = data?.cursor || "";
      const response = await fetch(`${API_URL.elections}?limit=${limit}&cursor=${cursor}`);
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch elections from API" };
    }
  });

export const getElectionById = createServerFn({ method: "GET" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      const response = await fetch(API_URL.electionById(id));
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch election details" };
    }
  });

export const createElection = createServerFn({ method: "POST" })
  .inputValidator((data: {
    name: string;
    candidates_count: number;
    election_date: string;
    election_group_id: number;
    office_id: number;
    state_id?: number | null;
    senatorial_district_id?: number | null;
    federal_constituency_id?: number | null;
    state_constituency_id?: number | null;
    lga_id?: number | null;
    ward_id?: number | null;
  }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await fetch(API_URL.elections, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to create election: " + (error as Error).message };
    }
  });

export const updateElection = createServerFn({ method: "POST" })
  .inputValidator((data: {
    id: string | number;
    name: string;
    candidates_count: number;
    election_date: string;
    election_group_id: number;
    office_id: number;
    state_id?: number | null;
    senatorial_district_id?: number | null;
    federal_constituency_id?: number | null;
    state_constituency_id?: number | null;
    lga_id?: number | null;
    ward_id?: number | null;
  }) => data)
  .handler(async ({ data: { id, ...body } }) => {
    try {
      const response = await fetch(API_URL.electionById(id), {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to update election: " + (error as Error).message };
    }
  });

export const deleteElection = createServerFn({ method: "POST" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      const response = await fetch(API_URL.electionById(id), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to delete election: " + (error as Error).message };
    }
  });

export const createNationwideElection = createServerFn({ method: "POST" })
  .inputValidator((data: { office_id: number; election_date: string; election_group_id?: number; candidate_ids: number[] }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await fetch(API_URL.electionsNationwide, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to create nationwide election: " + (error as Error).message };
    }
  });

export const createStateElection = createServerFn({ method: "POST" })
  .inputValidator((data: { office_id: number; election_date: string; election_group_id?: number; state_ids: number[] }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await fetch(API_URL.electionsState, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to create state elections: " + (error as Error).message };
    }
  });

export const createSenatorialDistrictElection = createServerFn({ method: "POST" })
  .inputValidator((data: { office_id: number; election_date: string; election_group_id?: number; senatorial_district_ids: number[] }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await fetch(API_URL.electionsSenatorialDistrict, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to create senatorial district elections: " + (error as Error).message };
    }
  });

export const createFederalConstituencyElection = createServerFn({ method: "POST" })
  .inputValidator((data: { office_id: number; election_date: string; election_group_id?: number; federal_constituency_ids: number[] }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await fetch(API_URL.electionsFederalConstituency, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to create federal constituency elections: " + (error as Error).message };
    }
  });

export const createStateConstituencyElection = createServerFn({ method: "POST" })
  .inputValidator((data: { office_id: number; election_date: string; election_group_id?: number; state_constituency_ids: number[] }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await fetch(API_URL.electionsStateConstituency, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to create state constituency elections: " + (error as Error).message };
    }
  });

export const createLgaElection = createServerFn({ method: "POST" })
  .inputValidator((data: { office_id: number; election_date: string; election_group_id?: number; lga_ids: number[] }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await fetch(API_URL.electionsLga, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to create LGA elections: " + (error as Error).message };
    }
  });

export const createWardElection = createServerFn({ method: "POST" })
  .inputValidator((data: { office_id: number; election_date: string; election_group_id?: number; ward_ids: number[] }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await fetch(API_URL.electionsWard, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to create Ward elections: " + (error as Error).message };
    }
  });

export const getElectionCandidates = createServerFn({ method: "GET" })
  .inputValidator((data: { electionId: string | number; limit?: number; cursor?: string | number }) => data)
  .handler(async ({ data }) => {
    try {
      const limit = data.limit || 20;
      const cursor = data.cursor || "";
      const response = await fetch(`${API_URL.electionCandidates(data.electionId)}?limit=${limit}&cursor=${cursor}`, {
        headers: getAuthHeaders(),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch election candidates: " + (error as Error).message };
    }
  });

export const getElectionsByGroup = createServerFn({ method: "GET" })
  .inputValidator((groupId: string | number) => groupId)
  .handler(async ({ data: groupId }) => {
    try {
      const response = await fetch(API_URL.electionGroupElections(groupId), {
        headers: getAuthHeaders(),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch group elections: " + (error as Error).message };
    }
  });

export const syncElectionCandidates = createServerFn({ method: "POST" })
  .inputValidator((data: { electionId: string | number; candidateIds: number[] }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await fetch(API_URL.electionCandidates(data.electionId), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ candidate_ids: data.candidateIds }),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to sync candidates: " + (error as Error).message };
    }
  });

