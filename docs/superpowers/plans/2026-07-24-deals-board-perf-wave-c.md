# Wave C — Deals Board Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Реализация open/filter under ~1–2s and keep expanding 5–10 deals smooth by fixing React Query defaults, lazy `rashod*` REST, narrowing `fetchAll`, and removing hover-driven full-table re-renders.

**Architecture:** Table opportunities stay column-driven and paginated for tight date presets. Finance chip/panel enrich `rashod*` on a parallel query. Default `loadDate` sort no longer forces `fetchAll` (critical: today it always does). Row hover moves to CSS; `DealRow` becomes memoized.

**Tech Stack:** React 19, `@tanstack/react-query` v5 (`keepPreviousData`), Vitest, existing `enrichOpportunityRowsWithRestFields` REST helper.

**Spec:** `docs/superpowers/specs/2026-07-24-deals-board-perf-wave-c-design.md`

## Global Constraints

- Order: C0 → C1 → C2 → C3; do not skip ahead
- Do **not** implement wave B (KPI from unfiltered month) or wave A (unified writes)
- Do **not** touch Toni/Bitrix/parser expense sync
- Preserve Apple ops UI tokens; no visual redesign beyond CSS row `:hover`
- Parent-row virtualization is **out of scope** unless a follow-up note after C3 says expand is still slow
- TDD for pure helpers (`shouldFetchAllOpportunities`, any merge helper)
- Use `corepack yarn` on Windows if `yarn` is missing from PATH
- Prefer ASCII worktree path if Cyrillic username breaks vitest
- No version bump until final task; then bump `package.json` patch (e.g. `0.5.1` → `0.5.2`)
- **C2 refinement (required for success):** Spec said “keep fetchAll for date-field sort”, but `useOpportunities` always applies default `loadDate` sort via `getEffectiveOpportunitySort`, so that rule would leave `fetchAll` permanently on. Implementation: date-sort alone does **not** force `fetchAll`. Tight presets paginate; wide presets / raw custom ranges / line-item clauses still `fetchAll`. Update the design spec in the C2 commit to match.

---

## File structure

| File | Responsibility |
|------|----------------|
| `docs/superpowers/specs/2026-07-24-deals-board-perf-wave-c-design.md` | Amend C2 date-sort rule (with C2 commit) |
| `src/deals-board/DealsBoard.tsx` | QueryClient defaults; stop merging rashod into table REST; wire rashod hook → strip/panel |
| `src/deals-board/hooks/useOpportunities.ts` | `placeholderData: keepPreviousData` |
| `src/deals-board/hooks/useOpportunityRashodFields.ts` | Parallel rashod REST enrich for finance UI |
| `src/deals-board/hooks/useOpportunityRashodFields.test.ts` | Pure id-key / merge helper tests if extracted |
| `src/deals-board/utils/date-filters.ts` | Narrow `shouldFetchAllOpportunities` |
| `src/deals-board/utils/date-filters.test.ts` | Flip tight-preset expectations |
| `src/deals-board/analytics/MarginStrip.tsx` | Optional expense-loading affordance |
| `src/deals-board/analytics/AnalyticsPanel.tsx` | Consume rashod-enriched opportunities |
| `src/deals-board/DealsTable/DealsTable.tsx` | Remove `hoveredRowId` state |
| `src/deals-board/DealsTable/DealsDataTable.tsx` | Drop hover props; stable expand callbacks |
| `src/deals-board/DealsTable/DealRow.tsx` | `memo`; remove hover props; `data-deal-row` |
| `src/deals-board/theme/GlobalThemeStyles.tsx` | CSS `:hover` for deal rows |
| `package.json` | Patch version bump last |

---

### Task 0: C0 — Baseline timings (manual, no code)

**Files:** none (notes only; paste into PR/commit message later if useful)

**Interfaces:**
- Consumes: local Twenty at `http://localhost:2020`, ~50-opp seed
- Produces: rough baseline numbers for cold open, today↔week, expand 5–10

- [ ] **Step 1: Measure cold open**

Open Реализация. In DevTools Performance or Network, note time until parent rows are visible. Write down ~seconds.

- [ ] **Step 2: Measure preset switch**

Switch date preset today → week → today. Note whether Network shows multi-page `fetchAll` (200-limit loops) vs a single page request.

- [ ] **Step 3: Measure expand**

