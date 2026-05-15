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
    return { status: "failed", error: "Failed to fetch countries from API" };
  }
});