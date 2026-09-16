# Оклейщики — режим «Вся сделка»

Date: 2026-09-15  
Status: approved (conversation)  
Page: `src/deals-board/salary/OkleykaSalaryPage.tsx`  
Prev: `docs/superpowers/specs/2026-08-03-okleyka-per-person-deal-shares-design.md`

## Problem

Страница «Оклейщики» показывает только позиции **плёнка · наши · оклейка/готово**. Продажа считается по ним, а печать и фреза уже берутся со **всей** сделки. Логистика и безнал скрыты. При раскидке ЗП нельзя увидеть полный состав сделки и честный P&L — легко переложить фонд на сделку, где оклейка мелкая, а остальные позиции и расходы большие.

## Goals

1. Переключаемый режим **Оклейка / Вся сделка** на той же таблице.
2. Набор сделок не меняется: сделка во вью, если есть хотя бы одна qualifying-позиция.
3. В полном режиме видны **все** позиции попавших сделок (включая отмену и черновики); qualifying выделены.
4. Полный расход = печать + фреза + логистика + безнал + раскиданная оклейка (без выездной команды и без `rashodItogo`).
5. Продажа полного режима исключает стадию `OTMENA`.
6. Колонки людей, раскидка, фонд и `rashodOkleyka` работают в обоих режимах одинаково.
7. Итоги шапки и Excel следуют активному режиму.

## Non-goals

- Менять правило автораскидки (поровну на сделки половины).
- Показывать или включать в формулу `rashodVyezdnayaKomanda`.
- Писать полный P&L / новые поля в CRM.
- Трогать «Реализацию», `rashodItogo`, `rashodVyezdnayaKomanda`.
- Persist режима в localStorage (сброс на «Оклейка» при перезагрузке страницы).
- Отдельный mobile layout.
- Подсветка «ЗП съела маржу ниже порога».
- Менять qualifying-фильтр (по-прежнему `tip=PLENKA`, `tipDetail=NASHI`, `stage ∈ {OKLEYKA, GOTOVO}`).

## Decisions (from conversation)

| Topic | Choice |
|-------|--------|
| Approach | **A** — сегмент режима на той же таблице, не карточка сбоку и не «всегда грузить всё» |
| Compact economics | Без изменений (продажа только qualifying; расход = печать + фреза + оклейка) |
| Full economics | Продажа всех позиций кроме `OTMENA`; расход = печать + фреза + логистика + безнал + оклейка |
| Positions in full mode | Все строки сделки, включая отмену и черновики; отмена видна, в продажу не входит |
| Shares in full mode | Редактируются на месте (не read-only) |
| Qualifying highlight | Semi-bold + цвет типа плёнка/оклейка (синий tip), не заливка строки |
| Vyezdnaya komanda | Скрыта и не в формуле |
| Mode persistence | Session only |
| Load strategy | Compact fetch as today; full line items + extra rashod lazy on first switch; cache until refresh / period change |
| Excel | As on screen |

## 1. Qualifying vs full positions

**Qualifying** (как сейчас, `isOkleykaSalaryLineItem`):

```
tip === 'PLENKA' && tipDetail === 'NASHI' && stage ∈ {OKLEYKA, GOTOVO}
```

Deal is in the view iff it has ≥1 qualifying line item in the active date range (`loadDate` else `closeDate`). This set of deals is identical in both modes.

**Full positions:** every `dealLineItem` of those deals, including `OTMENA` and drafts (`Новая позиция` and any other name). No extra client filter.

A position is **qualifying-highlighted** only if it matches the qualifying predicate. `OTMENA` cannot be highlighted even if tip/detail match, because qualifying already requires `OKLEYKA`/`GOTOVO`.

## 2. Modes and formulas

Toolbar segment next to month/half controls: **Оклейка** | **Вся сделка**. Default **Оклейка**. Ghost/primary like existing half buttons. Changing mode does not change date range, salary entries, or shares.

### Mode «Оклейка»

Unchanged:

```
saleRub      = Σ saleRub of qualifying positions
printRub     = currencyToRub(deal.rashodPechat)
frezaRub     = currencyToRub(deal.rashodFrezerovka)
okleykaRub   = Σ person shares (or rashodOkleyka)
costRub      = printRub + frezaRub + (okleykaRub ?? 0)
profitRub    = saleRub − costRub
marginPct    = saleRub > 0 ? profitRub / saleRub × 100 : null
```

Position rows: qualifying only. Columns: no logistics/beznal.

### Mode «Вся сделка»

Per position: `saleRub = unitPrice × qty` with the same qty rule as today (`kolichestvo > 0 ? kolichestvo : 1`).

```
saleRub      = Σ saleRub of positions where stage !== 'OTMENA'
               (drafts with a price are included)
printRub     = currencyToRub(deal.rashodPechat)
frezaRub     = currencyToRub(deal.rashodFrezerovka)
logisticsRub = currencyToRub(deal.rashodLogistika)
beznalRub    = currencyToRub(deal.rashodBeznal)
okleykaRub   = Σ person shares (or rashodOkleyka)   // same source as compact
costRub      = printRub + frezaRub + logisticsRub + beznalRub + (okleykaRub ?? 0)
profitRub    = saleRub − costRub
marginPct    = saleRub > 0 ? profitRub / saleRub × 100 : null
okleykaSharePct = saleRub > 0 ? (qualifyingSaleRub / saleRub) × 100 : null
```

`rashodItogo` and `rashodVyezdnayaKomanda` are not fetched for display and never enter `costRub`.

Page totals and group subtotals use the active mode’s formula. Person columns, «Сумма», distribute, reset, and green row (`dealShareSum > 0`) are mode-independent.

