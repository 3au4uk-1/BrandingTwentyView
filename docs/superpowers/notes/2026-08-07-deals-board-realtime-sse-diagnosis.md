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

## RESOLVED (Aug 7 ~16:00Z) — SSE cannot work in a front component

Every hypothesis above (token type, register timing, Traefik) is dead. Root cause is the host
fetch bridge. Front components run in a Web Worker with an opaque origin, so the host replaces
their `fetch` with a `postMessage` bridge that buffers the whole body:

```js
d4 = async (response) => {
  ...
  let body = await response.text();            // never resolves for an open stream
  return { status, statusText, headers, body }; // serialized string
}
```

The host performs the request itself with `credentials: "omit"` (so our `credentials: 'include'`
was inert) and awaits `response.text()`. For `text/event-stream` the worker's `fetch` promise
never resolves, so `graphql-sse` gets no `Response`, no `connected`, no `next` — matching the
HAR exactly (stream open 48s/228s, register only via our timers). The bridge has no
`ReadableStream` and no `text/event-stream` handling; streaming is unsupported by design. The
bridge API also exposes no way to subscribe to the host's own record events.

Server side is fully healthy. Live Node probe with the same application token and the same
`operationSignature` received `CREATED`, `UPDATED` (`updatedFields: ["name"]`) and `DESTROYED`
in 150–500 ms. Twenty publishes nothing when an update does not change a value — that is what
masked the first probe run.

Design for the replacement transport (event hub in crmparserv2 + long-poll through a logic
function): `docs/superpowers/specs/2026-08-07-deals-board-realtime-longpoll-design.md`.
