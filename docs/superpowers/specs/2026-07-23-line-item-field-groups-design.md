# Line Item Field Groups + Labor Marker Design

**Date:** 2026-07-23  
**Status:** Approved (brainstorming)  
**Scope:** Desktop + mobile Deals Board — configurable collapsible field groups on line items; labor work marker; print-flag progress UI

## Summary

1. В «Колонки: позиции» пользователь создаёт именованные группы, перетаскивает поля внутрь; в таблице каждая группа = одна колонка, раскрывается **по позиции**.
2. Новое SELECT-поле на `dealLineItem` — метка, что по позиции велась работа (оклейка / подрядная оклейка), для месячной выборки сделок под расход.
3. Флаги печати `vzatoVRabotu` / `gotovo` отображаются мини-лестницей из двух шагов, не сырыми чекбоксами.
4. Рядом с «Умное / Свёрнуто» — переключатель вида свёрнутого чипа группы: только имя / имя + статус.

## Goals

- Спрятать «шумные» поля позиции (печать и далее) без потери доступа в 1 клик
- Дать координатору самому собирать группы через уже знакомый ColumnPicker
- В конце месяца отфильтровать позиции/сделки, на которые нужно повесить расход за работу
- Сделать статусы печати («взято» / «готово») читаемее галочек

## Non-goals (v1)

- Группы на колонках сделок (parent)
- Группы в нативной карточке Twenty
- Учёт часов или денежных сумм затрат (только метка SELECT)
- Отдельный отчёт / автофильтр «расходы за месяц»
- Хардкод новых групп после сида «Печать» (дальше только UI)

## Decisions (from brainstorming)

| Topic | Choice |
|-------|--------|
| Surfaces | Desktop board + mobile board |
| Labor semantics | Marker that work happened (not hours/money) |
| Labor control | Single SELECT: none / Оклейка / Подрядная оклейка |
| Groups for v1 content | Seed only «Печать»; architecture supports more |
| Group authoring | ColumnPicker: create/rename/delete + drag fields |
| Expand scope | Per line item (not global for the view) |
| Collapsed chip modes | Both: name-only and name+status; toolbar toggle |
| Table interaction | Approach 1 — group = one column; expand stacks fields inside the cell |
| Print flags UI | Two-step progress: Взято → Готово |
| First-run seed | Group «Печать» + labor SELECT in always-visible columns on default + mobile default views |

## Architecture

### Approach

**Group-as-column:** ungrouped visible fields remain normal columns. Each configured group becomes one child column. Expanding a group on one row grows that cell vertically and shows member fields in a stack with existing editors. Sibling rows stay collapsed.

```
ColumnPicker (child)
  ├── groups[] + columns[] (with optional groupId)
  ↓ saved on dealBoardView.childColumns (RAW_JSON v2)
LineItemsTable / MobileLineItemRow
  ├── ungrouped columns
  └── group columns → chip | stacked fields (per row expand)
```

### Data model

#### New CRM field on `dealLineItem`

| Property | Value |
|----------|--------|
| Name | `zatratyNaRabotu` |
| Type | SELECT |
| Label | Затраты на работу |
| Options | `OKLEYKA` — Оклейка; `PODRYADNAYA_OKLEYKA` — Подрядная оклейка |
| Empty | `null` / unset = работы не отмечали |

Created via `yarn twenty dev:add field` (UUID v4) + app field definition.

#### View config: `childColumns` payload v2

Today `childColumns` is `ColumnConfig[]`. Extend storage shape (same RAW_JSON field) with backward-compatible parse:

```ts
type ColumnGroupConfig = {
  id: string; // uuid v4
  name: string;
  order: number;
};

type ColumnConfigV2 = ColumnConfig & {
  groupId?: string; // absent → ungrouped (always-visible pool)
};

type ChildColumnsPayloadV2 = {
  version: 2;
  columns: ColumnConfigV2[];
  groups: ColumnGroupConfig[];
};

// Wire parse accepts legacy ColumnConfig[] → { version: 2, columns, groups: [] }
```

Parent `parentColumns` unchanged (still `ColumnConfig[]`).

#### Client-only UI state

| State | Storage | Key idea |
|-------|---------|----------|
| Group expand per row | `localStorage` | `lineItemId + groupId` → open/closed |
| Collapsed chip mode | `localStorage` | `name` \| `name+status` (default: `name+status`) |

Not stored on `dealBoardView`.

### Seed (default + mobile default views)

Apply once when migrating those views if `groups` is still empty:

**Group «Печать»** (member fields, keep visible as today where applicable):

- `ssylkaNaMakety`
- `dataGotovnostiPechati`
- `vremyaGotovnostiPechati`
- `kommentariyDlyaPechati`
- `plenka`
- `vzatoVRabotu`
- `gotovo`

