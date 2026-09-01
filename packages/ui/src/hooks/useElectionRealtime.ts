import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import {
  getPusherClient,
  getElectionChannel,
  getElectionStateChannel,
  getElectionLGAChannel,
  getElectionWardChannel,
  getElectionPUChannel,
  getElectionStateConstituencyChannel,
  getElectionFederalConstituencyChannel,
  getElectionSenatorialDistrictChannel,
  PUSHER_EVENTS,
  type PusherClientConfig,
  type ResultsUpdatedEventPayload,
  type PUResultUploadedEventPayload,
} from "../lib/pusher";

export interface UseElectionRealtimeOptions {
  /** The target election ID to monitor */
  electionId?: number | string | null;

  /** Geographic and administrative scopes */
  stateId?: number | string | null;
  lgaId?: number | string | null;
  wardId?: number | string | null;
  pollingUnitId?: number | string | null;
  stateConstituencyId?: number | string | null;
  federalConstituencyId?: number | string | null;
  senatorialDistrictId?: number | string | null;

  /** Optional custom Pusher client configuration */
  clientConfig?: PusherClientConfig;

  /** Whether real-time subscription is enabled. Defaults to true. */
  enabled?: boolean;

  /** Callback fired when rollup results are updated */
  onResultsUpdated?: (event: ResultsUpdatedEventPayload) => void;

  /** Callback fired when a polling unit result is uploaded */
  onPUResultUploaded?: (event: PUResultUploadedEventPayload) => void;

  /**
   * Whether to automatically invalidate active TanStack Query cache on updates.
   * Defaults to true.
   */
  autoInvalidate?: boolean;

  /**
   * Additional custom query key prefixes to invalidate on update.
   */
  customQueryKeys?: (string | number)[][];
}

/**
 * Enterprise-grade hook that subscribes to hierarchical Pusher election channels
 * and automatically triggers TanStack Query invalidation and custom callbacks.
 */
