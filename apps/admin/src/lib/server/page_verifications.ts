import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetchJson } from "./fetch";

export const getVerificationTypes = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      return await apiFetchJson(API_URL.verificationTypes);
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to fetch verification types from API" };
    }
  });

export const assignVerifications = createServerFn({ method: "POST" })
  .inputValidator((data: { for_who: string; page_id: number; verification_type_ids: number[] }) => data)
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(API_URL.adminVerifications, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error: any) {
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

      return await apiFetchJson(`${API_URL.adminVerifications}?${queryParams}`, {
        method: 'DELETE',
      });
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to remove verification" };
    }
  });

