# Deals Board Filters + TanStack + Manual Sync Harden Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship universal FilterAST filters, TanStack parent table (sort/sticky), harden manual line-item survival across parser resync, and quiet desktop polish — without removing stage row colors.

**Architecture:** Widen parser unsynced-manual guard; surface board→parser sync failures with retry. Introduce `filter-model` (copy-on-write session over view) + FilterBar. Rebuild parent `DealsTable` on `@tanstack/react-table` while keeping cell editors, expand, and `getStageRowStyles`. Mobile gets sync harden + simplified filters only.

**Tech Stack:** React 19, TypeScript, `@tanstack/react-table` (add), `@tanstack/react-query` (existing), Vitest, Twenty App front component; crmparserv2 Node ESM + Vitest.

**Spec:** `docs/superpowers/specs/2026-07-23-deals-board-filters-tanstack-polish-design.md`

## Global Constraints

- Keep full-row stage color coding (`getStageRowStyles`) including sticky cells
- No keyboard spreadsheet grid in this package
- Child `LineItemsTable` stays non-TanStack in v1
- `@tanstack/react-virtual` already in package.json — do **not** mandate virtualization; optional only if profiling requires
- Mobile: sync harden + simplified filters; no TanStack mobile rewrite
- TDD; use `corepack yarn` on Windows if `yarn` missing from PATH
- Prefer ASCII worktree path if Cyrillic username breaks vitest
- No version bump until final task; then bump `BrandingTwentyView` `package.json` (e.g. `0.4.1` → `0.5.0`)
- crmparserv2 changes live in that repo; BrandingTwentyView changes in this repo — commit per-repo
- Filter session model: copy-on-write (`sessionClauses === undefined` → use view clauses)
- Hard rule: never delete `istochnik=TWENTY_RUCHNAYA` on resync solely because it is missing from parser SQLite

---

## File structure

### crmparserv2

| File | Responsibility |
|------|----------------|
| `backend/src/services/twenty-line-items-sync.js` | Widen unsynced-manual preserve guard |
| `backend/tests/twenty-line-items-sync.test.js` | Regression: renamed unsynced manual survives; archived still deletable |

### BrandingTwentyView

| File | Responsibility |
|------|----------------|
| `src/deals-board/filter-model/types.ts` | `FilterClause`, `FilterOperator`, `FilterState` |
| `src/deals-board/filter-model/migrate-legacy-filters.ts` | Flat `DealBoardFilters` → clauses |
| `src/deals-board/filter-model/session.ts` | effective filters, copy-on-write mutate, reset |
| `src/deals-board/filter-model/apply-line-item-filters.ts` | Nested semantics A + show-all |
| `src/deals-board/filter-model/*.test.ts` | Unit tests for above |
| `src/deals-board/FilterBar.tsx` | Presets + builder + chips + search + reset |
| `src/deals-board/QuickFiltersBar.tsx` | Remove or thin-wrap → delete after FilterBar lands |
| `src/deals-board/DealsBoard.tsx` | Wire FilterState, sort session, LI show-all, fetchAll when LI filters |
| `src/deals-board/types.ts` | Extend/keep compatibility types; document new filter JSON shape |
| `src/deals-board/api/opportunities.ts` | Map deal-level clauses → existing API filters |
| `src/deals-board/utils/manual-sync-notify.ts` | Register sync-error handler (CancelOtmena pattern) |
| `src/deals-board/ui/ManualSyncErrorToast.tsx` | Toast + Retry |
| `src/deals-board/hooks/useManualLineItemParserSync.ts` | Throw/notify on failure; export retry helper |
| `src/deals-board/hooks/useManualLineItemParserSync.test.ts` | Error path tests |
| `src/deals-board/DealsTable/DealsDataTable.tsx` | TanStack parent table shell |
| `src/deals-board/DealsTable/DealsTable.tsx` | Delegate to DealsDataTable or replace body |
| `src/deals-board/DealsTable/DealRow.tsx` | Sticky bg inheritance if split |
| `src/deals-board/mobile/MobileFiltersSheet.tsx` | Simplified clause builder / presets |
| `package.json` | Add `@tanstack/react-table`; version bump last |

