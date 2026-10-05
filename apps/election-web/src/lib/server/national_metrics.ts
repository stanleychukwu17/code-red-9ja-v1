import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetchJson } from "./fetch";

export const getNationalMetrics = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      return await apiFetchJson(API_URL.nationalMetrics);
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to fetch national metrics" };
    }
  },
);
