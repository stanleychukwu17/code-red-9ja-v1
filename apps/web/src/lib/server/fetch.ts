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

  // Determine headers object to modify
  const headers = new Headers(init?.headers);

  // If a client IP exists, forward it via X-Forwarded-For header
  if (clientIp) {
    headers.set("X-Forwarded-For", clientIp);
  }

  // Pass along the other configurations
  const requestInit: RequestInit = {
    ...init,
    headers,
  };

  return fetch(input, requestInit);
}