---

## Part A — Manual sync harden

### Task 1: Parser — preserve any unsynced `TWENTY_RUCHNAYA`

**Files:**
- Modify: `C:/Users/Василий/Documents/projects/crmparserv2/backend/src/services/twenty-line-items-sync.js`
- Test: `C:/Users/Василий/Documents/projects/crmparserv2/backend/tests/twenty-line-items-sync.test.js`

**Interfaces:**
- Consumes: existing `computeLineItemDiff(existing, eligible, { manualParserTwentyIds })`
- Produces: `isUnsyncedManualTwenty(li, manualParserTwentyIds)` — true when `li.istochnik === 'TWENTY_RUCHNAYA'` and `!manualParserTwentyIds.has(li.id)` (any name)

- [ ] **Step 1: Write failing tests**

Replace/extend the draft tests. The old test that expects delete of renamed unsynced manual must flip.

```js
  it('does not delete unsynced TWENTY_RUCHNAYA with non-default name', () => {
    const existing = [
      { id: 'li-draft', name: 'Баннер клиентский', stage: 'NOVYY', istochnik: 'TWENTY_RUCHNAYA' },
    ];
    const diff = computeLineItemDiff(existing, []);
    expect(diff.toDelete).toEqual([]);
  });

  it('does not delete TWENTY_RUCHNAYA draft without parser row', () => {
    const existing = [
      { id: 'li-draft', name: 'Новая позиция', stage: 'NOVYY', istochnik: 'TWENTY_RUCHNAYA' },
    ];
    const diff = computeLineItemDiff(existing, []);
    expect(diff.toDelete).toEqual([]);
  });

  it('deletes TWENTY_RUCHNAYA when twenty_id exists in parser manuals set (archived)', () => {
    const existing = [
      { id: 'li-gone', name: 'Баннер', stage: 'NOVYY', istochnik: 'TWENTY_RUCHNAYA' },
    ];
    const diff = computeLineItemDiff(existing, [], {
      manualParserTwentyIds: new Set(['li-gone']),
    });
    expect(diff.toDelete).toEqual(['li-gone']);
  });
```

- [ ] **Step 2: Run tests to verify failure**

Run (in crmparserv2):

```bash
cd backend && corepack yarn vitest run tests/twenty-line-items-sync.test.js
```

Expected: FAIL on `does not delete unsynced TWENTY_RUCHNAYA with non-default name` (currently deleted).

- [ ] **Step 3: Implement guard**

In `twenty-line-items-sync.js`, replace `isManualTwentyDraft` with:

```js
function isUnsyncedManualTwenty(li, manualParserTwentyIds) {
  return (
    li.istochnik === 'TWENTY_RUCHNAYA'
    && !manualParserTwentyIds.has(li.id)
  );
}
```

