import { createClientOnlyFn } from "@tanstack/react-start";
import { respondError, respondSuccess } from "@/lib/shared/response";
import { IP_SERVICE_URL } from "@/lib/config";

/**
 * Fetches the country data of the user's IP address from our local ip-service.
 * @returns A Promise that resolves to the country data.
 * @throws {Error} If there was an error fetching the country data.
*/
export const fetchCountryDetailsFromLocalIPService = createClientOnlyFn(async () => {
  try {
    const response = await fetch(IP_SERVICE_URL);
    if (!response.ok) {
      return respondError("Failed to fetch country from local IP service");
    }

    const data = await response.json();
    // The local service returns { ip: "...", location: { country: "..." } }
    // We return the entire payload wrapped in a data key to match the VisitorDetails interface structure
    return respondSuccess({ data });
  } catch (error) {
    return respondError("Failed to fetch country from local IP service, check if the server is up and running");
  }
})
