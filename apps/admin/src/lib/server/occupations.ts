import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "#/lib/config";
import { apiFetch } from "./fetch";

export const getOccupations = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const response = await apiFetch(API_URL.occupations);
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch occupations from API" };
    }
  });
