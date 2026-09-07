import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetchJson } from "./fetch";


/**
 * Fetches all the countries from the backend API.
 * @returns A Promise that resolves to an array of country objects.
 * @throws {Error} If there was an error fetching the countries.
*/
export const getAllCountries = createServerFn().handler(async () => {
  try {
    return await apiFetchJson(API_URL.getAllCountries);
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to fetch countries from API, Maybe the backend server is currently down" };
  }
});

export const getStates = createServerFn()
  .inputValidator((data: { countryId: number }) => data)
  .handler(async ({ data: { countryId } }) => {
    try {
      return await apiFetchJson(API_URL.getStates(countryId));
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to fetch states from API, Maybe the backend server is currently down" };
    }
  });

export const getCities = createServerFn()
  .inputValidator((data: { stateId: number; limit?: number; cursor?: string | number }) => data)
  .handler(async ({ data: { stateId, limit, cursor } }) => {
    try {
      const url = `${API_URL.getCities(stateId)}?limit=${limit || 150}&cursor=${cursor || ""}`;
      return await apiFetchJson(url);
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to fetch cities from API, Maybe the backend server is currently down" };
    }
  });
