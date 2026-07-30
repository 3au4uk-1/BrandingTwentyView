# Оклейщики — бюджет оклейки, фильтры и UX

Date: 2026-07-30  
Status: approved (conversation)  
Page: `src/deals-board/salary/OkleykaSalaryPage.tsx` (nav «Оклейщики»)

## Problem

Страница «Оклейщики» уже показывает нужные позиции (`Плёнка · Наши · Оклейка/Готово`), но:

1. Нельзя заложить **расход на оклейку** по позиции — маржа считается только как `(продажа − печать − фреза) / продажа`.
2. Нет фильтра по дате мероприятия — тянется вся история.
3. UI — плоский read-only отчёт; неудобно вводить суммы пачкой и читать по сделкам.

Нужен перенос учёта «Расход: выездная команда» в CRM **постепенно**: новое поле на позиции пишется с этой страницы, в общие расходы сделки пока **не** входит.

## Goals

1. Editable **стоимость оклейки** на позиции → влияет на маржу этой страницы.
2. Фильтр периода по дате мероприятия: месяц (выбор) + произвольный диапазон.
3. Лёгкий, но аккуратный Apple Ops-рефреш UI.
4. Группировка сделка → позиции, быстрый ввод, сортировка, разбивка статей расхода, Bitrix + копирование имени.

## Non-goals

- Не включать новое поле в `rashodItogo` / маржу «Реализации».
- Не писать в opportunity-поле `rashodVyezdnayaKomanda` (миграция позже).
- Не добавлять колонку на доску «Реализация».
- Не связывать с `field_staffs` / назначением персонала.
- Не делать в этой итерации: подсветку «бюджет не заполнен», фильтр стадий Оклейка/Готово отдельно, persist выбранного месяца в localStorage.
- Отдельный mobile layout.

## Data model

### New field

| | |
|---|---|
| Object | `dealLineItem` |
| Name | `stoimostOkleyki` |
| Type | `CURRENCY` |
| Label | `Стоимость оклейки` |
| Description | Расход на оклейку по позиции (зеркало учёта «Расход: выездная команда»; пока не входит в `rashodItogo`) |

Семантика: гранулярный дубликат deal-level `rashodVyezdnayaKomanda`. После готовности учёта — отдельная миграция на это поле.

### Formula (page only)

Per row:

```
saleRub        = currencyToRub(amount)            // null → 0
printCostRub   = currencyToRub(stoimostPechati)   // null → 0
frezaCostRub   = currencyToRub(stoimostFrezy)     // null → 0
okleykaCostRub = currencyToRub(stoimostOkleyki)   // null → 0

costRub    = printCostRub + frezaCostRub + okleykaCostRub
profitRub  = saleRub − costRub
marginPct  = saleRub > 0 ? (profitRub / saleRub) × 100 : null
```

Totals (header and per deal group): same aggregates. Expense strip always shows all articles:

**Печать · Фреза · Оклейка · Итого расход** (+ Продажа · Прибыль · Маржа · count).

### Persistence / visibility

- PATCH `stoimostOkleyki` from «Оклейщики» only.
- Do **not** add to default columns on «Реализация».
- Native CRM record card may show the field; out of scope to hide it there.

## Filters

- **Date field:** opportunity `loadDate` («дата мероприятия»), with the same `closeDate` fallback as «Реализация» when `loadDate` is empty.
- **Month picker:** any month/year; **default = current calendar month**.
- **Range:** from/to day; when user edits a custom range, month control leaves «picked month» mode (show as custom / clear month selection).
- Invalid/empty range: show a short hint; do not crash the table.
- **Position filter (unchanged):** `tip=PLENKA`, `tipDetail=NASHI`, `stage ∈ {OKLEYKA, GOTOVO}`.
- **Loading:** resolve the active date range → fetch opportunities whose effective event date falls in range (API date filter on `loadDate` / equivalent) → fetch `dealLineItem`s only for those `opportunityId`s with the tip/stage filter. Client then applies the same effective-date helper (`loadDate` else `closeDate`) as a safety net. Do not load the full historical line-item set when a month/range is active.

## UI layout (Apple Ops)

Shared theme tokens from deals-board (`colors`, `font`, `spacing`, `radius`). Quiet surfaces, no rainbow row washes, no heavy chrome.

