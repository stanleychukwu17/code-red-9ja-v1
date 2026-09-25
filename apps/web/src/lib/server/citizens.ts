import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetchJson } from "./fetch";

/**
 * Filter parameters supported by the citizen search endpoint.
 */
export interface SearchUsersParams {
  q?: string;
  countryId?: number;
  stateId?: number;
  partyId?: number;
  parties?: number[];
  isPolitician?: boolean;
  isVerified?: boolean;
  limit?: number;
  cursor?: string;
}

/**
 * Hydrated citizen profile item returned by the backend search.
 * Handles both raw string/boolean values and Go sql.Null* nullable object shapes.
 */
export interface SearchedUserItem {
  id: number;
  fake_id: number;
  username: { String: string; Valid: boolean } | string;
  first_name: { String: string; Valid: boolean } | string;
  last_name: { String: string; Valid: boolean } | string;
  middle_name?: { String: string; Valid: boolean } | string;
  avatar?: { String: string; Valid: boolean } | string;
  gender?: { String: string; Valid: boolean } | string;
  is_politician?: { Bool: boolean; Valid: boolean } | boolean;
  is_verified?: { Bool: boolean; Valid: boolean } | boolean;
  party_id?: { Int16: number; Valid: boolean } | number;
  country_name?: string;
  state_name?: string;
  city_name?: string;
  verifications?: Array<{
    id: number;
    verification_type_id: number;
    verification_title?: string;
  }>;
  party_basic_info?: {
    id: number;
    name: string;
    short_name: string;
    logo?: string;
    color_hex?: string;
  } | null;
}

/**
 * Standard API response envelope. Note that 'meta' is positioned
 * at the root level alongside 'data', matching the Go backend's RespondSuccess utility.
 */
export interface SearchUsersResponse {
  success: boolean;
  message: string;
  data: {
    users: SearchedUserItem[];
  };
  meta?: {
    next_cursor: string;
    has_more: boolean;
  };
}

/**
 * Server function to query active citizens via GET /api/v1/users/search.
 * Handles query string serialization, keyset cursor pagination, and graceful error fallback.
 */
export const searchCitizensList = createServerFn({ method: "GET" })
  .inputValidator((data: SearchUsersParams | undefined) => data)
  .handler(async ({ data }): Promise<SearchUsersResponse> => {
    try {
      // Serialize filter parameters into URL search params
      const params = new URLSearchParams();
      if (data?.q?.trim()) params.append("q", data.q.trim());
      if (data?.countryId) params.append("country_id", String(data.countryId));
      if (data?.stateId) params.append("state_id", String(data.stateId));
      if (data?.partyId) params.append("party_id", String(data.partyId));
      if (data?.parties?.length) params.append("parties", data.parties.join(","));
      if (typeof data?.isPolitician === "boolean") {
        params.append("is_politician", String(data.isPolitician));
      }
      if (typeof data?.isVerified === "boolean") {
        params.append("is_verified", String(data.isVerified));
      }
      if (data?.limit) params.append("limit", String(data.limit));
      if (data?.cursor) params.append("cursor", String(data.cursor));

      // Construct API endpoint URL with query parameters
      const qs = params.toString();
      const url = `${API_URL.searchUsers}${qs ? `?${qs}` : ""}`;

      return await apiFetchJson(url);
    } catch (error: any) {
      // Return safe fallback response with empty results and reset pagination on failure
      return {
        success: false,
        message: error?.message || "Failed to search citizens",
        data: {
          users: [],
        },
        meta: { next_cursor: "", has_more: false },
      };
    }
  });