Expand 5–10 deals; move mouse across rows. Note jank / full-table feel.

- [ ] **Step 4: Commit nothing**

No code. Proceed to Task 1.

---

### Task 1: C1a — QueryClient defaults + keepPreviousData

**Files:**
- Modify: `src/deals-board/DealsBoard.tsx` (module `queryClient`)
- Modify: `src/deals-board/hooks/useOpportunities.ts`

**Interfaces:**
- Consumes: `@tanstack/react-query` `QueryClient`, `keepPreviousData`
- Produces: board-wide query defaults; opportunities query keeps prior page while refetching

- [ ] **Step 1: Update module QueryClient**

In `DealsBoard.tsx`, replace:

```ts
const queryClient = new QueryClient();
```

with:

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});
```

Do not change mutation defaults.

- [ ] **Step 2: Keep previous opportunities while filters/page change**

In `useOpportunities.ts`, add import and option:

```ts
import { keepPreviousData, useQuery } from '@tanstack/react-query';
```

```ts
  return useQuery({
    queryKey: opportunitiesQueryKey(
      // ...existing args
    ),
    queryFn: async () => {
      // ...unchanged
    },
    enabled: params.enabled !== false,
    placeholderData: keepPreviousData,
  });
```

- [ ] **Step 3: Sanity check unit suite still green**

Run:

```bash
corepack yarn test:unit
```

Expected: PASS (no test changes required for this task).

- [ ] **Step 4: Commit**

```bash
git add src/deals-board/DealsBoard.tsx src/deals-board/hooks/useOpportunities.ts
git commit -m "perf: add React Query staleTime and keepPreviousData for opportunities"
```

---

### Task 2: C1b — Lazy rashod enrich for finance UI

**Files:**
- Create: `src/deals-board/hooks/useOpportunityRashodFields.ts`
- Create: `src/deals-board/hooks/opportunity-rashod-query-key.ts` (tiny pure helper for tests)
- Create: `src/deals-board/hooks/opportunity-rashod-query-key.test.ts`
- Modify: `src/deals-board/DealsBoard.tsx`
- Modify: `src/deals-board/analytics/MarginStrip.tsx` (optional `isExpenseLoading` prop)
- Modify: `src/deals-board/analytics/AnalyticsPanel.tsx` (consume enriched rows; already takes `opportunities`)

**Interfaces:**
- Consumes: `enrichOpportunityRowsWithRestFields`, `OPPORTUNITY_RASHOD_REST_FIELDS`, `OpportunityRow[]`
- Produces:
  - `buildOpportunityRashodQueryKey(ids: readonly string[]): readonly ['opportunity-rashod', string]`
  - `useOpportunityRashodFields(opportunities: OpportunityRow[], enabled?: boolean): { opportunities: OpportunityRow[]; isLoading: boolean; isFetching: boolean }`

- [ ] **Step 1: Write failing test for query-key helper**

Create `src/deals-board/hooks/opportunity-rashod-query-key.ts`:

```ts
export const buildOpportunityRashodQueryKey = (
  ids: readonly string[],
): readonly ['opportunity-rashod', string] =>
  ['opportunity-rashod', [...ids].sort().join(',')] as const;
```

Create `src/deals-board/hooks/opportunity-rashod-query-key.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { buildOpportunityRashodQueryKey } from './opportunity-rashod-query-key';

describe('buildOpportunityRashodQueryKey', () => {
  it('sorts ids so key is order-independent', () => {
    expect(buildOpportunityRashodQueryKey(['b', 'a'])).toEqual(
      buildOpportunityRashodQueryKey(['a', 'b']),
    );
  });

  it('changes when membership changes', () => {
    expect(buildOpportunityRashodQueryKey(['a'])).not.toEqual(
      buildOpportunityRashodQueryKey(['a', 'b']),
    );
  });
});
```

- [ ] **Step 2: Run test (helper already implemented in step 1 — confirm PASS)**

Run:

```bash
corepack yarn vitest run --config vitest.unit.config.ts src/deals-board/hooks/opportunity-rashod-query-key.test.ts
```

Expected: PASS.

- [ ] **Step 3: Implement `useOpportunityRashodFields`**

Create `src/deals-board/hooks/useOpportunityRashodFields.ts`:

```ts
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { OPPORTUNITY_RASHOD_REST_FIELDS } from 'src/constants/opportunity-rashod-fields';

