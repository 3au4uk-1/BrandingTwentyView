# Оклейщики — доли людей по сделкам (equal per person)

Date: 2026-08-03  
Status: approved (conversation)  
Page: `OkleykaSalaryPage` / `SalaryPanel` / fund distribute  
Prev: `docs/superpowers/specs/2026-08-03-okleyka-reset-and-zero-sale-distribute-design.md`

## Problem

Текущая раскидка делит **общий остаток фонда** пропорционально/поровну/по марже в одно поле `rashodOkleyka`. Нужен формат, где **ЗП каждого человека** делится **поровну на каждую сделку** своей половины, с колонками людей в таблице и персистентными долями.

Example: 15 сделок; человек 10 000 ₽ → ~667 ₽/сделку; человек 20 000 ₽ → ~1333 ₽/сделку; сумма на сделку = сумма колонок.

## Goals

1. Persist per-person share on each deal (not UI-only).
2. Equal split of each person's period sum across **all deals of that half** (choice B).
3. Table columns: one per person in the right panel scope + **Сумма** (= Σ shares).
4. `rashodOkleyka` = sum of person shares; auto-sync; remove manual okleyka cell (choice A).
5. Person cells editable; edit recalculates sum + CRM sync (choice B).
6. Deploy staging + prod.

## Non-goals

- Keeping sale / equal / margin fund-remainder rules (removed; always equal-per-person).
- Half-scoped reset only; reset still clears visible period shares (as prior reset UX) unless noted below.
- Storing shares as JSON blob on opportunity.
- Changing how salary entries (hours/rate/bonus) are edited in the aside.

## Decisions

| Topic | Choice |
|-------|--------|
| Storage | **B** — persist per person×deal |
| Deal set | **B** — all deals in the person's half |
| `rashodOkleyka` | **A** — derived sum of shares; no manual cost cell |
| Person cells | **B** — manually editable |
| Month columns | Show people from **both** halves; distribute buttons still half-scoped |
| Distribute rules UI | **Remove** sale/equal/margin |

## 1. Data model

### New object `okleykaDealShare` (name TBD via `yarn twenty dev:add object`)

Suggested fields:

| Field | Type | Notes |
|-------|------|--------|
| `opportunity` / `opportunityId` | RELATION → opportunity | Deal |
| `salaryEntry` / `salaryEntryId` | RELATION → okleykaSalaryEntry | Person×period row |
| `amountRub` | NUMBER FLOAT 2 | Share ₽ |

- UUID v4 for object + fields in `universal-identifiers.ts`.
- Index view optional (technical object — OK without nav if only used by page).

### Semantics

- Unique logical key: `(opportunityId, salaryEntryId)`.
- Upsert on distribute / cell edit; delete or `amountRub = 0` on clear (prefer delete empty shares to keep lists small).
- Person identity for columns = salary entries present for the month (both halves in month mode; one half in half mode).

## 2. Derived okleyka cost

```
dealSum = Σ amountRub for shares on opportunity (visible people or all shares on deal)
rashodOkleyka = dealSum > 0 ? dealSum : null
```

- After any share create/update/delete affecting a deal → patch `rashodOkleyka`.
- Economics (profit/margin/green row) continue to use `okleykaCostRub` from that field.
- Remove `OkleykaDealCostCell` from parent row; show read-only **Сумма** column (tabular) sourced from sum of loaded shares (or from `okleykaCostRub` after sync — prefer sum of shares as source of truth in UI).

## 3. Distribute (per half H)

Inputs:

- `halfEntries` = salary entries for half H (`entrySumRub = hours*rate + bonus`)
- `halfDeals` = all `displayGroups` with `eventDate` in half H (including `saleRub = 0`)
- `N = halfDeals.length` (if N = 0 → no-op / disabled)

For each entry `e` in `halfEntries`:

```
raw = entrySumRub(e) / N
```

Round to integer ₽ per deal; fix remainder on one deal (largest share or first — same pattern as existing distribute rounding).

Upsert share `(deal, e)` for every deal in `halfDeals`. Then sync each deal's `rashodOkleyka`.

**Overwrite** existing shares for those `(deal, entry)` pairs in half H. Does not delete shares of the other half's people on the same deal when in month mode.

Confirm UX retained («Раскидать 1-ю / 2-ю»).

## 4. Reset

- Visible period: all deals in `displayGroups`.
- Delete all shares for those deals (all people) → `rashodOkleyka = null`.
- Confirm «Сбросить оклейку» as today.

## 5. Table UI

Column order (parent deal row), replacing current single «Оклейка» editor:

- … existing money cols except replace editable Оклейка with:
  - Dynamic columns: person names (from entries in scope), editable number cells
  - **Сумма** — read-only sum

Child position rows: empty cells under person/sum columns.

Aside: people list unchanged. Remove distribute-rule buttons (sale/equal/margin).

Hints «по продаже ≈ N» tied to old remainder logic: **remove** or replace with per-person equal hint (`entrySum/N`) — prefer remove old sale-share hint.

## 6. Loading

- Fetch shares for opportunities in `displayGroups` (filter by opportunityId in, paginate).
- Join to entries by `salaryEntryId` for column values.
- Missing share → show empty / 0; treat as 0 in sum.

## 7. Deploy

Apply object+fields via CD (`yarn twenty` install on staging/main). Hard-refresh.

## Migration / old data

- Existing `rashodOkleyka` without shares: show sum from CRM until first distribute/reset; optional one-time «не разложено по людям» — **YAGNI**: first «Раскидать» overwrites cost via new shares; «Сбросить» clears. Manual mismatch until user redistributes is acceptable for v1.

## Out of scope

- Excel export of per-person columns (can add later; at minimum keep Bitrix/deal/sum economics).
- Mobile layout.
- Auto-create shares when adding a new person without distribute.
