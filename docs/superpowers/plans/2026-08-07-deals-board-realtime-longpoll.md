# Deals Board Realtime via Long-Poll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring remote changes to the «Реализация» board within 1–2 seconds by replacing the unusable SSE client with an event hub in crmparserv2 and a long-poll loop in the front component.

**Architecture:** A long-lived Twenty SSE consumer inside the crmparserv2 Express service writes record events into an in-memory journal with a monotonic cursor. The board polls `GET /api/twenty/events?since=&epoch=` through a thin Twenty logic function; the endpoint answers immediately when newer events exist and otherwise holds the request for up to 25 seconds. The client feeds received events into the existing `applyObjectRecordEvent` layer.

**Tech Stack:** Node 20 + Express 5 + Vitest + supertest (crmparserv2); TypeScript + twenty-sdk logic functions + React + @tanstack/react-query + Vitest (BrandingTwentyView).

**Spec:** `docs/superpowers/specs/2026-08-07-deals-board-realtime-longpoll-design.md`

## Global Constraints

- Two repositories are involved: `C:\Users\Василий\Documents\projects\crmparserv2` (tasks 1–6) and `C:\Users\Василий\Documents\projects\BrandingTwentyView` (tasks 7–10). Every task states its repo.
- crmparserv2 backend is ESM (`"type": "module"`): use `import`, always include the `.js` extension in relative imports.
- crmparserv2 has no vitest config; tests live in `backend/tests/*.test.js` and run with `npm test` from `backend/`.
- crmparserv2 logging convention: `console.log` / `console.warn` / `console.error` with a bracketed prefix. Use `[twenty-events]` for everything added here.
- crmparserv2 has no graceful shutdown anywhere; do not add process signal handlers. Background work is started from `start()` in `backend/src/index.js`.
- The journal is process-local. crmparserv2 must stay a single container (current `docker-compose.yml` has one `crmparser` service with no replicas).
- BrandingTwentyView unit tests run with `yarn test:unit` (config `vitest.unit.config.ts`). `yarn test` runs integration tests against a live Twenty and is not part of this plan.
- All new UUIDs must be valid UUID v4.
- Watched objects, identical on both sides: `opportunity`, `dealLineItem`, `okleykaDealShare`, `okleykaSalaryEntry`, `company`, `restorationTemplate`.
- Long-poll hold: 25 000 ms. Consumer watchdog: 60 000 ms. Consumer reconnect backoff: 500 ms doubling to a 5 000 ms cap. Client backoff: 1 000 ms doubling to a 30 000 ms cap, retried forever.
- `operationSignature` must be `{ objectNameSingular, variables: {} }`. This shape is verified against production: `addQueryToEventStream` returns `true` and events arrive. Do not switch to `metadataName` — that field is for metadata events, not record events.
- The consumer should reach Twenty in-network (`http://twenty-server:3000/metadata`) so the stream does not pass through Traefik. `TWENTY_EVENTS_METADATA_URL` exists for that; the fallback derives the URL from `TWENTY_API_URL`.
- Kill switch is server side: crmparserv2 env `TWENTY_EVENTS_ENABLED=false` makes the endpoint answer `200 { "disabled": true }`, and the client then stops polling for the session. This replaces the spec's idea of an application variable, because variable injection into the component sandbox is unverified while this path is plain env config.

---

### Task 1: Spike — can the crmparser API key subscribe? (repo: crmparserv2)

This task answers one question and changes no production code: does `onEventSubscription` deliver
events when authenticated with `TWENTY_API_TOKEN` (an `API_KEY` token)? The whole hub depends on
it. The equivalent probe already passed with an application token.

**Files:**
- Create: `backend/scripts/twenty-sse-probe.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing importable. Its only output is the recorded answer written into the plan
  checkbox below and reported to the user.

- [ ] **Step 1: Write the probe script**

```js
// backend/scripts/twenty-sse-probe.mjs
// Usage (from backend/): node scripts/twenty-sse-probe.mjs
// Answers one question: does the crmparser API key receive record events over SSE?
import crypto from 'node:crypto';

import { config } from '../src/config.js';

const metadataUrl = config.twentyApiUrl
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/(graphql|rest|metadata)$/, '') + '/metadata';
const token = config.twentyApiToken;

const SUBSCRIPTION = `
  subscription OnEventSubscription($eventStreamId: String!) {
    onEventSubscription(eventStreamId: $eventStreamId) {
      eventStreamId
      objectRecordEventsWithQueryIds {
        queryIds
        objectRecordEvent { action objectNameSingular recordId }
      }
    }
  }
`;

const log = (...args) => console.log(new Date().toISOString().slice(11, 23), ...args);

const post = (body, extraHeaders = {}) =>
  fetch(metadataUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });

const main = async () => {
  log('metadataUrl', metadataUrl, 'token?', Boolean(token));
  const eventStreamId = crypto.randomUUID();

  const stream = await post(
    { query: SUBSCRIPTION, variables: { eventStreamId } },
    { Accept: 'text/event-stream' },
  );
  log('SSE status', stream.status, stream.headers.get('content-type'));
  if (!stream.ok || !stream.body) {
    log('FAILED: stream did not open', await stream.text());
    process.exit(1);
  }

  void (async () => {
    const reader = stream.body.getReader();
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return log('SSE closed');
      const chunk = decoder.decode(value, { stream: true });
      if (chunk.trim() === ':') continue;
      log('SSE', chunk.replace(/\s+/g, ' ').slice(0, 500));
    }
  })();

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const add = await post({
    query:
      'mutation A($input: AddQuerySubscriptionInput!) { addQueryToEventStream(input: $input) }',
    variables: {
      input: {
        eventStreamId,
        queryId: 'probe-opportunity',
        operationSignature: { objectNameSingular: 'opportunity', variables: {} },
      },
    },
  });
  log('addQuery', add.status, await add.text());

  log('Now change any opportunity in the CRM UI. Waiting 60s for an event...');
  await new Promise((resolve) => setTimeout(resolve, 60_000));
  process.exit(0);
};

main().catch((error) => {
  log('FATAL', error);
  process.exit(1);
});
```

- [ ] **Step 2: Run the probe and change a record while it waits**

Run from `backend/`: `node scripts/twenty-sse-probe.mjs`

Expected on success: `SSE status 200 text/event-stream`, then
`addQuery 200 {"data":{"addQueryToEventStream":true}}`, then, after editing any deal in the CRM,
a line containing `"action":"UPDATED","objectNameSingular":"opportunity"`.

- [ ] **Step 3: Record the outcome and branch**

If events arrive: continue with Task 2 unchanged.

If the stream opens but no event ever arrives (or `addQueryToEventStream` is not `true`), STOP and
report to the user. The fallback is Twenty webhooks as the hub input: the journal, long-poll,
logic function and client stay exactly as planned, and only Task 5 is replaced by a webhook
receiver route that maps the webhook body to `{ action, objectNameSingular, recordId, properties }`
before `journal.append(...)`. Do not start that fallback without the user's go-ahead.

- [ ] **Step 4: Commit**

```bash
git add backend/scripts/twenty-sse-probe.mjs
git commit -m "chore(twenty-events): add SSE subscription probe for the crmparser API key"
```

---

### Task 2: Event journal (repo: crmparserv2)

**Files:**
- Create: `backend/src/services/twenty-events/journal.js`
- Test: `backend/tests/twenty-events-journal.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `createEventJournal({ maxEntries?: number, maxBytes?: number }) => journal` where
  `journal` has `epoch: string` (UUID v4), `cursor: number` (getter, `0` when empty),
  `size: number` (getter), `append(event: object) => number` (returns the assigned seq),
  `read({ since?: number, epoch?: string }) => { epoch, cursor, reset: boolean, events: object[] }`,
  `onAppend(listener: (seq: number) => void) => () => void`.
  Also exports `RESYNC_EVENT = { action: 'RESYNC' }`.

- [ ] **Step 1: Write the failing test**

