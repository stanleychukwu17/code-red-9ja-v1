import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "#/lib/config";
import { checkIfRefreshTokenInCookieImpl, getUserDetailsCookieImpl, loginAdminImpl, logoutUserImpl, refreshUserTokenImpl } from "#/lib/server/auth/auth.server"




// Sends a POST request to the server to log in an admin with their email and password.
export const loginAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const result = await loginAdminImpl({ data }) // Logs in an admin
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

      const response = await fetch(API_URL.auth.registerCandidate, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Register candidate error:", error);
      return { success: false, message: "An unexpected error occurred during candidate registration" };
    }
  });

// Fetches all admin users
export const getAdminUsers = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const { getCookie } = await import("@tanstack/react-start/server");
      const accessToken = getCookie("access_token");
      const refreshToken = getCookie("refresh_token");
      const headers: Record<string, string> = {};
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
        headers["Cookie"] = `accessToken=${accessToken}; refreshToken=${refreshToken || ""}`;
      }

      const response = await fetch(API_URL.adminUsers, {
        method: "GET",
        headers,
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Fetch admin users error:", error);
      return { success: false, message: "An unexpected error occurred during fetching admin users" };
    }
  });


