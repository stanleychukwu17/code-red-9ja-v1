import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";

export const registerUser = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const response = await fetch(API_URL.auth.registerPhaseSignUp, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
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
  .inputValidator((data: { phoneNumber: string; fakeId: number }) => data)
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

