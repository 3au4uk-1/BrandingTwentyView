import { useQueryClient } from '@tanstack/react-query';
import { createClient } from 'graphql-sse';
import { useEffect } from 'react';

import { applyObjectRecordEvent } from './apply-object-record-event';
import {
  registerDealsBoardEventStreamQueries,
  unregisterDealsBoardEventStreamQueries,
} from './event-stream-api';
import { ON_EVENT_SUBSCRIPTION } from './on-event-subscription';
import { logDealsBoardSseError } from './sse-log';
import { computeReconnectDelayMs, MAX_CONSECUTIVE_SSE_FAILURES } from './sse-reconnect';
import type { EventSubscriptionPayload } from './types';
import { getMetadataGraphqlUrl, resolveAccessToken } from './twenty-runtime';
import { createId } from '../utils/create-id';

const extractSubscriptionPayload = (
  data: unknown,
): EventSubscriptionPayload | undefined => {
  if (!data || typeof data !== 'object') return undefined;
  return (data as { onEventSubscription?: EventSubscriptionPayload }).onEventSubscription;
};

export const useDealsBoardRealtimeSync = (enabled = true): void => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    let disposed = false;
    let consecutiveFailures = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let activeDispose: (() => void) | undefined;
    let activeStreamId: string | null = null;
    let didRegister = false;

    const metadataUrl = getMetadataGraphqlUrl();

    const clearReconnectTimer = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = undefined;
      }
    };

    const teardownActive = () => {
      activeDispose?.();
      activeDispose = undefined;
      const streamId = activeStreamId;
      const shouldUnregister = didRegister && streamId;
      activeStreamId = null;
      didRegister = false;
      if (shouldUnregister && streamId) {
        void unregisterDealsBoardEventStreamQueries(streamId).catch((error) => {
          logDealsBoardSseError('register', error);
        });
      }
    };

    const scheduleRestart = () => {
      if (disposed) return;
      if (consecutiveFailures >= MAX_CONSECUTIVE_SSE_FAILURES) {
        logDealsBoardSseError(
          'subscribe',
          new Error(`paused after ${MAX_CONSECUTIVE_SSE_FAILURES} consecutive failures`),
        );
        return;
      }
      const delay = computeReconnectDelayMs(consecutiveFailures);
      clearReconnectTimer();
      reconnectTimer = setTimeout(() => {
        startSession();
      }, delay);
    };

    const startSession = () => {
      if (disposed) return;
      teardownActive();

      const eventStreamId = createId();
      activeStreamId = eventStreamId;
      didRegister = false;

      const sseClient = createClient({
        url: metadataUrl,
        retryAttempts: 0,
        headers: async () => ({
          Authorization: `Bearer ${await resolveAccessToken()}`,
        }),
      });

      const ensureQueryListeners = async () => {
        if (disposed || activeStreamId !== eventStreamId || didRegister) return;
        try {
          await registerDealsBoardEventStreamQueries(eventStreamId);
          if (disposed || activeStreamId !== eventStreamId) {
            void unregisterDealsBoardEventStreamQueries(eventStreamId).catch(() => undefined);
            return;
          }
          didRegister = true;
          consecutiveFailures = 0;
        } catch (error) {
          logDealsBoardSseError('register', error);
          consecutiveFailures += 1;
          teardownActive();
          scheduleRestart();
        }
      };

      const handleSubscriptionPayload = (payload: EventSubscriptionPayload | undefined) => {
        if (!payload || disposed || activeStreamId !== eventStreamId) return;
        try {
          for (const item of payload.objectRecordEventsWithQueryIds ?? []) {
            applyObjectRecordEvent(queryClient, item.objectRecordEvent);
          }
        } catch (error) {
          logDealsBoardSseError('apply', error);
        }
      };

      const disposeSubscription = sseClient.subscribe(
        {
          query: ON_EVENT_SUBSCRIPTION,
          variables: { eventStreamId },
        },
        {
          next: (result) => {
            handleSubscriptionPayload(extractSubscriptionPayload(result.data));
          },
          error: (error) => {
            logDealsBoardSseError('subscribe', error);
            consecutiveFailures += 1;
            teardownActive();
            scheduleRestart();
          },
          complete: () => {
            if (disposed) return;
            consecutiveFailures += 1;
            teardownActive();
            scheduleRestart();
          },
        },
        {
          connected: () => {
            void ensureQueryListeners();
          },
          message: ({ data, event }) => {
            if (event !== 'next') return;
            handleSubscriptionPayload(extractSubscriptionPayload(data));
          },
        },
      );

      const fallbackRegisterTimer = setTimeout(() => {
        void ensureQueryListeners();
      }, 0);

      activeDispose = () => {
        clearTimeout(fallbackRegisterTimer);
        disposeSubscription();
        sseClient.dispose();
      };
    };

    startSession();

    return () => {
      disposed = true;
      clearReconnectTimer();
      teardownActive();
    };
  }, [enabled, queryClient]);
};
