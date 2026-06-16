import { createClientOnlyFn } from "@tanstack/react-start";

/**
 * Fetches the country data of the user's IP address from "https://ipapi.co/json/".
 * @returns A Promise that resolves to the country data.
 * @throws {Error} If there was an error fetching the country data.
*/
export const fetchCountryDetailsFromUserIP = createClientOnlyFn(async () => {
  try {
    // https://www.cloudflare.com/cdn-cgi/trace - this returns the trace data of the user's IP address,
    // but it returns plain text instead of a json object
  
    // the https://ipapi.co/json/ is free, if you hit any limits then switch to cloudfare: https://www.cloudflare.com/cdn-cgi/trace
    const response = await fetch("https://ipapi.co/json/");
    if (!response.ok) {
      return { status: "failed", error: "Failed to fetch country from IP" };
    }

    const data = await response.json();
    return {status: "success", ...data};
  } catch (error) {
    return { status: "failed", error: "Failed to fetch country from IP" };
  }
})