Use it in the delete loop where `isManualTwentyDraft` was called. Remove the default-name `normalizePattern` check. Keep `DEFAULT_MANUAL_LINE_ITEM_NAME` only if still used elsewhere; otherwise delete dead constant.

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd backend && corepack yarn vitest run tests/twenty-line-items-sync.test.js
```

- [ ] **Step 5: Commit (crmparserv2)**

```bash
git add backend/src/services/twenty-line-items-sync.js backend/tests/twenty-line-items-sync.test.js
git commit -m "fix: preserve unsynced TWENTY_RUCHNAYA line items on resync"
```

---

### Task 2: Board — visible sync errors + retry

**Files:**
- Create: `src/deals-board/utils/manual-sync-notify.ts`
- Create: `src/deals-board/ui/ManualSyncErrorToast.tsx`
- Modify: `src/deals-board/hooks/useManualLineItemParserSync.ts`
- Modify: `src/deals-board/hooks/useManualLineItemParserSync.test.ts`
- Modify: `src/deals-board/DealsBoard.tsx` (wrap provider next to `CancelOtmenaProvider`)
- Modify: `src/deals-board/hooks/useLineItems.ts` (create path already calls sync — ensure errors notify)

**Interfaces:**
- Consumes: `syncManualLineItem`, `buildManualLineItemSyncPayload`
- Produces:
  - `notifyManualSyncError({ lineItemId, opportunityId, error, retry })`
  - `registerManualSyncErrorHandler(handler | null)`
  - `retryManualLineItemSync(queryClient, lineItemId): Promise<void>`

- [ ] **Step 1: Write failing unit tests for notify-on-failure**

In `useManualLineItemParserSync.test.ts`, mock `syncManualLineItem` to reject; assert `notifyManualSyncError` called (spy on notify module) and synced flag not set.

```ts
it('notifies when syncNewManualLineItemToParser fails', async () => {
  const notify = vi.spyOn(manualSyncNotify, 'notifyManualSyncError');
  vi.mocked(syncManualLineItem).mockRejectedValueOnce(new Error('network'));
  await syncNewManualLineItemToParser(queryClient, 'li-1', 'opp-1');
  expect(notify).toHaveBeenCalled();
  expect(isManualLineItemSyncedToParser(queryClient, 'li-1')).toBe(false);
});
```

- [ ] **Step 2: Run test — expect FAIL** (notify not wired)

```bash
corepack yarn test:unit src/deals-board/hooks/useManualLineItemParserSync.test.ts
```

- [ ] **Step 3: Implement notify + toast + wire sync functions**

`manual-sync-notify.ts` — mirror `cancel-otmena-notify.ts`:

```ts
export type ManualSyncErrorPayload = {
  lineItemId: string;
  opportunityId: string;
  message: string;
  retry: () => Promise<void>;
};

type Handler = (payload: ManualSyncErrorPayload) => void;
let handler: Handler | null = null;

export const registerManualSyncErrorHandler = (next: Handler | null) => {
  handler = next;
};

export const notifyManualSyncError = (payload: ManualSyncErrorPayload) => {
  handler?.(payload);
};
```

`ManualSyncErrorToast.tsx` — portal toast with message «Не удалось сохранить позицию в parser» + button «Повторить» calling `payload.retry`, auto-dismiss optional (keep until retry success or dismiss).

In `syncNewManualLineItemToParser` / `syncManualLineItemAfterUpdate` catch blocks: call `notifyManualSyncError` with retry that re-invokes the same sync.

- [ ] **Step 4: Run tests — expect PASS**

```bash
corepack yarn test:unit src/deals-board/hooks/useManualLineItemParserSync.test.ts
```

- [ ] **Step 5: Commit (BrandingTwentyView)**

```bash
git add src/deals-board/utils/manual-sync-notify.ts src/deals-board/ui/ManualSyncErrorToast.tsx src/deals-board/hooks/useManualLineItemParserSync.ts src/deals-board/hooks/useManualLineItemParserSync.test.ts src/deals-board/DealsBoard.tsx
git commit -m "fix: surface manual line-item parser sync errors with retry"
```

---

## Part B — FilterAST + FilterBar

### Task 3: filter-model — types, migrate, session copy-on-write

**Files:**
- Create: `src/deals-board/filter-model/types.ts`
- Create: `src/deals-board/filter-model/migrate-legacy-filters.ts`
- Create: `src/deals-board/filter-model/session.ts`
- Create: `src/deals-board/filter-model/migrate-legacy-filters.test.ts`
- Create: `src/deals-board/filter-model/session.test.ts`

**Interfaces:**
- Produces:
  - `FilterOperator = 'eq' | 'in' | 'contains' | 'between' | 'isEmpty'`
  - `FilterClause = { id: string; level: 'deal' | 'lineItem'; field: string; operator: FilterOperator; value: unknown }`
  - `FilterState` as in spec
  - `migrateLegacyFilters(filters: DealBoardFilters): FilterClause[]`
  - `getEffectiveClauses(viewClauses: FilterClause[], sessionClauses?: FilterClause[]): FilterClause[]`
  - `beginSessionClauses(viewClauses): FilterClause[]` (structuredClone / map new ids only if needed — prefer keep ids)
  - `resetSession<T extends { sessionClauses?: FilterClause[] }>(state): T`

- [ ] **Step 1: Failing tests**

```ts
// migrate-legacy-filters.test.ts
it('maps stages to lineItem in-clause', () => {
  expect(migrateLegacyFilters({ stages: ['NOVYY', 'GOTOVO'] })).toEqual([
    expect.objectContaining({
      level: 'lineItem',
      field: 'stage',
      operator: 'in',
      value: ['NOVYY', 'GOTOVO'],
    }),
  ]);
});

