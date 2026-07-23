# Horizontal Group Panel Layout Design

**Date:** 2026-07-23  
**Status:** Approved (brainstorming)  
**Scope:** Desktop + mobile Deals Board — replace vertical in-cell group expand with left/right split; labor SELECT empty value  
**Supersedes (UI only):** vertical stack expand in `GroupColumnCell` from `2026-07-23-line-item-field-groups-design.md` (data model, ColumnPicker groups, seed, chip modes unchanged)

## Summary

1. Строка позиции делится на **левую зону** (все видимые поля без группы) и **правую зону** (чипы групп всегда видны; при выборе — горизонтальная лента полей этой группы).
2. Одна открытая группа на позицию; клик по другому чипу переключает ленту.
3. Мобилка — та же модель (основные поля + чипы + горизонтальный скролл полей).
4. «Затраты на работу» получает явное пустое значение; `SelectCell` перестаёт подставлять первую опцию при `null`.

## Goals

- Не раздувать высоту строки при работе с полями печати и других групп
- Держать основные поля слева постоянно на виду
- Дать быстрый доступ к полям группы горизонтально справа
- Позволить снять метку затрат, если оклейка не делалась

## Non-goals

- Глобальный (на всю таблицу) выбор активной группы
- Несколько одновременно открытых групп у одной позиции
- Изменение ColumnPicker / v2 `childColumns` / seed «Печать»
- Нативная карточка Twenty

## Decisions

| Topic | Choice |
|-------|--------|
| Expand scope | Per line item |
| Concurrent groups per item | One only (switch closes previous) |
| Collapsed right zone | Always show group chips; field strip empty until a chip is selected |
| Left zone content | All visible **ungrouped** fields only |
| Desktop interaction | Approach 1 — two zones in the same row |
| Mobile | Same model: ungrouped + chips + horizontal field scroll |
| Labor empty | Explicit empty UI → CRM `null`; fix SelectCell null→first-option bug |

## Architecture

```
Line item row
├── Left: ungrouped visible columns (existing cell editors)
└── Right:
    ├── Chip column (all groups with ≥1 visible member)
    └── Field strip (horizontal): members of the active group for this row
         — empty when no group open
```

`buildChildLayoutColumns` still partitions ungrouped vs groups. Rendering changes:

- Ungrouped entries → left table columns (unchanged semantics).
- Group entries → **not** separate wide columns that grow vertically; instead one shared right zone with chips + optional strip.
- `GroupColumnCell` (or successor) renders chips; expanded members render in the horizontal strip, not a vertical grid under the chip.

### Expand state

Reuse `useLineItemGroupExpand` storage, with **exclusive open per lineItemId**:

- `toggle(lineItemId, groupId)` when opening: clear any other `lineItemId:*` keys for that item, then set the new one open.
- Toggle same group again → close (strip empty, chip inactive).

Chip mode (`name` / `name+status`) unchanged.

### Labor field empty value

| Layer | Change |
|-------|--------|
| UI options | Include empty choice labeled «—» or «Нет» (no CRM option value required if PATCH sends `null`) |
| `SelectCell` | Do **not** use `value ?? options[0]`. When `value` is null/undefined, select the empty placeholder; on choosing empty, PATCH `{ zatratyNaRabotu: null }` (or fieldName: null) |
| Scope of SelectCell fix | Prefer fixing globally for all SELECT cells (correct empty semantics); at minimum for `zatratyNaRabotu` |

Field definition options list can stay as today (Оклейка / Подрядная оклейка); empty is absence of value, not a third SELECT option in CRM metadata — unless Twenty requires an explicit option, in which case add a dedicated value only if API cannot clear SELECT otherwise. **Preferred:** clear to `null` via UI placeholder without a CRM option.

## UI / UX

### Desktop

- Left zone: fixed table columns for ungrouped fields; widths from ColumnPicker as today.
- Right zone: sticky-feeling companion within the child table row (~half visual weight when strip open; chips always occupy a narrow column).
- Active chip: visually emphasized; inactive chips remain clickable.
- Field strip: horizontal flex/row of labeled editors; overflow-x auto if many fields.
- Print progress ladder / existing editors reused inside the strip with `visibleFields` = active group members.

### Mobile

- Card body: ungrouped fields (existing stacks/header rules for name/stage).
- Below or beside: chip row.
- Active group: horizontal scroll of fields (not vertical `MobileFieldStack` for group members).

## Testing

- Exclusive expand: open group B closes group A on same item; other items unaffected.
- Layout: ungrouped fields never appear in the right strip; grouped fields never appear as left columns.
- SelectCell: null shows empty; choosing empty persists null; choosing Оклейка persists `OKLEYKA`.
- Chip status formatting still works when collapsed.
- Mobile: horizontal strip present when group open.

## Implementation sketch

1. Exclusive expand helper in `useLineItemGroupExpand` (+ unit tests).
2. Refactor `LineItemsTable` row: left cols + right chips/strip.
3. Refactor `GroupColumnCell` / extract `GroupFieldStrip`.
4. Mobile `MobileLineItemRow` parity.
5. Fix `SelectCell` empty + labor placeholder; tests.
6. Version bump (patch after feature).

## Open points resolved

- Left = ungrouped only (user confirmed).
- Mobile = same interaction model (B).
- Labor empty explicitly in scope.
