import { getCookie } from "@tanstack/react-start/server";
import { refreshUserToken } from "./auth/auth";

/**
 * A wrapper around the native fetch API that automatically extracts the client's IP address
 * from the `client_ip` cookie and appends it to the `X-Forwarded-For` header.
 * If a request fails with HTTP 401 Unauthorized (expired token), it silently refreshes the token and retries once.
 */
export async function apiFetch(
  input: string | URL | Request,
  init?: RequestInit,
  isRetry = false
): Promise<Response> {
  const clientIp = getCookie("client_ip");
  const accessToken = getCookie("access_token");

  // Determine headers object to modify
  const headers = new Headers(init?.headers);

  // If a client IP exists, forward it via X-Forwarded-For header
  if (clientIp) {
    headers.set("X-Forwarded-For", clientIp);
  }

  // If access token exists, forward it via Authorization header
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  // Pass along the other configurations
  const requestInit: RequestInit = {
    ...init,
    headers,
  };

  const response = await fetch(input, requestInit);

  // If 401 Unauthorized occurs and this isn't already a retry attempt
  if (response.status === 401 && !isRetry) {
    const clone = response.clone();
    try {
      const resData = await clone.json();
      const isExpiredToken =
        resData?.message?.toLowerCase().includes("expired") ||
        resData?.message?.toLowerCase().includes("unauthorized") ||
        resData?.message?.toLowerCase().includes("token") ||
        resData?.error?.toLowerCase().includes("expired") ||
        resData?.error?.toLowerCase().includes("token");

      if (isExpiredToken) {
        // Attempt silent refresh using refreshUserToken
        const refreshResult = await refreshUserToken();
        if (refreshResult?.status === "success") {
          // Retry the original request with updated access_token cookie
          return apiFetch(input, init, true);
        }
      }
    } catch {
      // Ignore JSON parse errors on 401 if response body is non-JSON
    }
  }

  return response;
}


/**
 * Safely parses the Response from apiFetch. 
 * If the response is JSON, it parses and checks for `.error`.
 * If the response is plain text, it throws the text as an error.
 */
export async function handleResponse<T = any>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type");

  if (contentType && contentType.includes("application/json")) {
    const resData = await response.json();

    if (!response.ok || resData?.success === false) {
      const errorMsg =
        resData?.message || resData?.error || resData?.details || `HTTP error ${response.status}`;
      throw new Error(errorMsg);
    }

    return resData as T;
  } else {
    const text = await response.text();
    throw new Error(text || `HTTP error ${response.status}`);
  }
}

/**
 * High-level helper wrapper that fetches and handles JSON response parsing/errors automatically.
 */
export async function apiFetchJson<T = any>(
  input: string | URL | Request,
  init?: RequestInit
): Promise<T> {
  const response = await apiFetch(input, init);
  return handleResponse<T>(response);
}
