# Оклейщики — колонка даты и бонус в фонде

Date: 2026-08-03  
Status: approved (conversation)  
Page: `src/deals-board/salary/OkleykaSalaryPage.tsx`, `SalaryPanel.tsx`  
Prev: `docs/superpowers/specs/2026-08-03-okleyka-clear-and-half-distribute-design.md`

## Problem

1. В таблице сделок «Оклейщики» нет даты мероприятия/отгрузки — неудобно ориентироваться и сортировать, хотя данные уже есть (`eventDate` из `loadDate`/`closeDate`, как в Реализации).
2. Зарплата человека = только `часы × ставка`. Нужна свободная надбавка (бонус) справа от ставки; сумма и фонд должны учитывать её.

## Goals

1. Первая колонка данных (после ▾): **Дата**, формат как в Реализации (`ru-RU` short).
2. Сортировка по дате кликом по заголовку; **по умолчанию дата ↑**.
3. У каждой записи ЗП — поле **Бонус ₽**; сумма строки и фонд = `hours * rateRub + bonusRub`.
4. Накатить на staging и prod (`yarn twenty apply` на оба).

## Non-goals

- Дневные сепараторы как на доске Реализации.
- Редактирование даты на странице Оклейщики (дата только read-only из сделки).
- Отдельный объект/таблица бонусов.
- Изменение правил раскидки (sale / equal / margin) — только источник фонда расширяется бонусом.

## Decisions (from conversation)

| Topic | Choice |
|-------|--------|
| Approach | **1** — UI из `eventDate` + CRM-поле `bonusRub` |
| Default sort | **B** — дата ↑; клик: desc → сброс (как у остальных колонок) |
| Bonus storage | Persisted CRM field on `okleykaSalaryEntry`, not localStorage |

## 1. Date column

### Data

- Source: `OkleykaDealGroup.eventDate` (already built via `getOpportunityEffectiveDate` → `toLocalInputDate`).
- Display: same short date as Реализация (`Intl.DateTimeFormat('ru-RU', { dateStyle: 'short' })` on the ISO/date string). Empty → `—`.

### Layout

- Header order after expand control: **Дата** | Сделка | Позиции | …money columns…
- Child (position) rows: empty date cell (deal-level only).
- Excel matrix: add «Дата» column (ISO `YYYY-MM-DD` or same short display; prefer `YYYY-MM-DD` for spreadsheet sortability).

### Sort

- Extend `OkleykaSortKey` with `'date'`.
- Compare by `eventDate` string (`YYYY-MM-DD`); empty dates sort last in both directions.
- Initial `sort` state stays `null`, but **when `sort === null` the table applies date ↑** (new default). Name order from `buildOkleykaDealGroups` is no longer the fallback.
- Click cycle unchanged: other/null → desc → asc → clear (`null` = again date ↑). So first click on «Дата» from default gives date ↓.

## 2. Bonus field

### Schema

- New field on `okleykaSalaryEntry`:
  - name: `bonusRub`
  - type: NUMBER (FLOAT, 2 decimals)
  - label: `Бонус ₽`
  - UUID v4 in `universal-identifiers.ts`
- Existing entries without the field → treat as `0` in normalize/API.

### Formula

```
entrySumRub = hours * rateRub + bonusRub
```

- `sumFundRub` / distribute remainder use this formula (no other code paths that recompute hours×rate only without bonus).
- UI live preview while drafting hours/rate/bonus uses the same formula.

### UI (`SalaryPanel` entry row)

- Grid: `Имя | часы | ставка | бонус | сумма | ✕`
- Bonus input: same pattern as rate (non-negative number, blur/Enter commit, revert on invalid).
- Aside width ~360px so the row fits without horizontal scroll in normal desktop layout.
- Create flow: new person starts with `bonusRub: 0` (omit or send 0).

### API

- `OkleykaSalaryEntry.bonusRub: number`
- `createSalaryEntry` / `updateSalaryEntry` accept `bonusRub`
- Normalize missing/invalid → `0`

## 3. Deploy

1. Implement + unit tests (sort date, `entrySumRub` with bonus, normalize).
2. Commit on `staging` when asked / as part of ship.
3. `yarn twenty apply` against staging, smoke: date column + sort, bonus save, fund includes bonus.
4. Merge/cherry-pick or apply same build to prod; `yarn twenty apply` prod.
5. Hard-refresh UI on both.

## Out of scope for this change

- Changing half-split / distribute UX.
- Mobile-specific layout for SalaryPanel.
- Migrating historical Excel exports already downloaded by users.
