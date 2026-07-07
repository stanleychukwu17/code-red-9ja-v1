import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "#/lib/config";
<<<<<<< HEAD
import { getUserDetailsCookieImpl, checkIfRefreshTokenInCookieImpl, logoutUserImpl, refreshUserTokenImpl, loginPartyAppImpl } from "#/lib/server/auth/auth.server"



export const loginPartyApp = createServerFn({ method: "POST" })
  .inputValidator((data: { country: string, identifierType?: string, identifier: string, password: string, iso2?: string }) => data)
  .handler(async ({ data }) => {
    const result = await loginPartyAppImpl({ data }) // Logs in a party member user
    return result
  })
=======
<<<<<<<< HEAD:apps/election-web/src/lib/server/auth/auth.ts
import { checkIfRefreshTokenInCookieImpl, getUserDetailsCookieImpl, loginUserImpl, loginAdminImpl, logoutUserImpl, refreshUserTokenImpl, verifySecurityQuestionsImpl, resetPasswordImpl } from "#/lib/server/auth/auth.server"

========
import { checkIfRefreshTokenInCookieImpl, getUserDetailsCookieImpl, loginUserImpl, logoutUserImpl, refreshUserTokenImpl, verifySecurityQuestionsImpl, resetPasswordImpl, loginPartyAppImpl } from "#/lib/server/auth/auth.server"
>>>>>>>> dev2:apps/partyadmin/src/lib/server/auth/auth.ts


// Starts the registration process for a new user
export const startUserRegistration = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const response = await fetch(API_URL.auth.registerPhaseSignUp, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Registration error:", error);
      return { status: "error", message: "An unexpected error occurred during registration" };
    }
  });

// Checks if a NIN (National Identity Number) is valid by sending a POST request to the server with the NIN.
export const checkNin = createServerFn({ method: "POST" })
  .inputValidator((data: { nin: string }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await fetch(API_URL.auth.checkNin, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Check NIN error:", error);
      return { status: "error", message: "An unexpected error occurred during NIN check" };
    }
  });

// Checks if a username is available by sending a POST request to the server with the username.
export const checkUsername = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await fetch(API_URL.auth.checkUsername, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Check username error:", error);
      return { status: "error", message: "An unexpected error occurred during username check" };
    }
  });

// Completes the registration process by sending a POST request to the server with the user's data.
export const completeRegistration = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const response = await fetch(API_URL.auth.register, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Complete registration error:", error);
      return { status: "error", message: "An unexpected error occurred during final registration" };
    }
  });


// Sends a POST request to the server to log in a user with their identifier (email, phone number, or username) and password.
export const loginUser = createServerFn({method: "POST"})
.inputValidator((data: { identifier: string; password: string; iso2?: string; identifierType?: string; country?: string; countryId?: number }) => data)
.handler(async ({ data }) => {
  const result = await loginUserImpl({data}) // Logs in a user
  return result
})

<<<<<<<< HEAD:apps/election-web/src/lib/server/auth/auth.ts
// Sends a POST request to the server to log in an admin with their email and password.
export const loginAdmin = createServerFn({method: "POST"})
.inputValidator((data: { email: string; password: string }) => data)
.handler(async ({ data }) => {
  const result = await loginAdminImpl({data}) // Logs in an admin
========
export const loginPartyApp = createServerFn({method: "POST"})
.inputValidator((data: { email: string; password: string }) => data)
.handler(async ({ data }) => {
  const result = await loginPartyAppImpl({data}) // Logs in a party member user
>>>>>>>> dev2:apps/partyadmin/src/lib/server/auth/auth.ts
  return result
})
>>>>>>> dev2

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

<<<<<<< HEAD
=======
// Verifies security questions for a user
export const verifySecurityQuestions = createServerFn({ method: "POST" })
  .inputValidator((data: { nin: string; question1: number; answer1: string; question2: number; answer2: string }) => data)
  .handler(async ({ data }) => {
    const result = await verifySecurityQuestionsImpl({ data })
    return result
  });

// Resets user password
export const resetPassword = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    const result = await resetPasswordImpl({ data })
    return result
  });

>>>>>>> dev2
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

<<<<<<< HEAD
      console.log("[DEBUG PartyAdmin] getCookie access_token:", accessToken);
      console.log("[DEBUG PartyAdmin] getCookie refresh_token:", refreshToken);
=======
<<<<<<<< HEAD:apps/election-web/src/lib/server/auth/auth.ts
      console.log("[DEBUG Admin] getCookie access_token:", accessToken);
      console.log("[DEBUG Admin] getCookie refresh_token:", refreshToken);
========
      console.log("[DEBUG PartyAdmin] getCookie access_token:", accessToken);
      console.log("[DEBUG PartyAdmin] getCookie refresh_token:", refreshToken);
>>>>>>>> dev2:apps/partyadmin/src/lib/server/auth/auth.ts
>>>>>>> dev2

      const response = await fetch(API_URL.auth.registerCandidate, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });

      const text = await response.text();
<<<<<<< HEAD
      console.log("[DEBUG PartyAdmin] response status:", response.status, "body:", text);
=======
<<<<<<<< HEAD:apps/election-web/src/lib/server/auth/auth.ts
      console.log("[DEBUG Admin] response status:", response.status, "body:", text);
========
      console.log("[DEBUG PartyAdmin] response status:", response.status, "body:", text);
>>>>>>>> dev2:apps/partyadmin/src/lib/server/auth/auth.ts
>>>>>>> dev2

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
<<<<<<< HEAD
=======
<<<<<<<< HEAD:apps/election-web/src/lib/server/auth/auth.ts

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


========
>>>>>>>> dev2:apps/partyadmin/src/lib/server/auth/auth.ts
>>>>>>> dev2
