import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "#/lib/config";
import { apiFetchJson } from "#/lib/server/fetch";
import {
  checkIfRefreshTokenInCookieImpl,
  getUserDetailsCookieImpl,
  loginUserImpl,
  loginAdminImpl,
  logoutUserImpl,
  refreshUserTokenImpl,

  resetPasswordImpl,
  signupUserImpl,
  changePasswordByEmailImpl,
} from "#/lib/server/auth/auth.server";

// send signup email otp
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
      return result;
    } catch (error) {
      return {
        success: false,
        message: "An unexpected error occurred while sending the OTP",
      };
    }
  });

// send forgot password email otp
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
      return {
        success: false,
        message: "An unexpected error occurred while sending the OTP",
      };
    }
  });

// verify signup email otp
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
      return {
        success: false,
        message: "An unexpected error occurred while verifying the OTP",
      };
    }
  });

// signup user
export const signupUser = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    return await signupUserImpl({ data });
  });

export interface CompleteOnboardingPayload {
  first_name: string;
  last_name: string;
  middle_name?: string;
  gender: string;
  date_of_birth?: string;
  referrer_user_id?: number | null;
  referral_code?: string;
  nin: string;
  username: string;
  country_of_origin?: number;
  state_of_origin?: number;
  current_country?: number;
  current_state?: number;
  current_city?: number;
}

// Completes the onboarding flow — sends all collected data to PATCH /api/v1/auth/onboarding
export const completeOnboarding = createServerFn({ method: "POST" })
  .inputValidator((data: CompleteOnboardingPayload) => data)
  .handler(async ({ data: payload }) => {
    try {
      return await apiFetchJson(API_URL.auth.completeOnboarding, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to complete onboarding",
      };
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
      return {
        success: false,
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
      return {
        success: false,
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
      return {
        success: false,
        message: "An unexpected error occurred during referral code check",
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

// Resets user password
export const resetPassword = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    const result = await resetPasswordImpl({ data });
    return result;
  });

// Changes user password by email (used in forgot-password flow)
export const changePasswordByEmail = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; otp: string; password: string }) => data)
  .handler(async ({ data }) => {
    const result = await changePasswordByEmailImpl({ data });
    return result;
  });

export interface RegisterCandidatePayload {
  email?: string;
  password: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  username?: string;
  gender: "male" | "female";
  date_of_birth: string; // YYYY-MM-DD
  current_country: number;
  current_state: number;
  current_city?: number;
  state_of_origin?: number;
  party_id?: number;
  avatar?: string;
  avatar_file_id?: number;
}

// Registers a candidate placeholder user account
export const registerCandidate = createServerFn({ method: "POST" })
  .inputValidator((data: RegisterCandidatePayload) => data)
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(API_URL.auth.registerCandidate, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      return {
        success: false,
        message:
          error?.message ||
          "An unexpected error occurred during candidate registration.",
      };
    }
  });

// Fetches all admin users
export const getAdminUsers = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      return await apiFetchJson(API_URL.adminUsers, {
        method: "GET",
      });
    } catch (error: any) {
      return {
        success: false,
        message:
          error?.message ||
          "An unexpected error occurred during fetching admin users",
      };
    }
  },
);
