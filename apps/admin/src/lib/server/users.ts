import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "#/lib/config";
import { apiFetch } from "./fetch";

// Returns users from the API based on the provided data
export const getUsersList = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { role?: string; limit?: number; cursor?: string | number; party_id?: number; search?: string } | undefined) => data,
  )
  .handler(async ({ data }) => {
    try {
      const params = new URLSearchParams();
      if (data?.role) params.append("role", data.role);
      if (data?.limit) params.append("limit", String(data.limit));
      if (data?.cursor) params.append("cursor", String(data.cursor));
      if (data?.party_id) params.append("party_id", String(data.party_id));
      if (data?.search) params.append("search", data.search);
      const qs = params.toString();
      console.log("getUsersList qs:", qs, "data:", data);

      const response = await apiFetch(`${API_URL.users}${qs ? `?${qs}` : ""}`);
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch users from API" };
    }
  });

// Updates a user in the API based on the provided data
export const updateUser = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data: { id, ...body } }) => {
    try {
      const response = await apiFetch(API_URL.manageUserById(id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
      const response = await apiFetch(API_URL.manageUserById(id), {
        method: "DELETE",
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to delete user: " + (error as Error).message };
    }
  });

// Updates user roles and optionally their party ID
export const updateUserRoles = createServerFn({ method: "POST" })
  .inputValidator((data: { user_id: number; roles: string[]; party_id?: number }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(API_URL.auth.updateRoles, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to update user roles: " + (error as Error).message };
    }
  });

// Gets user roles
export const getUserRoles = createServerFn({ method: "GET" })
  .inputValidator((data: { user_id: string | number }) => data)
  .handler(async ({ data: { user_id } }) => {
    try {
      const response = await apiFetch(API_URL.userRoles(user_id));
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch user roles: " + (error as Error).message };
    }
  });

// Gets user phone numbers
export const getUserPhoneNumbers = createServerFn({ method: "GET" })
  .inputValidator((data: { user_id: string | number }) => data)
  .handler(async ({ data: { user_id } }) => {
    try {
      const response = await apiFetch(API_URL.userPhoneNumbers(user_id));
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch user phone numbers: " + (error as Error).message };
    }
  });

// Deletes a user phone number
export const deleteUserPhoneNumber = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string | number }) => data)
  .handler(async ({ data: { id } }) => {
    try {
      const response = await apiFetch(API_URL.manageUserPhoneNumber(id), {
        method: "DELETE",
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to delete phone number: " + (error as Error).message };
    }
  });

// Updates user phone numbers
export const updateUserPhoneNumbers = createServerFn({ method: "POST" })
  .inputValidator((data: { user_fid: string | number; phones: any[] }) => data)
  .handler(async ({ data: { user_fid, phones } }) => {
    console.log({ user_fid, phones })
    // try {
    //   const response = await apiFetch(API_URL.userPhoneNumbers(user_fid), {
    //     method: "PUT",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ phones }),
    //   });
    //   const resData = await response.json();
    //   return resData;
    // } catch (error) {
    //   return { success: false, message: "Failed to update phone numbers: " + (error as Error).message };
    // }
  });
