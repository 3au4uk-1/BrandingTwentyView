# Оклейщики — сброс раскидки и доля для sale=0

Date: 2026-08-03  
Status: approved (conversation)  
Page: `OkleykaSalaryPage` / `SalaryPanel` / `fund.ts`  
Prev: `docs/superpowers/specs/2026-08-03-okleyka-date-column-bonus-design.md`

## Problem

1. После «Раскидать» нет способа одним действием обнулить заполненные «Оклейка» в периоде — только вручную по ячейкам.
2. Раскидка пропускает сделки с `saleRub = 0` (типичные реставрации с чипом «реставрация · 0 ₽»), хотя фонд должен делиться и на них.

## Goals

1. Кнопка **сброса** всех заполненных сумм оклейки в **видимом периоде** (выбор B).
2. Раскидка включает сделки с `saleRub = 0`; при правилах sale/margin — equal-fallback, если есть нулевые продажи или `totalSale = 0` (выбор A).
3. Накатить на staging и prod.

## Non-goals

- Отличать «ручной» ввод от результата раскидки (сброс чистит всё заполненное в периоде).
- Отдельный карман только для реставраций (вариант C).
- Сброс зарплатных записей (часы/ставка/бонус).
- Изменение правил UI (sale / equal / margin) кроме equal-fallback при нулях.

## Decisions

| Topic | Choice |
|-------|--------|
| Reset scope | **B** — все заполненные «Оклейка» в видимом периоде (`displayGroups`) |
| Zero-sale distribute | **A** — нули в целях; sale/margin → equal fallback when any target has `saleRub === 0` or `totalSale === 0` |
| Approach | Reset via existing `patchOkleykaDealCost(null)`; extend `distributeRemainder` |

## 1. Reset button

### Behavior

- Label: `Сбросить оклейку`.
- Placement: right aside, near distribute controls (above or beside half distribute blocks) so it is visible with «Раскидать».
- Enabled when at least one deal in `displayGroups` has `(okleykaCostRub ?? 0) > 0` (or non-null filled — prefer `> 0` to match green rows; also clear explicit stored values that display as filled). Clear any deal with `okleykaCostRub !== null && okleykaCostRub !== 0` OR simply `okleykaCostRub != null` after coalesce — **clear all with `(okleykaCostRub ?? 0) > 0`**, same green criterion.
- Confirm step (same pattern as distribute confirm): show count of deals to clear; Cancel / Confirm.
- On confirm: for each matching deal, optimistic `null` + `patchOkleykaDealCost(id, null)`; on failure rollback that deal; surface error if any fail; invalidate okleyka-salary query on full/partial success.

### Scope note

«Видимый период» = текущий `displayGroups` (месяц / половина / range уже отфильтрованы загрузкой страницы). Не две кнопки по половинам.

## 2. Distribute includes saleRub = 0

### Target filter

```ts
(g) => g.okleykaCostRub === null || g.okleykaCostRub === 0
// remove: && g.saleRub > 0
```

### Rules

- **`equal`:** unchanged — equal share among all targets (zeros included).
- **`sale` / `margin`:** if any target has `saleRub === 0` **or** `sum(saleRub) === 0`, compute shares as **`equal`** for the full target set. Otherwise keep existing sale/margin math.
- Rounding / remainder-on-largest unchanged.
- Still filter `result` to `okleykaRub > 0` after round (zeros that would get 0 after round stay empty).

### Tests

- `distributeRemainder` with a `saleRub: 0` empty deal under `sale` receives a positive share (equal fallback).
- All-zero sales → equal split.
- Pure positive sales under `sale` → unchanged proportional behavior.
- Reset helper or UI wiring covered at least by a pure list-of-ids-to-clear helper if extracted; otherwise page wiring + existing patch clear tests.

## 3. Deploy

Commit → push staging CD → merge/push main CD (same as prior ship). Hard-refresh Оклейщики.

## Out of scope

- Half-scoped reset buttons.
- Auto-detect restoration via crmparser for distribute (use sale=0 / empty okleyka only).
