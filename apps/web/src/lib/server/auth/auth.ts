import { createServerFn } from "@tanstack/react-start";
import {
  checkIfRefreshTokenInCookieImpl,
  getUserDetailsCookieImpl,
  loginUserImpl,
  logoutUserImpl,
  refreshUserTokenImpl,
} from "#/lib/server/auth/auth.server";

// Sends a POST request to the server to log in a user with their identifier (email, phone number, or username) and password.
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
    const result = await loginUserImpl({ data }); // Logs in a user
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
