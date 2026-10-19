import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "#/lib/config";
import { apiFetch } from "./fetch";

export const getOffices = createServerFn({ method: "GET" })
  .inputValidator(
    (
      data:
        | {
            limit?: number;
            cursor?: string | number;
            orderBy?: string;
            order?: string;
            contested?: boolean;
          }
        | undefined,
    ) => data,
  )
  .handler(async ({ data }) => {
    try {
      const limit = data?.limit || 50;
      const cursor = data?.cursor || "";
      const contestedParam =
        data?.contested !== undefined ? `&contested=${data.contested}` : "";
      const response = await apiFetch(
        `${API_URL.offices}?limit=${limit}&cursor=${cursor}${contestedParam}`,
      );
      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to fetch offices from API",
      };
    }
  });

export const getContestedOffices = createServerFn({ method: "GET" })
  .inputValidator(
    (
      data:
        | {
            limit?: number;
            cursor?: string | number;
            orderBy?: string;
            order?: string;
          }
        | undefined,
    ) => data,
  )
  .handler(async ({ data }) => {
    return await getOffices({ data: { ...data, contested: true } });
  });
