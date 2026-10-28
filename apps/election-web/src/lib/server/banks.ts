import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetch } from "./fetch";

export const getBanks = createServerFn().handler(async () => {
  try {
    const response = await apiFetch(API_URL.getBanks);
    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      message: "Failed to fetch banks from API",
    };
  }
});
