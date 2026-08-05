import { createServerOnlyFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { API_URL } from "../../config";

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
const setAuthCookies = (tokens: {
  refreshToken?: string;
  accessToken?: string;
}) => {
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

// Signs up a new user and sets auth cookies with the returned tokens
export const signupUserImpl = createServerOnlyFn(async ({ data }) => {
  try {
    const response = await fetch(API_URL.auth.signup, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (result.success && result.data?.refreshToken) {
      setAuthCookies({
        refreshToken: result.data.refreshToken,
        accessToken: result.data.accessToken,
      });
      delete result.data.refreshToken;
      delete result.data.accessToken;
    }
    return result;
  } catch (error) {
    return {
      success: false,
      message: "An unexpected error occurred during signup",
    };
  }
});

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
    if (result.success && result.data?.refreshToken) {
      setAuthCookies({
        refreshToken: result.data.refreshToken,
        accessToken: result.data.accessToken,
      });
      if (result.data.user) {
        setUserDetailsCookie(result.data.user);
      }
      delete result.data.refreshToken;
      delete result.data.accessToken;
    }
    return result;
  } catch (error) {
    return {
      success: false,
      message:
        "Connection error. Please try again later. " +
        (error as Error)?.message,
    };
  }
});

// Logs in an admin by sending a POST request to the server with email and password.
export const loginAdminImpl = createServerOnlyFn(async ({ data }) => {
  try {
    const response = await fetch(API_URL.auth.adminLogin, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (result.success && result.data && result.data.refreshToken) {
      setAuthCookies({
        refreshToken: result.data.refreshToken,
        accessToken: result.data.accessToken,
      });
      if (result.data.user) {
        setUserDetailsCookie(result.data.user);
      }
      return {
        success: true,
        data: {
          user: result.data.user,
        },
        message: result.message || "Login successful",
      };
    }
    return {
      success: false,
      message: result.message || "Invalid email or password.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        "Connection error. Please try again later. " +
        (error as Error)?.message,
    };
  }
});

// Refreshes the user's access token by sending a POST request to the server with the user's refresh token.
export const refreshUserTokenImpl = createServerOnlyFn(async () => {
  try {
    // Get the refresh token from the cookies
    const refreshToken = getCookie("refresh_token");

    // If no refresh token is found, return an error
    if (!refreshToken) {
      return { status: "error", message: "No refresh token found" };
    }

    // Calls the API to refresh the user token
    const response = await fetch(API_URL.auth.refresh, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    const result = await response.json();

    // If the refresh is successful, set the new access and refresh tokens in the cookies
    if (result.success && result.data) {
      const { accessToken, refreshToken: newRefreshToken, user } = result.data;
      if (newRefreshToken && accessToken) {
        setAuthCookies({ refreshToken: newRefreshToken, accessToken });
      }

      // If the result has a user, set the user details cookie
      if (user) {
        setUserDetailsCookie(user);
      }
      return { status: "success", user };
    } else {
      // If the result is an error, check if the error is an invalid or expired refresh token, and clear the cookies if it is
      const logOutConditions = [
        "invalid or expired refresh token",
        "user not found",
        "your account is not active",
      ];

      if (logOutConditions.includes(result?.message)) {
        console.log("cleared cookies because of this result", result);
        clearAuthCookies();
      } else {
        console.log("other errors for token error", result);
      }
      return {
        status: "error",
        message: result?.message || "Failed to refresh token",
      };
    }
  } catch (error) {
    return {
      status: "error",
      message:
        "Connection error. Please try again later. " +
        (error as Error)?.message,
    };
  }
});

// Checks if a refresh token exists in the cookies
export const checkIfRefreshTokenInCookieImpl = createServerOnlyFn(async () => {
  const refreshToken = getCookie("refresh_token");
  return { status: refreshToken ? "success" : "error" };
});

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
      return { status: "error", message: "No refresh token found" };
    }

    const response = await fetch(API_URL.auth.logout, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const result = await response.json();
    return result;
  } catch (error) {
    return { status: "error", message: error };
  } finally {
    clearAuthCookies();
  }
});

// Verifies security questions for a user
export const verifySecurityQuestionsImpl = createServerOnlyFn(
  async ({ data }) => {
    try {
      const response = await fetch(API_URL.auth.verifySecurityQuestions, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      return { ...result, ok: response.ok };
    } catch (error) {
      return {
        status: "error",
        message:
          "Connection error. Please try again later. " +
          (error as Error)?.message,
        ok: false,
      };
    }
  },
);

// Resets user's password
export const resetPasswordImpl = createServerOnlyFn(async ({ data }) => {
  try {
    const response = await fetch(API_URL.auth.forgotPassword, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    return {
      status: "error",
      message:
        "Connection error. Please try again later. " +
        (error as Error)?.message,
      ok: false,
    };
  }
});

// Changes the user's password using their email address
export const changePasswordByEmailImpl = createServerOnlyFn(
  async ({ data }: { data: { email: string; password: string } }) => {
    try {
      const response = await fetch(API_URL.auth.changePasswordByEmail, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        message:
          "Connection error. Please try again later. " +
          (error as Error)?.message,
      };
    }
  },
);
