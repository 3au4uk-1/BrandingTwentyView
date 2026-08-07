import type { QueryClient } from '@tanstack/react-query';

import type { BoardEventsResponse, FetchBoardEventsParams } from '../api/board-events';
import { fetchBoardEvents } from '../api/board-events';

import { applyObjectRecordEvent } from './apply-object-record-event';
import {
  logDealsBoardEventsError,
  logDealsBoardEventsInfo,
  type DealsBoardEventsStage,
} from './board-events-log';
import { computeBackoffDelayMs } from './poll-backoff';
import { ALL_WATCHED_QUERY_KEYS } from './query-key-registry';

type CreateBoardEventsSyncParams = {
  queryClient: QueryClient;
  fetchEvents?: (params: FetchBoardEventsParams) => Promise<BoardEventsResponse>;
  computeDelayMs?: (consecutiveFailures: number) => number;
  logError?: (stage: DealsBoardEventsStage, error: unknown) => void;
  logInfo?: (stage: DealsBoardEventsStage, detail: string) => void;
};

export const createBoardEventsSync = ({
  queryClient,
  fetchEvents = fetchBoardEvents,
  computeDelayMs = computeBackoffDelayMs,
  logError = logDealsBoardEventsError,
  logInfo = logDealsBoardEventsInfo,
}: CreateBoardEventsSyncParams) => {
  let disposed = false;
  let disabled = false;
  let cursor: number | undefined;
  let epoch: string | undefined;
  let consecutiveFailures = 0;
  let controller: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const invalidateEverything = (): void => {
    for (const queryKey of ALL_WATCHED_QUERY_KEYS) {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    }
  };

  const applyResponse = (response: BoardEventsResponse): void => {
    if (response.reset === true) invalidateEverything();

    for (const event of response.events ?? []) {
      applyObjectRecordEvent(queryClient, event);
    }

    if (typeof response.cursor === 'number') cursor = response.cursor;
    if (typeof response.epoch === 'string') epoch = response.epoch;
  };

  const schedule = (delayMs: number): void => {
    timer = setTimeout(() => {
      void poll();
    }, delayMs);
  };

  const poll = async (): Promise<void> => {
    if (disposed || disabled) return;

    controller = new AbortController();

    try {
      const response = await fetchEvents({ since: cursor, epoch, signal: controller.signal });
      if (disposed) return;

      if (response.disabled === true) {
        disabled = true;
        logInfo('poll', 'realtime disabled by server');
        return;
      }

      applyResponse(response);
      consecutiveFailures = 0;
      schedule(0);
    } catch (error) {
      if (disposed) return;

      consecutiveFailures += 1;
      // Log once per outage: the loop never gives up, so repeated logs would flood the console.
      if (consecutiveFailures === 1) logError('poll', error);
      schedule(computeDelayMs(consecutiveFailures));
    }
  };

  return {
    start(): void {
      void poll();
    },
    stop(): void {
      disposed = true;
      controller?.abort();
      if (timer !== undefined) clearTimeout(timer);
    },
  };
};