**Sticky top:**

1. Title «Оклейщики» + short subtitle (selection rules).
2. Filter row: month | range from–to | Обновить | Excel.
3. Totals strip: Позиций · Продажа · Печать · Фреза · Оклейка · Итого расход · Прибыль · Маржа — tabular nums, secondary surface.

**Table:**

- Groups by deal: group header row (deal name, Bitrix, copy-name control, group subtotals) → child position rows.
- Groups are **collapsible**, **expanded by default** (chevron on group row).
- Position columns: Позиция · Кол-во · Продажа · Печать · Фреза · **Оклейка** (only editable) · Прибыль · Маржа.
- Deal Bitrix / copy actions live on the **group** row only (not repeated per position).
- Margin tint (text only, no row wash):
  - `marginPct == null` → muted
  - `marginPct < 0` → danger
  - `marginPct < 20` → warning/secondary
  - else → default text (ok)
- Sticky `thead`; row density ~40–46px.

## Editing UX

- Inline «Оклейка» cell: click → edit rubles → blur / Enter → PATCH `stoimostOkleyki`.
- **Tab** / **Shift+Tab:** next/previous «Оклейка» cell in visual row order (across groups).
- **Enter:** save and move to next «Оклейка»; **Esc:** cancel draft.
- Optimistic update of row / group / header totals; on error — rollback + short message.
- Minimal cell status: saving… / error.
- Saving empty clears the field (`null`); formula treats as 0.

## Sorting

- Clickable headers for numeric columns: Продажа, Печать, Фреза, Оклейка, Прибыль, Маржа (asc/desc toggle).
- Sort **deal groups** by the selected aggregate metric; within a group, sort positions by the same metric.
- When sort is off: stable order (deal name, then position name) — current behaviour.
- Text columns: no sort required in v1.

## Deal actions

- **Bitrix:** open `bitrixLink` URL (existing behaviour).
- **Copy deal name:** clipboard + short toast «Скопировано».

## Excel export

- Include column **Оклейка** (`stoimostOkleyki`).
- Export reflects the **current filtered** on-screen set.
- Keep Remote-DOM-safe download path from the existing Excel work.
- Optional footer/total row acceptable if it does not break the current exporter; position rows remain the primary content. Deal identity can be a column or repeated deal name per row (implementation detail; prefer one clear deal column for flat sheets).

## Migration note (future, out of scope)

When okleyka cost accounting is complete:

1. Sum or map `stoimostOkleyki` into deal expense / replace `rashodVyezdnayaKomanda`.
2. Include in `rashodItogo` and «Реализация» margin.
3. Possibly expose the column on «Реализация».

This spec does **not** implement that cutover.

## Acceptance criteria

1. New CURRENCY field `stoimostOkleyki` on `dealLineItem` applied via Twenty app.
2. On «Оклейщики», editing «Оклейка» persists and recalculates profit/margin for row, group, and header.
3. Header and group totals show Печать, Фреза, Оклейка, and Итого расход separately.
4. Month picker and date range filter by event date (`loadDate` / fallback).
5. Default view is current month.
6. Table is grouped by deal; groups expanded; Bitrix + copy name on group row.
7. Tab/Shift+Tab/Enter/Esc keyboard flow works for «Оклейка» cells.
8. Numeric column sort works at group and position level.
9. Excel includes Оклейка and respects the active date filter.
10. «Реализация» margin / `rashodItogo` / `rashodVyezdnayaKomanda` unchanged.
11. Visual refresh uses existing Apple Ops tokens; no new competing visual system.

## Key files (implementation touchpoints)

| Path | Role |
|------|------|
| `src/fields/stoimost-okleyki.field.ts` | New field (via `yarn twenty dev:add field`) |
| `src/deals-board/salary/OkleykaSalaryPage.tsx` | UI: filters, groups, totals, editing |
| `src/deals-board/salary/compute.ts` | Row/group/totals math + matrix for export |
| `src/deals-board/salary/api.ts` | Fetch + date-scoped loading + PATCH |
| `src/deals-board/salary/export-excel.ts` | Excel column |
| `src/logic-functions/okleyka-salary-export.ts` | Server export parity if still used |
| `src/deals-board/theme/*` | Reuse tokens only |
