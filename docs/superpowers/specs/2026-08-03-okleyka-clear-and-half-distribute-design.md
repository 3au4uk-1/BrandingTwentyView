# Оклейщики — честное обнуление и раскидка по половинам

Date: 2026-08-03  
Status: approved (conversation)  
Page: `src/deals-board/salary/OkleykaSalaryPage.tsx`  
Prev: `docs/superpowers/specs/2026-07-31-okleyka-deal-fund-design.md`

## Problem

1. Очистка ячейки «Оклейка» ненадёжна: после F5 старое значение может вернуться; зелёная подсветка остаётся при попытке обнулить (в т.ч. при `0` или неуспешном null-patch CURRENCY в Twenty).
2. В режиме «Весь месяц» один остаток фонда (сумма обеих половин) раскидывается на **все** сделки месяца. Зарплата 1-й половины может уехать на сделки 2-й и наоборот.

## Goals

1. Пустая ячейка = «не задано» (`null` в CRM). Зелёный только при `okleykaCostRub > 0`.
2. В режиме «Весь месяц» — **две** независимые раскидки (1-я / 2-я половина): фонд, остаток и цели строго в границах половины.
3. В режиме одной половины — одна раскидка, как сейчас по смыслу, но с честным обнулением.

## Non-goals

- Смена стартового режима (остаётся «Весь месяц»).
- Превью раскидки, откат, целевая маржа %, новые правила распределения.
- Миграция `rashodOkleyka` в `rashodItogo` / выездную команду.
- Удаление позиционного `stoimostOkleyki`.

## Decisions (from conversation)

| Topic | Choice |
|-------|--------|
| Month mode distribute | **B** — две кнопки по половинам, без общего «кошелька» раскидки |
| Empty cell | **A** — пусто / Backspace / ввод `0` → clear to null; green only if `> 0` |
| Default filter | **A** — keep «Весь месяц» |

## 1. Clear + green

### Semantics

| UI | Stored | Green | In `spentRub` | Distribute target |
|----|--------|-------|---------------|-------------------|
| `—` (empty) | `null` | no | no | yes (if sale > 0) |
| `N ₽` where N > 0 | currency | yes | yes | no |
| User types `0` or clears | → `null` | no | no | yes |

Explicit stored `0` is not a supported end-state: input `0` is treated as clear.

### Persist clear

- `patchOkleykaDealCost(id, null)` must actually clear Twenty CURRENCY.
- Verify on apply/runtime which payload works; prefer trying in order if needed:
  1. `{ rashodOkleyka: null }`
  2. `{ rashodOkleyka: { amountMicros: null, currencyCode: 'RUB' } }` (or empty micros equivalent accepted by API)
- After successful clear: keep optimistic `null`, then **invalidate** (or refetch) page deals query so F5/refetch cannot resurrect stale value from a failed silent no-op. If patch throws or post-refetch still has old value → surface error and rollback optimistic.
- Unit/integration: assert clear payload; manual check: clear → F5 → still `—`.

### Green row

- Deal row background `successMuted` iff `(okleykaCostRub ?? 0) > 0`.
- Child position rows unchanged.

## 2. Half-scoped fund & distribute

### Period scope helper

For a half (`first` | `second`) given `year`, `monthIndex`, `splitDay`:

- `period` = `halfPeriod(...)`
- `halfEntries` = month salary entries belonging to that half (`entryHalf(periodStart)`)
- `halfGroups` = deal groups whose opportunity date (`loadDate` / existing page filter date) falls in `[period.dateFrom, period.dateTo]`
- `halfFund` = `buildFundSummary(halfEntries, halfGroups)`
- `halfDistribution` = `distributeRemainder(halfGroups, halfFund.remainderRub, rule)`

Same math as today; only the **slice** of entries/groups changes.

### Mode: half (1-я / 2-я)

- One fund strip: Фонд / Раскидано / Остаток for that half.
- One button «Распределить остаток» (existing confirm UX).
- Table already filtered to that half’s date range — no change to deal query.

### Mode: month («Весь месяц»)

- People panel still shows **two** period sections.
- **Do not** show a single combined remainder used for one distribute action.
- Per half (under each section or in footer):
  - compact Фонд · Раскидано · Остаток for that half only;
  - button «Раскидать 1-ю» / «Раскидать 2-ю» (labels may use `formatPeriodLabel`).
- Shared rule toggles (sale / equal / margin) apply to whichever button is pressed.
- Confirm copy: sum + count for **that** half only.
- Table remains full-month deals; distribute only patches targets in the chosen half.

### Mode: range

- Salary panel remains disabled (existing); no distribute.

### Disabled reasons (per half button)

- Remainder ≤ 0 → «Остаток фонда пуст»
- No empty targets in that half → «Нет сделок без оклейки»
- (Month mode never uses «Нужен месяц или полупериод» for these buttons.)

## 3. Hint (minimal alignment)

- In **half** mode: keep sale-share hint from that half’s fund (existing); optional later: hint follows selected rule — **out of scope** unless trivial.
- In **month** mode: hint may stay sale-share vs **full-month** fund **or** be hidden to avoid lying about half funds. Prefer: **hint uses half fund of the deal’s half** (deal date → which half → that half’s `fundRub`). Small change, avoids wrong month-wide hint.

## Acceptance

1. Clear okleyka → UI `—`, no green; after refresh still empty in CRM.
2. Typing `0` clears to null (same as empty).
3. Month mode: «Раскидать 1-ю» only writes deals in first half; second half deals unchanged (and vice versa).
4. Half mode: single distribute still works; only that half’s deals.
5. Green only when okleyka > 0.
6. Existing unit tests for fund/distribute updated; new cases for half-scoped slices and clear→null/`0`→null.

## Out of scope reminders

Preview of distribution rows, undo last distribute, target margin %, default-to-current-half — deferred.
