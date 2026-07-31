import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { respondError, respondSuccess } from "@/lib/shared/response";
import { apiFetch } from "./fetch";


/**
 * Fetches all the countries from the backend API.
 * @returns A Promise that resolves to an array of country objects.
 * @throws {Error} If there was an error fetching the countries.
*/
export const getAllCountries = createServerFn().handler(async () => {
  try {
    const response = await apiFetch(API_URL.getAllCountries);
    const data = await response.json();
    return respondSuccess(data);
  } catch (error) {
    return respondError("Failed to fetch countries from API, Maybe the backend server is currently down");
  }
});

export const getStates = createServerFn()
  .inputValidator((data: { countryId: number }) => data)
  .handler(async ({ data: { countryId } }) => {
    try {
      const response = await apiFetch(API_URL.getStates(countryId));
      const data = await response.json();
      return respondSuccess(data);
    } catch (error) {
      return respondError("Failed to fetch states from API, Maybe the backend server is currently down");
    }
  });

export const getCities = createServerFn()
  .inputValidator((data: { stateId: number; limit?: number; cursor?: string | number }) => data)
  .handler(async ({ data: { stateId, limit, cursor } }) => {
    try {
      const url = `${API_URL.getCities(stateId)}?limit=${limit || 150}&cursor=${cursor || ""}`;
      const response = await apiFetch(url);
      const data = await response.json();
      return respondSuccess(data);
    } catch (error) {
      return respondError("Failed to fetch cities from API, Maybe the backend server is currently down");
    }
  });
