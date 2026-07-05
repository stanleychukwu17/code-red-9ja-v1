import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";


/**
 * Fetches all the countries from the backend API.
 * @returns A Promise that resolves to an array of country objects.
 * @throws {Error} If there was an error fetching the countries.
*/
export const getAllCountries = createServerFn().handler(async () => {
  try {
    const response = await fetch(API_URL.getAllCountries);
    const data = await response.json();
    return data;
  } catch (error) {
    return { status: "failed", error: "Failed to fetch countries from API, Maybe the backend server is currently down" };
  }
});

export const getStates = createServerFn()
  .inputValidator((data: { countryId: number; limit?: number; cursor?: string | number }) => data)
  .handler(async ({ data: { countryId, limit, cursor } }) => {
    try {
      const response = await fetch(API_URL.getStates(countryId, limit, cursor));
      const data = await response.json();
      return data;
    } catch (error) {
      return { status: "failed", error: "Failed to fetch states from API, Maybe the backend server is currently down" };
    }
  });

export const getCities = createServerFn()
  .inputValidator((data: { stateId: number; limit?: number; cursor?: string | number }) => data)
  .handler(async ({ data: { stateId, limit, cursor } }) => {
    try {
      const url = `${API_URL.getCities(stateId)}?limit=${limit || 50}&cursor=${cursor || ""}`;
      const response = await fetch(url);
      const data = await response.json();
      return data;
    } catch (error) {
      return { status: "failed", error: "Failed to fetch cities from API, Maybe the backend server is currently down" };
    }
  });

export const getSenatorialDistricts = createServerFn()
  .inputValidator((data: { stateId?: number; limit?: number; cursor?: string | number } | undefined) => data)
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      if (data?.stateId) params.append("state_id", String(data.stateId));
      if (data?.limit) params.append("limit", String(data.limit));
      if (data?.cursor) params.append("cursor", String(data.cursor));
      
      const response = await fetch(`${API_URL.getSenatorialDistricts}?${params.toString()}`);
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { status: "failed", error: "Failed to fetch senatorial districts from API" };
    }
  });

export const getFederalConstituencies = createServerFn()
  .inputValidator((data: { stateId?: number; senatorialDistrictId?: number; limit?: number; cursor?: string | number } | undefined) => data)
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      if (data?.stateId) params.append("state_id", String(data.stateId));
      if (data?.senatorialDistrictId) params.append("senatorial_district_id", String(data.senatorialDistrictId));
      if (data?.limit) params.append("limit", String(data.limit));
      if (data?.cursor) params.append("cursor", String(data.cursor));
      
      const response = await fetch(`${API_URL.getFederalConstituencies}?${params.toString()}`);
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { status: "failed", error: "Failed to fetch federal constituencies from API" };
    }
  });

export const getStateConstituencies = createServerFn()
  .inputValidator((data: { stateId?: number; limit?: number; cursor?: string | number } | undefined) => data)
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      if (data?.stateId) params.append("state_id", String(data.stateId));
      if (data?.limit) params.append("limit", String(data.limit));
      if (data?.cursor) params.append("cursor", String(data.cursor));
      
      const response = await fetch(`${API_URL.getStateConstituencies}?${params.toString()}`);
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { status: "failed", error: "Failed to fetch state constituencies from API" };
    }
  });