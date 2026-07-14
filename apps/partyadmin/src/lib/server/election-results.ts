import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "./fetch";
import { API_URL } from "../config";

type PaginationInput = {
  limit?: number;
  cursor?: string;
};

export const getStatesWithResults = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { electionId: number } & PaginationInput) => data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      params.append("election_id", String(data.electionId));
      if (data.limit) params.append("limit", String(data.limit));
      if (data.cursor) params.append("cursor", String(data.cursor));
      const response = await apiFetch(
        `${API_URL.electionResultsStates}?${params.toString()}`,
      );
      return response.json();
    } catch (error) {
      return { success: false, message: "Failed to fetch states with results: " + (error as Error).message };
    }
  });

export const getSenatorialDistrictsWithResults = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { electionId: number; stateId: number } & PaginationInput) => data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      params.append("election_id", String(data.electionId));
      params.append("state_id", String(data.stateId));
      if (data.limit) params.append("limit", String(data.limit));
      if (data.cursor) params.append("cursor", String(data.cursor));
      const response = await apiFetch(
        `${API_URL.electionResultsSenatorialDistricts}?${params.toString()}`,
      );
      return response.json();
    } catch (error) {
      return { success: false, message: "Failed to fetch senatorial districts with results: " + (error as Error).message };
    }
  });

export const getFederalConstituenciesWithResults = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { electionId: number; senatorialDistrictId: number } & PaginationInput) => data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      params.append("election_id", String(data.electionId));
      params.append("senatorial_district_id", String(data.senatorialDistrictId));
      if (data.limit) params.append("limit", String(data.limit));
      if (data.cursor) params.append("cursor", String(data.cursor));
      const response = await apiFetch(
        `${API_URL.electionResultsFederalConstituencies}?${params.toString()}`,
      );
      return response.json();
    } catch (error) {
      return { success: false, message: "Failed to fetch federal constituencies with results: " + (error as Error).message };
    }
  });

export const getLGAsWithResults = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { electionId: number; federalConstituencyId: number } & PaginationInput) => data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      params.append("election_id", String(data.electionId));
      params.append("federal_constituency_id", String(data.federalConstituencyId));
      if (data.limit) params.append("limit", String(data.limit));
      if (data.cursor) params.append("cursor", String(data.cursor));
      const response = await apiFetch(
        `${API_URL.electionResultsLGAs}?${params.toString()}`,
      );
      return response.json();
    } catch (error) {
      return { success: false, message: "Failed to fetch LGAs with results: " + (error as Error).message };
    }
  });

export const getWardsWithResults = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { electionId: number; lgaId?: number; stateAssemblyConstituencyId?: number } & PaginationInput) => data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      params.append("election_id", String(data.electionId));
      if (data.lgaId) params.append("lga_id", String(data.lgaId));
      if (data.stateAssemblyConstituencyId) params.append("state_assembly_constituency_id", String(data.stateAssemblyConstituencyId));
      if (data.limit) params.append("limit", String(data.limit));
      if (data.cursor) params.append("cursor", String(data.cursor));
      const response = await apiFetch(
        `${API_URL.electionResultsWards}?${params.toString()}`,
      );
      return response.json();
    } catch (error) {
      return { success: false, message: "Failed to fetch wards with results: " + (error as Error).message };
    }
  });

export const getPollingUnitsWithResults = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { electionId: number; wardId: number } & PaginationInput) => data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      params.append("election_id", String(data.electionId));
      params.append("ward_id", String(data.wardId));
      if (data.limit) params.append("limit", String(data.limit));
      if (data.cursor) params.append("cursor", String(data.cursor));
      const response = await apiFetch(
        `${API_URL.electionResultsPollingUnits}?${params.toString()}`,
      );
      return response.json();
    } catch (error) {
      return { success: false, message: "Failed to fetch polling units with results: " + (error as Error).message };
    }
  });
