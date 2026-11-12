import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetchJson } from "./fetch";

export const getINECResultGrabbers = createServerFn({ method: "GET" })
  .inputValidator(
    (
      data:
        | {
            limit?: number;
            cursor?: string | number;
          }
        | undefined,
    ) => data,
  )
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(
        API_URL.inecResultGrabbers({ limit: data?.limit, cursor: data?.cursor }),
      );
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to fetch INEC result grabbers",
      };
    }
  });

export const getINECResultGrabberLogs = createServerFn({ method: "GET" })
  .inputValidator(
    (
      data:
        | {
            grabberId?: number | string;
            limit?: number;
            cursor?: string | number;
          }
        | undefined,
    ) => data,
  )
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(
        API_URL.inecResultGrabberLogs({
          grabberId: data?.grabberId,
          limit: data?.limit,
          cursor: data?.cursor,
        }),
      );
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to fetch INEC result grabber logs",
      };
    }
  });

export const syncINECResultGrabber = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: number | string;
      uploadToR2?: boolean;
      aiExtract?: boolean;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(
        API_URL.syncINECResultGrabber(data.id, data.uploadToR2, data.aiExtract),
        { method: "POST" },
      );
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to sync INEC result grabber",
      };
    }
  });

export const toggleINECResultGrabberPause = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number | string }) => data)
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(
        API_URL.toggleINECResultGrabberPause(data.id),
        { method: "POST" },
      );
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to toggle INEC result grabber status",
      };
    }
  });
