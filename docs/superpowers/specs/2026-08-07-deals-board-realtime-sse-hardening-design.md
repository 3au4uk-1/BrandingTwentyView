# Deals Board realtime SSE hardening

**Date:** 2026-08-07  
**Status:** Approved in chat (approach 1 — fix & harden Twenty SSE; hybrid poll only as escalation)  
**Repo:** BrandingTwentyView

## Problem

When a colleague edits a deal on the board (stage, line-item stage, comment field, or any other watched CRM field), the change does not appear for other open board sessions until a hard refresh (F5). After F5 the data is correct — persistence is fine; **live delivery is broken**.

Previously this worked via Twenty metadata SSE. The board still mounts `useDealsBoardRealtimeSync`, but remote clients stay stale for **all** opportunity / dealLineItem updates.

## Goals

1. Remote opportunity and dealLineItem changes appear on an open board within **1–2 seconds** without F5.
2. Keep local optimistic edits; do not force full-board refetch on every successful SSE patch.
3. Make the SSE lifecycle diagnosable and recoverable (reconnect + re-register).

## Non-goals (MVP)

- Custom WebSocket / crmparser pub-sub channel.
- UI “live” badge / connection indicator.
- Subscribing to Twenty Notes / activity objects (unless the “comment” is a field on opportunity or dealLineItem).
- Implementing hybrid polling in the first change set (criteria only; see Escalation).

## Current architecture (as-is)

```
DealsBoard
  └─ useDealsBoardRealtimeSync(enabled)
       ├─ graphql-sse → POST/GET /metadata  OnEventSubscription(eventStreamId)
       ├─ after first subscription "next" → addQueryToEventStream(opportunity, dealLineItem)
       └─ on event → applyObjectRecordEvent(queryClient, event)
              ├─ patch opportunities + deals-board-page (patchOpportunityInCache)
              ├─ patch lineItems (+ syncDealStage when needed)
              └─ else invalidate opportunities|lineItems + deals-board-page
```

Key files:

| Area | Path |
|------|------|
| Hook | `src/deals-board/realtime/useDealsBoardRealtimeSync.ts` |
| Register/unregister | `src/deals-board/realtime/event-stream-api.ts` |
| Apply | `src/deals-board/realtime/apply-object-record-event.ts` |
| Cache patch | `src/deals-board/utils/opportunity-cache.ts` |
| Watched objects | `src/deals-board/realtime/constants.ts` |

Likely failure modes for a **total** blackout (any remote edit invisible):

1. SSE never connects or errors silently.
2. Query listeners never register — today registration waits on the first `next` (`streamReady`).
3. `addQueryToEventStream` fails (auth / API shape) and is only logged.
4. Events arrive but `properties.after` is empty / shape changed so apply no-ops incorrectly.
5. Secondary: mobile `accumulatedRecords` merges only new ids when `page > 0`, so patched RQ rows may not refresh the mobile list until reset.

## Approach

**Primary:** Fix and harden the existing Twenty SSE path (no new transport).

**Escalation (follow-up, not MVP code):** If after hardening production still shows no subscription events while CRM writes succeed, add hybrid fallback (SSE primary + quiet poll of aggregate page while stream is unhealthy).

## Design

### 1. Diagnosis (first implementation step)

Before or as part of the fix, verify on a two-client setup:

1. Network: long-lived `OnEventSubscription` to `/metadata` is open.
2. `addQueryToEventStream` runs for both query ids and returns `true`.
3. Colleague edit produces a subscription `next` with `objectRecordEventsWithQueryIds`.
4. If (3) is true but UI stale → inspect `properties.after` / `diff` and whether `deals-board-page` / `lineItems` were patched.

### 2. SSE lifecycle

Contract for `useDealsBoardRealtimeSync`:

1. Create `eventStreamId`, open graphql-sse client against metadata GraphQL URL with bearer from `resolveAccessToken` (refresh via host API on demand).
2. **Register query listeners as soon as the subscription is established** — do not wait for the first data `next`. Prefer the client’s connection/complete-open signal if available; otherwise register immediately after `subscribe()` returns, then tolerate duplicate-safe register.
3. On subscribe or register failure: `console.error` with stage tag (`subscribe` | `register` | `apply`), then **reconnect with backoff** using a new `eventStreamId` and full re-register.
4. Cap aggressive reconnect (pause after N consecutive register failures) so a dead API does not spin forever.
5. On unmount: dispose SSE; best-effort `removeQueryFromEventStream`.
6. On 401: one token refresh + retry before treating as hard failure.

### 3. Apply path and cache

Keep **patch-first** (retain perf intent of commit `1a42ad4`):

1. Watch only `opportunity` and `dealLineItem`.
2. For `UPDATED` / `UPSERTED` / `RESTORED`:
   - Prefer `properties.after` as patch.
   - If `after` is missing/empty and `diff` is present, derive a patch from `diff`.
3. Opportunity → `patchOpportunityInCache` (roots `opportunities` and `deals-board-page`).
4. Line item → patch `lineItems`; on stage-related updates run `syncDealStage` as today.
5. Successful patch → **no** invalidate.
6. Miss / `CREATED` / `DELETED` (and dealLineItem delete side effects) → invalidate the object’s list keys **and** `deals-board-page`.

### 4. Mobile accumulated list

When `visibleRecords` changes, `accumulatedRecords` must **update existing ids** in place (and append new ones), not only append unseen ids. Desktop continues to render `visibleRecords` from React Query directly.

### 5. Observability

- Structured `console.error` / warn with `Deals Board SSE:` and stage.
- No live badge in MVP.

### 6. Escalation criteria (hybrid follow-up)

Implement hybrid poll **only if**, after lifecycle hardening on production:

- CRM writes are visible after F5, and
- Diagnosis steps 1–3 still fail (no healthy event stream / no events).

Hybrid sketch (out of MVP scope): while SSE unhealthy, quiet refetch of current `deals-board-page` (and hydrated line-item keys) on a short interval; stop or slow when SSE is healthy again. Deduplicate against in-flight local mutations.

## Testing

**Unit**

- Apply: patch from `after`; patch from `diff` without `after`; invalidate on cache miss / `CREATED`; opportunity patch updates `deals-board-page` root.
- Accumulated-records helper: existing id fields update when `visibleRecords` changes.

**Manual**

- Two browsers/users: change deal stage, line-item stage, and a text/comment field on a watched record → second client updates in 1–2s without F5.
- Confirm Network: subscription open, register succeeds, events arrive.

## Success criteria

- Remote edits to watched objects appear within ~1–2s on an open board without refresh.
- Local edits remain snappy (no redundant full refetch on every successful SSE patch).
- SSE disconnects recover via reconnect + re-register without requiring page reload.
- If SSE remains dead on prod after this work, hybrid escalation is clearly justified by diagnosis evidence.