import { enrichOpportunityRowsWithRestFields } from '../api/opportunity-link-fields-rest';
import type { OpportunityRow } from '../types';
import { buildOpportunityRashodQueryKey } from './opportunity-rashod-query-key';

export const useOpportunityRashodFields = (
  opportunities: OpportunityRow[],
  enabled = true,
) => {
  const ids = useMemo(
    () => opportunities.map((opportunity) => opportunity.id),
    [opportunities],
  );

  const query = useQuery({
    queryKey: buildOpportunityRashodQueryKey(ids),
    queryFn: () =>
      enrichOpportunityRowsWithRestFields(opportunities, OPPORTUNITY_RASHOD_REST_FIELDS),
    enabled: enabled && ids.length > 0,
    staleTime: 30_000,
  });

  return {
    opportunities: query.data ?? opportunities,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
};
```

Note: when `ids` is empty, return base `opportunities` and skip fetch.

- [ ] **Step 4: Stop merging rashod into table REST list**

In `DealsBoard.tsx`:

1. Remove import of `OPPORTUNITY_RASHOD_REST_FIELDS` if unused after change.
2. Change `opportunityRestFieldNames` to column-driven only:

```ts
  const opportunityRestFieldNames = useMemo(
    () =>
      resolveOpportunityRestFieldNames(
        mergedParentColumns,
        parentFieldsQuery.data ?? [],
      ),
    [mergedParentColumns, parentFieldsQuery.data],
  );
```

3. After `visibleRecords` / `visibleLineItems` are available, call:

```ts
  const rashodQuery = useOpportunityRashodFields(visibleRecords, boardPane !== undefined || true);
```

Strip is always mounted → pass `enabled: true` (or omit). Prefer:

```ts
  const rashodQuery = useOpportunityRashodFields(visibleRecords);
```

4. Pass `rashodQuery.opportunities` into `MarginStrip` and `AnalyticsPanel` instead of bare `visibleRecords`. Keep table/`DealsTable` on non-enriched `visibleRecords` / accumulated records.

5. Optionally pass `isExpenseLoading={rashodQuery.isLoading}` to `MarginStrip` and dim the margin chip opacity to `0.55` while loading (do not block table).

Example MarginStrip prop addition:

```ts
type MarginStripProps = {
  opportunities: OpportunityRow[];
  lineItems: LineItemRow[];
  onOpenAnalytics: () => void;
  isExpenseLoading?: boolean;
};
```

Apply `style={{ opacity: isExpenseLoading ? 0.55 : 1, ... }}` on the button root.

- [ ] **Step 5: Run unit tests**

```bash
corepack yarn test:unit
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/deals-board/hooks/useOpportunityRashodFields.ts src/deals-board/hooks/opportunity-rashod-query-key.ts src/deals-board/hooks/opportunity-rashod-query-key.test.ts src/deals-board/DealsBoard.tsx src/deals-board/analytics/MarginStrip.tsx src/deals-board/analytics/AnalyticsPanel.tsx
git commit -m "perf: load opportunity rashod fields lazily for finance UI"
```

---

### Task 3: C2 — Narrow `shouldFetchAllOpportunities`

**Files:**
- Modify: `src/deals-board/utils/date-filters.ts`
- Modify: `src/deals-board/utils/date-filters.test.ts`
- Modify: `docs/superpowers/specs/2026-07-24-deals-board-perf-wave-c-design.md` (align date-sort decision)

**Interfaces:**
- Consumes: `DealBoardFilters`, `DealBoardSort[]`, `FilterClause[]`, `buildOpportunityDateFilter`, `hasLineItemFilterClauses`
- Produces: updated `shouldFetchAllOpportunities(filters, sort?, clauses?): boolean`
- **Important:** `sort` parameter may remain for API compatibility but must **not** force `fetchAll` (see Global Constraints). Call sites can keep passing `effectiveSort`.

- [ ] **Step 1: Rewrite failing tests first**

Replace the `shouldFetchAllOpportunities` describe block in `date-filters.test.ts` with:

```ts
describe('shouldFetchAllOpportunities', () => {
  it('loads all records when line-item filter clauses are active', () => {
    expect(
      shouldFetchAllOpportunities(
        {},
        undefined,
        [{ id: '1', level: 'lineItem', field: 'stage', operator: 'in', value: ['NOVYY'] }],
      ),
    ).toBe(true);
    expect(
      shouldFetchAllOpportunities(
        {},
        undefined,
        [{ id: '1', level: 'deal', field: 'companyId', operator: 'in', value: ['c1'] }],
      ),
    ).toBe(false);
  });

  it('paginates tight date presets (even with default date sort)', () => {
    const dateSort = [{ field: 'loadDate', direction: 'AscNullsFirst' as const }];
    expect(shouldFetchAllOpportunities({ datePreset: 'today' }, dateSort)).toBe(false);
    expect(shouldFetchAllOpportunities({ datePreset: 'tomorrow' }, dateSort)).toBe(false);
    expect(shouldFetchAllOpportunities({ datePreset: 'dayAfterTomorrow' }, dateSort)).toBe(false);
    expect(shouldFetchAllOpportunities({ datePreset: 'week' }, dateSort)).toBe(false);
    expect(
      shouldFetchAllOpportunities(
        { datePreset: 'week' },
        [{ field: 'name', direction: 'AscNullsFirst' }],
      ),
    ).toBe(false);
  });

  it('loads all records for wide date filters', () => {
    expect(shouldFetchAllOpportunities({ datePreset: 'month' })).toBe(true);
    expect(shouldFetchAllOpportunities({ datePreset: 'future' })).toBe(true);
    expect(shouldFetchAllOpportunities({ datePreset: 'custom' })).toBe(true);
    expect(
      shouldFetchAllOpportunities({
        dateFrom: '2026-06-27',
        dateTo: '2026-06-27',
      }),
    ).toBe(true);
  });

  it('does not fetch-all when there is no date filter and no line-item clauses', () => {
    expect(shouldFetchAllOpportunities({})).toBe(false);
    expect(
      shouldFetchAllOpportunities(
        {},
        [{ field: 'loadDate', direction: 'AscNullsFirst' }],
      ),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
corepack yarn vitest run --config vitest.unit.config.ts src/deals-board/utils/date-filters.test.ts
```

Expected: FAIL on tight presets still returning `true`.

- [ ] **Step 3: Implement**

In `date-filters.ts`, replace `shouldFetchAllOpportunities` and add constant near other exports:

```ts
const TIGHT_DATE_PRESETS: ReadonlySet<DatePreset> = new Set([
  'today',
  'tomorrow',
  'dayAfterTomorrow',
  'week',
]);

export const shouldFetchAllOpportunities = (
  filters: DealBoardFilters,
  _sort?: DealBoardSort[],
  clauses?: FilterClause[],
): boolean => {
  if (clauses?.length && hasLineItemFilterClauses(clauses)) {
    return true;
  }

  if (!buildOpportunityDateFilter(filters)) {
    return false;
  }

  const preset = filters.datePreset;
  if (preset && TIGHT_DATE_PRESETS.has(preset)) {
    return false;
  }

  return true;
};
```

Remove unused `sortsByDateField` import from `date-filters.ts` if nothing else in that file uses it.

- [ ] **Step 4: Run tests — expect PASS**

```bash
corepack yarn vitest run --config vitest.unit.config.ts src/deals-board/utils/date-filters.test.ts
```

Expected: PASS.

- [ ] **Step 5: Amend design spec decisions**

In `docs/superpowers/specs/2026-07-24-deals-board-perf-wave-c-design.md`, replace decisions 3–4 with:

```markdown
3. **`fetchAll` keep for:** `month`, `future`, `custom`, raw `dateFrom`/`dateTo` without a tight preset, any line-item filter clauses, `showAll` (handled in `useOpportunities`).  
4. **`fetchAll` drop for:** presets `today` | `tomorrow` | `dayAfterTomorrow` | `week`. Default `loadDate` sort does **not** force `fetchAll` (otherwise C2 would be a no-op because `getEffectiveOpportunitySort` always injects it). Cancelled-last reordering applies per fetched page when paginated.
```

Update the C2 pseudocode section to match the implementation above.

- [ ] **Step 6: Full unit suite**

```bash
corepack yarn test:unit
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/deals-board/utils/date-filters.ts src/deals-board/utils/date-filters.test.ts docs/superpowers/specs/2026-07-24-deals-board-perf-wave-c-design.md
git commit -m "perf: paginate tight date presets instead of fetchAll"
```

---

### Task 4: C3 — CSS hover + memo `DealRow`

**Files:**
- Modify: `src/deals-board/DealsTable/DealRow.tsx`
- Modify: `src/deals-board/DealsTable/DealsDataTable.tsx`
- Modify: `src/deals-board/DealsTable/DealsTable.tsx`
- Modify: `src/deals-board/theme/GlobalThemeStyles.tsx`

**Interfaces:**
- Consumes: existing `DealRow` props minus hover
- Produces: `memo(DealRow)`; `data-deal-row` attribute; CSS hover via GlobalThemeStyles; no `hoveredRowId` state

- [ ] **Step 1: Strip hover from `DealRow` and wrap with `memo`**

In `DealRow.tsx`:

1. Add `import { memo } from 'react';`
2. Remove `isHovered` and `onHoverChange` from `DealRowProps` and destructuring.
3. Remove `onMouseEnter` / `onMouseLeave` from `<tr>`.
4. Add `data-deal-row=""` on the parent `<tr>`.
5. Change export to:

```ts
export const DealRow = memo(function DealRow({
  // ...props without hover
}: DealRowProps) {
  // ...existing body
});
```

Keep expand-only mount of `LineItemsTable` as today.

- [ ] **Step 2: Remove hover plumbing from table parents**

In `DealsDataTable.tsx`:

- Remove `hoveredRowId` / `onHoverRowChange` from props type and destructuring.
- Change `DealRow` usage to drop hover props.
- Change `onToggleShowAllPositions` wiring to a stable parent callback if one exists; if currently:

```tsx
onToggleShowAllPositions={
  onToggleShowAllPositions
    ? () => onToggleShowAllPositions(row.id)
    : undefined
}
```

prefer passing `opportunityId={row.id}` pattern **or** keep as-is for this task if refactor is large — memo still wins when other props are stable. Minimum: stop creating hover lambdas.

In `DealsTable.tsx`:

- Delete `const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);`
- Stop passing `hoveredRowId` / `onHoverRowChange` into `DealsDataTable`.

- [ ] **Step 3: Add CSS row hover**

In `GlobalThemeStyles.tsx`, inside the existing `[data-deals-board]` block, add:

```css
[data-deals-board] tr[data-deal-row]:hover > td {
  background-color: ${colors.bgHover} !important;
}
```

Place near other hover rules. Sticky cells inherit via `td` selector (matches prior solid-bg sticky fix intent).

- [ ] **Step 4: Run unit tests**

```bash
corepack yarn test:unit
```

Expected: PASS.

- [ ] **Step 5: Manual smoke**

On localhost: switch today/week (confirm Network is single-page for tight presets), expand 5–10 deals, hover rows (CSS only), open finance chip (rashod may load briefly).

- [ ] **Step 6: Commit**

```bash
git add src/deals-board/DealsTable/DealRow.tsx src/deals-board/DealsTable/DealsDataTable.tsx src/deals-board/DealsTable/DealsTable.tsx src/deals-board/theme/GlobalThemeStyles.tsx
git commit -m "perf: memo DealRow and use CSS hover instead of React hover state"
```

---

### Task 5: Re-measure + version bump

**Files:**
- Modify: `package.json` (`version` patch bump)

**Interfaces:** none

- [ ] **Step 1: Re-measure vs Task 0**

Repeat cold open, today↔week, expand 5–10. Confirm:

- Tight presets no longer loop `fetchAll` pages
- Hover does not re-render whole table (React Profiler optional)
- Margin chip still shows numbers when `rashod*` present (or 0 when absent)

- [ ] **Step 2: Bump version**

In `package.json`, bump `"version"` from current (e.g. `0.5.1`) to next patch (`0.5.2`).

- [ ] **Step 3: Final unit run**

```bash
corepack yarn test:unit
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore: bump version to 0.5.2 after Wave C performance"
```

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| C0 baseline | Task 0 |
| QueryClient staleTime / refetchOnWindowFocus | Task 1 |
| keepPreviousData on opportunities | Task 1 |
| Stop table rashod REST merge | Task 2 |
| Parallel finance rashod fetch | Task 2 |
| Narrow fetchAll for tight presets | Task 3 |
| Date-sort no-op fix (default loadDate) | Task 3 + spec amend |
| memo DealRow | Task 4 |
| CSS hover / remove hoveredRowId | Task 4 |
| No virtualization by default | Task 4 (omitted) |
| Version bump | Task 5 |
| Out of scope B/A/parser | not scheduled |
