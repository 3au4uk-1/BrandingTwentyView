# Deals Board F5 Load — Page LF + Early Fetch + Bundle Diet — Design

**Date:** 2026-07-31  
**Status:** Approved in chat (approach B; list-status deferred OK; sections 1–3 OK)  
**Evidence:** HAR `twenty.dosugmayak.ru.har` (F5 «Реализация»); canvas analysis in Cursor  
**Related:**
- [2026-07-29-deals-board-cold-load-perf-design.md](./2026-07-29-deals-board-cold-load-perf-design.md) (aggregate LF)
- [2026-07-24-deals-board-perf-wave-c-design.md](./2026-07-24-deals-board-perf-wave-c-design.md)
- [2026-07-30-deals-board-prod-perf-filters-design.md](./2026-07-30-deals-board-prod-perf-filters-design.md)
- crmparserv2 `ops/perf/results.md` (Workstreams A–C done; residual TTI)

## Context

After Traefik immutable assets + compress, F5 network transfer is tiny (~0.17 MB; 485/517 disk hits). Perceived load remains ~8–10s because of a **serial board waterfall** after Twenty shell metadata:

| Phase | Wall (HAR) | Owner |
| ----- | ---------- | ----- |
| JS parse (host + our sdk-client) | 0–2.5s+ | Host + our core ~756 KB + metadata sdk ~181 KB |
| Shell metadata GraphQL | ~3.0–3.4s | Twenty core |
| Client idle after metadata | ~3.4–5.0s | Host hydration (mostly out of scope) |
| Page layout + front-comp bootstrap | ~5.0–5.6s | Host + our sdk-client load |
| Idle before page POST | ~5.6–7.2s | **Our gate:** views + fields before `/s/deals-board/page` |
| Board data | ~7.2–8.1s | **`/s/deals-board/page` ~882 ms TTFB** |

Long 12s `/metadata` rows are `OnEventSubscription` — ignore for load timing.

`FrontComponentRenderer` **2.8 MB** is a **Twenty host** `/assets/` chunk — not BrandingTwentyView. We do not attempt to shrink it.

## Goals

1. **Warm `/s/deals-board/page` TTFB &lt; ~200 ms** on typical «Будущие» page (instrumented stages; exclude cold Postgres after restart).
2. **Start aggregate page fetch earlier** after front-comp mount — do not wait for `parentFieldsQuery.isLoading` or `viewsQuery.isSeedingDefault`.
3. **Drop client `MetadataApiClient`** so Twenty does not serve the separate **~181 KB metadata sdk-client** for this front component; keep prevyu upload via existing LF.
4. List-status badges may appear **~100–300 ms after** first rows (explicitly accepted).

## Non-goals

- Short-TTL server cache on the LF (reserve if still &gt;200 ms after this work).
- Patching Twenty host `FrontComponentRenderer` or shell metadata hydration.
- `React.lazy` / code-splitting for size (twenty-sdk front-component build uses **`splitting: false`**).
- Separate mobile front-component.
- CDN / re-tuning Traefik asset cache (already done).
- Changing legacy `useOpportunities` showAll cold path gates (except leaving them as today).

## Approach (chosen): B

1. LF pipeline: parallel enrich ∥ line-items; list-status off hot path.  
2. Client early aggregate fetch with provisional defaults.  
3. Bundle diet: remove client MetadataApiClient (real byte win); no React.lazy campaign.

## Architecture

```
Mount DealsBoard
  ├─ views + fields (parallel, non-blocking for aggregate)
  ├─ POST /s/deals-board/page  (provisional columns/filters ASAP)
  │     ├─ GQL opportunities
  │     └─ Promise.all([ REST enrich?, line-items ])
  │     └─ response: opportunities + lineItemsByOppId  (no listStatus)
  └─ usePrefetchLineItemListStatuses(ids)  → crmparser (deferred badges)
```

Prevyu upload (unchanged capability, new transport on client):

```
usePrevyuMediaActions → POST /s/prevyu-upload/:lineItemId  (LF already uses MetadataApiClient server-side)
files-field.ts → no twenty-client-sdk/metadata import
```

## Section 1 — `/s/deals-board/page` LF

**Files:**
- `src/logic-functions/deals-board-page.ts`
- `src/logic-functions/shared/deals-board-page-rest.ts` (unchanged API; call sites parallelize)
- tests under `src/logic-functions/` / existing page tests
- client: `src/deals-board/hooks/useDealsBoardPage.ts`, `DealsBoard.tsx` (list-status prefetch always on)

