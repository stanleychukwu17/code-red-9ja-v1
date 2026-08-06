import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "#/lib/config";
import { apiFetchJson } from "./fetch";

export const getOccupations = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      return await apiFetchJson(API_URL.occupations);
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to fetch occupations from API" };
    }
  });

