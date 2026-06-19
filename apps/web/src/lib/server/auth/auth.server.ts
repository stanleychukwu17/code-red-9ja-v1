import { createServerOnlyFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { API_URL } from "../../config";
import { respondError, respondSuccess } from "@/lib/shared/response";

// Helper function to set user details cookie
export const setUserDetailsCookie = (userDetails: any) => {
  const stringifiedDetails = JSON.stringify(userDetails);
  setCookie("user_details", stringifiedDetails, {
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
};

// Helper function to set auth cookies
const setAuthCookies = (tokens: { refreshToken?: string; accessToken?: string }) => {
  if (tokens.refreshToken) {
    setCookie("refresh_token", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });
  }

  if (tokens.accessToken) {
    setCookie("access_token", tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 15 * 60, // 15 mins
    });
  }
};

// Helper function to clear auth cookies
export const clearAuthCookies = () => {
  setCookie("refresh_token", "", {
    path: "/",
    maxAge: 0,
  });
  setCookie("access_token", "", {
    path: "/",
    maxAge: 0,
  });
  setCookie("user_details", "", {
    path: "/",
    maxAge: 0,
  });
};


// Logs in a user by sending a POST request to the server with the user's identifier and password.
export const loginUserImpl = createServerOnlyFn(async ({ data }) => {
  try {
    const response = await fetch(API_URL.auth.login, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    // console.log(result)
    if (result.success && result.refreshToken) {
      setAuthCookies({ refreshToken: result.refreshToken, accessToken: result.accessToken });
      delete result.refreshToken;
      delete result.accessToken;
    }
    return respondSuccess(result);
  } catch (error) {
    return respondError("Connection error. Please try again later. " + (error as Error)?.message);
  }
})

// Refreshes the user's access token by sending a POST request to the server with the user's refresh token.
export const refreshUserTokenImpl = createServerOnlyFn(async () => {
  // Get the refresh token from the cookies
  const refreshToken = getCookie("refresh_token");

  // If no refresh token is found, return an error
  if (!refreshToken) {
    return respondError("No refresh token found");
  }

  // Calls the API to refresh the user token
  const response = await fetch(API_URL.auth.refresh, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  const result = await response.json();
  // console.log("from refresh", result)

  // If the refresh is successful, set the new access and refresh tokens in the cookies and delete them from the result
  if (result.success) {
    if (result.refreshToken && result.accessToken) {
      setAuthCookies({ refreshToken: result.refreshToken, accessToken: result.accessToken });
      delete result.refreshToken;
      delete result.accessToken;
    }

    // If the result has a user, set the user details cookie
    if (result.user) {
      setUserDetailsCookie(result.user)
    }
  } else {
    // If the result is an error, check if the error is an invalid or expired refresh token, and clear the cookies if it is
    const logOutConditions = [
      "invalid or expired refresh token",
      "user not found",
      "your account is not active"
    ]

    if (logOutConditions.includes(result?.message)) {
      console.log("cleared cookies because of this result", result)
      clearAuthCookies();
    } else {
      console.log("other errors for token error", result)
    }
  }

  return respondSuccess(result);
})

// Checks if a refresh token exists in the cookies
export const checkIfRefreshTokenInCookieImpl = createServerOnlyFn(async () => {
  const refreshToken = getCookie("refresh_token");
  return !!refreshToken ? respondSuccess() : respondError("No refresh token found");
})

export const getUserDetailsCookieImpl = createServerOnlyFn(async () => {
  const userDetailsCookie = getCookie("user_details");
  if (!userDetailsCookie) return null;
  try {
    return JSON.parse(userDetailsCookie);
  } catch {
    return null;
  }
});

// Logs out the user by sending a POST request to the server with the user's refresh token,
// Clears the cookies after the request is made.
export const logoutUserImpl = createServerOnlyFn(async () => {
  try {
    const refreshToken = getCookie("refresh_token");
    if (!refreshToken) {
      return respondError("No refresh token found");
    }

    const response = await fetch(API_URL.auth.logout, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const result = await response.json();
    return respondSuccess(result);
  } catch (error) {
    return respondError(String(error));
  } finally {
    clearAuthCookies();
  }
});

// Verifies security questions for a user
export const verifySecurityQuestionsImpl = createServerOnlyFn(async ({ data }) => {
  try {
    const response = await fetch(API_URL.auth.verifySecurityQuestions, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    return respondSuccess({ ...result, ok: response.ok });
  } catch (error) {
    return respondError("Connection error. Please try again later. " + (error as Error)?.message);
  }
});

// Resets user's password
export const resetPasswordImpl = createServerOnlyFn(async ({ data }) => {
  try {
    const response = await fetch(API_URL.auth.forgotPassword, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    return respondSuccess(result);
  } catch (error) {
    return respondError("Connection error. Please try again later. " + (error as Error)?.message);
  }
});
