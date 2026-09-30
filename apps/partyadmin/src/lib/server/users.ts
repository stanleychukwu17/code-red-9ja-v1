/**
 * @file User Management Server Functions
 * @description Server actions interfacing with the Go backend user endpoints.
 * Handles user profile updates, roster listings with pagination & filtering,
 * account deletion, and cross-application citizen search queries.
 */

import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "./fetch";
import { API_URL } from "#/lib/config";

/**
 * Update User Server Function
 * Submits user profile modifications (personal info, geographic origins, assigned role)
 * to PUT /api/v1/admin/users/:id.
 */
export const updateUser = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string | number;
      first_name: string;
      last_name: string;
      middle_name?: string;
      gender: string;
      avatar?: string;
      current_country: number;
      current_state: number;
      current_city?: number;
      state_of_origin: number;
      role: string;
      role_level: string;
      party_id?: number;
      email: string;
    }) => data,
  )
  .handler(async ({ data: { id, ...body } }) => {
    try {
      const response = await apiFetch(API_URL.adminUserById(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to update user: " + (error as Error).message,
      };
    }
  });

/**
 * Get Users List Server Function
 * Fetches paginated user records from GET /api/v1/users.
 * Supports filtering by party, status, verification badge, roles, and geography.
 */
export const getUsersList = createServerFn({ method: "GET" })
  .inputValidator(
    (data: {
      role?: string;
      limit?: number;
      cursor?: string | number;
      party_id?: number;
      search?: string;
      parties?: number[];
      roles?: string[];
      statuses?: string[];
      verificationTypes?: string[];
      countryId?: string;
      stateIds?: string[];
    } | undefined) => data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      // Pagination & core filters
      if (data?.role) params.append("role", data.role);
      if (data?.limit) params.append("limit", String(data.limit));
      if (data?.cursor) params.append("cursor", String(data.cursor));
      if (data?.party_id) params.append("party_id", String(data.party_id));
      if (data?.search) params.append("search", data.search);

      // Multi-select scoped filters
      if (data?.parties?.length) params.append("parties", data.parties.join(","));
      if (data?.roles?.length) params.append("roles", data.roles.join(","));
      if (data?.statuses?.length) params.append("statuses", data.statuses.join(","));
      if (data?.verificationTypes?.length) params.append("verification_types", data.verificationTypes.join(","));
      if (data?.countryId) params.append("country_id", data.countryId);
      if (data?.stateIds?.length) params.append("state_ids", data.stateIds.join(","));

      const qs = params.toString();

      const response = await apiFetch(`${API_URL.users}${qs ? `?${qs}` : ""}`);
      const resData = await response.json();
      return resData;
    } catch (_error) {
      return { success: false, message: "Failed to fetch users from API" };
    }
  });

/**
 * Search Users Server Function
 * Queries cross-platform active citizens via GET /api/v1/users/search.
 * Operates without party isolation constraints, using keyword matching on name/username.
 */
export const searchUsers = createServerFn({ method: "GET" })
  .inputValidator(
    (data: {
      search: string;
      limit?: number;
      cursor?: string | number;
      countryId?: string;
      stateIds?: string[];
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      // Search term mapped to 'q' query parameter expected by /users/search
      if (data?.search) params.append("q", data.search);
      if (data?.limit) params.append("limit", String(data.limit));
      if (data?.cursor) params.append("cursor", String(data.cursor));
      if (data?.countryId) params.append("country_id", data.countryId);
      if (data?.stateIds?.[0]) params.append("state_id", data.stateIds[0]);

      const qs = params.toString();
      const response = await apiFetch(`${API_URL.searchUsers}${qs ? `?${qs}` : ""}`);
      const resData = await response.json();
      return resData;
    } catch (_error) {
      return { success: false, message: "Failed to search users from API" };
    }
  });

