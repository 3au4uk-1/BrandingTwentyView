# Horizontal Group Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace vertical in-cell group expand with a left (ungrouped fields) / right (chips + horizontal field strip) layout on desktop and mobile, and allow clearing «Затраты на работу» to `null`.

**Architecture:** Keep `buildChildLayoutColumns` partitioning. Render ungrouped columns on the left; collapse all groups into one right zone (chip column + optional horizontal strip). Make expand exclusive per line item. Fix `SelectCell` empty semantics globally.

**Tech Stack:** React 19, existing Deals Board cells/editors, vitest, `localStorage` via `browser-storage.ts`.

**Spec:** `docs/superpowers/specs/2026-07-23-horizontal-group-panel-design.md`

## Global Constraints

- Left zone = visible **ungrouped** fields only
- Right zone = group chips always visible; field strip only when a group is open for that row
- One open group per `lineItemId` (switching closes the previous)
- Desktop + mobile same interaction model
- Empty labor = CRM `null` via UI placeholder «—»; do not add a CRM SELECT option unless clearing is impossible
- Do not change ColumnPicker / v2 childColumns / print seed
- Use `corepack yarn` for tests on Windows if `yarn` is missing from PATH
- Prefer ASCII worktree path if Cyrillic username breaks vitest resolution
- TDD; no version bump until final task
- Bump to `0.4.1` at the end

---

## File structure

| File | Responsibility |
|------|----------------|
| `src/deals-board/hooks/useLineItemGroupExpand.ts` | Exclusive toggle helper |
| `src/deals-board/utils/group-chip-mode.test.ts` | Expand exclusivity tests (or new `line-item-group-expand.test.ts`) |
| `src/deals-board/editors/SelectCell.tsx` | Empty placeholder + null PATCH |
| `src/deals-board/editors/select-cell.test.ts` | Pure helper tests for selected value / empty payload |
| `src/deals-board/cells/GroupChipsCell.tsx` | Chip list for all groups (active state) |
| `src/deals-board/cells/GroupFieldStrip.tsx` | Horizontal labeled editors for active group members |
| `src/deals-board/cells/GroupColumnCell.tsx` | Slim or remove vertical stack; prefer chips+strip split |
| `src/deals-board/DealsTable/LineItemsTable.tsx` | Left columns + one right zone |
| `src/deals-board/mobile/MobileLineItemRow.tsx` | Chips + horizontal strip |
| `package.json` | `0.4.1` |

---

### Task 1: Exclusive per-line-item group expand

**Files:**
- Modify: `src/deals-board/hooks/useLineItemGroupExpand.ts`
- Modify: `src/deals-board/utils/group-chip-mode.test.ts` (or Create: `src/deals-board/hooks/line-item-group-expand.test.ts`)

**Interfaces:**
- Produces: `toggleGroupExpandKey(state, lineItemId, groupId): GroupExpandState` — exclusive open semantics

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { toggleGroupExpandKey } from '../hooks/useLineItemGroupExpand';

