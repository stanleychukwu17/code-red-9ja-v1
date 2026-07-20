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