```js
// backend/tests/twenty-events-journal.test.js
import { describe, it, expect, vi } from 'vitest';

import { createEventJournal, RESYNC_EVENT } from '../src/services/twenty-events/journal.js';

const event = (recordId) => ({
  action: 'UPDATED',
  objectNameSingular: 'opportunity',
  recordId,
  properties: { updatedFields: ['stage'] },
});

describe('createEventJournal', () => {
  it('assigns increasing seq numbers and reports the cursor', () => {
    const journal = createEventJournal();

    expect(journal.cursor).toBe(0);
    expect(journal.append(event('a'))).toBe(1);
    expect(journal.append(event('b'))).toBe(2);
    expect(journal.cursor).toBe(2);
  });

  it('returns only events newer than since', () => {
    const journal = createEventJournal();
    journal.append(event('a'));
    journal.append(event('b'));

    const result = journal.read({ since: 1, epoch: journal.epoch });

    expect(result.reset).toBe(false);
    expect(result.cursor).toBe(2);
    expect(result.events).toEqual([event('b')]);
  });

  it('returns the current cursor without events for a first poll', () => {
    const journal = createEventJournal();
    journal.append(event('a'));

    const result = journal.read({});

    expect(result).toEqual({
      epoch: journal.epoch,
      cursor: 1,
      reset: false,
      events: [],
    });
  });

  it('resets when the client epoch does not match', () => {
    const journal = createEventJournal();
    journal.append(event('a'));

    const result = journal.read({ since: 1, epoch: 'other-epoch' });

    expect(result.reset).toBe(true);
    expect(result.events).toEqual([]);
    expect(result.cursor).toBe(1);
  });

  it('resets when the requested cursor was already evicted', () => {
    const journal = createEventJournal({ maxEntries: 2 });
    journal.append(event('a'));
    journal.append(event('b'));
    journal.append(event('c'));

    expect(journal.size).toBe(2);
    expect(journal.read({ since: 0, epoch: journal.epoch }).reset).toBe(true);
    expect(journal.read({ since: 1, epoch: journal.epoch }).events).toEqual([
      event('b'),
      event('c'),
    ]);
  });

  it('evicts by byte budget as well as by count', () => {
    const journal = createEventJournal({ maxBytes: 200 });
    journal.append({ ...event('a'), padding: 'x'.repeat(300) });
    journal.append(event('b'));

    expect(journal.size).toBe(1);
    expect(journal.read({ since: 1, epoch: journal.epoch }).events).toEqual([event('b')]);
  });

  it('notifies append listeners until they unsubscribe', () => {
    const journal = createEventJournal();
    const listener = vi.fn();
    const unsubscribe = journal.onAppend(listener);

    journal.append(event('a'));
    unsubscribe();
    journal.append(event('b'));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(1);
  });

  it('exposes a RESYNC marker event', () => {
    expect(RESYNC_EVENT).toEqual({ action: 'RESYNC' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `backend/`: `npx vitest run tests/twenty-events-journal.test.js`
Expected: FAIL — `Failed to load url ../src/services/twenty-events/journal.js`.

- [ ] **Step 3: Write the implementation**

```js
// backend/src/services/twenty-events/journal.js
import crypto from 'node:crypto';

const DEFAULT_MAX_ENTRIES = 2000;
const DEFAULT_MAX_BYTES = 8 * 1024 * 1024;

/** Marker appended after a stream reconnect: clients must refetch everything. */
export const RESYNC_EVENT = { action: 'RESYNC' };

/**
 * In-memory, cursor-addressed log of Twenty record events.
 * Knows nothing about Twenty transport — only storage, eviction and notification.
 */