## 3. UI

Apple Ops tokens only. No new visual system.

**Segment:** in the existing filter row with «Весь месяц / 1-я / 2-я».

**Compact columns (unchanged):** ▾ · Дата · Сделка · Позиции · Продажа · Печать · Фреза · [люди] · Сумма · Расход · Прибыль · Маржа.

**Full columns:** after Фреза insert **Логистика** and **Безнал**. Zero/empty → `—` (same as print/freza). Person columns stay immediately after those two.

**Deal row in full mode:** under the sale amount, muted caption `оклейка N%` where N is `okleykaSharePct` rounded to integer. Omit the caption when `okleykaSharePct` is null.

**Position count:** compact = qualifying count; full = all loaded positions for the deal.

**Child rows (full mode):** same layout as today (name + `qty × price` under it; sale in the Продажа column). In full mode the name cell also gets existing `Chip`s for `tip` and `stage` (PLENKA = blue, Оклейка/Готово as on Реализация). No new table columns for type/stage.

| Kind | Style |
|------|--------|
| Qualifying | `font-weight: semibold`; name text color = Chip blue (`#007aff` light / `#64d2ff` dark); no row wash |
| Other live | existing secondary text |
| `OTMENA` | muted text; sale cell `—`; that sale is not in `saleRub` |

Expand/collapse unchanged. Editing person shares, Tab/Enter, fund panel: unchanged in both modes.

## 4. Data loading

1. Period fetch of opportunities stays as today (`loadDate`/`closeDate` range + `rashodPechat`, `rashodFrezerovka`, `rashodOkleyka`).
2. Qualifying line items fetch stays as today (`buildOkleykaSalaryLineItemsFilter`). This determines the deal set.
3. On **first** switch to «Вся сделка» in the current `(dateFrom, dateTo)` query: fetch all `dealLineItem`s for those opportunity ids **without** tip/stage/detail filter; REST-enrich those opportunities with `rashodLogistika` and `rashodBeznal` if not already on the records.
4. Cache the full payload on the page query client keyed with the salary page query (or a sibling key including the same dates). Subsequent toggles are local. Invalidate on «Обновить» and on period change (existing `refreshKey` / date query key already covers this).
5. If full fetch fails: do not switch mode; stay on «Оклейка»; show a short error «Не удалось загрузить все позиции». Do not render a mixed compact/full table.

Shares fetch is unchanged and not gated on mode.

## 5. Excel

Still one deal-level sheet (`dealGroupsToXlsxMatrix`). Export the **on-screen** mode. No positions sheet.

- Compact: current columns (Bitrix, Сделка, Дата, Позиций, Продажа, печать, фреза, оклейка, итого, прибыль, маржа %).
- Full: after «Расход фреза» insert «Расход логистика» and «Расход безнал»; after «Продажа» insert «Оклейка %» (same integer as the caption, empty if null). «Позиций» = all loaded positions. Sale/cost/profit/margin are the full-mode numbers.

Remote-DOM download path unchanged.

## 6. Testing

Vitest, next to existing salary suites (`compute.test.ts`, `api.test.ts`):

1. Deal inclusion still requires a qualifying item; full mode attaches sibling line items to that deal.
2. Full-mode sale excludes `OTMENA`; a draft with amount is included.
3. Full-mode cost = print + freza + logistics + beznal + okleyka; `rashodVyezdnayaKomanda` and `rashodItogo` ignored even if present on the deal fixture.
4. Qualifying predicate marks highlight; `OTMENA` is not qualifying.
5. `okleykaSharePct` = qualifying sale / full sale; sale 0 → `null`.
6. Mode switch does not change share sums or `rashodOkleyka`.
7. Compact line-item filter string unchanged (regression on `buildOkleykaSalaryLineItemsFilter`).

Manual: a mixed deal (qualifying wrap + banner + cancelled line) in the current month; toggle; edit a share; refresh; Excel in both modes.

## Acceptance criteria

1. Segment «Оклейка / Вся сделка» in the salary page header; default Оклейка; reload resets to Оклейка.
2. Deal set identical in both modes; shares/distribute/fund identical.
3. Full mode lists every line item of those deals; qualifying rows semi-bold + PLENKA blue; cancelled muted and out of sale.
4. Full-mode deal economics use the formula in §2; logistics and beznal columns visible; vyezdnaya komanda absent.
5. Caption `оклейка N%` under deal sale in full mode when sale > 0.
6. First switch loads extra data; failure keeps compact mode + error; success caches until refresh/period change.
7. Header totals and Excel follow the active mode.
8. Реализация / `rashodItogo` / `rashodVyezdnayaKomanda` persistence unchanged.
9. New vitest cases in §6 green.

## Key files

| Path | Role |
|------|------|
| `src/deals-board/salary/OkleykaSalaryPage.tsx` | Segment, columns, row styles, caption, error |
| `src/deals-board/salary/compute.ts` | Full-mode groups, sale/cost, `okleykaSharePct`, highlight flag |
| `src/deals-board/salary/api.ts` | Compact filter unchanged; full line-item fetch; extra rashod fields |
| `src/deals-board/salary/export-excel.ts` | Mode-aware columns |
| `src/deals-board/salary/compute.test.ts` / `api.test.ts` | §6 |
| `src/deals-board/theme/tokens.ts` | Reuse accent/tip blue only; no new token unless PLENKA color is not already importable |

## Follow-ups (not this iteration)

- Warn when a person’s share would push full-deal margin below a threshold.
- Optionally show wrapping-share `%` as a reason to skip equal distribute on tiny wrapping jobs.