**Ungrouped (always-visible pool):** existing defaults (name, tip, stage, …) plus `zatratyNaRabotu` visible.

Do **not** put technical print-sheet fields (`printSheetSessionId`, `printSheetRowNumber`, `printSheetTabName`) into the seed group.

Other user views: leave without auto-groups (legacy flat columns); user can group manually.

## UI / UX

### ColumnPicker («Колонки: позиции»)

- Sections: each group (header: name, rename, delete) + «Без группы».
- Actions: create group; drag field between sections; reorder within section and reorder groups.
- Visibility checkbox / order semantics unchanged: hidden field does not render in table or inside expanded group.
- Delete group → clear `groupId` on its fields (fields return to «Без группы»); CRM data untouched.
- Save persists `ChildColumnsPayloadV2` via existing view PATCH.
- Parent ColumnPicker unchanged.

### Desktop line-item table

- Visible layout columns = ungrouped visible fields + one column per group that has ≥1 visible member field.
- Empty group (no visible members) → omit group column.
- Collapsed cell: chip with chevron; label from group name; optional status suffix (see below).
- Expanded cell: stacked fields with current editors (`LinkCell`, date/time, rich text, progress ladder for the two booleans, etc.).
- Expand/collapse toggles only that `(lineItemId, groupId)`.

### Collapsed chip mode toggle

- Place next to `ExpandModeToggle` («Умное» / «Свёрнуто») on desktop toolbar; on mobile — in settings sheet beside the same control.
- Modes:
  - **Имя** — e.g. `Печать`
  - **Имя + статус** — e.g. `Печать · готово`

**Status derivation for a group** (only in «Имя + статус»):

1. If the group contains `gotovo` and it is `true` → `готово`
2. Else if it contains `vzatoVRabotu` and it is `true` → `взято`
3. Else → no status suffix (chip looks like name-only)

Arbitrary groups without those booleans never show a fabricated status.

### Print flags: progress ladder

- Replace default `BooleanCell` for `vzatoVRabotu` and `gotovo` when rendered in board (grouped or not) with a single two-step control when both fields are present in the same visual context; if only one of the two is visible, still render that step alone.
- Click step N toggles the corresponding boolean via existing `useUpdateRecord`.
- Visual: inactive outline / active fill; «Готово» uses success/green emphasis vs «Взято».
- No automatic coupling (setting «Готово» does not auto-set «Взято» in v1) unless product later requests it.

### Mobile

- Same group model and chip modes.
- Collapsed: chip row in the line-item card; tap expands stacked fields.
- ColumnPicker + chip-mode toggle live in mobile settings alongside existing column pickers.

## Data flow

1. Metadata → line-item fields (incl. `zatratyNaRabotu`).
2. Load view → parse `childColumns` (legacy array or v2) → columns + groups.
3. Merge with metadata (`mergeColumns`) preserving `groupId`.
4. Render table/cards from partitioned layout.
5. Field edits → REST PATCH line item (unchanged).
6. ColumnPicker save → PATCH view `childColumns` as v2 payload.
7. Expand + chip mode → localStorage only.

## Compatibility & errors

- Legacy views without `version: 2` keep working as flat columns (`groups: []`).
- Unknown `groupId` on a column → treat as ungrouped.
- ColumnPicker save failure → keep picker open, show error (same pattern as today).
- Field PATCH failure inside expanded group → existing alert pattern.
- Seed idempotent: only when target view has empty `groups`.

## Testing

- Unit: parse legacy `ColumnConfig[]` ↔ v2; partition ungrouped vs group columns; omit empty groups.
- Unit: chip status priority `готово` > `взято` > none.
- Unit: seed membership list (print fields + labor ungrouped).
- Unit: progress ladder click → correct boolean field payload.
- Manual: desktop + mobile expand per row; chip mode toggle; ColumnPicker create/drag/delete group; month-end filter by `zatratyNaRabotu` in Twenty or board column visibility.

## Implementation sketch (for writing-plans)

1. Add `zatratyNaRabotu` field definition + universal id.
2. Extend types + `parseColumns` / views API for v2 payload.
3. Seed helper for default + mobile default views.
4. Upgrade child ColumnPicker (groups + DnD).
5. LineItemsTable group column + per-row expand + stacked editors.
6. Chip mode toggle + status helper.
7. Progress ladder cell override for print booleans.
8. Mobile card parity + settings entry points.
9. Tests listed above.

## Open points resolved in brainstorming

- No hardcoded permanent groups beyond initial seed.
- Labor is a marker SELECT, not quantity.
- Chip modes A and B both ship behind a toolbar toggle.
)