it('maps companyIds to deal in-clause', () => {
  expect(migrateLegacyFilters({ companyIds: ['c1'] })[0]).toMatchObject({
    level: 'deal',
    field: 'companyId',
    operator: 'in',
    value: ['c1'],
  });
});

// session.test.ts
it('uses view clauses when session undefined', () => {
  expect(getEffectiveClauses([{ id: '1', level: 'deal', field: 'oplata', operator: 'eq', value: 'x' }], undefined)).toHaveLength(1);
});

it('copy-on-write: session replaces view for effective', () => {
  const view = [{ id: '1', level: 'deal', field: 'oplata', operator: 'eq', value: 'a' }];
  const session = [{ id: '1', level: 'deal', field: 'oplata', operator: 'eq', value: 'b' }];
  expect(getEffectiveClauses(view, session)[0].value).toBe('b');
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
corepack yarn test:unit src/deals-board/filter-model/
```

- [ ] **Step 3: Implement types + migrate + session helpers**

Migration mapping (exact):

| Legacy | Clause |
|--------|--------|
| `stages` | `{ level: 'lineItem', field: 'stage', operator: 'in', value }` |
| `types` | `{ level: 'lineItem', field: 'tip', operator: 'in', value }` |
| `companyIds` | `{ level: 'deal', field: 'companyId', operator: 'in', value }` |
| `oplata` (if not all) | `{ level: 'deal', field: 'oplata', operator: 'eq' \| 'isEmpty', value }` |

Generate `id` via `crypto.randomUUID()` when migrating.

If incoming filters already have `clauses` array (new shape), return those and ignore legacy arrays (or merge only when clauses empty).

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/filter-model
git commit -m "feat: add FilterAST migrate and session helpers"
```

---

### Task 4: Apply filters — deal API + nested line items + show-all

**Files:**
- Create: `src/deals-board/filter-model/apply-line-item-filters.ts`
- Create: `src/deals-board/filter-model/apply-line-item-filters.test.ts`
- Create: `src/deals-board/filter-model/clauses-to-deal-board-filters.ts` (adapter for existing `fetchOpportunities`)
- Create: `src/deals-board/filter-model/clauses-to-deal-board-filters.test.ts`
- Modify: `src/deals-board/utils/date-filters.ts` or opportunities fetch path if LI filters require `fetchAll` — prefer flag from DealsBoard

**Interfaces:**
- Produces:
  - `clausesToDealBoardFilters(clauses, datePreset, dateFrom, dateTo, search): DealBoardFilters` — fills legacy fields for API until opportunities.ts speaks clauses natively
  - `filterDealsAndLineItems({ deals, lineItemsByOppId, clauses, showAllPositionOppIds: Set<string> }): { deals, lineItemsByOppId }`
  - Semantics: deal kept if no LI clauses OR ≥1 matching LI; default LI list = matches only; if oppId in showAll set → all LIs (optional `matchedIds` for marker)

- [ ] **Step 1: Failing tests for nested semantics**

```ts
it('hides non-matching positions but keeps deal when one matches', () => {
  const result = filterDealsAndLineItems({
    deals: [{ id: 'd1' }],
    lineItemsByOppId: {
      d1: [
        { id: 'a', opportunityId: 'd1', stage: 'GOTOVO', name: 'A' },
        { id: 'b', opportunityId: 'd1', stage: 'NOVYY', name: 'B' },
      ],
    },
    clauses: [{ id: '1', level: 'lineItem', field: 'stage', operator: 'in', value: ['GOTOVO'] }],
    showAllPositionOppIds: new Set(),
  });
  expect(result.deals.map((d) => d.id)).toEqual(['d1']);
  expect(result.lineItemsByOppId.d1.map((i) => i.id)).toEqual(['a']);
});

it('show-all reveals non-matching positions for that deal', () => {
  const result = filterDealsAndLineItems({
    deals: [{ id: 'd1' }],
    lineItemsByOppId: {
      d1: [
        { id: 'a', opportunityId: 'd1', stage: 'GOTOVO', name: 'A' },
        { id: 'b', opportunityId: 'd1', stage: 'NOVYY', name: 'B' },
      ],
    },
    clauses: [{ id: '1', level: 'lineItem', field: 'stage', operator: 'in', value: ['GOTOVO'] }],
    showAllPositionOppIds: new Set(['d1']),
  });
  expect(result.lineItemsByOppId.d1.map((i) => i.id).sort()).toEqual(['a', 'b']);
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement apply + adapter**

For `in` on stage/tip: value is string[]. Field resolve via `row[field]`.

`clausesToDealBoardFilters`: extract deal `companyId` in → `companyIds`; lineItem stage/tip in → `stages`/`types` for any server-side LI filter still used by `fetchLineItemsByOpportunityIds`; keep date/search passthrough.

When any `level === 'lineItem'` clause is active, DealsBoard must set opportunity fetch to `fetchAll` / `showAll` path consistent with `shouldFetchAllOpportunities` (extend helper to return true if LI clauses present).

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/filter-model
git commit -m "feat: apply nested line-item filters and deal filter adapter"
```

---

### Task 5: FilterBar UI + wire DealsBoard

**Files:**
- Create: `src/deals-board/FilterBar.tsx`
- Modify: `src/deals-board/DealsBoard.tsx`
- Modify: `src/deals-board/DealsTable/DealRow.tsx` or `LineItemsTable.tsx` — control «Показать все позиции» when LI filters active
- Delete or stop importing: `src/deals-board/QuickFiltersBar.tsx`
- Update: `src/deals-board/utils/count-active-quick-filters.ts` → count effective clauses + date + search (rename if needed)
- Modify: view save path to persist `{ ...dates, clauses, search }` new shape (read path uses migrate)

**Interfaces:**
- Consumes: `FilterState`, session helpers, field registry / descriptors for builder field list
- Produces: `FilterBar` props `{ value, viewClauses, onChange, onReset }`

- [ ] **Step 1: Manual UI checklist as test plan** (no full RTL in repo — keep pure logic tested; smoke via unit of chip count helper)

Extend `count-active-quick-filters.test.ts` for clause counting.

- [ ] **Step 2: Implement FilterBar**

Layout: ViewSwitcher stays outside or left of FilterBar as today. FilterBar contains: date presets (reuse labels from old QuickFiltersBar) · «+ Фильтр» popover (level inferred from field catalog: parent vs child descriptors) · chips · search · Сбросить.

Chip remove → copy-on-write session and filter out clause id.  
Add filter → session begin + push clause.

- [ ] **Step 3: Wire DealsBoard**

Replace `QuickFiltersValue` state with `FilterState` session fields. Build `effective` via helpers → `clausesToDealBoardFilters` → existing `useOpportunities`. Apply `filterDealsAndLineItems` before render. Pass `showAllPositionOppIds` state + toggle into deal row.

Persist: `useUpdateDealBoardView` filters payload writes `{ datePreset, dateFrom, dateTo, search, clauses }` after migrate-on-read.

- [ ] **Step 4: Run unit tests + lint**

```bash
corepack yarn test:unit
corepack yarn lint
```

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/FilterBar.tsx src/deals-board/DealsBoard.tsx src/deals-board/DealsTable src/deals-board/utils/count-active-quick-filters.ts src/deals-board/utils/count-active-quick-filters.test.ts
git add -u src/deals-board/QuickFiltersBar.tsx
git commit -m "feat: replace quick filters with universal FilterBar"
```

---

## Part C — TanStack parent table

### Task 6: Add dependency + DealsDataTable shell

**Files:**
- Modify: `package.json` / `yarn.lock` — add `@tanstack/react-table`
- Create: `src/deals-board/DealsTable/DealsDataTable.tsx`
- Create: `src/deals-board/DealsTable/build-parent-columns.tsx` (column helper)
- Modify: `src/deals-board/DealsTable/DealsTable.tsx` — render via DealsDataTable

**Interfaces:**
- Produces: `buildParentColumnDefs({ columns, descriptorByField, ... }): ColumnDef<OpportunityRow>[]`
- `DealsDataTable` props ≈ current `DealsTableProps` + `sort`, `onSortChange`, `showAllPositionOppIds`, `onToggleShowAllPositions`

- [ ] **Step 1: Install**

```bash
corepack yarn add @tanstack/react-table
```

- [ ] **Step 2: Shell that renders same rows**

Use `useReactTable` + `getCoreRowModel` + `flexRender`. Row expand still via existing `useDealExpandState`. Expanded content = existing `DealRow` child / `LineItemsTable` path — either keep `DealRow` as full row renderer inside TanStack cell spanning columns, or map headers via TanStack and body via DealRow. Prefer: TanStack owns header + row iteration; each row uses updated `DealRow` for cells + expand panel.

- [ ] **Step 3: Visual smoke** — board still lists deals with colors (manual check list in commit message).

- [ ] **Step 4: Commit**

```bash
git add package.json yarn.lock src/deals-board/DealsTable
git commit -m "feat: introduce TanStack parent DealsDataTable shell"
```

---

### Task 7: Header sort + sticky pin + row color on sticky cells

**Files:**
- Modify: `src/deals-board/DealsTable/DealsDataTable.tsx`
- Modify: `src/deals-board/DealsTable/ResizableColumnHeader.tsx`
- Modify: `src/deals-board/theme/GlobalThemeStyles.tsx` if sticky helpers needed
- Create: `src/deals-board/DealsTable/parent-table-sort.test.ts` (pure mapping sort ↔ TanStack)
- Modify: `src/deals-board/DealsBoard.tsx` — session sort over view sort

**Interfaces:**
- Produces:
  - `dealBoardSortToSortingState(sort: DealBoardSort[]): SortingState`
  - `sortingStateToDealBoardSort(state: SortingState): DealBoardSort[]`
  - Pin column ids: `__expand`, `name` (left)

- [ ] **Step 1: Failing tests for sort mapping**

```ts
it('maps AscNullsFirst to asc', () => {
  expect(dealBoardSortToSortingState([{ field: 'name', direction: 'AscNullsFirst' }])).toEqual([
    { id: 'name', desc: false },
  ]);
});
```

- [ ] **Step 2: Implement mapping + header click**

Header click toggles sort → `onSortChange` → opportunities refetch (server sort). Do not use client-only `getSortedRowModel` for parent primary sort.

Sticky: `columnPinning: { left: ['__expand', 'name'] }`; cell style `backgroundColor` from `getStageRowStyles(row.stage, ...)`.

- [ ] **Step 3: Run unit tests PASS**

- [ ] **Step 4: Commit**

```bash
git add src/deals-board/DealsTable src/deals-board/DealsBoard.tsx
git commit -m "feat: TanStack header sort and sticky columns with stage colors"
```

---

## Part D — Desktop polish

### Task 8: Quiet toolbar + hierarchy

**Files:**
- Modify: `src/deals-board/DealsBoard.tsx` (toolbar layout)
- Possibly small: `src/deals-board/ViewSwitcher.tsx`, `ExpandModeToggle.tsx`, `GroupChipModeToggle.tsx`, `ColumnPicker` entry points

**Interfaces:** none new — visual/layout only

- [ ] **Step 1: Group secondary actions**

Move «Редактировать view», column pickers for Deals/Positions into a single «Настройки» / overflow cluster on the right. Keep ViewSwitcher + FilterBar primary. Keep Expand + Group chip toggles visible but visually secondary (muted).

- [ ] **Step 2: Deal → positions hierarchy**

Slightly stronger indent / border for expanded `LineItemsTable` container; do not change stage paints.

- [ ] **Step 3: Manual visual check against screenshot baseline (dark theme)**

- [ ] **Step 4: Commit**

```bash
git add src/deals-board/DealsBoard.tsx src/deals-board
git commit -m "style: quiet deals board toolbar and nested hierarchy"
```

---

## Part E — Mobile (sync + simplified filters)

### Task 9: Mobile filters + sync path

**Files:**
- Modify: `src/deals-board/mobile/MobileFiltersSheet.tsx`
- Modify: `src/deals-board/mobile/MobileDealsBoard.tsx`
- Modify: `src/deals-board/mobile/MobileToolbar.tsx` if needed
- Ensure create line item on mobile uses same `useCreateLineItem` (already shared) — verify toast provider wraps mobile tree too

**Interfaces:**
- Reuse `FilterState` session helpers; Mobile sheet edits session clauses with a shorter field list (stage, tip, company, date presets, search)

- [ ] **Step 1: Wire MobileDealsBoard to same effective filter pipeline as desktop** (shared hook `useDealBoardFilterState` extracted if duplication hurts — extract only if both files need 30+ duplicated lines)

- [ ] **Step 2: Simplify MobileFiltersSheet** to edit clauses + presets (remove dead hardcoded-only paths)

- [ ] **Step 3: Confirm ManualSyncErrorToast provider wraps mobile layout in `DealsBoard.tsx`**

- [ ] **Step 4: Commit**

```bash
git add src/deals-board/mobile src/deals-board/DealsBoard.tsx
git commit -m "feat: mobile simplified filters on FilterAST + shared sync toast"
```

---

### Task 10: Version bump + final verification

**Files:**
- Modify: `package.json` version `0.4.1` → `0.5.0`

- [ ] **Step 1: Run full unit suite + lint**

```bash
corepack yarn test:unit
corepack yarn lint
```

Expected: PASS

- [ ] **Step 2: Bump version**

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: bump version to 0.5.0 for filters and TanStack board"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Widen unsynced `TWENTY_RUCHNAYA` preserve | Task 1 |
| Visible sync errors + retry | Task 2 |
| FilterAST + migrate + session CoW | Task 3 |
| Nested semantics A + show-all | Task 4 |
| Hybrid FilterBar + replace hardcoded | Task 5 |
| View save new shape / reset | Task 5 |
| LI filters → fetchAll | Task 4–5 |
| TanStack parent foundation | Task 6 |
| Header sort + sticky + colors | Task 7 |
| Desktop toolbar polish | Task 8 |
| Mobile sync + simplified filters | Task 9 |
| No keyboard grid / no child TanStack / keep colors | Global constraints |
| Version bump | Task 10 |

---

## Execution notes

- Parts A→E are independently shippable; do not start Part C until Part B effective filters work.
- crmparserv2 Task 1 can merge before board UI; board Task 2 can ship without parser deploy but full colleague-bug fix needs both.
- If `@tanstack/react-table` peer/types conflict with React 19 types, pin a current v8 release compatible with React 19.