export function createEventJournal({
  maxEntries = DEFAULT_MAX_ENTRIES,
  maxBytes = DEFAULT_MAX_BYTES,
} = {}) {
  const epoch = crypto.randomUUID();
  const entries = [];
  const listeners = new Set();
  let nextSeq = 1;
  let totalBytes = 0;

  const evict = () => {
    while (
      entries.length > maxEntries ||
      (totalBytes > maxBytes && entries.length > 1)
    ) {
      totalBytes -= entries.shift().bytes;
    }
  };

  return {
    epoch,

    get cursor() {
      return nextSeq - 1;
    },

    get size() {
      return entries.length;
    },

    append(event) {
      const seq = nextSeq;
      const bytes = Buffer.byteLength(JSON.stringify(event));
      nextSeq += 1;
      entries.push({ seq, receivedAt: Date.now(), event, bytes });
      totalBytes += bytes;
      evict();
      for (const listener of [...listeners]) listener(seq);
      return seq;
    },

    read({ since, epoch: clientEpoch } = {}) {
      const cursor = nextSeq - 1;

      if (!Number.isInteger(since) || clientEpoch === undefined) {
        return { epoch, cursor, reset: false, events: [] };
      }

      if (clientEpoch !== epoch) {
        return { epoch, cursor, reset: true, events: [] };
      }

      const oldestSeq = entries.length > 0 ? entries[0].seq : cursor + 1;
      if (since < oldestSeq - 1) {
        return { epoch, cursor, reset: true, events: [] };
      }

      return {
        epoch,
        cursor,
        reset: false,
        events: entries.filter((entry) => entry.seq > since).map((entry) => entry.event),
      };
    },

    onAppend(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run from `backend/`: `npx vitest run tests/twenty-events-journal.test.js`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/twenty-events/journal.js backend/tests/twenty-events-journal.test.js
git commit -m "feat(twenty-events): add cursor-addressed in-memory event journal"
```

---

### Task 3: Long-poll waiter (repo: crmparserv2)

**Files:**
- Create: `backend/src/services/twenty-events/wait-for-events.js`
- Test: `backend/tests/twenty-events-wait.test.js`

**Interfaces:**
- Consumes: a journal from Task 2 (`read`, `onAppend`).
- Produces: `LONG_POLL_TIMEOUT_MS = 25000` and
  `waitForEvents(journal, { since?: number, epoch?: string, timeoutMs?: number, signal?: AbortSignal })
  => Promise<{ epoch, cursor, reset, events }>`.

- [ ] **Step 1: Write the failing test**

```js
// backend/tests/twenty-events-wait.test.js
import { describe, it, expect } from 'vitest';

import { createEventJournal } from '../src/services/twenty-events/journal.js';
import {
  LONG_POLL_TIMEOUT_MS,
  waitForEvents,
} from '../src/services/twenty-events/wait-for-events.js';

const event = (recordId) => ({
  action: 'UPDATED',
  objectNameSingular: 'dealLineItem',
  recordId,
  properties: {},
});

describe('waitForEvents', () => {
  it('uses a 25 second hold by default', () => {
    expect(LONG_POLL_TIMEOUT_MS).toBe(25_000);
  });

  it('returns immediately when events are already newer than the cursor', async () => {
    const journal = createEventJournal();
    journal.append(event('a'));

    const result = await waitForEvents(journal, {
      since: 0,
      epoch: journal.epoch,
      timeoutMs: 50,
    });

    expect(result.events).toEqual([event('a')]);
  });

  it('returns immediately on a first poll without a cursor', async () => {
    const journal = createEventJournal();

    const result = await waitForEvents(journal, { timeoutMs: 50 });

    expect(result).toEqual({
      epoch: journal.epoch,
      cursor: 0,
      reset: false,
      events: [],
    });
  });

  it('resolves as soon as an event is appended while waiting', async () => {
    const journal = createEventJournal();
    const pending = waitForEvents(journal, {
      since: 0,
      epoch: journal.epoch,
      timeoutMs: 5000,
    });

    setTimeout(() => journal.append(event('b')), 10);
    const result = await pending;

    expect(result.events).toEqual([event('b')]);
  });

  it('resolves empty after the timeout', async () => {
    const journal = createEventJournal();

    const result = await waitForEvents(journal, {
      since: 0,
      epoch: journal.epoch,
      timeoutMs: 20,
    });

    expect(result.events).toEqual([]);
    expect(result.cursor).toBe(0);
  });

  it('resolves when the request is aborted', async () => {
    const journal = createEventJournal();
    const controller = new AbortController();
    const pending = waitForEvents(journal, {
      since: 0,
      epoch: journal.epoch,
      timeoutMs: 5000,
      signal: controller.signal,
    });

    controller.abort();
    const result = await pending;

    expect(result.events).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `backend/`: `npx vitest run tests/twenty-events-wait.test.js`
Expected: FAIL — cannot resolve `wait-for-events.js`.

- [ ] **Step 3: Write the implementation**

```js
// backend/src/services/twenty-events/wait-for-events.js
export const LONG_POLL_TIMEOUT_MS = 25_000;

/**
 * Resolves with journal contents newer than `since`, waiting up to `timeoutMs`
 * when there is nothing yet. Knows only about the journal's read/onAppend contract.
 */
export function waitForEvents(
  journal,
  { since, epoch, timeoutMs = LONG_POLL_TIMEOUT_MS, signal } = {},
) {
  const immediate = journal.read({ since, epoch });
  if (immediate.reset || immediate.events.length > 0 || !Number.isInteger(since)) {
    return Promise.resolve(immediate);
  }
  if (signal?.aborted) {
    return Promise.resolve(immediate);
  }

  return new Promise((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      unsubscribe();
      clearTimeout(timer);
      signal?.removeEventListener('abort', finish);
      resolve(journal.read({ since, epoch }));
    };

    const unsubscribe = journal.onAppend(finish);
    const timer = setTimeout(finish, timeoutMs);
    timer.unref?.();
    signal?.addEventListener('abort', finish);
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run from `backend/`: `npx vitest run tests/twenty-events-wait.test.js`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/twenty-events/wait-for-events.js backend/tests/twenty-events-wait.test.js
git commit -m "feat(twenty-events): add long-poll waiter over the event journal"
```

---

### Task 4: SSE frame parser (repo: crmparserv2)

Twenty sends `text/event-stream` frames separated by a blank line, plus bare `:` keepalive
comments. This task turns a byte stream into frames; it does no network work.

**Files:**
- Create: `backend/src/services/twenty-events/sse-parser.js`
- Test: `backend/tests/twenty-events-sse-parser.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `createSseParser() => { push(chunk: string) => Array<{ event: string, data: string }> }`.

- [ ] **Step 1: Write the failing test**

```js
// backend/tests/twenty-events-sse-parser.test.js
import { describe, it, expect } from 'vitest';

import { createSseParser } from '../src/services/twenty-events/sse-parser.js';

describe('createSseParser', () => {
  it('parses a complete frame', () => {
    const parser = createSseParser();

    const frames = parser.push('event: next\ndata: {"a":1}\n\n');

    expect(frames).toEqual([{ event: 'next', data: '{"a":1}' }]);
  });

  it('ignores keepalive comments', () => {
    const parser = createSseParser();

    expect(parser.push(':\n\n')).toEqual([]);
    expect(parser.push(': ping\n\n')).toEqual([]);
  });

  it('buffers partial frames across chunks', () => {
    const parser = createSseParser();

    expect(parser.push('event: next\ndata: {"a"')).toEqual([]);
    expect(parser.push(':1}\n\n')).toEqual([{ event: 'next', data: '{"a":1}' }]);
  });

  it('returns several frames from one chunk', () => {
    const parser = createSseParser();

    const frames = parser.push(
      'event: next\ndata: 1\n\n:\n\nevent: complete\ndata: 2\n\n',
    );

    expect(frames).toEqual([
      { event: 'next', data: '1' },
      { event: 'complete', data: '2' },
    ]);
  });

  it('defaults the event name to message and joins multi-line data', () => {
    const parser = createSseParser();

    const frames = parser.push('data: line1\ndata: line2\n\n');

    expect(frames).toEqual([{ event: 'message', data: 'line1\nline2' }]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `backend/`: `npx vitest run tests/twenty-events-sse-parser.test.js`
Expected: FAIL — cannot resolve `sse-parser.js`.

- [ ] **Step 3: Write the implementation**

```js
// backend/src/services/twenty-events/sse-parser.js

const parseFrame = (raw) => {
  let event = 'message';
  const dataLines = [];

  for (const line of raw.split('\n')) {
    if (line === '' || line.startsWith(':')) continue;
    if (line.startsWith('event:')) event = line.slice('event:'.length).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice('data:'.length).trim());
  }

  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join('\n') };
};

/** Incremental text/event-stream framer: feed chunks, get complete frames back. */
export function createSseParser() {
  let buffer = '';

  return {
    push(chunk) {
      buffer += chunk;
      const frames = [];
      let index = buffer.indexOf('\n\n');

      while (index >= 0) {
        const frame = parseFrame(buffer.slice(0, index));
        buffer = buffer.slice(index + 2);
        if (frame) frames.push(frame);
        index = buffer.indexOf('\n\n');
      }

      return frames;
    },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run from `backend/`: `npx vitest run tests/twenty-events-sse-parser.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/twenty-events/sse-parser.js backend/tests/twenty-events-sse-parser.test.js
git commit -m "feat(twenty-events): add incremental SSE frame parser"
```

---

### Task 5: SSE consumer (repo: crmparserv2)

**Files:**
- Create: `backend/src/services/twenty-events/sse-consumer.js`
- Test: `backend/tests/twenty-events-sse-consumer.test.js`

**Interfaces:**
- Consumes: `createSseParser` (Task 4); a journal (Task 2) via `append`.
- Produces:
  - `WATCHED_OBJECT_NAMES: string[]` — `['opportunity','dealLineItem','okleykaDealShare','okleykaSalaryEntry','company','restorationTemplate']`
  - `WATCHDOG_TIMEOUT_MS = 60000`
  - `resolveMetadataUrl(twentyApiUrl: string) => string`
  - `computeBackoffMs(attempt: number) => number`
  - `createSseConsumer({ journal, metadataUrl, token, fetchImpl?, log?, watchdogTimeoutMs?, backoffMsFn?, watchdogIntervalMs? }) => { start(): void, stop(): void }`

- [ ] **Step 1: Write the failing test**

```js
// backend/tests/twenty-events-sse-consumer.test.js
import { describe, it, expect, vi } from 'vitest';

import { createEventJournal } from '../src/services/twenty-events/journal.js';
import {
  computeBackoffMs,
  createSseConsumer,
  resolveMetadataUrl,
  WATCHED_OBJECT_NAMES,
} from '../src/services/twenty-events/sse-consumer.js';

const silentLog = { log: () => {}, warn: () => {}, error: () => {} };

const eventFrame = (recordId) =>
  `event: next\ndata: ${JSON.stringify({
    data: {
      onEventSubscription: {
        eventStreamId: 'stream',
        objectRecordEventsWithQueryIds: [
          {
            queryIds: ['deals-board-opportunity'],
            objectRecordEvent: {
              action: 'UPDATED',
              objectNameSingular: 'opportunity',
              recordId,
              properties: { updatedFields: ['stage'] },
            },
          },
        ],
      },
    },
  })}\n\n`;

/** Fake fetch: JSON for mutations, a controllable stream for the subscription. */
const createFakeFetch = () => {
  const streams = [];
  const addQueryCalls = [];

  const fetchImpl = vi.fn(async (url, init) => {
    const body = JSON.parse(init.body);

    if (body.query.includes('addQueryToEventStream')) {
      addQueryCalls.push(body.variables.input);
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: { addQueryToEventStream: true } }),
      };
    }

    let push;
    let close;
    const stream = new ReadableStream({
      start(controller) {
        push = (text) => controller.enqueue(new TextEncoder().encode(text));
        close = () => controller.close();
      },
    });
    const handle = { push: (text) => push(text), close: () => close() };
    streams.push(handle);

    return { ok: true, status: 200, body: stream };
  });

  return { fetchImpl, streams, addQueryCalls };
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 20));

describe('resolveMetadataUrl', () => {
  it('rewrites known suffixes to /metadata', () => {
    expect(resolveMetadataUrl('http://twenty-server:3000/graphql')).toBe(
      'http://twenty-server:3000/metadata',
    );
    expect(resolveMetadataUrl('https://twenty.example.com/rest/')).toBe(
      'https://twenty.example.com/metadata',
    );
    expect(resolveMetadataUrl('https://twenty.example.com')).toBe(
      'https://twenty.example.com/metadata',
    );
    expect(resolveMetadataUrl('')).toBe('');
  });
});

describe('computeBackoffMs', () => {
  it('doubles from 500ms and caps at 5000ms', () => {
    expect(computeBackoffMs(1)).toBe(500);
    expect(computeBackoffMs(2)).toBe(1000);
    expect(computeBackoffMs(3)).toBe(2000);
    expect(computeBackoffMs(10)).toBe(5000);
  });
});

describe('createSseConsumer', () => {
  it('registers every watched object and journals incoming events', async () => {
    const journal = createEventJournal();
    const { fetchImpl, streams, addQueryCalls } = createFakeFetch();
    const consumer = createSseConsumer({
      journal,
      metadataUrl: 'http://twenty/metadata',
      token: 'test-token',
      fetchImpl,
      log: silentLog,
    });

    consumer.start();
    await flush();

    expect(addQueryCalls.map((call) => call.operationSignature.objectNameSingular)).toEqual(
      WATCHED_OBJECT_NAMES,
    );
    expect(addQueryCalls[0].operationSignature).toEqual({
      objectNameSingular: 'opportunity',
      variables: {},
    });

    streams[0].push(':\n\n');
    streams[0].push(eventFrame('rec-1'));
    await flush();

    expect(journal.read({ since: 0, epoch: journal.epoch }).events).toEqual([
      {
        action: 'UPDATED',
        objectNameSingular: 'opportunity',
        recordId: 'rec-1',
        properties: { updatedFields: ['stage'] },
      },
    ]);

    consumer.stop();
  });

  it('appends a RESYNC marker after reconnecting', async () => {
    const journal = createEventJournal();
    const { fetchImpl, streams } = createFakeFetch();
    const consumer = createSseConsumer({
      journal,
      metadataUrl: 'http://twenty/metadata',
      token: 'test-token',
      fetchImpl,
      log: silentLog,
      backoffMsFn: () => 1,
    });

    consumer.start();
    await flush();
    streams[0].close();
    await flush();

    expect(streams.length).toBeGreaterThan(1);
    expect(journal.read({ since: 0, epoch: journal.epoch }).events).toEqual([
      { action: 'RESYNC' },
    ]);

    consumer.stop();
  });

  it('does not reconnect after stop', async () => {
    const journal = createEventJournal();
    const { fetchImpl, streams } = createFakeFetch();
    const consumer = createSseConsumer({
      journal,
      metadataUrl: 'http://twenty/metadata',
      token: 'test-token',
      fetchImpl,
      log: silentLog,
      backoffMsFn: () => 1,
    });

    consumer.start();
    await flush();
    consumer.stop();
    const streamCount = streams.length;
    await flush();

    expect(streams.length).toBe(streamCount);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `backend/`: `npx vitest run tests/twenty-events-sse-consumer.test.js`
Expected: FAIL — cannot resolve `sse-consumer.js`.

- [ ] **Step 3: Write the implementation**

```js
// backend/src/services/twenty-events/sse-consumer.js
import crypto from 'node:crypto';

import { RESYNC_EVENT } from './journal.js';
import { createSseParser } from './sse-parser.js';

export const WATCHED_OBJECT_NAMES = [
  'opportunity',
  'dealLineItem',
  'okleykaDealShare',
  'okleykaSalaryEntry',
  'company',
  'restorationTemplate',
];

export const WATCHDOG_TIMEOUT_MS = 60_000;
const WATCHDOG_INTERVAL_MS = 10_000;
const MIN_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 5_000;

const ON_EVENT_SUBSCRIPTION = `
  subscription OnEventSubscription($eventStreamId: String!) {
    onEventSubscription(eventStreamId: $eventStreamId) {
      eventStreamId
      objectRecordEventsWithQueryIds {
        queryIds
        objectRecordEvent {
          action
          objectNameSingular
          recordId
          properties { updatedFields before after diff }
        }
      }
    }
  }
`;

const ADD_QUERY_MUTATION = `
  mutation AddQueryToEventStream($input: AddQuerySubscriptionInput!) {
    addQueryToEventStream(input: $input)
  }
`;

/** Twenty record events live on the metadata schema, not on /graphql or /rest. */
export function resolveMetadataUrl(twentyApiUrl) {
  const trimmed = String(twentyApiUrl ?? '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return `${trimmed.replace(/\/(graphql|rest|metadata)$/, '')}/metadata`;
}

export function computeBackoffMs(attempt) {
  const exponent = Math.max(0, attempt - 1);
  return Math.min(MAX_BACKOFF_MS, MIN_BACKOFF_MS * 2 ** exponent);
}

const delay = (ms) =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    timer.unref?.();
  });

export function createSseConsumer({
  journal,
  metadataUrl,
  token,
  fetchImpl = fetch,
  log = console,
  watchdogTimeoutMs = WATCHDOG_TIMEOUT_MS,
  watchdogIntervalMs = WATCHDOG_INTERVAL_MS,
  backoffMsFn = computeBackoffMs,
}) {
  let stopped = false;
  let started = false;
  let attempt = 0;
  let hadDisconnect = false;
  let activeController = null;

  const post = (body, extraHeaders, signal) =>
    fetchImpl(metadataUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
      body: JSON.stringify(body),
      signal,
    });

  const registerQueries = async (eventStreamId) => {
    for (const objectNameSingular of WATCHED_OBJECT_NAMES) {
      const response = await post({
        query: ADD_QUERY_MUTATION,
        variables: {
          input: {
            eventStreamId,
            queryId: `deals-board-${objectNameSingular}`,
            operationSignature: { objectNameSingular, variables: {} },
          },
        },
      });
      const payload = await response.json();
      if (payload?.data?.addQueryToEventStream !== true) {
        throw new Error(`addQueryToEventStream rejected ${objectNameSingular}`);
      }
    }
  };

  const journalFrame = (data) => {
    let payload;
    try {
      payload = JSON.parse(data);
    } catch {
      log.warn('[twenty-events] unparsable frame skipped');
      return;
    }

    const items =
      payload?.data?.onEventSubscription?.objectRecordEventsWithQueryIds ?? [];
    for (const item of items) {
      if (item?.objectRecordEvent) journal.append(item.objectRecordEvent);
    }
  };

  const readStream = async (response) => {
    const parser = createSseParser();
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let lastActivityAt = Date.now();

    const watchdog = setInterval(() => {
      if (Date.now() - lastActivityAt > watchdogTimeoutMs) {
        log.warn('[twenty-events] stream idle, forcing reconnect');
        activeController?.abort();
      }
    }, watchdogIntervalMs);
    watchdog.unref?.();

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) return;
        lastActivityAt = Date.now();
        for (const frame of parser.push(decoder.decode(value, { stream: true }))) {
          if (frame.event === 'next') journalFrame(frame.data);
        }
      }
    } finally {
      clearInterval(watchdog);
    }
  };

  const runOnce = async () => {
    const eventStreamId = crypto.randomUUID();
    const controller = new AbortController();
    activeController = controller;

    const response = await post(
      { query: ON_EVENT_SUBSCRIPTION, variables: { eventStreamId } },
      { Accept: 'text/event-stream' },
      controller.signal,
    );

    if (!response.ok || !response.body) {
      throw new Error(`event stream HTTP ${response.status}`);
    }

    await registerQueries(eventStreamId);
    attempt = 0;
    log.log(`[twenty-events] stream ${eventStreamId} registered`);

    // Events published while disconnected are lost, so tell clients to refetch.
    if (hadDisconnect) journal.append(RESYNC_EVENT);

    await readStream(response);
  };

  const loop = async () => {
    while (!stopped) {
      try {
        await runOnce();
        hadDisconnect = true;
        attempt += 1;
        if (!stopped) log.warn('[twenty-events] stream closed by server');
      } catch (error) {
        hadDisconnect = true;
        attempt += 1;
        if (!stopped) log.error(`[twenty-events] stream failed: ${error.message}`);
      }

      activeController = null;
      if (stopped) return;
      await delay(backoffMsFn(attempt));
    }
  };

  return {
    start() {
      if (started) return;
      started = true;
      void loop();
    },
    stop() {
      stopped = true;
      activeController?.abort();
      activeController = null;
    },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run from `backend/`: `npx vitest run tests/twenty-events-sse-consumer.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/twenty-events/sse-consumer.js backend/tests/twenty-events-sse-consumer.test.js
git commit -m "feat(twenty-events): consume Twenty record events into the journal"
```

---

### Task 6: Runtime wiring and the long-poll route (repo: crmparserv2)

**Files:**
- Create: `backend/src/services/twenty-events/index.js`
- Modify: `backend/src/config.js` (add `twentyEventsEnabled` next to the other `twenty*` keys)
- Modify: `backend/src/routes/twenty.js` (add `GET /events`)
- Modify: `backend/src/index.js` (call `initTwentyEvents()` inside `start()`)
- Modify: `.env.example` (document `TWENTY_EVENTS_ENABLED` and `TWENTY_EVENTS_METADATA_URL`)
- Test: `backend/tests/twenty-events-route.test.js`

**Interfaces:**
- Consumes: `createEventJournal` (Task 2), `waitForEvents`/`LONG_POLL_TIMEOUT_MS` (Task 3),
  `createSseConsumer`/`resolveMetadataUrl` (Task 5).
- Produces:
  - `initTwentyEvents(): void`, `getEventJournal(): journal | null`,
    `isTwentyEventsEnabled(): boolean`, `stopTwentyEventsForTests(): void`
    from `backend/src/services/twenty-events/index.js`
  - config keys `twentyEventsEnabled: boolean` (env `TWENTY_EVENTS_ENABLED`, default on) and
    `twentyEventsMetadataUrl: string` (env `TWENTY_EVENTS_METADATA_URL`, optional in-network override)
  - HTTP `GET /api/twenty/events?since=<int>&epoch=<uuid>` →
    `200 { epoch, cursor, reset, events }`, or `200 { disabled: true }`, or
    `503 { error }` when the consumer is not running, or `401` without the shared secret.

- [ ] **Step 1: Write the failing test**

```js
// backend/tests/twenty-events-route.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const state = vi.hoisted(() => ({ enabled: true, journal: null }));

vi.mock('../src/config.js', () => ({
  config: {
    twentyAppApiSecret: 'test-secret',
    dbPath: ':memory:',
  },
}));

vi.mock('../src/services/twenty-events/index.js', () => ({
  isTwentyEventsEnabled: () => state.enabled,
  getEventJournal: () => state.journal,
}));

import { initDb } from '../src/db/connection.js';
import { migrate } from '../src/db/migrate.js';
import { createEventJournal } from '../src/services/twenty-events/journal.js';
import twentyRouter from '../src/routes/twenty.js';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/twenty', twentyRouter);
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return app;
};

const event = (recordId) => ({
  action: 'UPDATED',
  objectNameSingular: 'opportunity',
  recordId,
  properties: { updatedFields: ['stage'] },
});

describe('GET /api/twenty/events', () => {
  beforeEach(() => {
    initDb();
    migrate();
    state.enabled = true;
    state.journal = createEventJournal();
  });

  it('rejects requests without the shared secret', async () => {
    await request(createApp()).get('/api/twenty/events').expect(401);
  });

  it('returns the current cursor on a first poll', async () => {
    state.journal.append(event('a'));

    const response = await request(createApp())
      .get('/api/twenty/events')
      .set('Authorization', 'Bearer test-secret')
      .expect(200);

    expect(response.body).toEqual({
      epoch: state.journal.epoch,
      cursor: 1,
      reset: false,
      events: [],
    });
  });

  it('returns events newer than the cursor', async () => {
    state.journal.append(event('a'));
    state.journal.append(event('b'));

    const response = await request(createApp())
      .get('/api/twenty/events')
      .query({ since: '1', epoch: state.journal.epoch })
      .set('Authorization', 'Bearer test-secret')
      .expect(200);

    expect(response.body.events).toEqual([event('b')]);
    expect(response.body.cursor).toBe(2);
  });

  it('asks the client to reset on an epoch mismatch', async () => {
    state.journal.append(event('a'));

    const response = await request(createApp())
      .get('/api/twenty/events')
      .query({ since: '1', epoch: 'stale-epoch' })
      .set('Authorization', 'Bearer test-secret')
      .expect(200);

    expect(response.body.reset).toBe(true);
    expect(response.body.events).toEqual([]);
  });

  it('reports 503 when the consumer is not running', async () => {
    state.journal = null;

    const response = await request(createApp())
      .get('/api/twenty/events')
      .set('Authorization', 'Bearer test-secret')
      .expect(503);

    expect(response.body.error).toContain('not running');
  });

  it('reports disabled when the kill switch is off', async () => {
    state.enabled = false;

    const response = await request(createApp())
      .get('/api/twenty/events')
      .set('Authorization', 'Bearer test-secret')
      .expect(200);

    expect(response.body).toEqual({ disabled: true });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `backend/`: `npx vitest run tests/twenty-events-route.test.js`
Expected: FAIL — cannot resolve `../src/services/twenty-events/index.js`, and later `404` on the route.

- [ ] **Step 3: Add the runtime module**

```js
// backend/src/services/twenty-events/index.js
import { config } from '../../config.js';

import { createEventJournal } from './journal.js';
import { createSseConsumer, resolveMetadataUrl } from './sse-consumer.js';

let journal = null;
let consumer = null;

export function isTwentyEventsEnabled() {
  return config.twentyEventsEnabled;
}

export function getEventJournal() {
  return journal;
}

export function initTwentyEvents() {
  if (!config.twentyEventsEnabled) {
    console.log('[twenty-events] disabled (TWENTY_EVENTS_ENABLED=false)');
    return;
  }
  if (consumer) return;

  // Prefer an in-network address so the stream does not pass through Traefik.
  const metadataUrl =
    config.twentyEventsMetadataUrl || resolveMetadataUrl(config.twentyApiUrl);
  if (!metadataUrl || !config.twentyApiToken) {
    console.warn('[twenty-events] not configured (needs TWENTY_API_URL and TWENTY_API_TOKEN)');
    return;
  }

  journal = createEventJournal();
  consumer = createSseConsumer({
    journal,
    metadataUrl,
    token: config.twentyApiToken,
  });
  consumer.start();
  console.log(`[twenty-events] consumer started (${metadataUrl}, epoch ${journal.epoch})`);
}

/** Test-only teardown: production has no shutdown path by design. */
export function stopTwentyEventsForTests() {
  consumer?.stop();
  consumer = null;
  journal = null;
}
```

- [ ] **Step 4: Add the config key**

In `backend/src/config.js`, directly after the `twentyApiRateLimitWindowMs` line:

```js
  twentyEventsEnabled: process.env.TWENTY_EVENTS_ENABLED !== 'false',
  twentyEventsMetadataUrl: process.env.TWENTY_EVENTS_METADATA_URL || '',
```

In `.env.example`, directly after `TWENTY_API_RATE_LIMIT_WINDOW_MS=60000`:

```
# Realtime события борда (long-poll для Twenty app). false отключает хаб событий.
TWENTY_EVENTS_ENABLED=true
# Необязательно: адрес /metadata внутри docker-сети, чтобы поток не шёл через Traefik,
# например http://twenty-server:3000/metadata. По умолчанию берётся из TWENTY_API_URL.
TWENTY_EVENTS_METADATA_URL=
```

- [ ] **Step 5: Add the route**

In `backend/src/routes/twenty.js`, extend the imports:

```js
import { getEventJournal, isTwentyEventsEnabled } from '../services/twenty-events/index.js';
import { waitForEvents } from '../services/twenty-events/wait-for-events.js';
```

and add this handler right after `router.use(twentyAppAuthMiddleware);`:

```js
router.get('/events', async (req, res, next) => {
  try {
    if (!isTwentyEventsEnabled()) {
      return res.json({ disabled: true });
    }

    const journal = getEventJournal();
    if (!journal) {
      return res.status(503).json({ error: 'Twenty events consumer is not running' });
    }

    const sinceRaw = req.query.since;
    const since =
      typeof sinceRaw === 'string' && /^\d+$/.test(sinceRaw) ? Number(sinceRaw) : undefined;
    const epochRaw = req.query.epoch;
    const epoch = typeof epochRaw === 'string' && epochRaw ? epochRaw : undefined;

    const controller = new AbortController();
    res.on('close', () => controller.abort());

    const result = await waitForEvents(journal, { since, epoch, signal: controller.signal });
    if (res.writableEnded) return;

    res.json(result);
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 6: Start the consumer at boot**

In `backend/src/index.js`, add the import next to the other service imports:

```js
import { initTwentyEvents } from './services/twenty-events/index.js';
```

and call it inside `start()`, directly after `initScheduler();`:

```js
  initTwentyEvents();
```

- [ ] **Step 7: Run the route test and the whole backend suite**

Run from `backend/`: `npx vitest run tests/twenty-events-route.test.js`
Expected: PASS, 6 tests.

Run from `backend/`: `npm test`
Expected: the full suite passes with no new failures.

- [ ] **Step 8: Commit**

```bash
git add backend/src/services/twenty-events/index.js backend/src/config.js backend/src/routes/twenty.js backend/src/index.js backend/tests/twenty-events-route.test.js .env.example
git commit -m "feat(twenty-events): expose long-poll events endpoint and start the consumer at boot"
```

---

### Task 7: Logic function proxy (repo: BrandingTwentyView)

Entry files under `src/logic-functions/` are not unit-tested in this codebase (they import
`twenty-sdk/define`), so the testable part goes into `src/logic-functions/shared/`, as with
`crmparser-proxy` and `deals-board-page-core`.

**Files:**
- Create: `src/logic-functions/shared/board-events-path.ts`
- Create: `src/logic-functions/deals-board-events.ts`
- Modify: `src/constants/universal-identifiers.ts` (add one constant after `DEALS_BOARD_PAGE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER`)
- Test: `src/logic-functions/shared/board-events-path.test.ts`

**Interfaces:**
- Consumes: `crmparserProxyFetch`, `jsonProxyResponse` from `./shared/crmparser-proxy`.
- Produces:
  - `buildBoardEventsPath(queryStringParameters: Record<string, string | undefined> | null | undefined): string`
  - `DEALS_BOARD_EVENTS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER = '7c1e0f4a-9b52-4d3e-8a76-2f5c1b9d4e08'`
  - HTTP route `GET /deals-board/events` on the Twenty functions base URL.

- [ ] **Step 1: Write the failing test**

```ts
// src/logic-functions/shared/board-events-path.test.ts
import { describe, expect, it } from 'vitest';

import { buildBoardEventsPath } from './board-events-path';

describe('buildBoardEventsPath', () => {
  it('returns the bare path when no cursor is known yet', () => {
    expect(buildBoardEventsPath(undefined)).toBe('/twenty/events');
    expect(buildBoardEventsPath({})).toBe('/twenty/events');
  });

  it('forwards since and epoch', () => {
    expect(
      buildBoardEventsPath({ since: '42', epoch: 'e1b9c0d4-1111-4222-8333-444455556666' }),
    ).toBe('/twenty/events?since=42&epoch=e1b9c0d4-1111-4222-8333-444455556666');
  });

  it('drops a non-numeric since', () => {
    expect(buildBoardEventsPath({ since: 'abc', epoch: 'e1' })).toBe('/twenty/events?epoch=e1');
  });

  it('ignores blank values and unknown parameters', () => {
    expect(buildBoardEventsPath({ since: '  ', epoch: '', extra: 'x' })).toBe('/twenty/events');
  });

  it('encodes the epoch', () => {
    expect(buildBoardEventsPath({ epoch: 'a b&c' })).toBe('/twenty/events?epoch=a+b%26c');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test:unit src/logic-functions/shared/board-events-path.test.ts`
Expected: FAIL — cannot resolve `./board-events-path`.

- [ ] **Step 3: Write the implementation**

```ts
// src/logic-functions/shared/board-events-path.ts

/** Builds the crmparser long-poll path, forwarding only the parameters we own. */
export const buildBoardEventsPath = (
  queryStringParameters: Record<string, string | undefined> | null | undefined,
): string => {
  const params = new URLSearchParams();

  const since = queryStringParameters?.since?.trim();
  if (since && /^\d+$/.test(since)) params.set('since', since);

  const epoch = queryStringParameters?.epoch?.trim();
  if (epoch) params.set('epoch', epoch);

  const query = params.toString();
  return query ? `/twenty/events?${query}` : '/twenty/events';
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn test:unit src/logic-functions/shared/board-events-path.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Add the universal identifier**

In `src/constants/universal-identifiers.ts`, after the `DEALS_BOARD_PAGE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER` declaration:

```ts
export const DEALS_BOARD_EVENTS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER =
  '7c1e0f4a-9b52-4d3e-8a76-2f5c1b9d4e08';
```

- [ ] **Step 6: Add the logic function**

```ts
// src/logic-functions/deals-board-events.ts
import { defineLogicFunction } from 'twenty-sdk/define';
import type { RoutePayload } from 'twenty-sdk/logic-function';

import { DEALS_BOARD_EVENTS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

import { buildBoardEventsPath } from './shared/board-events-path';
import { crmparserProxyFetch, jsonProxyResponse } from './shared/crmparser-proxy';

const handler = async (event: RoutePayload) => {
  const { status, body } = await crmparserProxyFetch(
    buildBoardEventsPath(event.queryStringParameters),
  );

  return jsonProxyResponse(status, body);
};

export default defineLogicFunction({
  universalIdentifier: DEALS_BOARD_EVENTS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'deals-board-events',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: {
    path: '/deals-board/events',
    httpMethod: 'GET',
    isAuthRequired: true,
  },
});
```

- [ ] **Step 7: Typecheck and lint**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

Run: `yarn lint`
Expected: no new findings.

- [ ] **Step 8: Commit**

```bash
git add src/logic-functions/deals-board-events.ts src/logic-functions/shared/board-events-path.ts src/logic-functions/shared/board-events-path.test.ts src/constants/universal-identifiers.ts
git commit -m "feat(deals-board): add long-poll events proxy logic function"
```

---

### Task 8: Query-key registry (repo: BrandingTwentyView)

Today `invalidateObjectQueries` hardcodes two objects, and the patch branch would try to patch the
line-item cache for any non-opportunity object. Both must become registry-driven before the hook
starts delivering six object types.

**Files:**
- Create: `src/deals-board/realtime/query-key-registry.ts`
- Modify: `src/deals-board/realtime/apply-object-record-event.ts` (replace the `./constants` import, `isWatchedObject`, `invalidateObjectQueries`, and the patch-branch guard)
- Test: `src/deals-board/realtime/query-key-registry.test.ts`
- Test: `src/deals-board/realtime/apply-object-record-event.test.ts` (extend)

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `WATCHED_QUERY_KEYS: Record<WatchedObjectName, string[]>`
  - `WATCHED_OBJECT_NAMES: readonly WatchedObjectName[]`
  - `ALL_WATCHED_QUERY_KEYS: string[]`
  - `PATCHABLE_OBJECT_NAMES: readonly ['opportunity', 'dealLineItem']`
  - `type WatchedObjectName`
- Note: `src/deals-board/realtime/constants.ts` stays untouched in this task — `event-stream-api.ts`
  still imports it, and both are deleted in Task 9.

- [ ] **Step 1: Write the failing registry test**

```ts
// src/deals-board/realtime/query-key-registry.test.ts
import { describe, expect, it } from 'vitest';

import {
  ALL_WATCHED_QUERY_KEYS,
  PATCHABLE_OBJECT_NAMES,
  WATCHED_OBJECT_NAMES,
  WATCHED_QUERY_KEYS,
} from './query-key-registry';

describe('query key registry', () => {
  it('covers every object the board renders', () => {
    expect(WATCHED_OBJECT_NAMES).toEqual([
      'opportunity',
      'dealLineItem',
      'okleykaDealShare',
      'okleykaSalaryEntry',
      'company',
      'restorationTemplate',
    ]);
  });

  it('maps objects to the query keys the board actually uses', () => {
    expect(WATCHED_QUERY_KEYS.opportunity).toEqual(['opportunities', 'deals-board-page']);
    expect(WATCHED_QUERY_KEYS.dealLineItem).toEqual(['lineItems', 'deals-board-page']);
    expect(WATCHED_QUERY_KEYS.okleykaDealShare).toEqual(['okleyka-shares', 'okleyka-salary']);
    expect(WATCHED_QUERY_KEYS.okleykaSalaryEntry).toEqual([
      'okleyka-salary-entries',
      'okleyka-salary',
      'okleyka-salary-history',
    ]);
    expect(WATCHED_QUERY_KEYS.company).toEqual(['companyNames']);
    expect(WATCHED_QUERY_KEYS.restorationTemplate).toEqual(['restorationTemplatesCatalog']);
  });

  it('exposes a deduplicated flat list for full resyncs', () => {
    expect(ALL_WATCHED_QUERY_KEYS).toEqual([
      'opportunities',
      'deals-board-page',
      'lineItems',
      'okleyka-shares',
      'okleyka-salary',
      'okleyka-salary-entries',
      'okleyka-salary-history',
      'companyNames',
      'restorationTemplatesCatalog',
    ]);
  });

  it('only allows cache patching for objects with row caches', () => {
    expect(PATCHABLE_OBJECT_NAMES).toEqual(['opportunity', 'dealLineItem']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test:unit src/deals-board/realtime/query-key-registry.test.ts`
Expected: FAIL — cannot resolve `./query-key-registry`.

- [ ] **Step 3: Write the registry**

```ts
// src/deals-board/realtime/query-key-registry.ts

/** Objects the board renders, mapped to the react-query keys that hold their data. */
export const WATCHED_QUERY_KEYS = {
  opportunity: ['opportunities', 'deals-board-page'],
  dealLineItem: ['lineItems', 'deals-board-page'],
  okleykaDealShare: ['okleyka-shares', 'okleyka-salary'],
  okleykaSalaryEntry: ['okleyka-salary-entries', 'okleyka-salary', 'okleyka-salary-history'],
  company: ['companyNames'],
  restorationTemplate: ['restorationTemplatesCatalog'],
} as const satisfies Record<string, readonly string[]>;

export type WatchedObjectName = keyof typeof WATCHED_QUERY_KEYS;

export const WATCHED_OBJECT_NAMES = Object.keys(WATCHED_QUERY_KEYS) as WatchedObjectName[];

export const ALL_WATCHED_QUERY_KEYS = [
  ...new Set(Object.values(WATCHED_QUERY_KEYS).flat()),
];

/** Only these two have row caches we can patch in place; the rest are refetched. */
export const PATCHABLE_OBJECT_NAMES = ['opportunity', 'dealLineItem'] as const;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn test:unit src/deals-board/realtime/query-key-registry.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the failing test for registry-driven invalidation**

Append to `src/deals-board/realtime/apply-object-record-event.test.ts` (inside the existing top-level
`describe`, following the style of the tests already there):

```ts
  it('invalidates registry keys for objects without a row cache', () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    applyObjectRecordEvent(queryClient, {
      action: 'UPDATED',
      objectNameSingular: 'okleykaSalaryEntry',
      recordId: 'entry-1',
      properties: { updatedFields: ['amount'], diff: { amount: { before: 1, after: 2 } } },
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['okleyka-salary-entries'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['okleyka-salary'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['okleyka-salary-history'] });
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['lineItems'] });
  });

  it('ignores objects outside the registry', () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    applyObjectRecordEvent(queryClient, {
      action: 'UPDATED',
      objectNameSingular: 'note',
      recordId: 'note-1',
      properties: { updatedFields: ['body'] },
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `yarn test:unit src/deals-board/realtime/apply-object-record-event.test.ts`
Expected: FAIL on the first new test — today `invalidateObjectQueries` only knows `opportunity` and
`dealLineItem`, so a salary-entry event invalidates nothing and none of the three expected
`invalidateQueries` calls happen. (The second new test already passes: `note` is not in
`WATCHED_OBJECT_NAMES`. Keep it as a regression guard.)

- [ ] **Step 7: Make `apply-object-record-event.ts` registry-driven**

Replace the `./constants` import:

```ts
import {
  PATCHABLE_OBJECT_NAMES,
  WATCHED_QUERY_KEYS,
  type WatchedObjectName,
} from './query-key-registry';
```

Replace `isWatchedObject`:

```ts
const isWatchedObject = (objectNameSingular: string): objectNameSingular is WatchedObjectName =>
  objectNameSingular in WATCHED_QUERY_KEYS;

const isPatchableObject = (objectNameSingular: WatchedObjectName): boolean =>
  (PATCHABLE_OBJECT_NAMES as readonly string[]).includes(objectNameSingular);
```

Replace `invalidateObjectQueries`:

```ts
const invalidateObjectQueries = (
  queryClient: QueryClient,
  objectNameSingular: WatchedObjectName,
): void => {
  for (const queryKey of WATCHED_QUERY_KEYS[objectNameSingular]) {
    queryClient.invalidateQueries({ queryKey: [queryKey] });
  }
};
```

In `applyObjectRecordEvent`, change the `canPatch` guard so only row-cached objects take the patch
path (the rest of the function body stays as it is):

```ts
  const patch = resolveEventPatch(event.properties);
  const canPatch =
    isPatchableObject(event.objectNameSingular) &&
    (event.action === 'UPDATED' || event.action === 'UPSERTED' || event.action === 'RESTORED') &&
    Boolean(patch);
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `yarn test:unit src/deals-board/realtime`
Expected: PASS — existing opportunity/line-item tests plus the two new ones.

- [ ] **Step 9: Commit**

```bash
git add src/deals-board/realtime/query-key-registry.ts src/deals-board/realtime/query-key-registry.test.ts src/deals-board/realtime/apply-object-record-event.ts src/deals-board/realtime/apply-object-record-event.test.ts
git commit -m "refactor(deals-board): drive event invalidation from a query-key registry"
```

---

### Task 9: Long-poll client and SSE removal (repo: BrandingTwentyView)

The polling loop lives in a plain module so it can be tested without a React renderer (this repo has
no `@testing-library/react`); the hook is a thin `useEffect` wrapper around it.

**Files:**
- Create: `src/deals-board/api/board-events.ts`
- Test: `src/deals-board/api/board-events.test.ts`
- Create: `src/deals-board/realtime/board-events-sync.ts`
- Test: `src/deals-board/realtime/board-events-sync.test.ts`
- Create: `src/deals-board/realtime/useDealsBoardEventsSync.ts`
- Rename: `src/deals-board/realtime/sse-reconnect.ts` → `poll-backoff.ts`, `sse-reconnect.test.ts` → `poll-backoff.test.ts`
- Rename: `src/deals-board/realtime/sse-log.ts` → `board-events-log.ts`
- Modify: `src/deals-board/DealsBoard.tsx:44` (import) and `:121` (call)
- Modify: `package.json` (drop the now-unused `graphql-sse` dependency)
- Delete: `src/deals-board/realtime/useDealsBoardRealtimeSync.ts`, `event-stream-api.ts`, `on-event-subscription.ts`, `constants.ts`, `twenty-runtime.ts`, `twenty-runtime.test.ts`

**Interfaces:**
- Consumes: `applyObjectRecordEvent` and `ObjectRecordEvent` (`./apply-object-record-event`, `./types`);
  `ALL_WATCHED_QUERY_KEYS` (Task 8); `getTwentyFunctionsBaseUrl` (`../utils/twenty-functions-base-url`);
  the route from Task 7.
- Produces:
  - `fetchBoardEvents({ since?: number, epoch?: string, signal: AbortSignal }) => Promise<BoardEventsResponse>`
    and `type BoardEventsResponse = { epoch?: string; cursor?: number; reset?: boolean; disabled?: boolean; events?: Array<ObjectRecordEvent | { action: 'RESYNC' }> }`
  - `computeBackoffDelayMs(consecutiveFailures: number): number` (from `poll-backoff.ts`)
  - `logDealsBoardEventsError(stage, error)` / `logDealsBoardEventsInfo(stage, detail)` with
    `type DealsBoardEventsStage = 'poll' | 'apply'` (from `board-events-log.ts`)
  - `createBoardEventsSync({ queryClient, fetchEvents?, computeDelayMs?, logError?, logInfo? }) => { start(): void; stop(): void }`
  - `useDealsBoardEventsSync(enabled?: boolean): void`

- [ ] **Step 1: Write the failing test for the API client**

```ts
// src/deals-board/api/board-events.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchBoardEvents } from './board-events';

const originalEnv = { ...process.env };

const jsonResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

describe('fetchBoardEvents', () => {
  beforeEach(() => {
    process.env.TWENTY_FUNCTIONS_URL = 'https://twenty.example.com/functions';
    process.env.TWENTY_APP_ACCESS_TOKEN = 'app-token';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it('requests without parameters when no cursor is known', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ epoch: 'e1', cursor: 7, events: [] }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchBoardEvents({ signal: new AbortController().signal });

    expect(fetchMock.mock.calls[0][0]).toBe('https://twenty.example.com/functions/deals-board/events');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer app-token');
    expect(result).toEqual({ epoch: 'e1', cursor: 7, events: [] });
  });

  it('sends since and epoch when known', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ epoch: 'e1', cursor: 9, events: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchBoardEvents({ since: 7, epoch: 'e1', signal: new AbortController().signal });

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://twenty.example.com/functions/deals-board/events?since=7&epoch=e1',
    );
  });

  it('throws with the server error message on a failure status', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'consumer down' }, 503)));

    await expect(
      fetchBoardEvents({ signal: new AbortController().signal }),
    ).rejects.toThrow('consumer down');
  });

  it('throws when the proxy is not configured', async () => {
    delete process.env.TWENTY_APP_ACCESS_TOKEN;
    vi.stubGlobal('fetch', vi.fn());

    await expect(
      fetchBoardEvents({ signal: new AbortController().signal }),
    ).rejects.toThrow('not configured');
  });
});
```

`getTwentyFunctionsBaseUrl()` (`src/deals-board/utils/twenty-functions-base-url.ts`) reads
`TWENTY_FUNCTIONS_URL` first and falls back to `${TWENTY_API_URL}/s`, which is why the test sets
`TWENTY_FUNCTIONS_URL`. Do not modify that helper.

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test:unit src/deals-board/api/board-events.test.ts`
Expected: FAIL — cannot resolve `./board-events`.

- [ ] **Step 3: Write the API client**

```ts
// src/deals-board/api/board-events.ts
import type { ObjectRecordEvent } from '../realtime/types';
import { getTwentyFunctionsBaseUrl } from '../utils/twenty-functions-base-url';

export type BoardEventsResponse = {
  epoch?: string;
  cursor?: number;
  reset?: boolean;
  disabled?: boolean;
  events?: Array<ObjectRecordEvent | { action: 'RESYNC' }>;
};

export type FetchBoardEventsParams = {
  since?: number;
  epoch?: string;
  signal: AbortSignal;
};

const getAppAccessToken = (): string | null => {
  const token = globalThis.process?.env?.TWENTY_APP_ACCESS_TOKEN?.trim();
  return token || null;
};

export const fetchBoardEvents = async ({
  since,
  epoch,
  signal,
}: FetchBoardEventsParams): Promise<BoardEventsResponse> => {
  const baseUrl = getTwentyFunctionsBaseUrl();
  const token = getAppAccessToken();
  if (!baseUrl || !token) {
    throw new Error('Board events proxy not configured');
  }

  const params = new URLSearchParams();
  if (typeof since === 'number') params.set('since', String(since));
  if (epoch) params.set('epoch', epoch);
  const query = params.toString();

  const response = await fetch(
    `${baseUrl}/deals-board/events${query ? `?${query}` : ''}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    },
  );

  const body = (await response.json().catch(() => ({}))) as BoardEventsResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(body.error ?? `Board events request failed (${response.status})`);
  }

  return body;
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn test:unit src/deals-board/api/board-events.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Rename the backoff and log modules**

```bash
git mv src/deals-board/realtime/sse-reconnect.ts src/deals-board/realtime/poll-backoff.ts
git mv src/deals-board/realtime/sse-reconnect.test.ts src/deals-board/realtime/poll-backoff.test.ts
git mv src/deals-board/realtime/sse-log.ts src/deals-board/realtime/board-events-log.ts
```

`poll-backoff.ts` keeps the same math, loses the failure cap (the loop now retries forever):

```ts
// src/deals-board/realtime/poll-backoff.ts
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;

/** 1s, 2s, 4s, … capped at 30s. */
export const computeBackoffDelayMs = (consecutiveFailures: number): number => {
  const attempt = Math.max(1, consecutiveFailures);
  const exponent = Math.min(attempt - 1, 5);
  return Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** exponent);
};
```

`poll-backoff.test.ts` becomes:

```ts
// src/deals-board/realtime/poll-backoff.test.ts
import { describe, expect, it } from 'vitest';

import { computeBackoffDelayMs } from './poll-backoff';

describe('computeBackoffDelayMs', () => {
  it('starts at one second', () => {
    expect(computeBackoffDelayMs(0)).toBe(1000);
    expect(computeBackoffDelayMs(1)).toBe(1000);
  });

  it('doubles per consecutive failure', () => {
    expect(computeBackoffDelayMs(2)).toBe(2000);
    expect(computeBackoffDelayMs(3)).toBe(4000);
    expect(computeBackoffDelayMs(4)).toBe(8000);
  });

  it('caps at thirty seconds', () => {
    expect(computeBackoffDelayMs(6)).toBe(30_000);
    expect(computeBackoffDelayMs(50)).toBe(30_000);
  });
});
```

`board-events-log.ts` becomes:

```ts
// src/deals-board/realtime/board-events-log.ts
export type DealsBoardEventsStage = 'poll' | 'apply';

export const logDealsBoardEventsError = (stage: DealsBoardEventsStage, error: unknown): void => {
  console.error(`Deals Board events: ${stage}`, error);
};

export const logDealsBoardEventsInfo = (stage: DealsBoardEventsStage, detail: string): void => {
  console.info(`Deals Board events: ${stage} — ${detail}`);
};
```

- [ ] **Step 6: Write the failing test for the polling loop**

```ts
// src/deals-board/realtime/board-events-sync.test.ts
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

  it('invalidates everything on a RESYNC marker', async () => {
    const harness = createHarness([
      { epoch: 'e1', cursor: 3, events: [{ action: 'RESYNC' }] },
      { epoch: 'e1', cursor: 3, events: [] },
    ]);

    harness.sync.start();
    await flush();
    harness.sync.stop();

    expect(harness.invalidateSpy).toHaveBeenCalledWith({ queryKey: ['restorationTemplatesCatalog'] });
  });

  it('keeps retrying after failures instead of giving up', async () => {
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
    await flush();
    harness.sync.stop();

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
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `yarn test:unit src/deals-board/realtime/board-events-sync.test.ts`
Expected: FAIL — cannot resolve `./board-events-sync`.

- [ ] **Step 8: Write the polling loop**

```ts
// src/deals-board/realtime/board-events-sync.ts
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
import type { ObjectRecordEvent } from './types';

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
      if (event.action === 'RESYNC') {
        invalidateEverything();
        continue;
      }
      applyObjectRecordEvent(queryClient, event as ObjectRecordEvent);
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
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `yarn test:unit src/deals-board/realtime/board-events-sync.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 10: Add the hook**

```ts
// src/deals-board/realtime/useDealsBoardEventsSync.ts
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { createBoardEventsSync } from './board-events-sync';

/** Keeps board caches in sync with other users' changes via a long-poll loop. */
export const useDealsBoardEventsSync = (enabled = true): void => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const sync = createBoardEventsSync({ queryClient });
    sync.start();

    return () => sync.stop();
  }, [enabled, queryClient]);
};
```

- [ ] **Step 11: Switch the board over and delete the SSE layer**

In `src/deals-board/DealsBoard.tsx`, replace line 44:

```ts
import { useDealsBoardEventsSync } from './realtime/useDealsBoardEventsSync';
```

and line 121:

```ts
  useDealsBoardEventsSync(!viewsQuery.isLoading);
```

Then delete the SSE modules (all of them are now unreferenced):

```bash
git rm src/deals-board/realtime/useDealsBoardRealtimeSync.ts src/deals-board/realtime/event-stream-api.ts src/deals-board/realtime/on-event-subscription.ts src/deals-board/realtime/constants.ts src/deals-board/realtime/twenty-runtime.ts src/deals-board/realtime/twenty-runtime.test.ts
```

Remove the `graphql-sse` line from `dependencies` in `package.json`, then run `yarn install` to
update the lockfile.

- [ ] **Step 12: Verify nothing references the removed modules**

Run: `rg -n "graphql-sse|useDealsBoardRealtimeSync|event-stream-api|on-event-subscription|twenty-runtime|sse-log|sse-reconnect" src`
Expected: no matches.

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

Run: `yarn lint`
Expected: no new findings.

Run: `yarn test:unit`
Expected: the whole unit suite passes.

- [ ] **Step 13: Commit**

```bash
git add -A src/deals-board package.json yarn.lock
git commit -m "feat(deals-board): replace SSE sync with a long-poll events loop"
```

---

### Task 10: Deploy and verify end to end (repos: both)

**Files:**
- Modify: `docs/superpowers/notes/2026-08-07-deals-board-realtime-sse-diagnosis.md` (BrandingTwentyView — append the outcome)

**Interfaces:**
- Consumes: everything from Tasks 1–9.
- Produces: no code. A recorded verification result.

No new environment variable has to be set anywhere: `TWENTY_EVENTS_ENABLED` defaults to enabled and
only `=false` turns the hub off.

- [ ] **Step 1: Deploy crmparserv2 and confirm the consumer connected**

Merge the crmparser work to `main` — `.github/workflows/docker-publish.yml` builds and pushes
`ghcr.io/<repo>:latest` — then redeploy the `crmparser` container so it picks up the new image.
Check the container logs for:
`[twenty-events] consumer started (…/metadata, epoch …)` followed by
`[twenty-events] stream <uuid> registered`.
Expected: no `[twenty-events] stream failed` or `stream idle` lines in steady state.

- [ ] **Step 2: Confirm the endpoint answers through the proxy**

From a shell that can reach crmparser (substitute the real secret):

```bash
curl -s -m 30 -H "Authorization: Bearer $TWENTY_APP_API_SECRET" \
  "http://crmparser:3000/api/twenty/events"
```

Expected: immediate JSON `{"epoch":"…","cursor":N,"reset":false,"events":[]}`.

Then verify the hold, passing the cursor from the previous answer:

```bash
time curl -s -m 40 -H "Authorization: Bearer $TWENTY_APP_API_SECRET" \
  "http://crmparser:3000/api/twenty/events?since=N&epoch=EPOCH"
```

Expected: returns after ~25 s with an empty `events` array — or immediately with events if somebody
edited a deal meanwhile.

- [ ] **Step 3: Deploy the Twenty app and check the route**

Merge the BrandingTwentyView work to `main`: `.github/workflows/cd.yml` bumps the version, deploys
and installs the app. (For a dry run first, put the branch on a PR and add the `deploy` label, which
targets the same workflow.)
Expected: both the Deploy and Install steps succeed, and the new `deals-board-events` route answers
`GET <functions base URL>/deals-board/events`.

- [ ] **Step 4: Two-browser acceptance check**

Open the «Реализация» board in two browsers logged in as different users. In browser A change a deal
stage, then a line-item stage, then add a comment.
Expected: each change appears in browser B within about 1–2 seconds without F5. The board console
shows no `Deals Board events: poll` errors.

- [ ] **Step 5: Restart resilience check**

Restart the crmparser container while both boards stay open.
Expected: within a few seconds each board issues a poll that returns `reset: true`, refetches, and
keeps working; no page reload needed. Logs show the consumer reconnecting and a `RESYNC` entry being
journalled.

- [ ] **Step 6: Record the outcome**

Append a short section to `docs/superpowers/notes/2026-08-07-deals-board-realtime-sse-diagnosis.md`
stating that SSE in the front component was replaced by the long-poll hub, with the observed latency
from Step 4 and anything surprising from Steps 1–5.

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/notes/2026-08-07-deals-board-realtime-sse-diagnosis.md
git commit -m "docs(deals-board): record long-poll realtime verification results"
```






