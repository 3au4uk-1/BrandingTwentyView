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

## Remaining Important: unfiltered `useLineItems` for chip (not filtered query)

`streamFilteredLineItems` was still filled from `useLineItems(..., lineItemQueryFilters)`. A PLENKA-only filter never loads BANNERA, so the chip hid on mixed deals even after passing that list as `allDealLineItems`.

### Fix
- Table `useLineItems` unchanged (`lineItemQueryFilters` still drives `tableLineItems` / children).
- Second `useLineItems` in `DealsBoard.tsx`: ids = `filteredBoardData.deals`, filters = `undefined`, enabled when those ids are non-empty and cold load is not blocking. Also enabled on the aggregate path (page hydrate writes the **filtered** query key, not `undefined`).
- Group that result by `opportunityId` (board-stream filtered). Per displayed deal, pass unfiltered children into `allDealLineItems`; if the deal is missing from that map, fall back to `filteredBoardData.lineItemsByOppId` (current filtered children).
- Desktop `DealsTable` and mobile `MobileDealsBoard` both get `allDealLineItemsForChip`. Table `lineItems` stay filtered.

`tipDetail` / `SupplierCombobox` unchanged.

### Lint
```
yarn oxlint -c .oxlintrc.json src/deals-board/DealsBoard.tsx
Found 2 warnings and 0 errors — pre-existing unused vars (`layout`, `opportunityLinkFieldNames`). None in the new chip query path.
```

## Remaining Important: mobile accumulated deals in chip line items

After load-more, mobile cards use `mobileRecords` (`accumulatedRecords`) while the unfiltered chip `useLineItems` and `allDealLineItemsForChip` only iterated `filteredBoardData.deals` (current page). Because `allDealLineItems` is always passed, a previous-page row got `[]` instead of filtered children. A mixed PLENKA+BANNERA deal could hide the chip.

### Fix
- Unfiltered chip query ids = unique union of current-page `filteredBoardData.deals` and `accumulatedRecords` (same source as `mobileRecords`; not the later `mobileRecords` binding, so hook order stays valid).
- Flatten `allDealLineItemsForChip` over that union, unfiltered map first, then `filteredBoardData.lineItemsByOppId`.
- Table `useLineItems` unchanged. Desktop still groups by opportunity id, so extra accumulated items are unused on the current page.
- `tipDetail` / `SupplierCombobox` unchanged.

### Files
- `src/deals-board/banner-crew/chip-line-items.ts` (new)
- `src/deals-board/banner-crew/chip-line-items.test.ts` (new)
- `src/deals-board/DealsBoard.tsx`

### Tests
```
yarn test:unit src/deals-board/banner-crew/chip-line-items.test.ts src/deals-board/banner-crew/line-items-for-opportunity.test.ts src/deals-board/banner-crew/chip-model.test.ts
✓ src/deals-board/banner-crew/chip-line-items.test.ts (6 tests)
✓ src/deals-board/banner-crew/line-items-for-opportunity.test.ts (4 tests)
✓ src/deals-board/banner-crew/chip-model.test.ts (3 tests)
Test Files  3 passed (3)
Tests  13 passed (13)
```

### Lint
```
yarn oxlint -c .oxlintrc.json src/deals-board/DealsBoard.tsx src/deals-board/banner-crew/chip-line-items.ts src/deals-board/banner-crew/chip-line-items.test.ts
Found 2 warnings and 0 errors — pre-existing unused vars in DealsBoard.tsx (`layout`, `opportunityLinkFieldNames`). None in the chip union path.
```
