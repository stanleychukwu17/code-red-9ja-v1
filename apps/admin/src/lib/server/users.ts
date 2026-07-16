import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "#/lib/config";
import { apiFetch } from "./fetch";

// Returns users from the API based on the provided data
export const getUsersList = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { role?: string; limit?: number; cursor?: string | number; party_id?: number } | undefined) => data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      if (data?.role) params.append("role", data.role);
      if (data?.limit) params.append("limit", String(data.limit));
      if (data?.cursor) params.append("cursor", String(data.cursor));
      if (data?.party_id) params.append("party_id", String(data.party_id));
      const qs = params.toString();


      console.log({ data }, `${API_URL.users}${qs ? `?${qs}` : ""}`)

      const response = await apiFetch(`${API_URL.users}${qs ? `?${qs}` : ""}`);
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch users from API" };
    }
  });

// Updates a user in the API based on the provided data
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
      return { success: false, message: "Failed to update user: " + (error as Error).message };
    }
  });

// Deletes a user from the API based on the provided ID
export const deleteUser = createServerFn({ method: "POST" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      const response = await apiFetch(API_URL.adminUserById(id), {
        method: "DELETE",
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to delete user: " + (error as Error).message };
    }
  });
