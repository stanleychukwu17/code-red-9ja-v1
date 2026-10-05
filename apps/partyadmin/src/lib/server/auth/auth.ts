import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "#/lib/config";
import { apiFetchJson } from "#/lib/server/fetch";
import {
  getUserDetailsCookieImpl,
  checkIfRefreshTokenInCookieImpl,
  logoutUserImpl,
  refreshUserTokenImpl,
  loginPartyAppImpl,
} from "#/lib/server/auth/auth.server";

export const loginPartyApp = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      country: string;
      identifierType?: string;
      identifier: string;
      password: string;
      iso2?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const result = await loginPartyAppImpl({ data }); // Logs in a party member user
    return result;
  });

// Sends a POST request to the server to refresh the user's access token.
export const refreshUserToken = createServerFn({ method: "POST" }).handler(
  async () => {
    const result = await refreshUserTokenImpl(); // Refreshes the user's access token
    return result;
  },
);

// Sends a GET request to the server to check if there is a refresh token in the client's cookie.
export const checkIfRefreshTokenInCookie = createServerFn({
  method: "GET",
}).handler(async () => {
  const result = await checkIfRefreshTokenInCookieImpl(); // Checks if there is a refresh token in the client's cookie
  return result;
});

// Gets the user details from the client's cookie
export const getUserDetailsCookie = createServerFn({ method: "GET" }).handler(
  async () => {
    const result = await getUserDetailsCookieImpl(); // Gets the user details from the client's cookie
    return result;
  },
);

// Sends a POST request to the server to log out a user.
export const logoutUser = createServerFn({ method: "POST" }).handler(
  async () => {
    const result = await logoutUserImpl(); // Logs out the user
    return result;
  },
);

export interface RegisterCandidatePayload {
  email?: string;
  password: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  username?: string;
  gender: "male" | "female";
  date_of_birth: string; // YYYY-MM-DD
  current_country: number;
  current_state: number;
  current_city?: number;
  state_of_origin?: number;
  party_id?: number;
  avatar?: string;
  avatar_file_id?: number;
}

// Registers a candidate placeholder user account
export const registerCandidate = createServerFn({ method: "POST" })
  .inputValidator((data: RegisterCandidatePayload) => data)
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(API_URL.auth.registerCandidate, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      return {
        success: false,
        message:
          error?.message ||
          "An unexpected error occurred during candidate registration.",
      };
    }
  });
