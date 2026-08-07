# Deals Board Realtime SSE Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore near-instant (1–2s) cross-client deals-board updates by fixing Twenty metadata SSE registration lifecycle and hardening event apply / mobile cache merge — without adding a new transport.

**Architecture:** Keep `graphql-sse` → `/metadata` `OnEventSubscription` + `addQueryToEventStream` for `opportunity` / `dealLineItem`. Register listeners on SSE `connected` (not after first data `next`), reconnect with backoff and a fresh `eventStreamId`, derive patches from `after` or `diff`, and merge mobile `accumulatedRecords` by id. Hybrid poll is out of scope unless diagnosis proves SSE still dead after this work.

**Tech Stack:** React 19, `@tanstack/react-query` v5, `graphql-sse` ^2.6, Vitest, Twenty metadata GraphQL event streams.

**Spec:** `docs/superpowers/specs/2026-08-07-deals-board-realtime-sse-hardening-design.md`

## Global Constraints

- Watched objects only: `opportunity`, `dealLineItem` (see `DEALS_BOARD_SSE_QUERY_IDS`)
- Patch-first on successful apply — do **not** invalidate `deals-board-page` when a cache patch succeeds (perf `1a42ad4`)
- No live UI badge; no Notes/activity subscriptions; no hybrid poll implementation in this plan
- Structured logs must use prefix `Deals Board SSE:` and stage `subscribe` | `register` | `apply`
- TDD for pure helpers; hook changes verified by unit-tested helpers + manual two-browser QA
- Use `yarn test:unit` (or `corepack yarn test:unit` on Windows if needed)
- Do not invent Twenty warehouse field UUIDs; do not bump app version unless a separate release task asks
- Every task’s requirements implicitly include this section

---

## File structure

| File | Responsibility |
|------|----------------|
| `src/deals-board/realtime/resolve-event-patch.ts` | Pure: build patch from `properties.after` or `properties.diff` |
| `src/deals-board/realtime/resolve-event-patch.test.ts` | Unit tests for after / diff / empty |
| `src/deals-board/realtime/apply-object-record-event.ts` | Use `resolveEventPatch`; keep invalidate-on-miss |
| `src/deals-board/realtime/apply-object-record-event.test.ts` | Cover diff patch + `deals-board-page` root patch |
| `src/deals-board/utils/merge-accumulated-records.ts` | Pure: update existing ids + append new; optional max length |
| `src/deals-board/utils/merge-accumulated-records.test.ts` | Unit tests for merge behavior |
| `src/deals-board/DealsBoard.tsx` | Use merge helper in accumulated-records effect |
| `src/deals-board/realtime/sse-log.ts` | `logDealsBoardSseError(stage, error)` |
| `src/deals-board/realtime/sse-reconnect.ts` | `computeReconnectDelayMs`, failure cap constants |
| `src/deals-board/realtime/sse-reconnect.test.ts` | Backoff unit tests |
| `src/deals-board/realtime/useDealsBoardRealtimeSync.ts` | Register on `connected`, reconnect loop, stage-tagged logs |
| `docs/superpowers/notes/2026-08-07-deals-board-realtime-sse-diagnosis.md` | Task 0 diagnosis notes (create if findings recorded) |

---

### Task 0: Live diagnosis (manual, before code changes)

**Files:**
- Create (optional): `docs/superpowers/notes/2026-08-07-deals-board-realtime-sse-diagnosis.md`

**Interfaces:**
- Consumes: staging or local Twenty with two logged-in board sessions
- Produces: which failure mode (subscription / register / events / apply) is active — guides Task 4 emphasis

- [ ] **Step 1: Open two board sessions**

Use two browsers or two users on Реализация. Keep DevTools Network open on the observer.

- [ ] **Step 2: Check subscription**

Filter Network for `metadata` / EventStream / long-lived request. Confirm `OnEventSubscription` is open after board load.

- [ ] **Step 3: Check register mutations**

Look for `addQueryToEventStream` (or GraphQL operation name) after connect. Confirm responses indicate success for both opportunity and dealLineItem query ids (`deals-board-opportunities`, `deals-board-line-items`).

- [ ] **Step 4: Trigger a remote edit**

From the other session change a deal stage (or any opportunity field). On the observer: does a subscription `next` arrive with `objectRecordEventsWithQueryIds`?

- [ ] **Step 5: Record outcome**

