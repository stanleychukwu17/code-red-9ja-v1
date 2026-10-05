import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetchJson } from "./fetch";

export const getSystemSetting = createServerFn({ method: "GET" })
  .inputValidator((key: string) => key)
  .handler(async ({ data: key }) => {
    try {
      return await apiFetchJson(API_URL.systemSettings.get(key));
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to fetch system setting" };
    }
  });

export const updateSystemSetting = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { key: string; value: any; description?: string }) => data,
  )
  .handler(async ({ data: { key, value, description } }) => {
    try {
      return await apiFetchJson(API_URL.systemSettings.update(key), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value, description }),
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to update system setting",
      };
    }
  });
