import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";

export const getNationalMetrics = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const response = await fetch(API_URL.nationalMetrics);
      const resData = await response.json();
      return resData;
    } catch (error) {
      return { success: false, message: "Failed to fetch national metrics" };
    }
  },
);
