# Final review fixes

Date: 2026-07-23
Branch: `feat/line-item-field-groups`

## Finding 1 — Complete print-group seed

- Added all seven `PRINT_FIELD_GROUP_MEMBER_FIELDS` to `DEFAULT_CHILD_COLUMNS`, visible and assigned to `PRINT_FIELD_GROUP_ID`.
- `applyPrintGroupSeed` now assigns existing print fields and appends any missing print defaults.
- `zatratyNaRabotu` remains visible and has no `groupId`.
- Regression tests require every print member to exist and belong to the print group.

## Finding 2 — Progress-ladder visual context

- Group stacks derive `visibleFields` only from their visible member list.
- Flat cells derive `visibleFields` only from visible ungrouped layout entries.
- Desktop and mobile rendering no longer pass the full saved column configuration into print-progress rendering.
- Regression tests cover isolated grouped and flat contexts.

## Finding 3 — Group reordering

- Added accessible ↑/↓ controls to child group headers in `ColumnPicker`.
- Added and tested `moveGroup`, including order normalization and boundary behavior.
- `buildChildLayoutColumns` now fills group slots in `group.order`, independently of first-member position.

## Test evidence

- TDD red run: focused tests failed in the six expected assertions before implementation (missing defaults/helpers and old first-member ordering).
- Focused: `corepack yarn test:unit src/deals-board/utils/column-groups.test.ts src/deals-board/utils/column-picker-groups.test.ts src/deals-board/editors/print-progress.test.ts src/deals-board/cells/GroupColumnCell.test.ts src/deals-board/mobile/mobile-field-layout.test.ts` — 5 files, 31 tests passed.
- Full unit: `corepack yarn test:unit` — 51 files, 292 tests passed.
- Typecheck: `corepack yarn tsc --noEmit` — passed.
- Lint: `corepack yarn lint` — 0 errors, 5 pre-existing warnings in unrelated files.
- Diff check: `git diff --check` — passed (Git emitted only line-ending conversion notices).