Write a short note (chat or optional markdown file) with one of:
- A: no subscription
- B: subscription ok, register missing/failing
- C: events arrive, UI stale (apply/cache)
- D: unclear

- [ ] **Step 6: No commit required**

Proceed to Task 1. If outcome is C, Task 1–2 are highest priority; if A/B, Task 4 is highest priority — still implement all tasks.

---

### Task 1: `resolveEventPatch` helper (TDD)

**Files:**
- Create: `src/deals-board/realtime/resolve-event-patch.ts`
- Create: `src/deals-board/realtime/resolve-event-patch.test.ts`
- Modify: `src/deals-board/realtime/types.ts` (only if needed — prefer existing `ObjectRecordEventProperties`)

**Interfaces:**
- Consumes: `ObjectRecordEventProperties` from `./types`
- Produces: `resolveEventPatch(properties: ObjectRecordEventProperties): Record<string, unknown> | undefined`

- [ ] **Step 1: Write the failing tests**

Create `src/deals-board/realtime/resolve-event-patch.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import { resolveEventPatch } from './resolve-event-patch';

describe('resolveEventPatch', () => {
  it('prefers non-empty after', () => {
    expect(
      resolveEventPatch({
        after: { stage: 'WON' },
        diff: { stage: 'LOST' },
      }),
    ).toEqual({ stage: 'WON' });
  });

  it('returns undefined for empty after and no diff', () => {
    expect(resolveEventPatch({ after: {} })).toBeUndefined();
    expect(resolveEventPatch({})).toBeUndefined();
  });

  it('builds patch from flat diff values when after is missing', () => {
    expect(resolveEventPatch({ diff: { stage: 'DONE', name: 'X' } })).toEqual({
      stage: 'DONE',
      name: 'X',
    });
  });

  it('unwraps diff entries shaped as { after }', () => {
    expect(
      resolveEventPatch({
        diff: {
          stage: { before: 'NEW', after: 'WON' },
          comment: { after: 'hi' },
        },
      }),
    ).toEqual({ stage: 'WON', comment: 'hi' });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn test:unit src/deals-board/realtime/resolve-event-patch.test.ts`

Expected: FAIL (module / export not found)

- [ ] **Step 3: Implement `resolveEventPatch`**

Create `src/deals-board/realtime/resolve-event-patch.ts`:

```typescript
import type { ObjectRecordEventProperties } from './types';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const resolveEventPatch = (
  properties: ObjectRecordEventProperties,
): Record<string, unknown> | undefined => {
  if (isPlainObject(properties.after) && Object.keys(properties.after).length > 0) {
    return properties.after;
  }

  if (!isPlainObject(properties.diff)) return undefined;

  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties.diff)) {
    if (isPlainObject(value) && 'after' in value) {
      patch[key] = value.after;
      continue;
    }
    patch[key] = value;
  }

  return Object.keys(patch).length > 0 ? patch : undefined;
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn test:unit src/deals-board/realtime/resolve-event-patch.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/realtime/resolve-event-patch.ts src/deals-board/realtime/resolve-event-patch.test.ts
git commit -m "feat(deals-board): resolve SSE record patches from after or diff"
```

---

### Task 2: Wire patch helper into `applyObjectRecordEvent`

**Files:**
- Modify: `src/deals-board/realtime/apply-object-record-event.ts`
- Modify: `src/deals-board/realtime/apply-object-record-event.test.ts`

**Interfaces:**
- Consumes: `resolveEventPatch` from Task 1; `patchOpportunityInCache` (already patches `opportunities` + `deals-board-page`)
- Produces: unchanged `applyObjectRecordEvent(queryClient, event): void` behavior + diff support

- [ ] **Step 1: Write failing tests for new apply behaviors**

Append to `src/deals-board/realtime/apply-object-record-event.test.ts`:

