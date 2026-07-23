# Line Item Field Groups + Labor Marker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configurable collapsible field groups on deal line items (desktop + mobile), labor work SELECT marker, and a two-step print progress UI for «Взято» / «Готово».

**Architecture:** Extend `dealBoardView.childColumns` RAW_JSON to v2 `{ version: 2, columns, groups }`. In memory, views expose `childColumns` + `childGroups`. Each group renders as one table/card column; expand is per `(lineItemId, groupId)` in localStorage. Labor marker is a new CRM SELECT on `dealLineItem`.

**Tech Stack:** React 19, Twenty SDK `defineField`, `@tanstack/react-query`, existing Deals Board editors/cells, vitest unit tests, `localStorage` helpers in `browser-storage.ts`.

**Spec:** `docs/superpowers/specs/2026-07-23-line-item-field-groups-design.md`

## Global Constraints

- All new UUIDs must be valid UUID v4
- Groups only on child (line item) columns — never parent
- Desktop + mobile Deals Board only — not native Twenty record page
- Labor field is a marker SELECT, not hours/money
- Seed print group only when target view still has empty `groups`
- Seed targets: views named `Будущие сделки` and `Мобильный` (operational defaults)
- Chip status only from `gotovo` / `vzatoVRabotu` when present in the group
- Prefer existing ↑↓ + group select in ColumnPicker if HTML5 DnD is flaky in Remote DOM; both must move fields between groups
- Follow TDD: failing test → implement → pass → commit per task
- Do not bump app version until the final task

---

## File structure

| File | Responsibility |
|------|----------------|
| `src/constants/universal-identifiers.ts` | UUID for `zatratyNaRabotu` field |
| `src/constants/labor-work.ts` | SELECT option values/labels |
| `src/constants/print-field-group.ts` | Stable print group id + member field names + seed helper |
| `src/fields/zatraty-na-rabotu.field.ts` | `defineField` SELECT |
| `src/deals-board/types.ts` | `ColumnGroupConfig`, `groupId` on columns, `childGroups` on view |
| `src/deals-board/utils/columns.ts` | parse/serialize child columns v2 |
| `src/deals-board/utils/column-groups.ts` | partition layout columns, chip status, seed apply |
| `src/deals-board/api/views.ts` | map/parse/save `childGroups` |
| `src/deals-board/hooks/useGroupChipMode.tsx` | name \| name+status toggle |
| `src/deals-board/hooks/useLineItemGroupExpand.ts` | per-row group expand state |
| `src/deals-board/GroupChipModeToggle.tsx` | toolbar SegmentControl |
| `src/deals-board/ColumnPicker.tsx` | groups UI for `target === 'child'` |
| `src/deals-board/editors/PrintProgressCell.tsx` | Взято → Готово ladder |
| `src/deals-board/cells/GroupColumnCell.tsx` | chip / stacked fields |
| `src/deals-board/DealsTable/LineItemsTable.tsx` | render group columns |
| `src/deals-board/mobile/MobileLineItemRow.tsx` | group chips + expand |
| `src/deals-board/DealsBoard.tsx` | wire groups save, toggles, seed migration |
| `src/deals-board/hooks/useDealBoardViews.ts` | seed DEFAULT child config with groups |
| `src/constants/column-definitions.ts` | default child columns include labor + groupIds |

---

### Task 1: Types + childColumns v2 parse/serialize

**Files:**
- Modify: `src/deals-board/types.ts`
- Modify: `src/deals-board/utils/columns.ts`
- Create: `src/deals-board/utils/columns-groups.test.ts` (or extend existing columns tests if present)
- Test: `src/deals-board/utils/columns-groups.test.ts`

**Interfaces:**
- Produces:
  - `ColumnGroupConfig = { id: string; name: string; order: number }`
  - `ColumnConfig.groupId?: string`
  - `DealBoardViewRecord.childGroups: ColumnGroupConfig[]`
  - `parseChildColumnsPayload(raw, fallbackColumns): { columns: ColumnConfig[]; groups: ColumnGroupConfig[] }`
  - `serializeChildColumnsPayload(columns, groups): { version: 2; columns: ColumnConfig[]; groups: ColumnGroupConfig[] }`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  parseChildColumnsPayload,
  serializeChildColumnsPayload,
} from './columns';

const fallback = [{ field: 'name', label: 'Позиция', order: 0, visible: true }];

