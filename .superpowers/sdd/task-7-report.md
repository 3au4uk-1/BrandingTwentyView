# Task 7 Report: Header sort + sticky pin + row color on sticky cells

## Status
Complete.

## Summary
Added server-side header sort via TanStack controlled `manualSorting`, session-over-view sort in `DealsBoard`, sort↔`SortingState` mapping helpers, left pin for `__expand` + `name`, and stage background + inset accent on pinned body cells. Cleaned `DealsTable.tsx` blank-line noise.

## Files
| Action | Path |
|--------|------|
| Create | `src/deals-board/DealsTable/parent-table-sort.ts` |
| Create | `src/deals-board/DealsTable/parent-table-sort.test.ts` |
| Modify | `src/deals-board/DealsTable/DealsDataTable.tsx` |
| Modify | `src/deals-board/DealsTable/DealsTable.tsx` |
| Modify | `src/deals-board/DealsTable/DealRow.tsx` |
| Modify | `src/deals-board/DealsTable/ResizableColumnHeader.tsx` |
| Modify | `src/deals-board/DealsTable/build-parent-columns.tsx` |
| Modify | `src/deals-board/DealsBoard.tsx` |
| Modify | `src/deals-board/hooks/useOpportunities.ts` |
| Modify | `src/deals-board/cells/DynamicFieldCell.tsx`, `overrides.tsx` |

## Interfaces
- `dealBoardSortToSortingState(sort)` / `sortingStateToDealBoardSort(state)` — `AscNullsFirst`↔asc, `DescNullsLast`↔desc; drops `__expand`
- `PARENT_EXPAND_COLUMN`, `withParentExpandColumn(columns)`
- `DealsDataTable`: `sort`, `onSortChange` — header click → server refetch (no `getSortedRowModel`)
- `DealsBoard`: `sortSession` overrides view sort; reset on view change / filter reset

## Tests
```
node node_modules/vitest/dist/cli.js run --config vitest.unit.config.ts
→ 61 files, 348 tests passed (+4 parent-table-sort)
```

## Lint
```
npx oxlint … → 0 errors (2 pre-existing warnings: DealRow isHovered, DealsBoard opportunityLinkFieldNames)
```

## Self-review
- Sort query key now includes `effectiveSort` — fixes stale fetch on header toggle.
- Expand split into dedicated pinned column; name cell uses `hideExpandButton`.
- Pinned cells carry `backgroundColor` + inset accent + sticky shadow on name.
- `GlobalThemeStyles` unchanged — inline sticky styles sufficient.

## Commit
**Not created** — `git commit` failed (`Author identity unknown`). Staged files ready; message: `feat: TanStack header sort and sticky columns with stage colors`.

## Concerns
1. Manual smoke: horizontal scroll + header sort + pinned stage colors.
2. Session sort not persisted to view on save (by design v1; persist deferred).
3. Commit requires local git user.name/email without changing agent git config.

## Follow-up fix (import)
- **Issue:** `DealRow.tsx` imported `PARENT_EXPAND_COLUMN_FIELD` from `build-parent-columns`, but that constant is defined in `parent-table-sort.ts` and not re-exported.
- **Fix:** Import `PARENT_EXPAND_COLUMN_FIELD` directly from `./parent-table-sort`; keep `PARENT_EXPAND_COLUMN` from `./build-parent-columns`.
- **Tests:** `parent-table-sort.test.ts` — 4 passed.
- **Commit:** `303f5f7` — `fix: import PARENT_EXPAND_COLUMN_FIELD from parent-table-sort`
