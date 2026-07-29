# Deals Board Cold-Load Performance (Diet + Aggregate) — Design

**Date:** 2026-07-29  
**Status:** Approved in chat (scope B: board + native Twenty; approach 1+2; Finish ≤ ~2s)  
**Related:** [2026-07-24-deals-board-perf-wave-c-design.md](./2026-07-24-deals-board-perf-wave-c-design.md) (Wave C — RQ defaults, lazy rashod, narrow `fetchAll` for tight presets)

## Context

Staging Network (user evidence):

| Tab | ~Requests | ~Finish |
| --- | --------- | ------- |
| Native Opportunities (F5) | ~512 | ~6.5s |
| Реализация (F5) | ~526 | ~7.1s |

Native tab is dominated by Twenty core `metadata` + `graphql` from host `index-….js` (not BrandingTwentyView). Реализация adds board waterfall: views → (often duplicate) metadata → opportunities (`fetchAll` when `showAll` / heavy presets) → dealLineItems → list-status / rashod.

Default view «Будущие сделки» ships with `datePreset: 'future'` and `showAll: true` (`FUTURE_DEALS_VIEW_FILTERS`) → worst-case cold path even after Wave C.

## Goals

1. **Реализация:** board-owned cold waterfall Finish ≤ ~2s on staging F5 (opportunities + line items + required enrich for first paint).
2. **Native Opportunities:** best-effort toward ≤ ~2s via Dokploy / cache / Twenty version / metadata bloat we can control. If measured **shell-only** Finish stays above 2s, that floor is documented — not treated as a BrandingTwentyView code failure.
3. Preserve existing board UX (filters, expand, realtime, analytics rashod) without visual redesign.

## Non-goals

- Rewriting Twenty core frontend (`index-….js`).
- Parent-row virtualization (unless D1+D2 leave expand/scroll still unacceptable).
- Wave A write pipeline / Wave B unfiltered KPI universe.
- Hard CI timing gates (manual Network checklist only).

## Approach (chosen)

**Request diet (D1) + aggregate board logic function (D2)**, with a thin parallel **native/infra** track.

Phasing: **D1 → D2 → native notes**. D1 alone must improve cold load; D2 is the main cut for request count on Реализация.

## Architecture

```
┌─ Twenty shell (native) ─────────┐   ┌─ BrandingTwentyView board ─────────────────┐
│ metadata + graphql ×N           │   │ D1: default view, gate secondary fetches   │
│ Dokploy / cache / upgrade       │   │ D2: LF deals-board-page → one payload      │
│ (best-effort ≤2s)               │   │ Client RQ hydrate; fallback multi-call     │
└─────────────────────────────────┘   └────────────────────────────────────────────┘
```

### Target cold path (board)

1. Views + single metadata read.
2. One aggregate LF (after D2) or paginated opps + batched line items (after D1): first page only; no `showAll` dump.
3. Secondary: list-status (after paint or inside LF), rashod only with analytics strip (Wave C).

## D1 — Request diet

| Piece | Change |
| ----- | ------ |
| `FUTURE_DEALS_VIEW_FILTERS` | Set `showAll: false`; keep `datePreset: 'future'`. Session toggle «все» still allowed. |
| Stored views | Migrate/seed so default «Будущие» is not stuck with `showAll: true` if already persisted. |
| `future` + `fetchAll` | Prefer paginated GraphQL when server date filter can express «from today»; keep `fetchAll` only when client-only date matching or line-item search requires it. Exact `shouldFetchAllOpportunities` rule finalized in implementation plan against `buildOpportunityDateFilter` / `opportunityMatchesDateFilter`. |
| Metadata | Single `useObjectFields` (or equivalent) path; no duplicate `/metadata` on cold open from board helpers. |
| Rashod | Confirm cold open never blocks on rashod (Wave C lazy path). |
| list-status | Prefetch after first rows paint, or fold into aggregate; not on critical path for mounting the table. |
| REST enrich | Column/visible fields only; parallelize remaining batch calls if still N sequential. |

## D2 — Aggregate logic function

| Piece | Role |
| ----- | ---- |
| New LF `deals-board-page` | Input: filters, sort, limit, offset, field-selection flags. Output: `{ opportunities, totalCount, lineItemsByOppId, listStatusByLineItemId? }`. |
| Server work | Same auth pattern as existing LFs; load opportunity page; batch line items by opportunity ids; optionally reuse existing crmparser list-status batch. |
| Client | `fetchDealsBoardPage` (or rename) as primary cold loader; hydrate React Query keys for opportunities and line items so expand / realtime / mutations keep working. |
| Fallback | On LF timeout/5xx → existing multi-request path; warn once; board must not stay blank. |
| Partial failure | Opps OK / line items fail → show parents; load lines on expand via existing fetch. |

Mobile `forcePaginated` behavior remains; aggregate always respects limit/offset.

## Native Twenty track

1. Measure shell-only Finish (Opportunities tab, no board mount).
2. Dokploy / staging: caching, Redis, HTTP, Twenty release notes for metadata/graphql storms.
3. Only if clearly helpful: reduce unused custom object/field metadata bloat.
4. Does not block D1/D2 shipping.

## Error handling

- list-status / crmparser unavailable → chips degrade as today; never block table.
- Metadata failure → existing warning banner; no retry storm.
- Aggregate failure → automatic multi-call fallback.
- Realtime invalidation invalidates aggregate query key **and** child opportunities/line-items keys consistently with today’s semantics.

## Testing & verification

| Layer | Coverage |
| ----- | -------- |
| Unit | Default view filters (`showAll: false`); `shouldFetchAll` for `future` without `showAll`; LF response mapper / hydrate helpers; fallback branch if extracted as pure logic |
| Manual staging | Baseline F5 Network (Opportunities + Реализация); after D1; after D2 |
| Smoke | Default «Будущие»; toggle showAll; today/week; expand 5 deals; analytics rashod still loads |

### Success criteria

1. After D1: default cold open no longer dumps all deals via `showAll`; board-owned request volume and Finish trend down vs baseline.
2. After D2: cold Реализация ≈ one primary board LF (+ Twenty shell); **board-owned** Finish ≤ ~2s on staging.
3. Full-tab Finish ≤ ~2s when shell allows; otherwise shell floor documented with evidence.
4. `yarn test:unit` green for touched tests.
5. Fallback path verified (simulate LF failure once in staging or unit).

## Expected files (indicative)

| Path | Role |
| ---- | ---- |
| `src/constants/future-deals-view.ts` | Default `showAll: false` |
| `src/deals-board/utils/date-filters.ts` (+ tests) | `future` / `fetchAll` narrowing |
| `src/deals-board/hooks/useOpportunities.ts` / new `useDealsBoardPage` | Wire aggregate + hydrate |
| `src/deals-board/api/*` | Client for aggregate; metadata dedupe |
| `src/logic-functions/deals-board-page.ts` | Aggregate LF |
| `src/deals-board/hooks/useLineItemListStatus.ts` / `DealsBoard.tsx` | Defer list-status; rashod already lazy |
| Dokploy / ops notes | Native track (may live outside this repo) |

## Relation to Wave C

Wave C remains in force: RQ staleTime / keepPreviousData, lazy rashod, tight presets skip `fetchAll`. This wave does not reopen those decisions except where `future` + default `showAll` must change to meet the cold-load goal.