export function useElectionRealtime(options: UseElectionRealtimeOptions) {
  const {
    electionId,
    stateId,
    lgaId,
    wardId,
    pollingUnitId,
    stateConstituencyId,
    federalConstituencyId,
    senatorialDistrictId,
    clientConfig,
    enabled = true,
    autoInvalidate = true,
    onResultsUpdated,
    onPUResultUploaded,
    customQueryKeys,
  } = options;

  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = React.useState<boolean>(false);

  // Stable references for callbacks to avoid re-subscribing on every render
  const onResultsUpdatedRef = React.useRef(onResultsUpdated);
  const onPUResultUploadedRef = React.useRef(onPUResultUploaded);
  const queryClientRef = React.useRef(queryClient);

  React.useEffect(() => {
    onResultsUpdatedRef.current = onResultsUpdated;
    onPUResultUploadedRef.current = onPUResultUploaded;
    queryClientRef.current = queryClient;
  });

  React.useEffect(() => {
    if (!enabled || !electionId) {
      return;
    }

    const pusher = getPusherClient(clientConfig);
    if (!pusher) {
      return;
    }

    const updateConnectionState = () => {
      const connected = pusher.connection.state === "connected";
      setIsConnected(connected);
      console.info(`[Pusher] Connection state: ${pusher.connection.state}`);
    };

    pusher.connection.bind("state_change", updateConnectionState);
    updateConnectionState();

    // Determine target channels for this subscription scope
    const channelNames: string[] = [getElectionChannel(electionId)];

    if (stateId) {
      channelNames.push(getElectionStateChannel(electionId, stateId));
    }
    if (lgaId) {
      channelNames.push(getElectionLGAChannel(electionId, lgaId));
    }
    if (wardId) {
      channelNames.push(getElectionWardChannel(electionId, wardId));
    }
    if (pollingUnitId) {
      channelNames.push(getElectionPUChannel(electionId, pollingUnitId));
    }
    if (stateConstituencyId) {
      channelNames.push(
        getElectionStateConstituencyChannel(electionId, stateConstituencyId),
      );
    }
    if (federalConstituencyId) {
      channelNames.push(
        getElectionFederalConstituencyChannel(electionId, federalConstituencyId),
      );
    }
    if (senatorialDistrictId) {
      channelNames.push(
        getElectionSenatorialDistrictChannel(electionId, senatorialDistrictId),
      );
    }

    console.info(
      `[Pusher] Subscribing to election channels for election ${electionId}:`,
      channelNames,
    );

    const handleResultsUpdated = (data: ResultsUpdatedEventPayload) => {
      console.info(
        `[Pusher] Received '${PUSHER_EVENTS.RESULTS_UPDATED}' event for election ${data.election_id} (scope: ${data.scope})`,
        data,
      );

      if (autoInvalidate) {
        // Explicitly invalidate core query keys to trigger live re-renders
        queryClientRef.current.invalidateQueries({
          queryKey: ["election-scoped-final-result"],
        });
        queryClientRef.current.invalidateQueries({
          queryKey: ["election-stats"],
        });
        queryClientRef.current.invalidateQueries({
          queryKey: ["election-candidates"],
        });
        queryClientRef.current.invalidateQueries({
          queryKey: ["polling-unit-final-results"],
        });
        queryClientRef.current.invalidateQueries({
          queryKey: ["election-group-stats"],
        });

        // Also run predicate check for any other related queries
        queryClientRef.current.invalidateQueries({
          predicate: (query) => {
            const firstKey = query.queryKey[0];
            return (
              typeof firstKey === "string" &&
              (firstKey.includes("final-result") ||
                firstKey.includes("election") ||
                firstKey.includes("leaderboard") ||
                firstKey.includes("stats"))
            );
          },
        });

        // Invalidate any custom query keys requested
        if (customQueryKeys && customQueryKeys.length > 0) {
          for (const key of customQueryKeys) {
            queryClientRef.current.invalidateQueries({ queryKey: key });
          }
        }
      }

      if (onResultsUpdatedRef.current) {
        onResultsUpdatedRef.current(data);
      }
    };

    const handlePUResultUploaded = (data: PUResultUploadedEventPayload) => {
      console.info(
        `[Pusher] Received '${PUSHER_EVENTS.PU_RESULT_UPLOADED}' for PU ${data.polling_unit_id}`,
        data,
      );

      if (autoInvalidate) {
        queryClientRef.current.invalidateQueries({
          queryKey: ["polling-unit-final-results"],
        });
        queryClientRef.current.invalidateQueries({
          queryKey: ["polling-unit-updates"],
        });
        queryClientRef.current.invalidateQueries({
          predicate: (query) => {
            const firstKey = query.queryKey[0];
            return (
              typeof firstKey === "string" &&
              (firstKey.includes("polling-unit") ||
                firstKey.includes("update") ||
                firstKey.includes("final-result"))
            );
          },
        });
      }

      if (onPUResultUploadedRef.current) {
        onPUResultUploadedRef.current(data);
      }
    };

    const subscribedChannels = channelNames.map((name) => {
      const channel = pusher.subscribe(name);
      channel.bind(PUSHER_EVENTS.RESULTS_UPDATED, handleResultsUpdated);
      channel.bind(PUSHER_EVENTS.PU_RESULT_UPLOADED, handlePUResultUploaded);
      return { name, channel };
    });

    return () => {
      console.info("[Pusher] Cleaning up subscriptions for:", channelNames);
      pusher.connection.unbind("state_change", updateConnectionState);
      for (const { name, channel } of subscribedChannels) {
        channel.unbind(PUSHER_EVENTS.RESULTS_UPDATED, handleResultsUpdated);
        channel.unbind(PUSHER_EVENTS.PU_RESULT_UPLOADED, handlePUResultUploaded);
        pusher.unsubscribe(name);
      }
    };
  }, [
    electionId,
    stateId,
    lgaId,
    wardId,
    pollingUnitId,
    stateConstituencyId,
    federalConstituencyId,
    senatorialDistrictId,
    enabled,
    autoInvalidate,
    customQueryKeys,
  ]);

  return { isConnected };
}
