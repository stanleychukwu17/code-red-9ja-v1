import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { API_URL } from "../config";

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
        setCookie("refresh_token", result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 30 * 24 * 60 * 60, // 30 days
        });
        delete result.refreshToken;
      }
      return result;
    } catch (error) {
      console.error("Login error:", error);
      return { status: "error", message: "An unexpected error occurred during login" };
    }
  });

export const refreshUserToken = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async () => {
    try {
      const refreshToken = getCookie("refresh_token");
      if (!refreshToken) {
        return { status: "error", message: "No refresh token found" };
      }

      const response = await fetch(API_URL.auth.refresh, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      const result = await response.json();
      if (result.status === "success" && result.refreshToken) {
        setCookie("refresh_token", result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 30 * 24 * 60 * 60, // 30 days
        });
        delete result.refreshToken;
      }
      return result;
    } catch (error) {
      console.error("Token refresh error:", error);
      return { status: "error", message: "An unexpected error occurred during token refresh" };
    }
  });

export const logoutUser = createServerFn({ method: "POST" })
  .handler(async () => {
    setCookie("refresh_token", "", {
      path: "/",
      maxAge: 0,
    });
    return { status: "success" };
  });
