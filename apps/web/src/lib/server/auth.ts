import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { API_URL } from "../config";

// Helper function to set user details cookie
const setUserDetailsCookie = (userDetails: any) => {
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


export const registerUser = createServerFn({ method: "POST" })
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

export const resendOtp = createServerFn({ method: "POST" })
  .inputValidator((data: { phoneNumber: string; id: number }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await fetch(API_URL.auth.resendOtp, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Resend OTP error:", error);
      return { status: "error", message: "An unexpected error occurred while resending OTP" };
    }
  });

export const verifyOtp = createServerFn({ method: "POST" })
  .inputValidator((data: { phoneNumber: string; otp: string }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await fetch(API_URL.auth.verifyOtp, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Verify OTP error:", error);
      return { status: "error", message: "An unexpected error occurred during OTP verification" };
    }
  });

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

export const loginUser = createServerFn({ method: "POST" })
  .inputValidator((data: { identifier: string; password: string; }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await fetch(API_URL.auth.login, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (result.status === "success" && result.refreshToken) {
        setAuthCookies({ refreshToken: result.refreshToken, accessToken: result.accessToken });
        delete result.refreshToken;
        delete result.accessToken;
      }
      return result;
    } catch (error) {
      console.error("Login error:", error);
      return { status: "error", message: "Connection error. Please try again later." };
    }
  });

export const refreshUserToken = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async () => {
    try {
      const refreshToken = getCookie("refresh_token");
      console.log({refreshToken})
      if (!refreshToken) {
        return { status: "error", message: "No refresh token found" };
      }

      // calls the API to refresh the user token
      const response = await fetch(API_URL.auth.refresh, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      const result = await response.json();
      console.log("from refresh", result)
      if (result.status === "success") {
        if (result.refreshToken && result.accessToken) {
          setAuthCookies({ refreshToken: result.refreshToken, accessToken: result.accessToken });
          delete result.refreshToken;
          delete result.accessToken;
        }

        if (result.user) {
          setUserDetailsCookie(result.user)
        }
      } else {
        if (result?.message === "invalid or expired refresh token1") {
          console.log("cleared cookies because of this result", result)
          clearAuthCookies();
        } else {
          console.log("other errors for token error", result)
        }
      }

      return result;
    } catch (error) {
      return { status: "error", message: error };
    }
  });

export const checkIfRefreshTokenInCookie = createServerFn({ method: "GET" })
  .handler(async () => {
    const refreshToken = getCookie("refresh_token");
    return { status: refreshToken ? "success" : "error" };
  });

export const logoutUser = createServerFn({ method: "POST" })
  .handler(async () => {
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
      console.log("log out result", result)
      return result;
    } catch (error) {
      console.error("Failed to logout from backend:", error);
      return { status: "error", message: error };
    } finally {
      clearAuthCookies();
    }
  });
