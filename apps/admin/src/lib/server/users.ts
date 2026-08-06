import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "#/lib/config";
import { apiFetchJson } from "./fetch";

// Returns users from the API based on the provided data
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
      if (data?.role) params.append("role", data.role);
      if (data?.limit) params.append("limit", String(data.limit));
      if (data?.cursor) params.append("cursor", String(data.cursor));
      if (data?.party_id) params.append("party_id", String(data.party_id));
      if (data?.search) params.append("search", data.search);
      
      if (data?.parties?.length) params.append("parties", data.parties.join(","));
      if (data?.roles?.length) params.append("roles", data.roles.join(","));
      if (data?.statuses?.length) params.append("statuses", data.statuses.join(","));
      if (data?.verificationTypes?.length) params.append("verification_types", data.verificationTypes.join(","));
      if (data?.countryId) params.append("country_id", data.countryId);
      if (data?.stateIds?.length) params.append("state_ids", data.stateIds.join(","));
      
      const qs = params.toString();

      return await apiFetchJson(`${API_URL.users}${qs ? `?${qs}` : ""}`);
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to fetch users from API" };
    }
  });

// Updates a user in the API based on the provided data
export const updateUser = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data: { id, ...body } }) => {
    try {
      return await apiFetchJson(API_URL.manageUserById(id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to update user" };
    }
  });

// Updates user's more info in the API
export const updateUserMoreInfo = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data: { user_id, ...body } }) => {
    try {
      // Clean up string values (e.g. occupation_id)
      const payload: any = { ...body };
      if (payload.occupation_id) {
        payload.occupation_id = Number(payload.occupation_id);
      }

      return await apiFetchJson(API_URL.manageUserMoreInfo(user_id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to update user more info" };
    }
  });

// Gets user's more info from the API
export const getUserMoreInfo = createServerFn({ method: "GET" })
  .inputValidator((id: number | string) => id)
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(API_URL.manageUserMoreInfo(data), {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to get user's more info" };
    }
  });

// Deletes a user from the API based on the provided ID
export const deleteUser = createServerFn({ method: "POST" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      return await apiFetchJson(API_URL.manageUserById(id), {
        method: "DELETE",
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to delete user" };
    }
  });

// Updates user roles and optionally their party ID
export const updateUserRoles = createServerFn({ method: "POST" })
  .inputValidator((data: { user_fid: number; roles: string[]; party_id?: number }) => data)
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(API_URL.auth.updateRoles, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to update user roles" };
    }
  });

// Gets user phone numbers
export const getUserPhoneNumbers = createServerFn({ method: "GET" })
  .inputValidator((data: { user_id: string | number }) => data)
  .handler(async ({ data: { user_id } }) => {
    try {
      return await apiFetchJson(API_URL.userPhoneNumbers(user_id));
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to fetch user phone numbers" };
    }
  });

// Deletes a user phone number
export const deleteUserPhoneNumber = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string | number; user_fid: string | number }) => data)
  .handler(async ({ data: { id, user_fid } }) => {
    try {
      return await apiFetchJson(API_URL.manageUserPhoneNumber(), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_id: Number(id), user_fid: Number(user_fid) }),
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to delete phone number" };
    }
  });

// Updates user phone numbers
export const updateUserPhoneNumbers = createServerFn({ method: "POST" })
  .inputValidator((data: { user_fid: string | number; phones: any[] }) => data)
  .handler(async ({ data: { user_fid, phones } }) => {
    try {
      return await apiFetchJson(API_URL.userPhoneNumbers(user_fid), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phones }),
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to update phone numbers" };
    }
  });

// Deletes a file (like user avatar)
export const deleteFile = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string | number; user_fake_id?: string | number; party_id?: string | number; type?: string }) => data)
  .handler(async ({ data: { id, user_fake_id, party_id, type } }) => {
    try {
      const params = new URLSearchParams();
      if (user_fake_id) params.append("user_fake_id", String(user_fake_id));
      if (party_id) params.append("party_id", String(party_id));
      if (type) params.append("type", type);
      const qs = params.toString();

      return await apiFetchJson(`${API_URL.deleteFile(id)}${qs ? `?${qs}` : ""}`, {
        method: "DELETE",
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to delete file" };
    }
  });

