import { getCookie } from "@tanstack/react-start/server";

/**
 * A wrapper around the native fetch API that automatically extracts the client's IP address
 * from the `client_ip` cookie and appends it to the `X-Forwarded-For` header.
 */
export async function apiFetch(
  input: string | URL | Request,
  init?: RequestInit
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

  return fetch(input, requestInit);
}

/**
 * Safely parses the Response from apiFetch. 
 * If the response is JSON, it parses and checks for `.error`.
 * If the response is plain text, it throws the text as an error.
 */
export async function handleResponse(response: Response) {
  const contentType = response.headers.get("content-type");

  if (contentType && contentType.includes("application/json")) {
    const resData = await response.json();

    if (!response.ok && resData && resData.error) {
      throw new Error(resData.error);
    }

    return resData;
  } else {
    const text = await response.text();
    throw new Error(text || "Unknown error occurred");
  }
}
