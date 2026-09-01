import Pusher from "pusher-js";
import type { Options } from "pusher-js";

export const PUSHER_EVENTS = {
  RESULTS_UPDATED: "results-updated",
  PU_RESULT_UPLOADED: "pu-result-uploaded",
} as const;

export interface ResultsUpdatedEventPayload {
  election_id: number;
  scope: string;
  state_id?: number;
  lga_id?: number;
  ward_id?: number;
  state_constituency_id?: number;
  federal_constituency_id?: number;
  senatorial_district_id?: number;
  timestamp: string;
}

export interface PUResultUploadedEventPayload {
  election_id: number;
  polling_unit_id: number;
  ward_id: number;
  lga_id: number;
  state_id: number;
  valid_votes: number;
  timestamp: string;
}

// Channel generator helpers
export const getElectionChannel = (electionId: number | string): string =>
  `election-${electionId}`;

export const getElectionStateChannel = (
  electionId: number | string,
  stateId: number | string,
): string => `election-${electionId}-state-${stateId}`;

export const getElectionLGAChannel = (
  electionId: number | string,
  lgaId: number | string,
): string => `election-${electionId}-lga-${lgaId}`;

export const getElectionWardChannel = (
  electionId: number | string,
  wardId: number | string,
): string => `election-${electionId}-ward-${wardId}`;

export const getElectionPUChannel = (
  electionId: number | string,
  puId: number | string,
): string => `election-${electionId}-pu-${puId}`;

export const getElectionStateConstituencyChannel = (
  electionId: number | string,
  scId: number | string,
): string => `election-${electionId}-sc-${scId}`;

export const getElectionFederalConstituencyChannel = (
  electionId: number | string,
  fcId: number | string,
): string => `election-${electionId}-fc-${fcId}`;

export const getElectionSenatorialDistrictChannel = (
  electionId: number | string,
  sdId: number | string,
): string => `election-${electionId}-sd-${sdId}`;

export interface PusherClientConfig {
  key?: string;
  cluster?: string;
  wsHost?: string;
  wsPort?: number;
  wssPort?: number;
  forceTLS?: boolean;
  enabledTransports?: ("ws" | "wss")[];
}

let pusherInstance: InstanceType<typeof Pusher> | null = null;
let currentConfigKey = "";

function getFallbackEnv(name: string): string | undefined {
  if (typeof process !== "undefined" && process?.env) {
    return (
      process.env[name] ||
      process.env[`VITE_${name}`] ||
      process.env[`NEXT_PUBLIC_${name}`]
    );
  }
  const g = typeof globalThis !== "undefined" ? (globalThis as any) : undefined;
  if (g) {
    const envObj = g.__ENV__ || g.env || g.process?.env;
    if (envObj) {
      return (
        envObj[name] ||
        envObj[`VITE_${name}`] ||
        envObj[`NEXT_PUBLIC_${name}`]
      );
    }
  }
  return undefined;
}

/**
 * Returns a cached singleton Pusher client instance based on environment or custom configuration.
 * Supports both hosted Pusher.com and self-hosted Soketi / Centrifugo servers.
 */
export function getPusherClient(
  customConfig?: PusherClientConfig,
): InstanceType<typeof Pusher> | null {
  if (typeof window === "undefined") {
    return null;
  }

  const envKey = getFallbackEnv("PUSHER_KEY");
  const envCluster = getFallbackEnv("PUSHER_CLUSTER");
  const envHost = getFallbackEnv("PUSHER_HOST");
  const envPort = getFallbackEnv("PUSHER_PORT");
  const envTls = getFallbackEnv("PUSHER_TLS");

  const key = customConfig?.key || envKey || "";
  const cluster = customConfig?.cluster || envCluster || "eu";
  const wsHost = customConfig?.wsHost || envHost || undefined;
  const port =
    customConfig?.wsPort || (envPort ? parseInt(envPort, 10) : undefined);
  const forceTLS =
    customConfig?.forceTLS !== undefined
      ? customConfig.forceTLS
      : envTls !== "false";

  if (!key) {
    console.warn(
      "[Pusher] No PUSHER_KEY provided. Real-time updates are inactive.",
    );
    return null;
  }

  const configSignature = `${key}:${cluster}:${wsHost || ""}:${port || ""}:${forceTLS}`;
  if (pusherInstance && currentConfigKey === configSignature) {
    return pusherInstance;
  }

  if (pusherInstance) {
    pusherInstance.disconnect();
    pusherInstance = null;
  }

  const options: Options = {
    cluster,
    forceTLS,
  };

  if (wsHost) {
    options.wsHost = wsHost;
    if (port) {
      if (forceTLS) {
        options.wssPort = port;
      } else {
        options.wsPort = port;
      }
    }
    options.enabledTransports = ["ws", "wss"];
    options.disableStats = true;
  }

  pusherInstance = new Pusher(key, options);
  currentConfigKey = configSignature;

  console.info(
    `[Pusher] Initialized client (cluster: ${cluster}${wsHost ? `, host: ${wsHost}` : ""})`,
  );

  return pusherInstance;
}
