# Wave C — Deals Board Performance — Design

**Date:** 2026-07-24  
**Status:** Approved in chat (speed goals both; order C1→C2→C3; B deprioritized)  
**Scope:** Faster open/filter and smoother expand of 5–10 deals on Реализация  
**Out of scope:** Honest KPI isolation from filtered page (wave B), unified write pipeline (wave A), Toni/Bitrix/parser finance sync, visual redesign, parent-row virtualization (unless C1–C2 leave expand still slow)

## Context

The board feels right visually (Apple ops UI). Engineering bottlenecks:

1. Module-level `QueryClient` with no helpful defaults → frequent refetch / lost previous page on filter change.
2. Every opportunities fetch REST-enriches `rashod*` fields (Wave 5 requirement) even when the table never displays them — MarginStrip/Analytics are the only consumers.
3. `shouldFetchAllOpportunities` returns true for **any** date filter, including tight presets (today / tomorrow / dayAfterTomorrow / week), forcing a full list + client filter.
4. Row hover is React state (`hoveredRowId`) → whole table re-renders on pointer move.

Success criteria (both required):

- Open / change common date presets feels under 1–2s on local seed (~50 opps).
- Expanding 5–10 deals stays smooth (no hover jank / cascade re-renders).

## Decisions

1. **Order:** C0 measure → C1 RQ + lazy rashod → C2 narrow `fetchAll` → C3 lighter table.  
2. **Wave 5 data coupling revised:** table fetch no longer always merges `OPPORTUNITY_RASHOD_REST_FIELDS`. Finance UI loads rashod on its own path. KPI still may reflect the **currently loaded** opportunity set (wave B remains deferred).  
3. **`fetchAll` keep for:** `month`, `future`, `custom`, raw `dateFrom`/`dateTo` without a tight preset, any line-item filter clauses, `showAll` (handled in `useOpportunities`).  
4. **`fetchAll` drop for:** presets `today` | `tomorrow` | `dayAfterTomorrow` | `week`. Default `loadDate` sort does **not** force `fetchAll` (otherwise C2 would be a no-op because `getEffectiveOpportunitySort` always injects it). Cancelled-last reordering applies per fetched page when paginated.
5. **Virtualization:** not in the default C3 path; only a follow-up if expand is still slow after C1–C3.

## C0 — Baseline

Before code changes, capture rough timings on localhost with the existing ~50-opp seed:

| Scenario | What to note |
| -------- | ------------ |
| Cold open Реализация | Time to first painted rows |
| Switch today → week (and back) | Network + UI settle |
| Expand 5–10 deals | Scroll/hover smoothness |

Dev-only `performance.now` logs or Performance panel are enough. No permanent timing UI. Re-measure after C1, C2, C3.

## C1 — React Query defaults + lazy rashod

### QueryClient

In `DealsBoard.tsx` (module `queryClient`):

- `defaultOptions.queries.staleTime`: 30_000–60_000 ms for board data.  
- `refetchOnWindowFocus: false`.  
- Prefer keeping previous opportunities data while a filter/page query is in flight (`placeholderData: keepPreviousData` or equivalent on the opportunities query / defaults where safe).

Do not change mutation invalidation semantics; writes still invalidate as today.

### Rashod enrichment

- Remove unconditional spread of `OPPORTUNITY_RASHOD_REST_FIELDS` from `opportunityRestFieldNames` used by `useOpportunities`.  
- Table REST enrich = column-driven fields only (existing `resolveOpportunityRestFieldNames`).  
- MarginStrip / AnalyticsPanel: introduce a dedicated lightweight fetch (or enrich) for current-month (or visible) opportunities’ `rashod*` fields when the strip/panel is mounted. Prefer one batched REST/Graph path over N per-row calls.  
- Chip/panel may show a short loading state for expense/margin while rashod loads; **turnover from line amounts** can still use already-loaded line items.  
- If strip is always mounted: rashod query runs in parallel with the table, not on the table’s critical path.

## C2 — Narrow `shouldFetchAllOpportunities`

Update `src/deals-board/utils/date-filters.ts`:

```ts
// Pseudocode — exact implementation in plan
shouldFetchAll =
  hasLineItemFilterClauses(clauses)
  || datePreset is custom
  || (
    buildOpportunityDateFilter(filters)
    && datePreset is NOT one of: today | tomorrow | dayAfterTomorrow | week
  )
```

Only those four presets skip `fetchAll` when there are no line-item filter clauses. Sort does not affect this decision. Any other preset (`month` | `future` | `custom`) or missing preset with a built date filter keeps `fetchAll`. Paginated path uses existing `buildOpportunityDateFilter`.

Update `date-filters.test.ts` accordingly (flip expectations for tight presets from `true` → `false` when no line-item clauses, including under the default date sort).

Manual check: pagination still works under «сегодня» / «неделя»; row counts match filter intent.

## C3 — Lighter table

1. Extract or wrap deal parent row in `React.memo` with stable callback props from parent (avoid inline lambdas that break memo where cheap to fix).  
2. Replace `hoveredRowId` React state with CSS `:hover` row styles in `DealsDataTable` / row styles — remove hover props that force full-table re-render.  
3. Keep current expand behavior: do not mount heavy line-item editors for collapsed rows.  
4. Parent virtualization: **only if** post-C1–C3 expand of 5–10 deals is still unsatisfactory on 50+ rows.

Preserve Apple ops UI tokens; no visual redesign.

## Testing

| Layer | Coverage |
| ----- | -------- |
| Unit | `shouldFetchAllOpportunities` matrix (presets × sort × line-item clauses) |
| Unit | Any new rashod-fetch helper (pure merge / field list) if extracted |
| Manual | Open board, switch today/week, expand deals, confirm MarginStrip still shows numbers when rashod present |
| Unit suite | `yarn test:unit` green for touched packages |

## Files (expected)

| Path | Role |
| ---- | ---- |
| `src/deals-board/DealsBoard.tsx` | QueryClient defaults; stop merging rashod into table REST list; wire finance fetch |
| `src/deals-board/hooks/useOpportunities.ts` | keepPreviousData / query options if not only on client |
| `src/deals-board/utils/date-filters.ts` + `.test.ts` | Narrow `shouldFetchAllOpportunities` |
| `src/deals-board/analytics/MarginStrip.tsx` / `AnalyticsPanel.tsx` (+ optional hook) | Lazy rashod |
| `src/deals-board/DealsTable/DealsTable.tsx` | Drop hover state |
| `src/deals-board/DealsTable/DealsDataTable.tsx` (+ row component) | CSS hover; memo |

## Non-goals (explicit)

- Fixing scoreboard/analytics to use an unfiltered month universe (wave B).  
- Unifying `useUpdateRecord` / stage sync write paths (wave A).  
- Replacing `alert` error UX.  
- Parser / Toni / Bitrix expense truth.

## Success criteria

1. Tight date presets no longer trigger `fetchAll` unless line-item filters apply; date sort alone does not force it.  
2. Table opportunities request does not REST-enrich `rashod*` solely for the finance chip.  
3. Hovering rows does not re-render the entire table via React hover state.  
4. Baseline C0 vs post-C3: open/filter and expand feel within the stated goals on local seed.  
5. `yarn test:unit` passes for changed tests.
