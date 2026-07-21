import { createServerFn } from "@tanstack/react-start";
import { apiFetch } from "./fetch";
import { API_URL } from "#/lib/config";


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

export const getUsersList = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { limit?: number; cursor?: string | number; party_id?: number; search?: string } | undefined) => data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      if (data?.limit) params.append("limit", String(data.limit));
      if (data?.cursor) params.append("cursor", String(data.cursor));
      if (data?.party_id) params.append("party_id", String(data.party_id));
      if (data?.search) params.append("search", data.search);
      const qs = params.toString();

      const response = await apiFetch(`${API_URL.users}${qs ? `?${qs}` : ""}`);
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch users from API" };
    }
  });

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