```typescript
  it('patches from diff when after is missing', () => {
    const queryClient = new QueryClient();
    const filters = {};
    const queryKey = opportunitiesQueryKey(undefined, filters, 0, [], [], false, {}, false, false);
    queryClient.setQueryData(queryKey, {
      records: [{ id: 'opp-1', name: 'Deal A', stage: 'NEW' } satisfies OpportunityRow],
      totalCount: 1,
    });

    applyObjectRecordEvent(
      queryClient,
      baseEvent({
        properties: { diff: { stage: { before: 'NEW', after: 'WON' } } },
      }),
    );

    expect(queryClient.getQueryData<{ records: OpportunityRow[] }>(queryKey)?.records[0]?.stage).toBe(
      'WON',
    );
  });

  it('patches deals-board-page root when opportunity is only there', () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const pageKey = ['deals-board-page', 'view-1'] as const;
    queryClient.setQueryData(pageKey, {
      records: [{ id: 'opp-1', name: 'Deal A', stage: 'NEW' } satisfies OpportunityRow],
      totalCount: 1,
    });

    applyObjectRecordEvent(
      queryClient,
      baseEvent({
        properties: { after: { stage: 'WON' } },
      }),
    );

    expect(
      queryClient.getQueryData<{ records: OpportunityRow[] }>(pageKey)?.records[0]?.stage,
    ).toBe('WON');
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
```

Keep the existing test that expects `invalidateSpy` not called on successful opportunity patch.

- [ ] **Step 2: Run tests to verify new ones fail**

Run: `yarn test:unit src/deals-board/realtime/apply-object-record-event.test.ts`

Expected: FAIL on diff / deals-board-page cases (diff case fails until wired)

- [ ] **Step 3: Update apply to use `resolveEventPatch`**

In `src/deals-board/realtime/apply-object-record-event.ts`, replace the `const patch = event.properties.after` / `canPatch` block with:

```typescript
  const patch = resolveEventPatch(event.properties);
  const canPatch =
    (event.action === 'UPDATED' || event.action === 'UPSERTED' || event.action === 'RESTORED') &&
    Boolean(patch);

  if (canPatch && patch) {
    const didPatch =
      event.objectNameSingular === 'opportunity'
        ? patchOpportunityInCache(queryClient, event.recordId, patch)
        : patchLineItemInCache(queryClient, event.recordId, patch);

    if (didPatch) {
      if (event.objectNameSingular === 'dealLineItem') {
        const opportunityId =
          typeof patch.opportunityId === 'string'
            ? patch.opportunityId
            : findLineItemOpportunityId(queryClient, event.recordId);

        if (opportunityId) {
          void syncDealStage(queryClient, opportunityId);
        }
      }

      return;
    }
  }

  invalidateObjectQueries(queryClient, event.objectNameSingular);
```

Add import:

```typescript
import { resolveEventPatch } from './resolve-event-patch';
```

Do **not** reintroduce `invalidateQueries({ queryKey: ['deals-board-page'] })` on successful patch.

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn test:unit src/deals-board/realtime/apply-object-record-event.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/realtime/apply-object-record-event.ts src/deals-board/realtime/apply-object-record-event.test.ts
git commit -m "fix(deals-board): apply SSE events from diff and aggregate page cache"
```

---

### Task 3: Merge accumulated mobile records by id

**Files:**
- Create: `src/deals-board/utils/merge-accumulated-records.ts`
- Create: `src/deals-board/utils/merge-accumulated-records.test.ts`
- Modify: `src/deals-board/DealsBoard.tsx` (accumulated-records `useEffect` ~625–645)

**Interfaces:**
- Consumes: `OpportunityRow` (or generic `{ id: string }`)
- Produces: `mergeAccumulatedRecords<T extends { id: string }>(prev, visible, options?: { maxLength?: number }): T[]`

- [ ] **Step 1: Write the failing tests**

Create `src/deals-board/utils/merge-accumulated-records.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import { mergeAccumulatedRecords } from './merge-accumulated-records';

