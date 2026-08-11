import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "#/lib/config";
import {
  checkIfRefreshTokenInCookieImpl,
  getUserDetailsCookieImpl,
  loginUserImpl,
  loginAdminImpl,
  logoutUserImpl,
  refreshUserTokenImpl,
  verifySecurityQuestionsImpl,
  resetPasswordImpl,
  signupUserImpl,
  changePasswordByEmailImpl,
} from "#/lib/server/auth/auth.server";

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
      return {
        status: "error",
        message: "An unexpected error occurred during registration",
      };
    }
  });

export const sendSignupEmailOtp = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await fetch(API_URL.auth.sendSignupEmailOtp, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      console.log("OTP RESULT:", result);
      return result;
    } catch (error) {
      console.error("Send signup OTP error:", error);
      return {
        success: false,
        message: "An unexpected error occurred while sending the OTP",
      };
    }
  });

export const sendForgotPasswordEmailOtp = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await fetch(API_URL.auth.sendForgotPasswordEmailOtp, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Send forgot password OTP error:", error);
      return {
        success: false,
        message: "An unexpected error occurred while sending the OTP",
      };
    }
  });

export const verifySignupEmailOtp = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; otp: string }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await fetch(API_URL.auth.verifySignupEmailOtp, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      return await response.json();
    } catch (error) {
      console.error("Verify signup OTP error:", error);
      return {
        success: false,
        message: "An unexpected error occurred while verifying the OTP",
      };
    }
  });

export const signupUser = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    return await signupUserImpl({ data });
  });

// Completes the onboarding flow — sends all collected data to PATCH /api/v1/auth/onboarding
export const completeOnboarding = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data: payload }) => {
    try {
      const { getCookie } = await import("@tanstack/react-start/server");
      const accessToken = getCookie("access_token");

      if (!accessToken) {
        return {
          success: false,
          message: "Session expired. Please log in again.",
        };
      }

      const response = await fetch(API_URL.auth.completeOnboarding, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });
      return await response.json();
    } catch (error) {
      return { success: false, message: "Failed to complete onboarding" };
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
      return {
        status: "error",
        message: "An unexpected error occurred during NIN check",
      };
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
      return {
        status: "error",
        message: "An unexpected error occurred during username check",
      };
    }
  });

export const checkReferralCode = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await fetch(API_URL.auth.checkReferralCode, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Check referral code error:", error);
      return {
        status: "error",
        message: "An unexpected error occurred during referral code check",
      };
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
      return {
        status: "error",
        message: "An unexpected error occurred during final registration",
      };
    }
  });

// Sends a POST request to the server to log in a user with their identifier (email, phone number, or username) and password.
export const loginUser = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      identifier: string;
      password: string;
      iso2?: string;
      identifierType?: string;
      country?: string;
      countryId?: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    const result = await loginUserImpl({ data }); // Logs in a user
    return result;
  });

// Sends a POST request to the server to log in an admin with their email and password.
export const loginAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const result = await loginAdminImpl({ data }); // Logs in an admin
    return result;
  });

// Sends a POST request to the server to refresh the user's access token.
export const refreshUserToken = createServerFn({ method: "POST" }).handler(
  async () => {
    const result = await refreshUserTokenImpl(); // Refreshes the user's access token
    // console.log("refreshUserToken result", result)
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

// Verifies security questions for a user
export const verifySecurityQuestions = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      nin: string;
      question1: number;
      answer1: string;
      question2: number;
      answer2: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const result = await verifySecurityQuestionsImpl({ data });
    return result;
  });

// Resets user password
export const resetPassword = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    const result = await resetPasswordImpl({ data });
    return result;
  });

// Changes user password by email (used in forgot-password flow)
export const changePasswordByEmail = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const result = await changePasswordByEmailImpl({ data });
    return result;
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
        headers["Cookie"] =
          `accessToken=${accessToken}; refreshToken=${refreshToken || ""}`;
      }

      console.log("[DEBUG Admin] getCookie access_token:", accessToken);
      console.log("[DEBUG Admin] getCookie refresh_token:", refreshToken);

      const response = await fetch(API_URL.auth.registerCandidate, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });

      const text = await response.text();
      console.log(
        "[DEBUG Admin] response status:",
        response.status,
        "body:",
        text,
      );

      if (!response.ok) {
        return {
          success: false,
          message: text || `HTTP error ${response.status}`,
        };
      }

      try {
        const result = JSON.parse(text);
        return result;
      } catch (err) {
        return { success: true, data: text }; // Fallback if raw text success
      }
    } catch (error) {
      console.error("Register candidate error:", error);
      return {
        success: false,
        message:
          "An unexpected error occurred during candidate registration: " +
          (error as Error).message,
      };
    }
  });

// Fetches all admin users
export const getAdminUsers = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const { getCookie } = await import("@tanstack/react-start/server");
      const accessToken = getCookie("access_token");
      const refreshToken = getCookie("refresh_token");
      const headers: Record<string, string> = {};
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
        headers["Cookie"] =
          `accessToken=${accessToken}; refreshToken=${refreshToken || ""}`;
      }

      const response = await fetch(API_URL.adminUsers, {
        method: "GET",
        headers,
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Fetch admin users error:", error);
      return {
        success: false,
        message: "An unexpected error occurred during fetching admin users",
      };
    }
  },
);
