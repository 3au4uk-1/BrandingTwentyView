import { useQueryClient } from '@tanstack/react-query';
import { createClient } from 'graphql-sse';
import { useEffect } from 'react';

import { applyObjectRecordEvent } from './apply-object-record-event';
import {
  registerDealsBoardEventStreamQueries,
  unregisterDealsBoardEventStreamQueries,
} from './event-stream-api';
import { ON_EVENT_SUBSCRIPTION } from './on-event-subscription';
import { logDealsBoardSseError, logDealsBoardSseInfo } from './sse-log';
import { computeReconnectDelayMs, MAX_CONSECUTIVE_SSE_FAILURES } from './sse-reconnect';
import type { EventSubscriptionPayload } from './types';
import { getMetadataGraphqlUrl, resolveAccessToken } from './twenty-runtime';
import { createId } from '../utils/create-id';

/** In-place register retries while keeping the SSE session open (stream may not be in Redis yet). */
const MAX_REGISTER_ATTEMPTS = 16;
const REGISTER_RETRY_DELAY_MS = 250;
/** Kick register without waiting for graphql-sse connected/next (prod HAR: both silent). */
const REGISTER_KICK_DELAYS_MS = [0, 300, 1000, 2500] as const;

const extractSubscriptionPayload = (
  data: unknown,
): EventSubscriptionPayload | undefined => {
  if (!data || typeof data !== 'object') return undefined;
  return (data as { onEventSubscription?: EventSubscriptionPayload }).onEventSubscription;
};

const isStreamNotReadyError = (error: unknown): boolean =>
  error instanceof Error && error.message.includes('Event stream not ready');

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
      const streamId = activeStreamId;
      const shouldUnregister = didRegister && streamId;
      activeStreamId = null;
      didRegister = false;

      activeDispose?.();
      activeDispose = undefined;

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
      let registerInFlight = false;
      let registerAttempts = 0;
      let registerRetryTimer: ReturnType<typeof setTimeout> | undefined;
      const kickTimers: Array<ReturnType<typeof setTimeout>> = [];
      // Reuse the token from SSE headers — a second host refresh can hang and
      // block addQuery forever (FLEET HAR: open SSE, zero deals-board addQuery).
      let sessionToken: string | null = null;

      const resolveSessionToken = async (): Promise<string> => {
        if (sessionToken) return sessionToken;
        sessionToken = await resolveAccessToken();
        return sessionToken;
      };

      const sseClient = createClient({
        url: metadataUrl,
        retryAttempts: 0,
        credentials: 'include',
        headers: async () => ({
          Authorization: `Bearer ${await resolveSessionToken()}`,
        }),
      });

      const clearRegisterRetryTimer = () => {
        if (registerRetryTimer) {
          clearTimeout(registerRetryTimer);
          registerRetryTimer = undefined;
        }
      };

      const clearKickTimers = () => {
        for (const timer of kickTimers) clearTimeout(timer);
        kickTimers.length = 0;
      };

      const ensureQueryListeners = async (reason: string) => {
        if (
          disposed ||
          activeStreamId !== eventStreamId ||
          didRegister ||
          registerInFlight
        ) {
          return;
        }
        registerInFlight = true;
        logDealsBoardSseInfo('register', `attempt via ${reason} stream=${eventStreamId}`);
        try {
          // Prefer cached session token for the metadata mutation (same as SSE).
          await registerDealsBoardEventStreamQueries(eventStreamId, {
            token: await resolveSessionToken(),
          });
          if (disposed || activeStreamId !== eventStreamId) {
            void unregisterDealsBoardEventStreamQueries(eventStreamId).catch(() => undefined);
            return;
          }
          didRegister = true;
          consecutiveFailures = 0;
          registerAttempts = 0;
          logDealsBoardSseInfo('register', `ok stream=${eventStreamId}`);
        } catch (error) {
          logDealsBoardSseError('register', error);
          if (
            isStreamNotReadyError(error) &&
            registerAttempts < MAX_REGISTER_ATTEMPTS &&
            !disposed &&
            activeStreamId === eventStreamId
          ) {
            registerAttempts += 1;
            clearRegisterRetryTimer();
            registerRetryTimer = setTimeout(() => {
              void ensureQueryListeners(`retry-${registerAttempts}`);
            }, REGISTER_RETRY_DELAY_MS);
            return;
          }
          consecutiveFailures += 1;
          teardownActive();
          scheduleRestart();
        } finally {
          registerInFlight = false;
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

      const onSubscriptionNext = (data: unknown) => {
        if (disposed || activeStreamId !== eventStreamId) return;
        void ensureQueryListeners('subscription-next');
        handleSubscriptionPayload(extractSubscriptionPayload(data));
      };

      const disposeSubscription = sseClient.subscribe(
        {
          query: ON_EVENT_SUBSCRIPTION,
          variables: { eventStreamId },
        },
        {
          next: (result) => {
            onSubscriptionNext(result.data);
          },
          error: (error) => {
            if (disposed || activeStreamId !== eventStreamId) return;
            logDealsBoardSseError('subscribe', error);
            consecutiveFailures += 1;
            teardownActive();
            scheduleRestart();
          },
          complete: () => {
            if (disposed || activeStreamId !== eventStreamId) return;
            consecutiveFailures += 1;
            teardownActive();
            scheduleRestart();
          },
        },
        {
          connected: () => {
            if (disposed || activeStreamId !== eventStreamId) return;
            void ensureQueryListeners('sse-connected');
          },
          message: ({ data, event }) => {
            if (event !== 'next') return;
            onSubscriptionNext(data);
          },
        },
      );

      // Prod FLEET HAR (2026-08-07): board OnEventSubscription stayed open ~228s with
      // zero deals-board addQuery — graphql-sse connected/next never drove register.
      // Kick register on timers so Redis listeners are attached even when the SSE
      // client stays silent after HTTP headers.
      for (const delayMs of REGISTER_KICK_DELAYS_MS) {
        kickTimers.push(
          setTimeout(() => {
            void ensureQueryListeners(`timer-${delayMs}ms`);
          }, delayMs),
        );
      }

      activeDispose = () => {
        clearRegisterRetryTimer();
        clearKickTimers();
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
