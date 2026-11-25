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
      force?: boolean;
      year?: number;
      inecElectionId?: string;
      lgaId?: string;
      wardId?: string;
      maxPUs?: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const body: Record<string, unknown> = {};
      if (data.uploadToR2 !== undefined) body.upload_to_r2 = data.uploadToR2;
      if (data.aiExtract !== undefined) body.ai_extract = data.aiExtract;
      if (data.force !== undefined) body.force = data.force;
      if (data.year !== undefined) body.year = data.year;
      if (data.inecElectionId) body.inec_election_id = data.inecElectionId;
      if (data.lgaId) body.lga_id = data.lgaId;
      if (data.wardId) body.ward_id = data.wardId;
      if (data.maxPUs !== undefined && data.maxPUs > 0)
        body.max_pus = data.maxPUs;

      return await apiFetchJson(
        API_URL.syncINECResultGrabber(data.id, data.uploadToR2, data.aiExtract),
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to sync INEC result grabber",
      };
    }
  });

export const controlledScrapeINEC = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      officeId: number | string;
      stateId?: number | string;
      year?: number;
      inecElectionId: string;
      lgaId?: string;
      wardId?: string;
      maxPUs?: number;
      uploadToR2?: boolean;
      aiExtract?: boolean;
      force?: boolean;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const body: Record<string, unknown> = {
        office_id: Number(data.officeId),
        inec_election_id: data.inecElectionId,
      };
      if (data.stateId) body.state_id = Number(data.stateId);
      if (data.year !== undefined) body.year = data.year;
      if (data.lgaId) body.lga_id = data.lgaId;
      if (data.wardId) body.ward_id = data.wardId;
      if (data.maxPUs !== undefined && data.maxPUs > 0)
        body.max_pus = data.maxPUs;
      if (data.uploadToR2 !== undefined) body.upload_to_r2 = data.uploadToR2;
      if (data.aiExtract !== undefined) body.ai_extract = data.aiExtract;
      if (data.force !== undefined) body.force = data.force;

      return await apiFetchJson(API_URL.controlledScrapeINEC, {
        method: "POST",
        body: JSON.stringify(body),
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to run controlled INEC scrape",
      };
    }
  });

export const syncINECMongoIDs = createServerFn({ method: "POST" })
  .inputValidator((data: { inecElectionId: string }) => data)
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(API_URL.syncINECMongoIDs, {
        method: "POST",
        body: JSON.stringify({ inec_election_id: data.inecElectionId }),
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to sync LGA and ward IDs",
      };
    }
  });

export const previewINECElections = createServerFn({ method: "GET" })
  .inputValidator((data: { id: number | string; year?: number }) => data)
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(
        API_URL.previewINECElections(data.id, data.year),
      );
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to preview INEC elections",
      };
    }
  });

export const discoverINECElections = createServerFn({ method: "GET" })
  .inputValidator(
    (data: {
      officeId: number | string;
      stateId?: number | string;
      year?: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(API_URL.discoverINECElections(data));
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to discover INEC elections",
      };
    }
  });

export const previewINECLGAs = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { inecElectionId: string; stateId?: number }) => data,
  )
  .handler(async ({ data }) => {
    try {
      return await apiFetchJson(
        API_URL.previewINECLGAs(data.inecElectionId, data.stateId),
      );
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to preview INEC LGAs",
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
