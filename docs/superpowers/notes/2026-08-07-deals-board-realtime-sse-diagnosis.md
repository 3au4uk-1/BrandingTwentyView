# Deals Board SSE diagnosis

**Date:** 2026-08-07  
**Last updated:** FLEET HAR + prod bundle inspection (Aug 7 ~15:08–15:12Z)

## Symptom

Remote board edits invisible until F5. Persistence OK → live delivery broken.

## Evidence chain

### 1. July HAR — register OK, no publish

- `addQueryToEventStream` returned `true` for deals-board queries
- App/API token streams → publisher skips (no usable role intersection)
- Fix shipped: prefer host user token (`e22d43d`)

### 2. `twenty.dosugmayak.ru _ new.har` (~14:37Z)

- Board SSE open, **zero** deals-board `addQuery`
- Cause: code waited only for subscription `next`; `next` never arrived
- Fix shipped: register on graphql-sse `connected` (`0a3e141`)

### 3. FLEET HAR (`_ new_new_new_FLEET.har`, ~15:08Z) — after `0a3e141` CD

| Fact | Detail |
|------|--------|
| Board SSE | `0db13278…` open **~228s** |
| deals-board `addQuery` | **0** |
| Host `addQuery` | `front-component-updated-…` → `true` |
| Prod FC checksum | `8d17a2d9…` |
| Prod bundle markers | `credentials:"include"`, `connected→register`, `deals-board-opportunities` — **new code is live** |
| FC network fetch | **0** `/rest/front-components/…` (Cache Storage hit; content hash matches checksum) |

**Conclusion:** Deployed code that registers on `connected` still never issues deals-board `addQuery`. So either `connected`/`next` never run the register path in this host/iframe environment, or register hangs before `fetch` (e.g. second `requestAccessTokenRefresh`). Traefik is **not** required to explain missing `addQuery` (client never POSTs it). Same `/metadata` path serves working host SSE+addQuery.

### 4. Side finding (search flood) — separate bug

~1142 identical `GET /rest/dealLineItems?name[ilike]:"%1%"&after=<stuck cursor>` — pagination loop in `fetchLineItemOpportunityIdsBySearch`. Not the SSE root cause.

## Next fix (in progress)

1. Kick `addQuery` on timers (`0 / 300 / 1000 / 2500 ms`) — do not depend on graphql-sse `connected`/`next`
2. Cache session Bearer from first resolve — avoid re-entrant host token refresh before register
3. `console.info` on register attempt/ok for Network+Console QA

## Traefik?

**Unlikely primary cause.** Host and board share `/metadata` through the same edge. Missing deals-board `addQuery` is a client-side call that never appears. Traefik SSE buffering could still contribute to “no `next` events”, but only after listeners exist.

## Manual QA after next deploy

1. Hard refresh (or clear Cache Storage `front-component-source-v1` if checksum stuck)
2. Console: `Deals Board SSE: register — attempt via timer-…` then `register — ok`
3. Network: two `AddQueryToEventStream` for `deals-board-opportunities` / `deals-board-line-items` → `true`
4. Colleague stage edit → observer ≤2s without F5