describe('mergeAccumulatedRecords', () => {
  it('updates existing ids in place and appends new ones', () => {
    const prev = [
      { id: 'a', stage: 'NEW' },
      { id: 'b', stage: 'NEW' },
    ];
    const visible = [
      { id: 'b', stage: 'WON' },
      { id: 'c', stage: 'NEW' },
    ];

    expect(mergeAccumulatedRecords(prev, visible)).toEqual([
      { id: 'a', stage: 'NEW' },
      { id: 'b', stage: 'WON' },
      { id: 'c', stage: 'NEW' },
    ]);
  });

  it('replaces when prev is empty', () => {
    expect(mergeAccumulatedRecords([], [{ id: 'a', stage: 'NEW' }])).toEqual([
      { id: 'a', stage: 'NEW' },
    ]);
  });

  it('truncates to maxLength after merge', () => {
    const prev = [{ id: 'a' }, { id: 'b' }];
    const visible = [{ id: 'c' }];
    expect(mergeAccumulatedRecords(prev, visible, { maxLength: 2 })).toEqual([
      { id: 'a' },
      { id: 'b' },
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn test:unit src/deals-board/utils/merge-accumulated-records.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 3: Implement helper**

Create `src/deals-board/utils/merge-accumulated-records.ts`:

```typescript
export const mergeAccumulatedRecords = <T extends { id: string }>(
  prev: T[],
  visible: T[],
  options?: { maxLength?: number },
): T[] => {
  const visibleById = new Map(visible.map((record) => [record.id, record]));
  const seen = new Set<string>();
  const merged: T[] = [];

  for (const record of prev) {
    merged.push(visibleById.get(record.id) ?? record);
    seen.add(record.id);
  }

  for (const record of visible) {
    if (seen.has(record.id)) continue;
    merged.push(record);
    seen.add(record.id);
  }

  const maxLength = options?.maxLength;
  if (typeof maxLength === 'number' && merged.length > maxLength) {
    return merged.slice(0, maxLength);
  }

  return merged;
};
```

- [ ] **Step 4: Wire into `DealsBoard.tsx`**

Replace the `page > 0` branch body so it updates existing ids:

```typescript
  useEffect(() => {
    if (effectiveShowAll) {
      setAccumulatedRecords(visibleRecords);
      return;
    }
    if (page === 0) {
      setAccumulatedRecords(visibleRecords);
      return;
    }
    setAccumulatedRecords((prev) =>
      mergeAccumulatedRecords(prev, visibleRecords, {
        maxLength: mobileLayoutActive ? MOBILE_MAX_RECORDS : undefined,
      }),
    );
  }, [effectiveShowAll, mobileLayoutActive, page, visibleRecords]);
```

Import `mergeAccumulatedRecords` from `./utils/merge-accumulated-records`.

- [ ] **Step 5: Run unit tests**

Run: `yarn test:unit src/deals-board/utils/merge-accumulated-records.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/deals-board/utils/merge-accumulated-records.ts src/deals-board/utils/merge-accumulated-records.test.ts src/deals-board/DealsBoard.tsx
git commit -m "fix(deals-board): refresh accumulated mobile rows on realtime patches"
```

---

### Task 4: SSE lifecycle — register on connect + reconnect backoff

**Files:**
- Create: `src/deals-board/realtime/sse-log.ts`
- Create: `src/deals-board/realtime/sse-reconnect.ts`
- Create: `src/deals-board/realtime/sse-reconnect.test.ts`
- Modify: `src/deals-board/realtime/useDealsBoardRealtimeSync.ts`

**Interfaces:**
- Consumes: `registerDealsBoardEventStreamQueries` / `unregisterDealsBoardEventStreamQueries`, `applyObjectRecordEvent`, `createClient` from `graphql-sse`, `ON_EVENT_SUBSCRIPTION`
- Produces:
  - `logDealsBoardSseError(stage: 'subscribe' | 'register' | 'apply', error: unknown): void`
  - `computeReconnectDelayMs(consecutiveFailures: number): number`
  - `MAX_CONSECUTIVE_SSE_FAILURES` (export const `5`)
  - Updated hook: register on `connected`; full session restart with new `eventStreamId` after sink errors / register failures

- [ ] **Step 1: Write failing backoff tests**

Create `src/deals-board/realtime/sse-reconnect.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import { computeReconnectDelayMs, MAX_CONSECUTIVE_SSE_FAILURES } from './sse-reconnect';

describe('computeReconnectDelayMs', () => {
  it('uses 1s for the first failure', () => {
    expect(computeReconnectDelayMs(1)).toBe(1000);
  });

  it('doubles up to 30s', () => {
    expect(computeReconnectDelayMs(2)).toBe(2000);
    expect(computeReconnectDelayMs(3)).toBe(4000);
    expect(computeReconnectDelayMs(6)).toBe(30000);
  });

  it('exports a finite failure cap', () => {
    expect(MAX_CONSECUTIVE_SSE_FAILURES).toBe(5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn test:unit src/deals-board/realtime/sse-reconnect.test.ts`

Expected: FAIL

- [ ] **Step 3: Implement reconnect helpers + log helper**

Create `src/deals-board/realtime/sse-reconnect.ts`:

```typescript
export const MAX_CONSECUTIVE_SSE_FAILURES = 5;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;

export const computeReconnectDelayMs = (consecutiveFailures: number): number => {
  const attempt = Math.max(1, consecutiveFailures);
  const exp = Math.min(attempt - 1, 5);
  return Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** exp);
};
```

Create `src/deals-board/realtime/sse-log.ts`:

```typescript
export type DealsBoardSseStage = 'subscribe' | 'register' | 'apply';

export const logDealsBoardSseError = (stage: DealsBoardSseStage, error: unknown): void => {
  console.error(`Deals Board SSE: ${stage}`, error);
};
```

- [ ] **Step 4: Run backoff tests**

Run: `yarn test:unit src/deals-board/realtime/sse-reconnect.test.ts`

Expected: PASS

- [ ] **Step 5: Rewrite `useDealsBoardRealtimeSync` lifecycle**

Replace `src/deals-board/realtime/useDealsBoardRealtimeSync.ts` with this contract (keep imports tidy; this is the full intended body):

```typescript
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

      // Fallback if `connected` is delayed/missing: attempt register once shortly after subscribe.
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
```

Notes for the implementer:
- `retryAttempts: 0` disables graphql-sse internal retries so **we** own reconnect with a **new** `eventStreamId` (required by the spec).
- `resolveAccessToken` already refreshes via host API when env token is absent — headers run per connection attempt (401 path).
- `didRegister` makes register idempotent across `connected` + `setTimeout(0)` fallback.

- [ ] **Step 6: Run unit tests for helpers + apply**

Run: `yarn test:unit src/deals-board/realtime/`

Expected: PASS for resolve / apply / reconnect tests

- [ ] **Step 7: Commit**

```bash
git add src/deals-board/realtime/sse-log.ts src/deals-board/realtime/sse-reconnect.ts src/deals-board/realtime/sse-reconnect.test.ts src/deals-board/realtime/useDealsBoardRealtimeSync.ts
git commit -m "fix(deals-board): register SSE listeners on connect and reconnect with backoff"
```

---

### Task 5: Manual two-client verification + diagnosis note

**Files:**
- Create/update (optional): `docs/superpowers/notes/2026-08-07-deals-board-realtime-sse-diagnosis.md`

**Interfaces:**
- Consumes: synced board after Tasks 1–4 (`yarn twenty apply` if front-component sync required for your environment)
- Produces: pass/fail against success criteria; escalate to hybrid **only** if SSE still shows no events

- [ ] **Step 1: Sync front component if needed**

If testing against a Twenty host that loads published app assets: `yarn twenty apply` (or project-standard sync). For local docker app-dev, follow `.cursor/skills/twenty-crm-app/SKILL.md`.

- [ ] **Step 2: Two-browser QA checklist**

On observer board without F5:
1. Colleague changes opportunity stage → updates in ≤2s
2. Colleague changes line-item stage → updates in ≤2s
3. Colleague edits a text/comment **field on opportunity or line item** → updates in ≤2s
4. Network: subscription stays open; `addQueryToEventStream` succeeds after connect; events arrive on edit

- [ ] **Step 3: Decide escalation**

If F5 still required and diagnosis steps 1–3 from the spec still fail after this hardening → stop and open a follow-up for hybrid poll (do **not** implement poll in this plan).

If QA passes → note “SSE restored” in the optional diagnosis file or PR description.

- [ ] **Step 4: Commit note only if you created/updated the markdown file**

```bash
git add docs/superpowers/notes/2026-08-07-deals-board-realtime-sse-diagnosis.md
git commit -m "docs: record deals-board SSE diagnosis after hardening"
```

If no note file was written, skip commit.

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Diagnosis before/during fix | Task 0, Task 5 |
| Register without waiting for first data `next` | Task 4 (`connected` + fallback) |
| Reconnect + new stream id + backoff + failure cap | Task 4 |
| Stage-tagged `Deals Board SSE:` logs | Task 4 (`sse-log`) |
| Patch from `after` or `diff` | Tasks 1–2 |
| Patch `deals-board-page` + no invalidate on success | Task 2 |
| Mobile accumulated id refresh | Task 3 |
| Token refresh on reconnect | Task 4 (`headers` → `resolveAccessToken`) |
| Hybrid poll only as escalation | Task 5 decision; no poll code |
| Unit + manual tests | Tasks 1–5 |

## Placeholder / consistency check

- No TBD/TODO left in tasks.
- `resolveEventPatch` / `mergeAccumulatedRecords` / `computeReconnectDelayMs` / `logDealsBoardSseError` names are consistent across tasks.
- `retryAttempts: 0` is intentional so stream ids rotate on our schedule.
