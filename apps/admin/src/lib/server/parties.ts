import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetch } from "./fetch";

export const getParties = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const response = await apiFetch(API_URL.parties);
      const resData = await response.json();
      return resData; // Envelope: { success: true, message: "...", data: { parties: [...] } }
    } catch (error) {
      return { success: false, message: "Failed to fetch parties from API" };
    }
  });

export const getPartyById = createServerFn({ method: "GET" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      const response = await apiFetch(API_URL.partyById(id));
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch party details" };
    }
  });

export const createParty = createServerFn({ method: "POST" })
  .inputValidator((data: { short_name: string; name: string; logo: string; display_order?: number }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(API_URL.parties, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to create party: " + (error as Error).message };
    }
  });

export const updateParty = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string | number; short_name: string; name: string; logo: string; display_order?: number }) => data)
  .handler(async ({ data: { id, ...body } }) => {
    try {
      const response = await apiFetch(API_URL.partyById(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to update party: " + (error as Error).message };
    }
  });

export const deleteParty = createServerFn({ method: "POST" })
  .inputValidator((id: string | number) => id)
  .handler(async ({ data: id }) => {
    try {
      const response = await apiFetch(API_URL.partyById(id), {
        method: "DELETE",
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to delete party: " + (error as Error).message };
    }
  });

export const getPresignedUploadURL = createServerFn({ method: "POST" })
  .inputValidator((data: { original_name: string; mime_type: string; file_size: number; folder?: string; is_public?: boolean }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(API_URL.uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to get upload URL: " + (error as Error).message };
    }
  });

export const confirmFileUpload = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string | number; success: boolean }) => data)
  .handler(async ({ data: { id, success } }) => {
    try {
      const response = await apiFetch(`${API_URL.confirmUpload(id)}?success=${success}`, {
        method: "POST",
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to confirm file upload" };
    }
  });
