import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "#/lib/config";
import { checkIfRefreshTokenInCookieImpl, getUserDetailsCookieImpl, loginUserImpl, logoutUserImpl, refreshUserTokenImpl, verifySecurityQuestionsImpl, resetPasswordImpl } from "#/lib/server/auth/auth.server"


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
.inputValidator((data: { identifier: string; password: string; iso2?: string, identifierType?: string }) => data)
.handler(async ({ data }) => {
  const result = await loginUserImpl({data}) // Logs in a user
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
