import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetch } from "./fetch";

export const getSystemSetting = createServerFn({ method: "GET" })
  .inputValidator((key: string) => key)
  .handler(async ({ data: key }) => {
    console.log("SERVER FN getSystemSetting called with key:", key);
    try {
      const response = await apiFetch(API_URL.systemSettings.get(key));
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch system setting" };
    }
  });

export const updateSystemSetting = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { key: string; value: any; description?: string }) => data,
  )
  .handler(async ({ data: { key, value, description } }) => {
    try {
      const response = await apiFetch(API_URL.systemSettings.update(key), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value, description }),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      return {
        success: false,
        message: "Failed to update system setting: " + (error as Error).message,
      };
    }
  });