describe('parseChildColumnsPayload', () => {
  it('parses legacy ColumnConfig[] as groups: []', () => {
    const result = parseChildColumnsPayload(
      [{ field: 'stage', label: 'Стадия', order: 0, visible: true }],
      fallback,
    );
    expect(result.groups).toEqual([]);
    expect(result.columns[0]?.field).toBe('stage');
  });

  it('parses v2 payload with groupId', () => {
    const result = parseChildColumnsPayload(
      {
        version: 2,
        groups: [{ id: 'g1', name: 'Печать', order: 0 }],
        columns: [
          { field: 'plenka', label: 'Плёнка', order: 0, visible: true, groupId: 'g1' },
        ],
      },
      fallback,
    );
    expect(result.groups).toEqual([{ id: 'g1', name: 'Печать', order: 0 }]);
    expect(result.columns[0]?.groupId).toBe('g1');
  });

  it('returns fallback when raw is invalid', () => {
    expect(parseChildColumnsPayload(null, fallback).columns).toEqual(fallback);
  });
});

describe('serializeChildColumnsPayload', () => {
  it('always writes version 2', () => {
    const payload = serializeChildColumnsPayload(
      [{ field: 'name', label: 'Позиция', order: 0, visible: true }],
      [],
    );
    expect(payload.version).toBe(2);
    expect(payload.groups).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `yarn test:unit src/deals-board/utils/columns-groups.test.ts`

Expected: FAIL (exports missing)

- [ ] **Step 3: Implement types + parse/serialize**

In `types.ts`:

```ts
export type ColumnGroupConfig = {
  id: string;
  name: string;
  order: number;
};

export type ColumnConfig = {
  field: string;
  label: string;
  width?: number;
  order: number;
  visible: boolean;
  groupId?: string;
};

export type DealBoardViewRecord = {
  // ...existing fields...
  childColumns: ColumnConfig[];
  childGroups: ColumnGroupConfig[];
};
```

In `columns.ts` add `parseChildColumnsPayload` / `serializeChildColumnsPayload`. Keep existing `parseColumns` for parent columns unchanged. When parsing v2, drop `groupId` values that do not match any group id (treat as ungrouped).

- [ ] **Step 4: Run test — expect PASS**

Run: `yarn test:unit src/deals-board/utils/columns-groups.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/types.ts src/deals-board/utils/columns.ts src/deals-board/utils/columns-groups.test.ts
git commit -m "feat: parse childColumns v2 with field groups"
```

---

### Task 2: Wire views API + call-site defaults for `childGroups`

**Files:**
- Modify: `src/deals-board/api/views.ts`
- Modify: `src/deals-board/hooks/useDealBoardViews.ts`
- Modify: `src/deals-board/ViewSettingsModal.tsx`
- Modify: any test helpers that construct `DealBoardViewRecord` (e.g. `resolve-active-view.test.ts`)
- Test: extend `columns-groups.test.ts` or add `views` mapping test if cheap; otherwise fix compile via `yarn test:unit`

**Interfaces:**
- Consumes: `parseChildColumnsPayload`, `serializeChildColumnsPayload`
- Produces: `mapViewRecord` sets `childGroups`; `create`/`update` serialize child payload when writing `childColumns`

- [ ] **Step 1: Update `mapViewRecord`**

```ts
const mapped = parseChildColumnsPayload(node.childColumns, DEFAULT_CHILD_COLUMNS);
return {
  // ...
  childColumns: mapped.columns,
  childGroups: mapped.groups,
};
```

- [ ] **Step 2: Update create/update payloads**

When sending `childColumns` to Twenty, if the in-memory update includes columns (and optionally groups from the record), serialize:

```ts
childColumns: serializeChildColumnsPayload(data.childColumns, data.childGroups ?? [])
```

For partial updates that only patch `childColumns` array from old callers, also accept optional `childGroups` on the partial type. Update `saveActiveViewColumns` later in Task 6 to pass groups.

- [ ] **Step 3: Fix all `DealBoardViewRecord` literals**

Add `childGroups: []` to seeds in `useDealBoardViews.ts`, `ViewSettingsModal.tsx`, and tests.

- [ ] **Step 4: Run unit tests**

Run: `yarn test:unit`

Expected: PASS (or only unrelated failures — fix type errors you introduced)

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/api/views.ts src/deals-board/hooks/useDealBoardViews.ts src/deals-board/ViewSettingsModal.tsx src/deals-board/utils/resolve-active-view.test.ts
git commit -m "feat: load and save childGroups on deal board views"
```

---

### Task 3: Labor SELECT field `zatratyNaRabotu`

**Files:**
- Modify: `src/constants/universal-identifiers.ts`
- Create: `src/constants/labor-work.ts`
- Create: `src/fields/zatraty-na-rabotu.field.ts`
- Test: `src/constants/labor-work.test.ts`

**Interfaces:**
- Produces:
  - `DEAL_LINE_ITEM_ZATRATY_NA_RABOTU_FIELD_UNIVERSAL_IDENTIFIER = '92d0a8eb-9cc5-40de-ba82-addbaf2d09d5'`
  - `LABOR_WORK_OPTIONS = [{ value: 'OKLEYKA', label: 'Оклейка', ...}, { value: 'PODRYADNAYA_OKLEYKA', label: 'Подрядная оклейка', ...}]`

- [ ] **Step 1: Write failing test for option values**

```ts
import { describe, expect, it } from 'vitest';
import { LABOR_WORK_OPTIONS, LABOR_WORK } from './labor-work';

describe('LABOR_WORK_OPTIONS', () => {
  it('has okleyka and contract wrapping', () => {
    expect(LABOR_WORK.OKLEYKA).toBe('OKLEYKA');
    expect(LABOR_WORK.PODRYADNAYA_OKLEYKA).toBe('PODRYADNAYA_OKLEYKA');
    expect(LABOR_WORK_OPTIONS.map((o) => o.value)).toEqual([
      'OKLEYKA',
      'PODRYADNAYA_OKLEYKA',
    ]);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `yarn test:unit src/constants/labor-work.test.ts`

- [ ] **Step 3: Implement constants + `defineField`**

Mirror `src/fields/istochnik.field.ts`:

```ts
export default defineField({
  universalIdentifier: DEAL_LINE_ITEM_ZATRATY_NA_RABOTU_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'zatratyNaRabotu',
  type: FieldType.SELECT,
  label: 'Затраты на работу',
  icon: 'IconUserDollar',
  options: [
    { value: LABOR_WORK.OKLEYKA, label: 'Оклейка', position: 0, color: 'blue' },
    {
      value: LABOR_WORK.PODRYADNAYA_OKLEYKA,
      label: 'Подрядная оклейка',
      position: 1,
      color: 'purple',
    },
  ],
});
```

Prefer `yarn twenty dev:add field` if the CLI can scaffold; then replace generated ids/options with the values above so the UUID stays the one in this plan.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/constants/universal-identifiers.ts src/constants/labor-work.ts src/constants/labor-work.test.ts src/fields/zatraty-na-rabotu.field.ts
git commit -m "feat: add dealLineItem.zatratyNaRabotu labor marker field"
```

---

### Task 4: Print group constants + layout/chip helpers

**Files:**
- Create: `src/constants/print-field-group.ts`
- Create: `src/deals-board/utils/column-groups.ts`
- Create: `src/deals-board/utils/column-groups.test.ts`
- Modify: `src/constants/column-definitions.ts` (default child columns: labor visible; print members get `groupId`)

**Interfaces:**
- Produces:
  - `PRINT_FIELD_GROUP_ID = '6c0f96ca-7419-4400-8fa0-50461ac62550'`
  - `PRINT_FIELD_GROUP_MEMBER_FIELDS: readonly string[]`
  - `buildDefaultChildGroups(): ColumnGroupConfig[]`
  - `applyPrintGroupSeed(columns, groups): { columns; groups }` — no-op if `groups.length > 0`
  - `buildChildLayoutColumns(columns, groups): Array<ColumnConfig | { type: 'group'; group: ColumnGroupConfig; members: ColumnConfig[] }>`
  - `getGroupChipStatus(members, row): 'gotovo' | 'vzyato' | null`
  - `formatGroupChipLabel(groupName, status, mode): string`

- [ ] **Step 1: Write failing tests**

```ts
describe('applyPrintGroupSeed', () => {
  it('is idempotent when groups already exist', () => { /* ... */ });
  it('assigns print fields to Печать and leaves zatratyNaRabotu ungrouped', () => { /* ... */ });
});

describe('buildChildLayoutColumns', () => {
  it('omits groups with no visible members', () => { /* ... */ });
  it('keeps ungrouped visible fields as normal columns', () => { /* ... */ });
});

describe('getGroupChipStatus', () => {
  it('prefers gotovo over vzatoVRabotu', () => { /* ... */ });
  it('returns null when neither flag is set', () => { /* ... */ });
});

describe('formatGroupChipLabel', () => {
  it('name mode ignores status', () => {
    expect(formatGroupChipLabel('Печать', 'gotovo', 'name')).toBe('Печать');
  });
  it('name+status appends suffix', () => {
    expect(formatGroupChipLabel('Печать', 'gotovo', 'name+status')).toBe('Печать · готово');
    expect(formatGroupChipLabel('Печать', 'vzyato', 'name+status')).toBe('Печать · взято');
  });
});
```

Member fields (exact):

```ts
export const PRINT_FIELD_GROUP_MEMBER_FIELDS = [
  'ssylkaNaMakety',
  'dataGotovnostiPechati',
  'vremyaGotovnostiPechati',
  'kommentariyDlyaPechati',
  'plenka',
  'vzatoVRabotu',
  'gotovo',
] as const;
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement helpers + update `DEFAULT_CHILD_COLUMNS`**

Add to defaults (ungrouped, visible): `{ field: 'zatratyNaRabotu', label: 'Затраты на работу', order: <next>, visible: true, width: 140 }`.

Set `groupId: PRINT_FIELD_GROUP_ID` on the print member fields that already appear in defaults (`ssylkaNaMakety`, `plenka`); other print members appear via metadata merge later — seed on views will set their `groupId`.

Export `DEFAULT_CHILD_GROUPS = [{ id: PRINT_FIELD_GROUP_ID, name: 'Печать', order: 0 }]`.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/constants/print-field-group.ts src/constants/column-definitions.ts src/deals-board/utils/column-groups.ts src/deals-board/utils/column-groups.test.ts
git commit -m "feat: add print group seed and child layout helpers"
```

---

### Task 5: Seed Future Deals + Mobile views; preserve `groupId` in mergeColumns

**Files:**
- Modify: `src/deals-board/metadata/merge-columns.ts`
- Modify: `src/deals-board/hooks/useDealBoardViews.ts`
- Modify: `src/deals-board/DealsBoard.tsx` (one-shot migration after views load)
- Test: `src/deals-board/metadata/merge-columns.test.ts` (add case)

**Interfaces:**
- Consumes: `applyPrintGroupSeed`, `DEFAULT_CHILD_GROUPS`
- Produces: views named `Будущие сделки` / `Мобильный` get seeded groups when empty; `mergeColumns` copies `groupId` from saved column

- [ ] **Step 1: Failing test — merge preserves groupId**

```ts
it('preserves groupId from saved columns', () => {
  const merged = mergeColumns(
    [{ field: 'plenka', label: 'Плёнка', order: 0, visible: true, groupId: 'g1' }],
    [{ field: 'plenka', label: 'Плёнка', source: 'crm', fieldType: 'RICH_TEXT', isEditable: true }],
  );
  expect(merged[0]?.groupId).toBe('g1');
});
```

- [ ] **Step 2: Implement preserve `groupId` in `mergeColumns`**

- [ ] **Step 3: Seed on view bootstrap**

In `useDealBoardViews` seeds, set:

```ts
childColumns: DEFAULT_CHILD_COLUMNS, // already with groupIds from Task 4
childGroups: DEFAULT_CHILD_GROUPS,
```

After fetch, for each view where `view.name === FUTURE_DEALS_VIEW_NAME || view.name === MOBILE_VIEW_NAME` and `view.childGroups.length === 0`, call `applyPrintGroupSeed`, then `updateDealBoardView` with serialized columns+groups. Guard with a ref so it runs once per session (same pattern as existing mobile align effects).

- [ ] **Step 4: Run unit tests**

Run: `yarn test:unit src/deals-board/metadata/merge-columns.test.ts src/deals-board/utils/column-groups.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/metadata/merge-columns.ts src/deals-board/metadata/merge-columns.test.ts src/deals-board/hooks/useDealBoardViews.ts src/deals-board/DealsBoard.tsx
git commit -m "feat: seed print group on future and mobile views"
```

---

### Task 6: Group chip mode + per-row expand hooks

**Files:**
- Create: `src/deals-board/hooks/useGroupChipMode.tsx`
- Create: `src/deals-board/hooks/useLineItemGroupExpand.ts`
- Create: `src/deals-board/GroupChipModeToggle.tsx`
- Create: `src/deals-board/utils/group-chip-mode.test.ts` (pure helpers if any)
- Modify: `src/deals-board/DealsBoard.tsx` — wrap provider + render toggle next to `ExpandModeToggle`
- Modify: `src/deals-board/mobile/MobileSettingsSheet.tsx` — add toggle

**Interfaces:**
- Produces:
  - `GroupChipMode = 'name' | 'name+status'`
  - `useGroupChipMode(): { mode, setMode }`
  - `useLineItemGroupExpand(): { isExpanded(lineItemId, groupId), toggle(lineItemId, groupId) }`
  - Storage keys: `deals-board-group-chip-mode`, `deals-board-line-item-group-expand` (JSON map)

- [ ] **Step 1: Write failing tests for expand toggle purity**

Extract pure helpers in `useLineItemGroupExpand.ts` (or adjacent util):

```ts
export const toggleGroupExpandKey = (
  state: Record<string, boolean>,
  lineItemId: string,
  groupId: string,
): Record<string, boolean> => {
  const key = `${lineItemId}:${groupId}`;
  return { ...state, [key]: !state[key] };
};
```

Test flip behavior.

- [ ] **Step 2: Implement hooks + `GroupChipModeToggle` using `SegmentControl`**

Labels: `Имя` / `Имя+статус`. Default mode: `name+status`.

Mirror `ExpandModeProvider` pattern; nest provider beside/inside existing `ExpandModeProvider` in `DealsBoard.tsx`.

- [ ] **Step 3: Place toggle in desktop toolbar and mobile settings**

- [ ] **Step 4: Run unit tests**

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/hooks/useGroupChipMode.tsx src/deals-board/hooks/useLineItemGroupExpand.ts src/deals-board/GroupChipModeToggle.tsx src/deals-board/DealsBoard.tsx src/deals-board/mobile/MobileSettingsSheet.tsx src/deals-board/utils/group-chip-mode.test.ts
git commit -m "feat: add group chip mode toggle and per-row expand state"
```

---

### Task 7: ColumnPicker groups for child columns

**Files:**
- Modify: `src/deals-board/ColumnPicker.tsx`
- Modify: `src/deals-board/DealsBoard.tsx` (`saveActiveViewColumns`)
- Modify: `src/deals-board/mobile/MobileSettingsSheet.tsx` (props if needed)
- Create: `src/deals-board/utils/column-picker-groups.ts` (pure move/assign helpers)
- Create: `src/deals-board/utils/column-picker-groups.test.ts`

**Interfaces:**
- Consumes: `ColumnGroupConfig`
- Produces: child picker can create/rename/delete groups; assign field `groupId`; reorder; `onSave(columns, groups)`

- [ ] **Step 1: Failing tests for pure helpers**

```ts
describe('assignColumnGroup', () => {
  it('sets groupId or clears it for Без группы', () => { /* ... */ });
});

describe('deleteGroup', () => {
  it('removes group and clears member groupIds', () => { /* ... */ });
});

describe('createGroup', () => {
  it('appends group with uuid and name Печать N or custom', () => { /* ... */ });
});
```

Use `crypto.randomUUID()` in create helper (Node 24 / browsers OK).

- [ ] **Step 2: Extend ColumnPicker API**

```ts
type ColumnPickerProps = {
  target: 'parent' | 'child';
  columns: ColumnConfig[];
  groups?: ColumnGroupConfig[];
  onSave: (columns: ColumnConfig[], groups: ColumnGroupConfig[]) => Promise<void>;
};
```

For `target === 'parent'`, ignore groups (always save `[]`).

Child UI:
- Button «+ Группа»
- Per group: editable name input, delete button, list of member fields (checkbox visible + ↑↓ + `<select>` of groups including «Без группы»)
- Section «Без группы» for `!groupId`
- Widen panel (~360–400px) and raise `maxHeight` so sections fit

Remote DOM note: implement move-to-group via `<select>` + ↑↓ first (required). Optional pointer drag is nice-to-have only if select path works.

- [ ] **Step 3: Wire `saveActiveViewColumns`**

```ts
const saveActiveViewColumns = async (
  target: 'parent' | 'child',
  columns: ColumnConfig[],
  groups: ColumnGroupConfig[] = [],
) => {
  // parent: { parentColumns: columns }
  // child: { childColumns: columns, childGroups: groups } — API serializes v2
};
```

- [ ] **Step 4: Manual sanity via unit tests of helpers + `yarn test:unit`**

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/ColumnPicker.tsx src/deals-board/DealsBoard.tsx src/deals-board/mobile/MobileSettingsSheet.tsx src/deals-board/utils/column-picker-groups.ts src/deals-board/utils/column-picker-groups.test.ts src/deals-board/api/views.ts
git commit -m "feat: configure line-item field groups in ColumnPicker"
```

---

### Task 8: Print progress ladder cell

**Files:**
- Create: `src/deals-board/editors/PrintProgressCell.tsx`
- Create: `src/deals-board/editors/print-progress.test.ts` (pure label/state helpers if extracted)
- Modify: `src/deals-board/cells/overrides.tsx` — special-case `vzatoVRabotu` / `gotovo`
- Modify: `src/deals-board/cells/DynamicFieldCell.tsx` — do not fall through to raw checkbox when override handles them

**Interfaces:**
- Produces: `PrintProgressCell({ recordId, vzatoVRabotu, gotovo, mode: 'full' | 'vzato' | 'gotovo' })`
- Click toggles the corresponding boolean via `useUpdateRecord('dealLineItem')`

- [ ] **Step 1: Failing test for step active derivation**

```ts
expect(getPrintProgressState(true, false)).toEqual({ vzato: true, gotovo: false });
expect(getPrintProgressState(false, true)).toEqual({ vzato: false, gotovo: true });
```

- [ ] **Step 2: Implement `PrintProgressCell` UI**

Two compact buttons in a row: `Взято` → `Готово`. Active fill uses theme accent / green (`colors` from theme). Disabled while mutation pending.

When override renders `vzatoVRabotu`, if `gotovo` is also being shown as its own column/stack field, prefer rendering the **full** ladder only on the first of the two fields and `null` on the second — OR always render full ladder on either field when both values are available on `row`. Spec: if only one field visible, show that step alone (`mode: 'vzato' | 'gotovo'`).

In `overrides.tsx`:

```ts
case 'vzatoVRabotu':
case 'gotovo':
  return (
    <PrintProgressCell
      recordId={recordId}
      vzatoVRabotu={row?.vzatoVRabotu === true}
      gotovo={row?.gotovo === true}
      focus={field === 'vzatoVRabotu' ? 'vzato' : 'gotovo'}
      showBoth={/* true when both fields are in the same visible stack/columns */}
    />
  );
```

Keep `showBoth` simple for v1: always show both steps when `row` is present (values still toggle independently); hide inactive step only if product later asks. Spec allows single-step when only one field visible — pass `visibleSteps` from caller.

For grouped stack (Task 9), pass `visibleSteps` based on member fields. For flat columns, each column passes only its own step **unless** we detect both columns visible then show full ladder only once — simplest correct approach:

- In layout, when building stacked members, replace the pair with a single synthetic renderer.
- For flat table with both columns visible, accept two ladders briefly OR hide `gotovo` column’s cell when `vzatoVRabotu` column is also visible.

Implement: helper `shouldRenderPrintProgress(field, visibleFields): boolean` — render full ladder only for `vzatoVRabotu` if both visible; only for `gotovo` if `vzatoVRabotu` not visible; single step otherwise.

- [ ] **Step 3: Unit tests for `shouldRenderPrintProgress`**

- [ ] **Step 4: Run tests**

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/editors/PrintProgressCell.tsx src/deals-board/editors/print-progress.test.ts src/deals-board/cells/overrides.tsx src/deals-board/cells/DynamicFieldCell.tsx
git commit -m "feat: show print taken/done as progress ladder"
```

---

### Task 9: Desktop LineItemsTable group columns

**Files:**
- Create: `src/deals-board/cells/GroupColumnCell.tsx`
- Modify: `src/deals-board/DealsTable/LineItemsTable.tsx`
- Modify: `src/deals-board/DealsTable/DealRow.tsx` / `DealsTable.tsx` if child columns prop needs groups
- Modify: `src/deals-board/DealsBoard.tsx` — pass `childGroups` into table tree

**Interfaces:**
- Consumes: `buildChildLayoutColumns`, `useLineItemGroupExpand`, `useGroupChipMode`, `formatGroupChipLabel`, `getGroupChipStatus`
- Produces: group header + per-row `GroupColumnCell`

- [ ] **Step 1: Implement `GroupColumnCell`**

Collapsed: button/chip calling `toggle(lineItemId, groupId)`; label from `formatGroupChipLabel`.

Expanded: stack member fields with `DynamicFieldCell` (existing editors). Include field labels in the stack for clarity.

- [ ] **Step 2: Update `LineItemsTable`**

```ts
type LineItemsTableProps = {
  // existing...
  groups: ColumnGroupConfig[];
};

const layout = buildChildLayoutColumns(columns, groups);
```

Header row: for group entries use `group.name` as header text (width ~160).

Body: map layout entries; group → `GroupColumnCell`.

Filter `columns` prop: still the full merged child columns (including grouped ones). `buildChildLayoutColumns` excludes grouped fields from flat columns.

- [ ] **Step 3: Thread `groups={activeView.childGroups}` from `DealsBoard` → `DealsTable` → `DealRow` → `LineItemsTable`**

- [ ] **Step 4: Run `yarn test:unit` + lint touched files**

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/cells/GroupColumnCell.tsx src/deals-board/DealsTable/LineItemsTable.tsx src/deals-board/DealsTable/DealRow.tsx src/deals-board/DealsTable/DealsTable.tsx src/deals-board/DealsBoard.tsx
git commit -m "feat: render collapsible field groups in line items table"
```

---

### Task 10: Mobile line-item groups

**Files:**
- Modify: `src/deals-board/mobile/MobileLineItemRow.tsx`
- Modify: `src/deals-board/mobile/MobileDealCard.tsx` / `MobileDealsBoard.tsx` to pass `groups`
- Reuse: `GroupColumnCell` or a thin mobile wrapper

**Interfaces:**
- Same group expand + chip mode hooks

- [ ] **Step 1: Partition mobile detail fields**

Ungrouped detail fields stay in `MobileFieldStack`. Each group with visible members renders a chip row; expanded shows stacked fields below the chip (not inside the header row).

Exclude grouped fields from the default `detail` list (use `buildChildLayoutColumns` or filter `!groupId`).

- [ ] **Step 2: Pass `childGroups` through mobile board props**

- [ ] **Step 3: Run unit tests**

- [ ] **Step 4: Commit**

```bash
git add src/deals-board/mobile/MobileLineItemRow.tsx src/deals-board/mobile/MobileDealCard.tsx src/deals-board/mobile/MobileDealsBoard.tsx src/deals-board/mobile/types.ts
git commit -m "feat: collapsible field groups on mobile line items"
```

---

### Task 11: Version bump, full verify, docs touch-up if needed

**Files:**
- Modify: `package.json` version `0.3.1` → `0.3.2` (or next minor if you prefer feature bump `0.4.0` — use **0.4.0** because this is a user-facing feature set)

- [ ] **Step 1: Bump version to `0.4.0`**

- [ ] **Step 2: Run full unit suite + lint**

Run:

```bash
yarn test:unit
yarn lint
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: bump version to 0.4.0 for field groups release"
```

- [ ] **Step 4: Manual checklist (human or browser)**

1. Desktop: ColumnPicker → create group, assign fields, save, reload — persisted  
2. Expand «Печать» on one position only  
3. Toggle Имя / Имя+статус  
4. Ladder toggles `vzatoVRabotu` / `gotovo`  
5. Set `zatratyNaRabotu` on a row  
6. Mobile: same group expand + settings toggles  

---

## Spec coverage self-review

| Spec requirement | Task |
|------------------|------|
| childColumns v2 + backward compat | 1–2 |
| `zatratyNaRabotu` SELECT | 3 |
| Seed «Печать» + labor ungrouped on Future/Mobile | 4–5 |
| ColumnPicker groups create/rename/delete/assign | 7 |
| Group = one column, per-row expand | 6, 9 |
| Chip mode toggle by ExpandMode | 6 |
| Status gotovo > vzyato | 4 |
| Print progress ladder | 8 |
| Mobile parity | 10 |
| Non-goals respected (no parent groups, no hours, no native card) | Global constraints |

## Placeholder / consistency check

- UUIDs fixed in plan: labor field `92d0a8eb-9cc5-40de-ba82-addbaf2d09d5`, print group `6c0f96ca-7419-4400-8fa0-50461ac62550`
- `childGroups` naming consistent across types, API, UI
- Chip modes `'name' | 'name+status'` consistent with toggle labels
- DnD reduced to select+↑↓ as required path for Remote DOM reliability (still moves fields between groups as designed)
