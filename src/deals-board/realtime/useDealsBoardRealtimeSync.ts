import { useQueryClient } from '@tanstack/react-query';
import { createClient } from 'graphql-sse';
import { useEffect } from 'react';

import { applyObjectRecordEvent } from './apply-object-record-event';
import {
  registerDealsBoardEventStreamQueries,
  unregisterDealsBoardEventStreamQueries,
} from './event-stream-api';
import { ON_EVENT_SUBSCRIPTION } from './on-event-subscription';
import type { EventSubscriptionPayload } from './types';
import { getMetadataGraphqlUrl, resolveAccessToken } from './twenty-runtime';
import { createId } from '../utils/create-id';

const createEventStreamId = (): string => createId();

const extractSubscriptionPayload = (
  data: unknown,
): EventSubscriptionPayload | undefined => {
  if (!data || typeof data !== 'object') return undefined;

  const payload = (data as { onEventSubscription?: EventSubscriptionPayload }).onEventSubscription;
  return payload;
};

export const useDealsBoardRealtimeSync = (enabled = true): void => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    let disposed = false;
    let eventStreamId: string | null = null;
    let streamReady = false;
    let disposeSubscription: (() => void) | undefined;

    const metadataUrl = getMetadataGraphqlUrl();
    const sseClient = createClient({
      url: metadataUrl,
      headers: async () => ({
        Authorization: `Bearer ${await resolveAccessToken()}`,
      }),
    });

    const ensureQueryListeners = async (streamId: string) => {
      try {
        await registerDealsBoardEventStreamQueries(streamId);
      } catch (error) {
        console.error('Deals Board SSE: failed to register query listeners', error);
      }
    };

    const handleSubscriptionPayload = (payload: EventSubscriptionPayload | undefined) => {
      if (!payload || disposed) return;

      if (!streamReady) {
        streamReady = true;
        if (eventStreamId) {
          void ensureQueryListeners(eventStreamId);
        }
      }

      for (const item of payload.objectRecordEventsWithQueryIds ?? []) {
        applyObjectRecordEvent(queryClient, item.objectRecordEvent);
      }
    };

    eventStreamId = createEventStreamId();

    disposeSubscription = sseClient.subscribe(
      {
        query: ON_EVENT_SUBSCRIPTION,
        variables: { eventStreamId },
      },
      {
        next: (result) => {
          handleSubscriptionPayload(extractSubscriptionPayload(result.data));
        },
        error: (error) => {
          console.error('Deals Board SSE: subscription error', error);
        },
      },
      {
        message: ({ data, event }) => {
          if (event !== 'next') return;
          handleSubscriptionPayload(extractSubscriptionPayload(data));
        },
      },
    );

    return () => {
      disposed = true;
      disposeSubscription?.();
      sseClient.dispose();

      if (streamReady && eventStreamId) {
        void unregisterDealsBoardEventStreamQueries(eventStreamId).catch((error) => {
          console.error('Deals Board SSE: failed to unregister query listeners', error);
        });
      }
    };
  }, [enabled, queryClient]);
};