**Behavior:**
1. Parse/validate body as today.
2. GQL `opportunities` + `totalCount`.
3. After IDs known: run **`enrichOpportunityRowsWithRestFields` and `fetchLineItemsByOpportunityIds` in parallel** when both needed; if `restFieldNames` empty, only line-items.
4. **Never** call `fetchListStatusByLineItemId` / crmparser from this LF (ignore `includeListStatus` for hot path; field may remain on request type for back-compat but is a no-op).
5. Optional `_timings: { gqlMs, enrichMs, lineItemsMs, totalMs }` when request has `debug: true` or env flag — not shown in UI.

**Client:**
- Stop treating aggregate `listStatusHydrated` as reason to skip prefetch; always run `usePrefetchLineItemListStatuses` when line-item ids exist and crmparser is configured.
- Legacy multi-call fallback may keep or drop list-status in-assemble; prefer same deferred prefetch for consistency.

## Section 2 — Early aggregate fetch

**Files:**
- `src/deals-board/DealsBoard.tsx` (gates)
- possibly small helper for provisional view defaults
- tests around enable conditions if present; add unit coverage for gate helper if extracted

**Behavior:**
1. For `useAggregateColdPath` only:  
   `enabled = useAggregateColdPath && !viewsQuery.isError`  
   (remove waits on `parentFieldsQuery.isLoading` and `isSeedingDefault`; do not require `activeView` if provisional filters work).
2. Provisional data while views/seed incomplete:  
   filters/sort from `FUTURE_DEALS_VIEW_FILTERS` / `FUTURE_DEALS_VIEW_SORT`; columns `DEFAULT_PARENT_COLUMNS`; query key `viewId: activeView?.id ?? 'provisional-future'`.
3. `visibleCrmFieldNames` from columns even with empty field descriptors (existing `crmFieldNamesFromColumns`).  
   `restFieldNames` / `fieldTypesByName` start empty → faster first LF (no enrich); refetch when metadata arrives and key changes.
4. Legacy `useOpportunities` path keeps current `baseColdLoadEnabled` (views ready + fields ready).

**Risk:** one extra refetch when provisional ≠ real view — acceptable; normal F5 has `activeView` soon after views query.

## Section 3 — Bundle diet (metadata sdk-client)

**Clarification:** Host `FrontComponentRenderer` 2.8 MB is out of scope. Target our HAR rows:
- sdk-client **core** ~756 KB (shrink only via true unreferenced tree-shake)
- sdk-client **metadata** ~181 KB → **eliminate** by removing client `MetadataApiClient`

**Files:**
- `src/deals-board/api/files-field.ts` — remove `MetadataApiClient`; rewrite `uploadPrevyuImageFile` to call LF (needs `lineItemId`) **or** fold upload into `usePrevyuMediaActions` via `POST .../prevyu-upload/:lineItemId` and delete client metadata upload
- `src/deals-board/editors/prevyu/usePrevyuMediaActions.ts` — use LF response `files` (LF already patches); avoid double-patch when possible
- `src/deals-board/api/files-field.test.ts` — update mocks
- Prefer reusing **`prevyu-upload`** LF (already production); no new LF unless file-only upload without patch is required

**Verify:** after `yarn twenty apply`, Network on F5 should not request `/rest/sdk-client/metadata/...` for this app; core checksum may change.

Light audit: drop any other easy unused top-level imports that keep large modules referenced. No React.lazy campaign.

## Success metrics

| Metric | Target |
| ------ | ------ |
| LF warm TTFB (`_timings.totalMs` or DevTools) | &lt; ~200 ms typical page |
| Time from front-comp mount → page POST start | noticeably earlier than fields+seed gate (HAR idle 5.6–7.2s shrinks) |
| `/rest/sdk-client/metadata/...` on board F5 | absent |
| List-status chips | appear shortly after rows; no permanent missing |
| Prevyu upload from cell / modal | still works (LF path) |

## Test plan

- Unit: LF handler — enrich ∥ line-items; list-status never called; timings optional.
- Unit: gate/provisional enable logic.
- Unit: files-field / media actions without MetadataApiClient (mock `fetch` to LF).
- `yarn test:unit` green.
- Manual: F5 «Реализация» on staging — Network: page TTFB, no metadata sdk-client, badges populate; upload one prevyu file.

## Rollback

Revert BrandingTwentyView commits; `yarn twenty apply`. No infra changes in this workstream.

## Out of scope / follow-ups

- Short-TTL LF cache if warm still &gt;200 ms.
- Host shell metadata / FrontComponentRenderer.
- RAM / 16s spike investigation (crmparserv2 reserve).
