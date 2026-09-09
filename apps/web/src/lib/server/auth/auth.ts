import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "#/lib/config";
import { apiFetch, apiFetchJson } from "#/lib/server/fetch";
import {
  checkIfRefreshTokenInCookieImpl,
  getUserDetailsCookieImpl,
  loginUserImpl,
  logoutUserImpl,
  refreshUserTokenImpl,
  signupUserImpl,
  changePasswordByEmailImpl,
} from "#/lib/server/auth/auth.server";

// send signup email otp
export const sendSignupEmailOtp = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(API_URL.auth.sendSignupEmailOtp, {
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
      const response = await apiFetch(API_URL.auth.sendForgotPasswordEmailOtp, {
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
      const response = await apiFetch(API_URL.auth.verifySignupEmailOtp, {
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

// Checks if a NIN (National Identity Number) is valid
export const checkNin = createServerFn({ method: "POST" })
  .inputValidator((data: { nin: string }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(API_URL.auth.checkNin, {
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

// Checks if a username is available
export const checkUsername = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(API_URL.auth.checkUsername, {
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

// Checks if a referral code exists
export const checkReferralCode = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(API_URL.auth.checkReferralCode, {
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

// Login user
export const loginUser = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      identifier: string;
      password: string;
      iso2?: string;
      identifierType?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const result = await loginUserImpl({ data });
    return result;
  });

// Refresh user token
export const refreshUserToken = createServerFn({ method: "POST" }).handler(
  async () => {
    const result = await refreshUserTokenImpl();
    return result;
  },
);

// Check if refresh token is in cookie
export const checkIfRefreshTokenInCookie = createServerFn({
  method: "GET",
}).handler(async () => {
  const result = await checkIfRefreshTokenInCookieImpl(); // Checks if there is a refresh token in the client's cookie
  return result;
});

// Get user details from cookie
export const getUserDetailsCookie = createServerFn({ method: "GET" }).handler(
  async () => {
    const result = await getUserDetailsCookieImpl(); // Gets the user details from the client's cookie
    return result;
  },
);

// Logout user
export const logoutUser = createServerFn({ method: "POST" }).handler(
  async () => {
    const result = await logoutUserImpl(); // Logs out the user
    return result;
  },
);

// Changes user password by email
export const changePasswordByEmail = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; otp: string; password: string }) => data)
  .handler(async ({ data }) => {
    return await changePasswordByEmailImpl({ data });
  });
