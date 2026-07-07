import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "#/lib/config";
import { getUserDetailsCookieImpl, checkIfRefreshTokenInCookieImpl, logoutUserImpl, refreshUserTokenImpl, loginPartyAppImpl } from "#/lib/server/auth/auth.server"



export const loginPartyApp = createServerFn({ method: "POST" })
  .inputValidator((data: { country: string, identifierType?: string, identifier: string, password: string, iso2?: string }) => data)
  .handler(async ({ data }) => {
    const result = await loginPartyAppImpl({ data }) // Logs in a party member user
    return result
  })

// Sends a POST request to the server to refresh the user's access token.
export const refreshUserToken = createServerFn({ method: "POST" })
  .handler(async () => {
    const result = await refreshUserTokenImpl() // Refreshes the user's access token
    // console.log("refreshUserToken result", result)
    return result
  });

// Sends a GET request to the server to check if there is a refresh token in the client's cookie.
export const checkIfRefreshTokenInCookie = createServerFn({ method: "GET" })
  .handler(async () => {
    const result = await checkIfRefreshTokenInCookieImpl() // Checks if there is a refresh token in the client's cookie
    return result;
  });

// Gets the user details from the client's cookie
export const getUserDetailsCookie = createServerFn({ method: "GET" })
  .handler(async () => {
    const result = await getUserDetailsCookieImpl() // Gets the user details from the client's cookie
    return result;
  });

// Sends a POST request to the server to log out a user.
export const logoutUser = createServerFn({ method: "POST" })
  .handler(async () => {
    const result = await logoutUserImpl() // Logs out the user
    return result
  });

// Registers a candidate placeholder user account
export const registerCandidate = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const { getCookie } = await import("@tanstack/react-start/server");
      const accessToken = getCookie("access_token");
      const refreshToken = getCookie("refresh_token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
        headers["Cookie"] = `accessToken=${accessToken}; refreshToken=${refreshToken || ""}`;
      }

      console.log("[DEBUG PartyAdmin] getCookie access_token:", accessToken);
      console.log("[DEBUG PartyAdmin] getCookie refresh_token:", refreshToken);

      const response = await fetch(API_URL.auth.registerCandidate, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });

      const text = await response.text();
      console.log("[DEBUG PartyAdmin] response status:", response.status, "body:", text);

      if (!response.ok) {
        return { success: false, message: text || `HTTP error ${response.status}` };
      }

      try {
        const result = JSON.parse(text);
        return result;
      } catch (err) {
        return { success: true, data: text }; // Fallback if raw text success
      }
    } catch (error) {
      console.error("Register candidate error:", error);
      return { success: false, message: "An unexpected error occurred during candidate registration: " + (error as Error).message };
    }
  });