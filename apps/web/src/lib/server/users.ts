import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "#/lib/config";
import { apiFetchJson } from "./fetch";

export type UpdateUserPayload = {
  id?: number | string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  gender: string;
  avatar?: string;
  avatar_file_id?: number | null;
  current_country: number;
  current_state: number;
  current_city?: number;
  state_of_origin?: number;
  party_id?: number;
  email?: string;
  username?: string;
};

export type PresignedUploadURLPayload = {
  original_name: string;
  mime_type: string;
  file_size: number;
  folder?: string;
  is_public?: boolean;
  owner_id?: number;
};

export type ConfirmFileUploadPayload = {
  id: string | number;
  success: boolean;
};

/**
 * Updates user profile on the backend via PUT /api/v1/users/profile
 */
export const updateUser = createServerFn({ method: "POST" })
  .inputValidator((data: UpdateUserPayload) => data)
  .handler(async ({ data }) => {
    try {
      const payload: Record<string, any> = {
        first_name: data.first_name,
        last_name: data.last_name,
        middle_name: data.middle_name || "",
        gender: data.gender,
        avatar: data.avatar || "",
        current_country: Number(data.current_country),
        current_state: Number(data.current_state),
      };

      if (data.avatar_file_id !== undefined && data.avatar_file_id !== null) {
        payload.avatar_file_id = Number(data.avatar_file_id);
      }
      if (data.current_city !== undefined && data.current_city !== null) {
        payload.current_city = Number(data.current_city);
      }

      return await apiFetchJson(API_URL.updateProfile, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to update profile",
      };
    }
  });

/**
 * Generates presigned upload URL for assets via POST /api/v1/files/upload-url
 */
export const getPresignedUploadURL = createServerFn({ method: "POST" })
  .inputValidator((data: PresignedUploadURLPayload) => data)
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(API_URL.uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to get upload URL",
      };
    }
  });

/**
 * Confirms file upload completion via POST /api/v1/files/{id}/confirm
 */
export const confirmFileUpload = createServerFn({ method: "POST" })
  .inputValidator((data: ConfirmFileUploadPayload) => data)
  .handler(async ({ data: { id, success } }) => {
    try {
      return await apiFetchJson(
        `${API_URL.confirmUpload(id)}?success=${success}`,
        {
          method: "POST",
        }
      );
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to confirm file upload",
      };
    }
  });

/**
 * Gets user phone numbers
 */
export const getUserPhoneNumbers = createServerFn({ method: "GET" })
  .inputValidator((data: { user_id: string | number }) => data)
  .handler(async ({ data: { user_id } }) => {
    try {
      return await apiFetchJson(API_URL.userPhoneNumbers(user_id));
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to fetch user phone numbers",
      };
    }
  });

/**
 * Deletes a user phone number
 */
export const deleteUserPhoneNumber = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string | number; user_fid: string | number }) => data)
  .handler(async ({ data: { id, user_fid } }) => {
    try {
      return await apiFetchJson(API_URL.manageUserPhoneNumber(id), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_id: Number(id), user_fid: Number(user_fid) }),
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to delete phone number",
      };
    }
  });

/**
 * Updates user phone numbers
 */
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
      return {
        success: false,
        message: error?.message || "Failed to update phone numbers",
      };
    }
  });
