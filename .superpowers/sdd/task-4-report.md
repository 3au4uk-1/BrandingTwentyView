# Task 4 Report: SSE lifecycle — register on connect + reconnect backoff

## Status: DONE

## Summary

Rewrote `useDealsBoardRealtimeSync` to register query listeners on graphql-sse `connected` (with `setTimeout(0)` fallback), disable internal retries (`retryAttempts: 0`), and own reconnect with fresh `eventStreamId` + exponential backoff capped at 5 failures. Added `sse-log.ts` and `sse-reconnect.ts` helpers.

## TDD Evidence

### RED — Step 2

```
npx vitest run --config vitest.unit.config.ts src/deals-board/realtime/sse-reconnect.test.ts
```

Result: **FAIL** — module `./sse-reconnect` not found (expected).

### GREEN — Step 4 / Step 6

```
npx vitest run --config vitest.unit.config.ts src/deals-board/realtime/
```

Result: **14 passed** (3 files: sse-reconnect 3, resolve-event-patch 4, apply-object-record-event 7)

## Files Changed

| File | Change |
|------|--------|
| `src/deals-board/realtime/sse-reconnect.ts` | `computeReconnectDelayMs`, `MAX_CONSECUTIVE_SSE_FAILURES` |
| `src/deals-board/realtime/sse-reconnect.test.ts` | Backoff unit tests per brief |
| `src/deals-board/realtime/sse-log.ts` | Stage-tagged `logDealsBoardSseError` |
| `src/deals-board/realtime/useDealsBoardRealtimeSync.ts` | Register on connect, session restart loop, teardown/unregister |

## Commit

```
5ea13d2 fix(deals-board): register SSE listeners on connect and reconnect with backoff
```

## Self-Review

- **Double register:** `didRegister` gate makes `connected` + `setTimeout(0)` idempotent.
- **Session teardown races:** `ensureQueryListeners` and `handleSubscriptionPayload` check `disposed` and `activeStreamId === eventStreamId`; stale register unregisters orphan stream id.
- **Dispose:** effect cleanup sets `disposed`, clears reconnect timer, calls `teardownActive` (dispose subscription/client + unregister when registered).
- **graphql-sse sink:** `complete` callback accepted by client v2.6.0 (`.then(() => sink.complete())` in client.js); no type errors.
- Lint clean on modified files.

## Concerns

1. **No hook integration test** — lifecycle verified by code review; unit coverage only on backoff helper.
2. **Pause after 5 failures** — board stays stale until remount/refresh; intentional per spec.
3. **`complete` path** — increments failure count without explicit log (only triggers restart via `scheduleRestart`).

## Review Fix (2026-08-07)

Addressed Important findings from Task 4 review.

### Changes

1. **In-flight register guard** — added `registerInFlight` flag set before `await registerDealsBoardEventStreamQueries`, cleared in `finally`. Prevents `connected` + `setTimeout(0)` from both entering register before `didRegister` is set.
2. **Session guard on `complete` / `error`** — both handlers now return early when `disposed || activeStreamId !== eventStreamId`, matching `handleSubscriptionPayload`. Intentional dispose no longer double-counts toward the 5-failure cap.

### Tests

```
npx vitest run --config vitest.unit.config.ts src/deals-board/realtime/
```

Result: **14 passed** (3 files: sse-reconnect 3, resolve-event-patch 4, apply-object-record-event 7)

### Commit

```
6ac14b2 fix(deals-board): guard SSE register in-flight and ignore dispose complete
```

## Final Review Fix (2026-08-07)

Addressed Important findings from whole-branch review.

### Changes

1. **Teardown order** — `teardownActive` now nulls `activeStreamId` / `didRegister` before calling `activeDispose()`, so dispose-triggered `complete`/`error` see a stale session and return early. `streamId` / `shouldUnregister` captured first so unregister still runs.
2. **Session-scoped `registerInFlight`** — moved from effect scope into `startSession` closure so a new session is never blocked by a prior session’s in-flight register; still prevents double register within one session (`connected` + `setTimeout(0)`).

### Tests

```
npx vitest run --config vitest.unit.config.ts src/deals-board/realtime/
```

Result: **14 passed** (3 files: sse-reconnect 3, resolve-event-patch 4, apply-object-record-event 7)

### Commit

```
(pending) fix(deals-board): clear SSE session state before dispose to avoid failure double-count
```
