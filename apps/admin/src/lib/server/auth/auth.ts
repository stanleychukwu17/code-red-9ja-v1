import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "#/lib/config";
import {
  checkIfRefreshTokenInCookieImpl,
  getUserDetailsCookieImpl,
  loginAdminImpl,
  logoutUserImpl,
  refreshUserTokenImpl,
} from "#/lib/server/auth/auth.server";
import { apiFetch, handleResponse } from "#/lib/server/fetch";

// Sends a POST request to the server to log in an admin with their email, username or phone and password.
export const loginAdmin = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      identifier: string;
      password: string;
      identifierType?: string;
      iso2?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const result = await loginAdminImpl({ data }); // Logs in an admin
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

// Registers a candidate placeholder user account
export const registerCandidate = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(API_URL.auth.registerCandidate, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      return await handleResponse(response);
    } catch (error) {
      return {
        success: false,
        message:
          "An unexpected error occurred during candidate registration: " +
          (error as Error).message,
      };
    }
  });

// Makes a user a superadmin
export const makeSuperadminFn = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(API_URL.auth.superadmin, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      return await handleResponse(response);
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "An unknown error occurred",
      };
    }
  });

// Fetches all admin users
export const getAdminUsers = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const response = await apiFetch(API_URL.adminUsers, {
        method: "GET",
      });

      return await handleResponse(response);
    } catch (error) {
      return {
        success: false,
        message: "An unexpected error occurred during fetching admin users",
      };
    }
  },
);
