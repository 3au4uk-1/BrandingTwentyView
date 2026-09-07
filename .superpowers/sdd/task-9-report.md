# Task 9 Report: Chip on the deals board

## Status
**Complete**

## Commits
- `271fd90` — `feat(deals-board): banner crew chip beside deal date`

## Changes

### Created
- `src/deals-board/banner-crew/BannerCrewChip.tsx` — clickable chip; `useBannerCrewSlots` + `buildBannerCrewChipModel` (`lineItems`, this-opportunity `slots`, `allSlotsForConflicts` = full query list); inner `Chip` with `useTheme`; opens `BannerCrewModal` via local `useState`. Renders nothing when `model === null`. Button: `type="button"`, no border/background/padding, `cursor: pointer`, `flexShrink: 1`, `stopPropagation` on click and pointer down.

### Modified
- `src/deals-board/cells/overrides.tsx` — `case 'loadDate'` now renders `LoadDateCell` (flex row: `gap: theme.spacing.sm`, `alignItems: 'center'`, `minWidth: 0`) with `DatePickerModal` + `BannerCrewChip`. `loadDate` from `props.value`; name from `row.name`.
- `src/deals-board/mobile/MobileDealCard.tsx` — `BannerCrewChip` after the `showDate` span; `dealLineItems`, `dealName`, `row.loadDate`.

### Untouched (confirmed in commit `271fd90`)
- `case 'tipDetail'` / `SupplierCombobox` — not present in the overrides diff (no added or removed lines).

## Lint
| Command | Result |
|---|---|
| `yarn lint` | 17 warnings, 0 errors — all pre-existing, **none in the three task files** |
| `yarn oxlint -c .oxlintrc.json` on the three files | 0 warnings, 0 errors |

No unit test file in this task; plan check is lint.

## Concerns
1. **No component tests.** Chip visibility/color stay covered by `chip-model.test.ts`; click → modal is untested.
2. **DatePicker `width: 100%`.** The date trigger still wants full cell width; the chip uses `flexShrink: 1` + `minWidth: 0` so it should ellipsize, but the date button may crowd a narrow column.
3. **Chip still mounts when there is no `loadDate` on mobile** (sibling of `showDate`, not gated by it) so banner deals without a date can still open the modal.

## Review fix: chip visibility vs board-filtered line items

Chip visibility no longer depends on the board-filtered `lineItems` prop.

`BannerCrewChip` reads `queryClient.getQueriesData({ queryKey: ['lineItems'] })`, flattens arrays, and keeps items with `opportunityId === opportunityId` via `lineItemsForOpportunity(cacheLists, opportunityId, fallback)`. Empty cache falls back to the prop. Slots still come from this opportunity via `useBannerCrewSlots`; conflicts still use the full slot list.

`tipDetail` / `SupplierCombobox` unchanged (no edits in `overrides.tsx` or `SupplierCombobox.tsx`).

### Tests
```
yarn test:unit src/deals-board/banner-crew/line-items-for-opportunity.test.ts
✓ src/deals-board/banner-crew/line-items-for-opportunity.test.ts (3 tests) 3ms
Test Files  1 passed (1)
Tests  3 passed (3)
```

### Lint
```
yarn oxlint -c .oxlintrc.json src/deals-board/banner-crew/BannerCrewChip.tsx src/deals-board/banner-crew/line-items-for-opportunity.ts src/deals-board/banner-crew/line-items-for-opportunity.test.ts
Found 0 warnings and 0 errors.
```

## Remaining Important: unfiltered `allDealLineItems`, not react-query cache

Chip visibility now uses the DealsBoard map **before** `filterDealsAndLineItems`, not board-filtered children and not `['lineItems']` cache as the primary source.

`DealRow.lineItems` was **not** already unfiltered: it comes from `tableLineItems` / `filteredBoardData.lineItemsByOppId` (type/stage filter strips BANNERA on a mixed deal).

### Data path
- `DealsBoard` passes `allDealLineItems={streamFilteredLineItems}` (flatten of `lineItemsByOppId`, the map next to `filteredBoardData`) into `DealsTable`.
- Mobile: unfiltered `streamFilteredMobileLineItems` (else desktop `streamFilteredLineItems`) into `MobileDealsBoard` → `MobileDealCard`.
- `DealsTable` groups that list and passes per-row `allDealLineItems` through `DealsDataTable` → `DealRow` → `DynamicFieldCell` / `overrides` `loadDate`.
- `LoadDateCell` and `MobileDealCard` pass `allDealLineItems` into `BannerCrewChip` as `lineItems`.
- `lineItemsForOpportunity` unions cache rows for this `opportunityId` with that unfiltered fallback (fallback first; dedupe by `id`). It never drops fallback just because some cache list is non-empty.

`tipDetail` / `SupplierCombobox` unchanged.

### Tests
```
yarn test:unit src/deals-board/banner-crew/line-items-for-opportunity.test.ts
✓ src/deals-board/banner-crew/line-items-for-opportunity.test.ts (4 tests) 6ms
Test Files  1 passed (1)
Tests  4 passed (4)
```

Mixed PLENKA+BANNERA with type filter: unfiltered fallback keeps BANNERA; `apply-line-item-filters.test.ts` asserts `lineItemsByOppId.d1` still has BANNERA while filtered children are PLENKA-only.

### Lint
```
yarn oxlint -c .oxlintrc.json (13 task files)
Found 2 warnings and 0 errors — both pre-existing unused vars in DealsBoard.tsx (layout, opportunityLinkFieldNames). None in the new/edited chip path.
```