describe('toggleGroupExpandKey exclusive', () => {
  it('opens a group', () => {
    expect(toggleGroupExpandKey({}, 'item-1', 'g-a')).toEqual({ 'item-1:g-a': true });
  });

  it('closes the same group on second toggle', () => {
    const open = { 'item-1:g-a': true };
    expect(toggleGroupExpandKey(open, 'item-1', 'g-a')).toEqual({ 'item-1:g-a': false });
  });

  it('switching groups closes the previous on the same item', () => {
    const open = { 'item-1:g-a': true };
    const next = toggleGroupExpandKey(open, 'item-1', 'g-b');
    expect(next['item-1:g-a']).toBeFalsy();
    expect(next['item-1:g-b']).toBe(true);
  });

  it('does not close another item group', () => {
    const open = { 'item-1:g-a': true, 'item-2:g-a': true };
    const next = toggleGroupExpandKey(open, 'item-1', 'g-b');
    expect(next['item-2:g-a']).toBe(true);
    expect(next['item-1:g-b']).toBe(true);
    expect(next['item-1:g-a']).toBeFalsy();
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (old toggle keeps both true)

Run: `corepack yarn test:unit src/deals-board/utils/group-chip-mode.test.ts`

- [ ] **Step 3: Implement exclusive toggle**

```ts
export const toggleGroupExpandKey = (
  state: GroupExpandState,
  lineItemId: string,
  groupId: string,
): GroupExpandState => {
  const key = `${lineItemId}:${groupId}`;
  const prefix = `${lineItemId}:`;
  const currentlyOpen = state[key] === true;

  const next: GroupExpandState = { ...state };
  for (const existingKey of Object.keys(next)) {
    if (existingKey.startsWith(prefix)) {
      next[existingKey] = false;
    }
  }

  next[key] = !currentlyOpen;
  return next;
};
```

Update existing tests in `group-chip-mode.test.ts` that assumed non-exclusive behavior.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/hooks/useLineItemGroupExpand.ts src/deals-board/utils/group-chip-mode.test.ts
git commit -m "feat: exclusive group expand per line item"
```

---

### Task 2: SelectCell empty value (labor clear)

**Files:**
- Modify: `src/deals-board/editors/SelectCell.tsx`
- Create: `src/deals-board/editors/select-cell-value.ts` (pure helpers)
- Create: `src/deals-board/editors/select-cell-value.test.ts`

**Interfaces:**
- Produces:
  - `EMPTY_SELECT_VALUE = ''` (sentinel for `<option value="">`)
  - `resolveSelectDisplayValue(value: string | null | undefined): string` → `value ?? ''`
  - `selectValueToPatch(nextValue: string): string | null` → `nextValue === '' ? null : nextValue`

- [ ] **Step 1: Failing tests**

```ts
describe('resolveSelectDisplayValue', () => {
  it('maps null/undefined to empty string', () => {
    expect(resolveSelectDisplayValue(null)).toBe('');
    expect(resolveSelectDisplayValue(undefined)).toBe('');
  });
  it('keeps real values', () => {
    expect(resolveSelectDisplayValue('OKLEYKA')).toBe('OKLEYKA');
  });
});

describe('selectValueToPatch', () => {
  it('maps empty to null', () => {
    expect(selectValueToPatch('')).toBeNull();
  });
  it('passes through option values', () => {
    expect(selectValueToPatch('OKLEYKA')).toBe('OKLEYKA');
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement helpers + update SelectCell**

```tsx
const selectedValue = resolveSelectDisplayValue(value);

const handleChange = async (nextValue: string) => {
  const patchValue = selectValueToPatch(nextValue);
  if (patchValue === (value ?? null)) return;
  await updateMutation.mutateAsync({
    id: recordId,
    data: { [fieldName]: patchValue },
  });
};

// in <Select>:
<option value="">{—}</option>
{options.map(...)}
```

Label for empty option: `—` (em dash). Do **not** coerce to `options[0]`.

- [ ] **Step 4: Run unit tests + commit**

```bash
git commit -m "fix: allow clearing SELECT cells to null"
```

---

### Task 3: GroupChipsCell + GroupFieldStrip components

**Files:**
- Create: `src/deals-board/cells/GroupChipsCell.tsx`
- Create: `src/deals-board/cells/GroupFieldStrip.tsx`
- Modify: `src/deals-board/cells/GroupColumnCell.tsx` — either delete vertical stack path or re-export chips for compatibility; update `GroupColumnCell.test.ts`
- Create: `src/deals-board/cells/GroupFieldStrip.test.ts` (smoke: renders member labels when members provided — optional if hard without DOM; prefer testing a pure `getActiveGroupMembers(layout, lineItemId, isExpanded)` helper)

**Interfaces:**
- `GroupChipsCellProps = { groups: Array<{ group: ColumnGroupConfig; members: ColumnConfig[] }>; item: LineItemRow }`
- `GroupFieldStripProps = { members: ColumnConfig[]; item: LineItemRow; descriptorByField: Map<...>; ... }`
- Chips call `toggle(item.id, group.id)`; active chip when `isExpanded(...)`
- Strip: `display: flex; flexDirection: row; gap; overflowX: auto`; each member = label above editor (same editors as today)

- [ ] **Step 1: Extract active-group helper + test**

```ts
// src/deals-board/utils/active-group.ts
export const findActiveGroupMembers = (
  groups: Array<{ group: ColumnGroupConfig; members: ColumnConfig[] }>,
  lineItemId: string,
  isExpanded: (lineItemId: string, groupId: string) => boolean,
): ColumnConfig[] | null => {
  for (const entry of groups) {
    if (isExpanded(lineItemId, entry.group.id)) return entry.members;
  }
  return null;
};
```

- [ ] **Step 2: Implement chips + strip UI**

Chip active style: stronger border/background using theme accent. Inactive: current pill style from `GroupColumnCell`.

`GroupFieldStrip`: if `members` empty/null, render nothing (or null).

- [ ] **Step 3: Update/remove old vertical `GroupColumnCell` tests** to match chips-only or delete file if unused.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add group chips cell and horizontal field strip"
```

---

### Task 4: Desktop LineItemsTable left/right layout

**Files:**
- Modify: `src/deals-board/DealsTable/LineItemsTable.tsx`
- Modify: `src/deals-board/utils/column-groups.ts` if needed for `partitionUngroupedAndGroups(layout)`

**Interfaces:**
- Layout: `ungrouped = layout.filter(e => !('type' in e))`
- `groupEntries = layout.filter(e => 'type' in e)`
- Table columns = `[...ungrouped, chipsCol, stripCol?]` OR single right `td` with flex `[chips | strip]`

**Recommended markup per row:**

```tsx
{/* left: ungrouped tds */}
{ungrouped.map(... DynamicFieldCell ...)}

{/* right zone spanning chips + strip */}
<td colSpan={1} style={{ minWidth: 280, maxWidth: '50%', verticalAlign: 'middle' }}>
  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', minWidth: 0 }}>
    <GroupChipsCell groups={groupEntries} item={item} />
    <div style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
      <GroupFieldStrip
        members={findActiveGroupMembers(groupEntries, item.id, isExpanded) ?? []}
        item={item}
        descriptorByField={descriptorByField}
      />
    </div>
  </div>
</td>
```

Header: ungrouped headers + one header cell «Группы» (or empty / «Детали»).

Remove per-group `<th>` columns of width 160.

`tfoot` `colSpan` = ungrouped.length + 1.

- [ ] **Step 1: Implement layout refactor**

- [ ] **Step 2: Manual sanity via unit helpers if any; run `corepack yarn test:unit`**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: left-right line item layout for field groups"
```

---

### Task 5: Mobile parity

**Files:**
- Modify: `src/deals-board/mobile/MobileLineItemRow.tsx`

**Behavior:**
- Ungrouped detail fields stay in `MobileFieldStack` / header as today.
- Replace vertical `GroupColumnCell` stacks with:
  1. horizontal chip row (`GroupChipsCell` or shared chip buttons)
  2. when active: `GroupFieldStrip` with `overflowX: auto` (not vertical stack)

Pass `touchFriendly` / `listMenuPresentation="sheet"` into strip editors.

Keep `clearHeaderFieldGroupIds` behavior.

- [ ] **Step 1: Implement**

- [ ] **Step 2: Run unit tests**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: horizontal group field strip on mobile line items"
```

---

### Task 6: Version bump + verify

**Files:**
- Modify: `package.json` → `0.4.1`

- [ ] **Step 1: Bump version**

- [ ] **Step 2: Run**

```bash
corepack yarn test:unit
corepack yarn lint
```

Expected: all tests PASS; lint 0 errors

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: bump version to 0.4.1 for horizontal group panel"
```

- [ ] **Step 4: Manual checklist**

1. Desktop: left only ungrouped; right chips always; open Печать → horizontal fields  
2. Switch chip → previous closes  
3. Mobile: chips + horizontal scroll  
4. Затраты: select «—» → null; select Оклейка → OKLEYKA  

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| Exclusive expand | 1 |
| Select empty / null | 2 |
| Chips + horizontal strip components | 3 |
| Desktop left/right | 4 |
| Mobile same model | 5 |
| Version | 6 |

## Consistency notes

- `toggleGroupExpandKey` exclusive semantics used by hook automatically once helper updated
- Empty select sentinel `''` ↔ patch `null`
- `findActiveGroupMembers` shared by desktop and mobile
