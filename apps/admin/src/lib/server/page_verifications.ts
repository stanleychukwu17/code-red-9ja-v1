import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetch, handleResponse } from "./fetch";

export const getVerificationTypes = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const response = await apiFetch(API_URL.verificationTypes);
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch verification types from API" };
    }
  });

export const assignVerifications = createServerFn({ method: "POST" })
  .inputValidator((data: { for_who: string; page_id: number; verification_type_ids: number[] }) => data)
  .handler(async ({ data }) => {
    try {
      const response = await apiFetch(API_URL.adminVerifications, {
        method: 'POST',
        body: JSON.stringify(data),
      });

      return await handleResponse(response);
    } catch (error: any) {
      console.log("error", error?.message)
      return { success: false, message: error?.message || "Failed to assign verifications" };
    }
  });

export const removeVerification = createServerFn({ method: "POST" })
  .inputValidator((data: { page_type: string; page_id: number; verification_type_id: number, activeVrfId: number }) => data)
  .handler(async ({ data }) => {
    try {
      const queryParams = new URLSearchParams({
        page_type: data.page_type,
        page_id: data.page_id.toString(),
        verification_type_id: data.verification_type_id.toString(),
        activeVrfId: data.activeVrfId.toString(),
      }).toString();

      const response = await apiFetch(`${API_URL.adminVerifications}?${queryParams}`, {
        method: 'DELETE',
      });

      return await handleResponse(response);
    } catch (error: any) {
      console.log("error", error?.message)
      return { success: false, message: error?.message || "Failed to remove verification" };
    }
  });
