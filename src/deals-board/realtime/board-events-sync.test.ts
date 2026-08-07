import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { createBoardEventsSync } from './board-events-sync';

const flush = () => new Promise((resolve) => setTimeout(resolve, 5));

const opportunityEvent = (recordId: string) => ({
  action: 'UPDATED' as const,
  objectNameSingular: 'opportunity',
  recordId,
  properties: { updatedFields: ['stage'], diff: { stage: { before: 'A', after: 'B' } } },
});

const createHarness = (responses: unknown[]) => {
  const queryClient = new QueryClient();
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  const calls: Array<{ since?: number; epoch?: string }> = [];
  let index = 0;

  const fetchEvents = vi.fn(async ({ since, epoch }: { since?: number; epoch?: string }) => {
    calls.push({ since, epoch });
    const next = responses[Math.min(index, responses.length - 1)];
    index += 1;
    if (next instanceof Error) throw next;
    return next as never;
  });

  const sync = createBoardEventsSync({
    queryClient,
    fetchEvents,
    computeDelayMs: () => 1,
    logError: () => {},
    logInfo: () => {},
  });

  return { sync, fetchEvents, calls, invalidateSpy, queryClient };
};

describe('createBoardEventsSync', () => {
  it('carries the cursor and epoch into the next poll', async () => {
    const harness = createHarness([
      { epoch: 'e1', cursor: 5, events: [] },
      { epoch: 'e1', cursor: 5, events: [] },
    ]);

    harness.sync.start();
    await flush();
    harness.sync.stop();

    expect(harness.calls[0]).toEqual({ since: undefined, epoch: undefined });
    expect(harness.calls[1]).toEqual({ since: 5, epoch: 'e1' });
  });

  it('applies received events to the cache', async () => {
    const harness = createHarness([
      { epoch: 'e1', cursor: 1, events: [opportunityEvent('opp-1')] },
      { epoch: 'e1', cursor: 1, events: [] },
    ]);

    harness.sync.start();
    await flush();
    harness.sync.stop();

    expect(harness.invalidateSpy).toHaveBeenCalledWith({ queryKey: ['opportunities'] });
  });

  it('invalidates every registry key on reset', async () => {
    const harness = createHarness([
      { epoch: 'e2', cursor: 12, reset: true, events: [] },
      { epoch: 'e2', cursor: 12, events: [] },
    ]);

    harness.sync.start();
    await flush();
    harness.sync.stop();

    expect(harness.invalidateSpy).toHaveBeenCalledWith({ queryKey: ['lineItems'] });
    expect(harness.invalidateSpy).toHaveBeenCalledWith({ queryKey: ['okleyka-salary'] });
    expect(harness.invalidateSpy).toHaveBeenCalledWith({ queryKey: ['companyNames'] });
  });

  it('keeps retrying after failures instead of giving up', async () => {
    vi.useFakeTimers();
    const harness = createHarness([
      new Error('boom'),
      new Error('boom'),
      new Error('boom'),
      new Error('boom'),
      new Error('boom'),
      new Error('boom'),
      new Error('boom'),
    ]);

    harness.sync.start();
    await vi.advanceTimersByTimeAsync(20);
    harness.sync.stop();
    vi.useRealTimers();

    expect(harness.fetchEvents.mock.calls.length).toBeGreaterThan(5);
  });

  it('stops permanently when the server reports the feature disabled', async () => {
    const harness = createHarness([{ disabled: true }]);

    harness.sync.start();
    await flush();
    harness.sync.stop();

    expect(harness.fetchEvents).toHaveBeenCalledTimes(1);
  });

  it('does not poll again after stop', async () => {
    const harness = createHarness([{ epoch: 'e1', cursor: 1, events: [] }]);

    harness.sync.start();
    await flush();
    const callsBeforeStop = harness.fetchEvents.mock.calls.length;
    harness.sync.stop();
    await flush();

    expect(harness.fetchEvents.mock.calls.length).toBe(callsBeforeStop);
  });
});
