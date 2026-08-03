# Okleyka v2 — Deal-Level Budget + Salary Fund Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move okleyka budget to the deal (`opportunity.rashodOkleyka`), compute margins at deal level with read-only `rashodPechat`/`rashodFrezerovka`, sale = unit price × qty, add a salary-fund panel backed by a new `okleykaSalaryEntry` CRM object with half-month reporting periods, plus fund automation (copy people, distribute remainder, sale-share hint, rate autofill).

**Architecture:** New CURRENCY field on `opportunity` + new custom object `okleykaSalaryEntry` (name/hours/rateRub/periodStart/periodEnd). `date-range.ts` gains half-period model with editable split day. `compute.ts` is reworked around `OkleykaDealGroup` (deal-level economics); new pure module `fund.ts` holds fund/remainder/hint/distribution math. `api.ts` loads deals incl. rashod fields and patches `rashodOkleyka`; new `salary-entries-api.ts` does REST CRUD on salary entries. Page: deal-row editing cell, right-side SalaryPanel. The unused logic function `okleyka-salary-export` is deleted; Excel stays local, one row per deal.

**Tech Stack:** twenty-sdk (defineField/defineObject/defineView), React + TanStack Query, RestApiClient, `patchOpportunity`, vitest, Apple Ops theme tokens.

**Spec:** `docs/superpowers/specs/2026-07-31-okleyka-deal-fund-design.md`

## Global Constraints

- `rashodOkleyka` must NOT enter `rashodItogo`, «Реализация» margin, or `rashodVyezdnayaKomanda`.
- Deal position filter stays: `tip=PLENKA`, `tipDetail=NASHI`, `stage ∈ {OKLEYKA, GOTOVO}`.
- Event date = `loadDate` else `closeDate` (existing `opportunityMatchesDateFilter`).
- Default period = current calendar month; split day default **15**, clamp 10–25, not persisted.
- Sale per position = `currencyToRub(amount) × effectiveQty`, `effectiveQty = kolichestvo > 0 ? kolichestvo : 1`.
- Deal okleyka distinguishes **null (not set, shown «—») vs 0**; empty save → null.
- All UUIDs below are fixed — copy verbatim, never regenerate.
- Do NOT create a navigationMenuItem for `okleykaSalaryEntry` (index view only).
- Visual system: existing deals-board Apple Ops tokens only.
- Commits only when the user explicitly asks (skip commit steps otherwise).
- `yarn twenty apply` is known to fail on Windows (backslash path validation). Attempt it; if it fails with that error, report DONE_WITH_CONCERNS and continue — code must not depend on apply having run.

## File map

| Path | Change |
|------|--------|
| `src/constants/universal-identifiers.ts` | + UUID constants |
| `src/fields/rashod-okleyka.field.ts` | Create (opportunity CURRENCY) |
| `src/objects/okleyka-salary-entry.object.ts` | Create |
| `src/views/okleyka-salary-entries-index.view.ts` | Create |
| `src/deals-board/types.ts` | Typed rashod fields on `OpportunityRow` |
| `src/deals-board/salary/date-range.ts` (+test) | Half periods, splitDay, salary periods |
| `src/deals-board/salary/compute.ts` (+test) | Rework: deal groups, totals, sort, xlsx matrix |
| `src/deals-board/salary/fund.ts` (+test) | Create: entries math, hint, distribution, prev period |
| `src/deals-board/salary/api.ts` (+test) | Deal groups loader, `patchOkleykaDealCost`; drop line-item patch |
| `src/deals-board/salary/salary-entries-api.ts` | Create: REST CRUD + history fetch |
| `src/deals-board/salary/OkleykaDealCostCell.tsx` | Create (replaces `OkleykaCostCell.tsx`, which is deleted) |
| `src/deals-board/salary/SalaryPanel.tsx` | Create |
| `src/deals-board/salary/OkleykaSalaryPage.tsx` | Rework: segment filter, deal table, panel, distribute |
| `src/deals-board/salary/export-excel.ts` | Deal-group matrix |
| `src/logic-functions/okleyka-salary-export.ts` | **Delete** (already unused by page) |

---

### Task 1: CRM schema — field, object, view, types

**Files:**
- Modify: `src/constants/universal-identifiers.ts`
- Create: `src/fields/rashod-okleyka.field.ts`
- Create: `src/objects/okleyka-salary-entry.object.ts`
- Create: `src/views/okleyka-salary-entries-index.view.ts`
- Modify: `src/deals-board/types.ts`

**Interfaces:**
- Produces: `opportunity.rashodOkleyka` (CURRENCY), object `okleykaSalaryEntry` with `hours` (NUMBER), `rateRub` (NUMBER), `periodStart` (DATE), `periodEnd` (DATE); REST endpoint `/rest/okleykaSalaryEntries`.
- Note: `OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER` already exists in `src/constants/crm-objects.ts`. Field name `rashodOkleyka` is new — the “do not ship opportunity defineField” warning in universal-identifiers.ts applies only to fields that already exist in the workspace Custom app; a new name is safe.

- [ ] **Step 1: Add UUID constants**

Append to `src/constants/universal-identifiers.ts` (after the opportunity rashod block):

```ts
export const OPPORTUNITY_RASHOD_OKLEYKA_FIELD_UNIVERSAL_IDENTIFIER =
  '611ae56a-022a-48d1-9e50-4193955bd1e1';

export const OKLEYKA_SALARY_ENTRY_OBJECT_UNIVERSAL_IDENTIFIER =
  'dc15124d-4b29-46c6-b4b3-3774e5212c2d';
export const OKLEYKA_SALARY_ENTRY_HOURS_FIELD_UNIVERSAL_IDENTIFIER =
  'd6d9ee45-529e-4e36-ac97-a6a58b979de5';
export const OKLEYKA_SALARY_ENTRY_RATE_RUB_FIELD_UNIVERSAL_IDENTIFIER =
  '16ed9be1-1e9e-48e8-85e4-c9c3702cb45a';
export const OKLEYKA_SALARY_ENTRY_PERIOD_START_FIELD_UNIVERSAL_IDENTIFIER =
  '5578c0c8-4ae1-4135-af4f-9e0587610ca8';
export const OKLEYKA_SALARY_ENTRY_PERIOD_END_FIELD_UNIVERSAL_IDENTIFIER =
  '0c595388-0052-458a-ba29-ba42188ecdad';
export const OKLEYKA_SALARY_ENTRIES_INDEX_VIEW_UNIVERSAL_IDENTIFIER =
  '0b95cf06-861d-4d28-8279-98f083e8be0d';
```

- [ ] **Step 2: Create opportunity field**

`src/fields/rashod-okleyka.field.ts`:

```ts
import { defineField, FieldType } from 'twenty-sdk/define';
import { OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import { OPPORTUNITY_RASHOD_OKLEYKA_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

/** Deal-level okleyka budget from the «Оклейщики» page; not part of rashodItogo. */
export default defineField({
  universalIdentifier: OPPORTUNITY_RASHOD_OKLEYKA_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'rashodOkleyka',
  type: FieldType.CURRENCY,
  label: 'Расход: оклейка (план)',
  icon: 'IconCurrencyRubel',
  description:
    'Бюджет оклейки сделки со страницы «Оклейщики»; пока не входит в rashodItogo',
});
```

- [ ] **Step 3: Create salary entry object**

`src/objects/okleyka-salary-entry.object.ts` (mirror `supplier.object.ts` structure):

```ts
import { defineObject, FieldType } from 'twenty-sdk/define';
import {
  OKLEYKA_SALARY_ENTRY_HOURS_FIELD_UNIVERSAL_IDENTIFIER,
  OKLEYKA_SALARY_ENTRY_OBJECT_UNIVERSAL_IDENTIFIER,
  OKLEYKA_SALARY_ENTRY_PERIOD_END_FIELD_UNIVERSAL_IDENTIFIER,
  OKLEYKA_SALARY_ENTRY_PERIOD_START_FIELD_UNIVERSAL_IDENTIFIER,
  OKLEYKA_SALARY_ENTRY_RATE_RUB_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

/** Salary record of one installer for one reporting half-month period. */
export default defineObject({
  universalIdentifier: OKLEYKA_SALARY_ENTRY_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'okleykaSalaryEntry',
  namePlural: 'okleykaSalaryEntries',
  labelSingular: 'ЗП оклейщика',
  labelPlural: 'ЗП оклейщиков',
  icon: 'IconUsersGroup',
  description: 'Записи зарплат оклейщиков по отчётным периодам (страница «Оклейщики»)',
  fields: [
    {
      universalIdentifier: OKLEYKA_SALARY_ENTRY_HOURS_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'hours',
      type: FieldType.NUMBER,
      label: 'Часы',
      icon: 'IconClock',
    },
    {
      universalIdentifier: OKLEYKA_SALARY_ENTRY_RATE_RUB_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'rateRub',
      type: FieldType.NUMBER,
      label: 'Ставка ₽/час',
      icon: 'IconCurrencyRubel',
    },
    {
      universalIdentifier: OKLEYKA_SALARY_ENTRY_PERIOD_START_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'periodStart',
      type: FieldType.DATE,
      label: 'Начало периода',
      icon: 'IconCalendar',
    },
    {
      universalIdentifier: OKLEYKA_SALARY_ENTRY_PERIOD_END_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'periodEnd',
      type: FieldType.DATE,
      label: 'Конец периода',
      icon: 'IconCalendar',
    },
  ],
});
```

- [ ] **Step 4: Create index view**

`src/views/okleyka-salary-entries-index.view.ts` (mirror `suppliers-index.view.ts`; view-field UUIDs fixed below):

```ts
import { defineView, ViewKey } from 'twenty-sdk/define';
import {
  OKLEYKA_SALARY_ENTRIES_INDEX_VIEW_UNIVERSAL_IDENTIFIER,
  OKLEYKA_SALARY_ENTRY_HOURS_FIELD_UNIVERSAL_IDENTIFIER,
  OKLEYKA_SALARY_ENTRY_OBJECT_UNIVERSAL_IDENTIFIER,
  OKLEYKA_SALARY_ENTRY_PERIOD_END_FIELD_UNIVERSAL_IDENTIFIER,
  OKLEYKA_SALARY_ENTRY_PERIOD_START_FIELD_UNIVERSAL_IDENTIFIER,
  OKLEYKA_SALARY_ENTRY_RATE_RUB_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: OKLEYKA_SALARY_ENTRIES_INDEX_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'Все записи ЗП',
  objectUniversalIdentifier: OKLEYKA_SALARY_ENTRY_OBJECT_UNIVERSAL_IDENTIFIER,
  icon: 'IconList',
  key: ViewKey.INDEX,
  position: 0,
  fields: [
    {
      universalIdentifier: 'b73e66b5-5e47-4a82-9830-f576a921afee',
      fieldMetadataUniversalIdentifier: OKLEYKA_SALARY_ENTRY_HOURS_FIELD_UNIVERSAL_IDENTIFIER,
      position: 0,
      isVisible: true,
      size: 100,
    },
    {
      universalIdentifier: 'a6d3085d-c9bb-43ad-93ee-cafd2e5ef40f',
      fieldMetadataUniversalIdentifier: OKLEYKA_SALARY_ENTRY_RATE_RUB_FIELD_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
      size: 120,
    },
    {
      universalIdentifier: 'c33b720c-0516-49ec-9cab-974603541c7e',
      fieldMetadataUniversalIdentifier: OKLEYKA_SALARY_ENTRY_PERIOD_START_FIELD_UNIVERSAL_IDENTIFIER,
      position: 2,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: '148edbe1-c637-4477-9376-ebebb4082975',
      fieldMetadataUniversalIdentifier: OKLEYKA_SALARY_ENTRY_PERIOD_END_FIELD_UNIVERSAL_IDENTIFIER,
      position: 3,
      isVisible: true,
      size: 140,
    },
  ],
});
```

- [ ] **Step 5: Type OpportunityRow rashod fields**

In `src/deals-board/types.ts`, inside `OpportunityRow` (before the index signature):

```ts
  rashodPechat?: { amountMicros: number; currencyCode: string } | null;
  rashodFrezerovka?: { amountMicros: number; currencyCode: string } | null;
  rashodOkleyka?: { amountMicros: number; currencyCode: string } | null;
```

- [ ] **Step 6: Typecheck + apply attempt**

Run: `yarn tsc --noEmit` (or the project's check script) → expect PASS.  
Run: `yarn twenty apply` → expected: field + object + view created. If it fails with the Windows backslash-path sync validation error, report the exact error and mark DONE_WITH_CONCERNS (apply deferred to WSL/CI as in v1).

- [ ] **Step 7: Commit (only if user asked)**

```bash
git add src/constants/universal-identifiers.ts src/fields/rashod-okleyka.field.ts src/objects/okleyka-salary-entry.object.ts src/views/okleyka-salary-entries-index.view.ts src/deals-board/types.ts
git commit -m "feat(okleyka): deal-level okleyka field and salary entry object"
```

---

### Task 2: Half-month reporting periods in date-range

**Files:**
- Modify: `src/deals-board/salary/date-range.ts`
- Modify: `src/deals-board/salary/date-range.test.ts`

**Interfaces:**
- Produces (consumed by Tasks 5–6):
  - `OkleykaHalf = 'first' | 'second'`
  - `OkleykaDateMode` gains variant `{ kind: 'half'; year: number; monthIndex: number; half: OkleykaHalf }`
  - `DEFAULT_SPLIT_DAY = 15`, `clampSplitDay(value: number): number` (10–25, non-finite → 15)
  - `SalaryPeriod = { dateFrom: string; dateTo: string }`
  - `halfPeriod(year: number, monthIndex: number, half: OkleykaHalf, splitDay: number): SalaryPeriod`
  - `resolveOkleykaDateRange(mode: OkleykaDateMode, splitDay: number)` — **signature change** (second arg required; month/range behave as before, half uses `halfPeriod`)
  - `salaryPeriodsForMode(mode: OkleykaDateMode, splitDay: number): SalaryPeriod[]` — half → 1 period, month → both halves, range → `[]`
  - `periodKey(period: SalaryPeriod): string` — `` `${dateFrom}_${dateTo}` ``
  - `formatPeriodLabel(period: SalaryPeriod): string` — e.g. `«1–15 июл»`

- [ ] **Step 1: Write failing tests**

Extend `date-range.test.ts`:

```ts
import {
  clampSplitDay,
  formatPeriodLabel,
  getCurrentMonthMode,
  halfPeriod,
  periodKey,
  resolveOkleykaDateRange,
  salaryPeriodsForMode,
} from './date-range';

describe('half periods', () => {
  it('builds first and second halves with splitDay', () => {
    expect(halfPeriod(2026, 6, 'first', 15)).toEqual({
      dateFrom: '2026-07-01',
      dateTo: '2026-07-15',
    });
    expect(halfPeriod(2026, 6, 'second', 15)).toEqual({
      dateFrom: '2026-07-16',
      dateTo: '2026-07-31',
    });
    expect(halfPeriod(2026, 6, 'second', 17)).toEqual({
      dateFrom: '2026-07-18',
      dateTo: '2026-07-31',
    });
    expect(halfPeriod(2026, 1, 'second', 15)).toEqual({
      dateFrom: '2026-02-16',
      dateTo: '2026-02-28',
    });
  });

  it('clamps split day', () => {
    expect(clampSplitDay(15)).toBe(15);
    expect(clampSplitDay(9)).toBe(10);
    expect(clampSplitDay(26)).toBe(25);
    expect(clampSplitDay(Number.NaN)).toBe(15);
  });

  it('resolves half mode', () => {
    expect(
      resolveOkleykaDateRange(
        { kind: 'half', year: 2026, monthIndex: 6, half: 'second' },
        16,
      ),
    ).toEqual({ dateFrom: '2026-07-17', dateTo: '2026-07-31' });
  });

  it('salaryPeriodsForMode: month → two halves, half → one, range → none', () => {
    expect(
      salaryPeriodsForMode({ kind: 'month', year: 2026, monthIndex: 6 }, 15),
    ).toEqual([
      { dateFrom: '2026-07-01', dateTo: '2026-07-15' },
      { dateFrom: '2026-07-16', dateTo: '2026-07-31' },
    ]);
    expect(
      salaryPeriodsForMode(
        { kind: 'half', year: 2026, monthIndex: 6, half: 'first' },
        15,
      ),
    ).toHaveLength(1);
    expect(
      salaryPeriodsForMode(
        { kind: 'range', dateFrom: '2026-07-01', dateTo: '2026-07-10' },
        15,
      ),
    ).toEqual([]);
  });

  it('periodKey and label', () => {
    expect(periodKey({ dateFrom: '2026-07-01', dateTo: '2026-07-15' })).toBe(
      '2026-07-01_2026-07-15',
    );
    expect(formatPeriodLabel({ dateFrom: '2026-07-16', dateTo: '2026-07-31' })).toBe(
      '16–31 июл',
    );
  });
});
```

Also update all existing `resolveOkleykaDateRange(mode)` calls in the test file to pass `15` as the second argument.

- [ ] **Step 2: Run — expect FAIL**

Run: `yarn vitest run src/deals-board/salary/date-range.test.ts`

- [ ] **Step 3: Implement**

Replace `date-range.ts` content:

```ts
import { toInputDate } from '../utils/date-filters';

export type OkleykaHalf = 'first' | 'second';

export type OkleykaDateMode =
  | { kind: 'month'; year: number; monthIndex: number }
  | { kind: 'half'; year: number; monthIndex: number; half: OkleykaHalf }
  | { kind: 'range'; dateFrom: string; dateTo: string };

export const DEFAULT_SPLIT_DAY = 15;

export const clampSplitDay = (value: number): number => {
  if (!Number.isFinite(value)) return DEFAULT_SPLIT_DAY;
  return Math.min(25, Math.max(10, Math.trunc(value)));
};

export type SalaryPeriod = { dateFrom: string; dateTo: string };

export const halfPeriod = (
  year: number,
  monthIndex: number,
  half: OkleykaHalf,
  splitDay: number,
): SalaryPeriod => {
  const day = clampSplitDay(splitDay);
  if (half === 'first') {
    return {
      dateFrom: toInputDate(new Date(year, monthIndex, 1)),
      dateTo: toInputDate(new Date(year, monthIndex, day)),
    };
  }
  return {
    dateFrom: toInputDate(new Date(year, monthIndex, day + 1)),
    dateTo: toInputDate(new Date(year, monthIndex + 1, 0)),
  };
};

export const getCurrentMonthMode = (now = new Date()): OkleykaDateMode => ({
  kind: 'month',
  year: now.getFullYear(),
  monthIndex: now.getMonth(),
});

export const resolveOkleykaDateRange = (
  mode: OkleykaDateMode,
  splitDay: number,
): { dateFrom: string; dateTo: string } | { error: string } => {
  if (mode.kind === 'month') {
    const start = new Date(mode.year, mode.monthIndex, 1);
    const end = new Date(mode.year, mode.monthIndex + 1, 0);
    return { dateFrom: toInputDate(start), dateTo: toInputDate(end) };
  }
  if (mode.kind === 'half') {
    return halfPeriod(mode.year, mode.monthIndex, mode.half, splitDay);
  }
  const dateFrom = mode.dateFrom?.trim() ?? '';
  const dateTo = mode.dateTo?.trim() ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
    return { error: 'Укажите корректный диапазон дат' };
  }
  if (dateFrom > dateTo) {
    return { error: 'Укажите корректный диапазон дат' };
  }
  return { dateFrom, dateTo };
};

export const salaryPeriodsForMode = (
  mode: OkleykaDateMode,
  splitDay: number,
): SalaryPeriod[] => {
  if (mode.kind === 'half') {
    return [halfPeriod(mode.year, mode.monthIndex, mode.half, splitDay)];
  }
  if (mode.kind === 'month') {
    return [
      halfPeriod(mode.year, mode.monthIndex, 'first', splitDay),
      halfPeriod(mode.year, mode.monthIndex, 'second', splitDay),
    ];
  }
  return [];
};

export const periodKey = (period: SalaryPeriod): string =>
  `${period.dateFrom}_${period.dateTo}`;

const MONTH_SHORT = [
  'янв', 'фев', 'мар', 'апр', 'май', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
];

export const formatPeriodLabel = (period: SalaryPeriod): string => {
  const dayFrom = Number(period.dateFrom.slice(8, 10));
  const dayTo = Number(period.dateTo.slice(8, 10));
  const month = MONTH_SHORT[Number(period.dateFrom.slice(5, 7)) - 1] ?? '';
  return `${dayFrom}–${dayTo} ${month}`;
};
```

Note: `OkleykaSalaryPage.tsx` still calls `resolveOkleykaDateRange(dateMode)` with one arg — fix the call there minimally (`resolveOkleykaDateRange(dateMode, DEFAULT_SPLIT_DAY)`) so the project compiles; the full page rework happens in Task 5.

- [ ] **Step 4: Run — expect PASS**

Run: `yarn vitest run src/deals-board/salary/date-range.test.ts` and `yarn tsc --noEmit`.

- [ ] **Step 5: Commit (only if user asked)**

```bash
git add src/deals-board/salary/date-range.ts src/deals-board/salary/date-range.test.ts src/deals-board/salary/OkleykaSalaryPage.tsx
git commit -m "feat(okleyka): half-month reporting periods with editable split day"
```

---

### Task 3: Compute rework (deal groups) + fund math

**Files:**
- Modify: `src/deals-board/salary/compute.ts`
- Modify: `src/deals-board/salary/compute.test.ts`
- Create: `src/deals-board/salary/fund.ts`
- Create: `src/deals-board/salary/fund.test.ts`
- Modify: `src/deals-board/salary/export-excel.ts`
- Delete: `src/logic-functions/okleyka-salary-export.ts` (uses removed row-level exports; page already ignores it)

**Interfaces:**
- Removes: `OkleykaSalaryRow`, `buildOkleykaSalaryRows`, `sumOkleykaSalaryTotals`, `OkleykaSalaryGroup`, `buildOkleykaSalaryGroups`, `sortOkleykaSalaryGroups`, `salaryRowsToCsv`, `salaryRowsToXlsxMatrix` (delete their tests too).
- Keeps: `isOkleykaSalaryLineItem`, `marginPctTone`, `formatMarginPct`, `formatSalaryRub`, `buildOkleykaSalaryFilename`.
- Produces in `compute.ts`:
  - `OkleykaPositionRow = { lineItemId: string; opportunityId: string; positionName: string; qty: number; unitPriceRub: number; saleRub: number }`
  - `OkleykaDealGroup = { opportunityId: string; dealName: string; bitrixUrl: string; positions: OkleykaPositionRow[]; saleRub: number; printCostRub: number; frezaCostRub: number; okleykaCostRub: number | null; costRub: number; profitRub: number; marginPct: number | null }`
  - `buildOkleykaDealGroups(lineItems: LineItemRow[], dealsById: Map<string, OpportunityRow>): OkleykaDealGroup[]`
  - `applyDealOkleykaOverride(group: OkleykaDealGroup, okleykaCostRub: number | null): OkleykaDealGroup`
  - `OkleykaDealTotals = { deals: number; positions: number; sale: number; print: number; freza: number; okleyka: number; cost: number; profit: number; marginPct: number | null }`
  - `sumOkleykaDealTotals(groups: OkleykaDealGroup[]): OkleykaDealTotals`
  - `OkleykaSortKey = 'sale' | 'print' | 'freza' | 'okleyka' | 'profit' | 'margin'`
  - `sortOkleykaDealGroups(groups: OkleykaDealGroup[], key: OkleykaSortKey, direction: 'asc' | 'desc'): OkleykaDealGroup[]` (positions keep name order)
  - `dealGroupsToXlsxMatrix(groups: OkleykaDealGroup[]): Array<Array<string | number>>`
- Produces in `fund.ts`:
  - `OkleykaSalaryEntry = { id: string; name: string; hours: number; rateRub: number; periodStart: string; periodEnd: string }`
  - `entrySumRub(entry: OkleykaSalaryEntry): number`
  - `sumFundRub(entries: OkleykaSalaryEntry[]): number`
  - `FundSummary = { fundRub: number; spentRub: number; remainderRub: number }`
  - `buildFundSummary(entries: OkleykaSalaryEntry[], groups: OkleykaDealGroup[]): FundSummary`
  - `saleShareHintRub(dealSaleRub: number, groups: OkleykaDealGroup[], fundRub: number): number | null`
  - `distributeRemainder(groups: OkleykaDealGroup[], remainderRub: number): Array<{ opportunityId: string; okleykaRub: number }>`
  - `pickPreviousPeriodEntries(entries: OkleykaSalaryEntry[]): OkleykaSalaryEntry[]`
  - `latestRateByName(entries: OkleykaSalaryEntry[], name: string): number | null`

- [ ] **Step 1: Rewrite compute tests**

Replace row-level economics tests in `compute.test.ts` with deal-group tests (keep any `isOkleykaSalaryLineItem` tests):

```ts
const deal = (id: string, over: Partial<OpportunityRow> = {}): OpportunityRow => ({
  id,
  name: `Сделка ${id}`,
  bitrixLink: { primaryLinkUrl: `https://bitrix/${id}` },
  rashodPechat: { amountMicros: 10_000_000, currencyCode: 'RUB' },
  rashodFrezerovka: { amountMicros: 5_000_000, currencyCode: 'RUB' },
  rashodOkleyka: null,
  ...over,
});

const item = (over: Partial<LineItemRow>): LineItemRow => ({
  id: 'li-1',
  opportunityId: 'd1',
  name: 'Позиция',
  tip: 'PLENKA',
  tipDetail: 'NASHI',
  stage: 'OKLEYKA',
  kolichestvo: 2,
  amount: { amountMicros: 50_000_000, currencyCode: 'RUB' },
  ...over,
} as LineItemRow);

it('sale = unit price × qty; qty <= 0 counts as 1', () => {
  const groups = buildOkleykaDealGroups(
    [item({}), item({ id: 'li-2', kolichestvo: 0, amount: { amountMicros: 30_000_000, currencyCode: 'RUB' } })],
    new Map([['d1', deal('d1')]]),
  );
  expect(groups).toHaveLength(1);
  expect(groups[0]?.positions.map((p) => p.saleRub)).toEqual([50 * 2, 30]);
  expect(groups[0]?.saleRub).toBe(130);
});

it('deal economics: print/freza from deal, okleyka null → cost without it, margin deal-level', () => {
  const groups = buildOkleykaDealGroups([item({})], new Map([['d1', deal('d1')]]));
  const g = groups[0]!;
  expect(g.printCostRub).toBe(10);
  expect(g.frezaCostRub).toBe(5);
  expect(g.okleykaCostRub).toBeNull();
  expect(g.costRub).toBe(15);
  expect(g.profitRub).toBe(85);
  expect(g.marginPct).toBeCloseTo(85);
});

it('okleyka set on deal reduces profit', () => {
  const groups = buildOkleykaDealGroups(
    [item({})],
    new Map([['d1', deal('d1', { rashodOkleyka: { amountMicros: 20_000_000, currencyCode: 'RUB' } })]]),
  );
  expect(groups[0]?.okleykaCostRub).toBe(20);
  expect(groups[0]?.costRub).toBe(35);
});

it('applyDealOkleykaOverride recomputes cost/profit/margin', () => {
  const g = buildOkleykaDealGroups([item({})], new Map([['d1', deal('d1')]]))[0]!;
  const next = applyDealOkleykaOverride(g, 30);
  expect(next.okleykaCostRub).toBe(30);
  expect(next.costRub).toBe(45);
  expect(next.profitRub).toBe(55);
  expect(applyDealOkleykaOverride(next, null).okleykaCostRub).toBeNull();
});

it('totals over deals', () => {
  const groups = buildOkleykaDealGroups(
    [item({}), item({ id: 'li-3', opportunityId: 'd2' })],
    new Map([['d1', deal('d1')], ['d2', deal('d2')]]),
  );
  const totals = sumOkleykaDealTotals(groups);
  expect(totals.deals).toBe(2);
  expect(totals.positions).toBe(2);
  expect(totals.sale).toBe(200);
  expect(totals.print).toBe(20);
  expect(totals.okleyka).toBe(0);
});

it('sorts groups by margin desc', () => {
  const groups = buildOkleykaDealGroups(
    [
      item({ id: 'a', opportunityId: 'd1' }),
      item({ id: 'b', opportunityId: 'd2' }),
    ],
    new Map([
      ['d1', deal('d1', { rashodOkleyka: { amountMicros: 80_000_000, currencyCode: 'RUB' } })],
      ['d2', deal('d2')],
    ]),
  );
  const sorted = sortOkleykaDealGroups(groups, 'margin', 'desc');
  expect(sorted.map((g) => g.opportunityId)).toEqual(['d2', 'd1']);
});

it('xlsx matrix: one row per deal, null okleyka → empty cell', () => {
  const groups = buildOkleykaDealGroups([item({})], new Map([['d1', deal('d1')]]));
  const matrix = dealGroupsToXlsxMatrix(groups);
  expect(matrix[0]).toEqual([
    'Bitrix', 'Сделка', 'Позиций', 'Продажа', 'Расход печать',
    'Расход фреза', 'Расход оклейка', 'Расход итого', 'Прибыль', 'Маржа %',
  ]);
  const row = matrix[1]!;
  expect(row[2]).toBe(1);
  expect(row[6]).toBe('');
});
```

- [ ] **Step 2: Run — expect FAIL**, `yarn vitest run src/deals-board/salary/compute.test.ts`

- [ ] **Step 3: Implement compute rework**

In `compute.ts`: delete the removed exports, add:

```ts
export type OkleykaPositionRow = {
  lineItemId: string;
  opportunityId: string;
  positionName: string;
  qty: number;
  unitPriceRub: number;
  saleRub: number;
};

export type OkleykaDealGroup = {
  opportunityId: string;
  dealName: string;
  bitrixUrl: string;
  positions: OkleykaPositionRow[];
  saleRub: number;
  printCostRub: number;
  frezaCostRub: number;
  okleykaCostRub: number | null;
  costRub: number;
  profitRub: number;
  marginPct: number | null;
};

const currencyToRubOrNull = (value: unknown): number | null => {
  if (!value || typeof value !== 'object') return null;
  const micros = (value as { amountMicros?: unknown }).amountMicros;
  if (typeof micros !== 'number' || !Number.isFinite(micros)) return null;
  return micros / 1_000_000;
};

const dealEconomics = (
  saleRub: number,
  printCostRub: number,
  frezaCostRub: number,
  okleykaCostRub: number | null,
) => {
  const costRub = printCostRub + frezaCostRub + (okleykaCostRub ?? 0);
  const profitRub = saleRub - costRub;
  return {
    costRub,
    profitRub,
    marginPct: saleRub > 0 ? (profitRub / saleRub) * 100 : null,
  };
};

export const buildOkleykaDealGroups = (
  lineItems: LineItemRow[],
  dealsById: Map<string, OpportunityRow>,
): OkleykaDealGroup[] => {
  const positionsByDeal = new Map<string, OkleykaPositionRow[]>();
  for (const item of lineItems) {
    if (!isOkleykaSalaryLineItem(item)) continue;
    if (!dealsById.has(item.opportunityId)) continue;
    const unitPriceRub = currencyToRub(item.amount as CurrencyAmount | undefined);
    const qty =
      typeof item.kolichestvo === 'number' && item.kolichestvo > 0 ? item.kolichestvo : 1;
    const list = positionsByDeal.get(item.opportunityId) ?? [];
    list.push({
      lineItemId: item.id,
      opportunityId: item.opportunityId,
      positionName: item.name || '—',
      qty,
      unitPriceRub,
      saleRub: unitPriceRub * qty,
    });
    positionsByDeal.set(item.opportunityId, list);
  }

  const groups: OkleykaDealGroup[] = [];
  for (const [opportunityId, positions] of positionsByDeal) {
    const deal = dealsById.get(opportunityId)!;
    const saleRub = positions.reduce((s, p) => s + p.saleRub, 0);
    const printCostRub = currencyToRub(deal.rashodPechat as CurrencyAmount | undefined);
    const frezaCostRub = currencyToRub(deal.rashodFrezerovka as CurrencyAmount | undefined);
    const okleykaCostRub = currencyToRubOrNull(deal.rashodOkleyka);
    groups.push({
      opportunityId,
      dealName: deal.name || '—',
      bitrixUrl: deal.bitrixLink?.primaryLinkUrl?.trim() ?? '',
      positions: [...positions].sort((a, b) =>
        a.positionName.localeCompare(b.positionName, 'ru'),
      ),
      saleRub,
      printCostRub,
      frezaCostRub,
      okleykaCostRub,
      ...dealEconomics(saleRub, printCostRub, frezaCostRub, okleykaCostRub),
    });
  }
  return groups.sort((a, b) => a.dealName.localeCompare(b.dealName, 'ru'));
};

export const applyDealOkleykaOverride = (
  group: OkleykaDealGroup,
  okleykaCostRub: number | null,
): OkleykaDealGroup => ({
  ...group,
  okleykaCostRub,
  ...dealEconomics(group.saleRub, group.printCostRub, group.frezaCostRub, okleykaCostRub),
});

export type OkleykaDealTotals = {
  deals: number;
  positions: number;
  sale: number;
  print: number;
  freza: number;
  okleyka: number;
  cost: number;
  profit: number;
  marginPct: number | null;
};

export const sumOkleykaDealTotals = (groups: OkleykaDealGroup[]): OkleykaDealTotals => {
  const sale = groups.reduce((s, g) => s + g.saleRub, 0);
  const print = groups.reduce((s, g) => s + g.printCostRub, 0);
  const freza = groups.reduce((s, g) => s + g.frezaCostRub, 0);
  const okleyka = groups.reduce((s, g) => s + (g.okleykaCostRub ?? 0), 0);
  const cost = print + freza + okleyka;
  const profit = sale - cost;
  return {
    deals: groups.length,
    positions: groups.reduce((s, g) => s + g.positions.length, 0),
    sale,
    print,
    freza,
    okleyka,
    cost,
    profit,
    marginPct: sale > 0 ? (profit / sale) * 100 : null,
  };
};

export type OkleykaSortKey = 'sale' | 'print' | 'freza' | 'okleyka' | 'profit' | 'margin';

const groupMetric = (group: OkleykaDealGroup, key: OkleykaSortKey): number => {
  if (key === 'sale') return group.saleRub;
  if (key === 'print') return group.printCostRub;
  if (key === 'freza') return group.frezaCostRub;
  if (key === 'okleyka') return group.okleykaCostRub ?? Number.NEGATIVE_INFINITY;
  if (key === 'profit') return group.profitRub;
  return group.marginPct ?? Number.NEGATIVE_INFINITY;
};

export const sortOkleykaDealGroups = (
  groups: OkleykaDealGroup[],
  key: OkleykaSortKey,
  direction: 'asc' | 'desc',
): OkleykaDealGroup[] => {
  const sign = direction === 'asc' ? 1 : -1;
  return [...groups].sort((a, b) => sign * (groupMetric(a, key) - groupMetric(b, key)));
};

export const dealGroupsToXlsxMatrix = (
  groups: OkleykaDealGroup[],
): Array<Array<string | number>> => {
  const header = [
    'Bitrix', 'Сделка', 'Позиций', 'Продажа', 'Расход печать',
    'Расход фреза', 'Расход оклейка', 'Расход итого', 'Прибыль', 'Маржа %',
  ];
  return [
    header,
    ...groups.map((g) => [
      g.bitrixUrl,
      g.dealName,
      g.positions.length,
      Math.round(g.saleRub),
      Math.round(g.printCostRub),
      Math.round(g.frezaCostRub),
      g.okleykaCostRub === null ? '' : Math.round(g.okleykaCostRub),
      Math.round(g.costRub),
      Math.round(g.profitRub),
      g.marginPct === null ? '' : Number(g.marginPct.toFixed(1)),
    ]),
  ];
};
```

Update `export-excel.ts` to the group matrix:

```ts
import { buildXlsxFromRows, XLSX_MIME } from 'src/logic-functions/shared/build-xlsx';

import {
  buildOkleykaSalaryFilename,
  dealGroupsToXlsxMatrix,
  type OkleykaDealGroup,
} from './compute';

export const buildOkleykaSalaryExcelBlobFromGroups = (groups: OkleykaDealGroup[]): Blob => {
  const bytes = buildXlsxFromRows(dealGroupsToXlsxMatrix(groups));
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer], { type: XLSX_MIME });
};

export const fetchOkleykaSalaryExcelBlob = async (
  groups: OkleykaDealGroup[],
): Promise<{ blob: Blob; filename: string }> => {
  if (!groups.length) throw new Error('Нет строк для экспорта.');
  return { blob: buildOkleykaSalaryExcelBlobFromGroups(groups), filename: buildOkleykaSalaryFilename() };
};
```

Delete `src/logic-functions/okleyka-salary-export.ts`.

Note: `api.ts` / `api.test.ts` / `OkleykaSalaryPage.tsx` still reference removed exports after this step — that is expected mid-task; Task 4/5 fix them. To keep this task independently green, limit `tsc` expectations to the tested files, or (preferred) apply the *minimal* mechanical fix in `api.ts` (switch `buildOkleykaSalaryRows` → `buildOkleykaDealGroups` and return type to `OkleykaDealGroup[]`, remove `fetchOkleykaSalaryLineItems` and `patchOkleykaCost` consumers' imports) and in `OkleykaSalaryPage.tsx` only as far as compilation requires. Task 4/5 finish the semantics.

- [ ] **Step 4: fund.ts tests (write first) + implementation**

`fund.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { OkleykaDealGroup } from './compute';
import {
  buildFundSummary,
  distributeRemainder,
  entrySumRub,
  latestRateByName,
  pickPreviousPeriodEntries,
  saleShareHintRub,
  sumFundRub,
  type OkleykaSalaryEntry,
} from './fund';

const entry = (over: Partial<OkleykaSalaryEntry>): OkleykaSalaryEntry => ({
  id: 'e1',
  name: 'Иван',
  hours: 10,
  rateRub: 500,
  periodStart: '2026-07-01',
  periodEnd: '2026-07-15',
  ...over,
});

const group = (over: Partial<OkleykaDealGroup>): OkleykaDealGroup => ({
  opportunityId: 'd1',
  dealName: 'Сделка',
  bitrixUrl: '',
  positions: [],
  saleRub: 100,
  printCostRub: 0,
  frezaCostRub: 0,
  okleykaCostRub: null,
  costRub: 0,
  profitRub: 100,
  marginPct: 100,
  ...over,
});

it('fund and remainder', () => {
  const entries = [entry({}), entry({ id: 'e2', hours: 8, rateRub: 600 })];
  expect(entrySumRub(entries[0]!)).toBe(5000);
  expect(sumFundRub(entries)).toBe(9800);
  const summary = buildFundSummary(entries, [
    group({ okleykaCostRub: 3000 }),
    group({ opportunityId: 'd2' }),
  ]);
  expect(summary).toEqual({ fundRub: 9800, spentRub: 3000, remainderRub: 6800 });
});

it('sale share hint proportional to fund', () => {
  const groups = [group({ saleRub: 300 }), group({ opportunityId: 'd2', saleRub: 100 })];
  expect(saleShareHintRub(300, groups, 8000)).toBe(6000);
  expect(saleShareHintRub(300, groups, 0)).toBeNull();
  expect(saleShareHintRub(300, [group({ saleRub: 0 })], 8000)).toBeNull();
});

it('distributes remainder over empty/zero okleyka deals proportionally, rounding fixed on largest', () => {
  const groups = [
    group({ opportunityId: 'a', saleRub: 200, okleykaCostRub: null }),
    group({ opportunityId: 'b', saleRub: 100, okleykaCostRub: 0 }),
    group({ opportunityId: 'c', saleRub: 500, okleykaCostRub: 999 }), // skipped
  ];
  const result = distributeRemainder(groups, 1000);
  expect(result).toHaveLength(2);
  const total = result.reduce((s, r) => s + r.okleykaRub, 0);
  expect(total).toBe(1000);
  expect(result.find((r) => r.opportunityId === 'a')?.okleykaRub).toBe(667);
  expect(result.find((r) => r.opportunityId === 'b')?.okleykaRub).toBe(333);
});

it('distribution edge cases', () => {
  expect(distributeRemainder([group({})], 0)).toEqual([]);
  expect(distributeRemainder([group({ okleykaCostRub: 10 })], 500)).toEqual([]);
  expect(distributeRemainder([group({ saleRub: 0 })], 500)).toEqual([]);
});

it('picks the latest finished period', () => {
  const entries = [
    entry({ id: '1', periodStart: '2026-06-16', periodEnd: '2026-06-30' }),
    entry({ id: '2', periodStart: '2026-06-16', periodEnd: '2026-06-30', name: 'Пётр' }),
    entry({ id: '3', periodStart: '2026-06-01', periodEnd: '2026-06-15' }),
  ];
  expect(pickPreviousPeriodEntries(entries).map((e) => e.id)).toEqual(['1', '2']);
  expect(pickPreviousPeriodEntries([])).toEqual([]);
});

it('latest rate by name (case-insensitive, latest periodEnd wins)', () => {
  const entries = [
    entry({ id: '1', rateRub: 500, periodEnd: '2026-06-15' }),
    entry({ id: '2', rateRub: 550, periodEnd: '2026-06-30' }),
    entry({ id: '3', name: 'Пётр', rateRub: 700, periodEnd: '2026-06-30' }),
  ];
  expect(latestRateByName(entries, 'иван')).toBe(550);
  expect(latestRateByName(entries, 'Нет такого')).toBeNull();
});
```

`fund.ts`:

```ts
import type { OkleykaDealGroup } from './compute';

export type OkleykaSalaryEntry = {
  id: string;
  name: string;
  hours: number;
  rateRub: number;
  periodStart: string;
  periodEnd: string;
};

export const entrySumRub = (entry: OkleykaSalaryEntry): number =>
  entry.hours * entry.rateRub;

export const sumFundRub = (entries: OkleykaSalaryEntry[]): number =>
  entries.reduce((s, e) => s + entrySumRub(e), 0);

export type FundSummary = { fundRub: number; spentRub: number; remainderRub: number };

export const buildFundSummary = (
  entries: OkleykaSalaryEntry[],
  groups: OkleykaDealGroup[],
): FundSummary => {
  const fundRub = sumFundRub(entries);
  const spentRub = groups.reduce((s, g) => s + (g.okleykaCostRub ?? 0), 0);
  return { fundRub, spentRub, remainderRub: fundRub - spentRub };
};

/** «по продаже ≈ N ₽» — deal's proportional share of the fund by sale. */
export const saleShareHintRub = (
  dealSaleRub: number,
  groups: OkleykaDealGroup[],
  fundRub: number,
): number | null => {
  if (fundRub <= 0) return null;
  const totalSale = groups.reduce((s, g) => s + g.saleRub, 0);
  if (totalSale <= 0 || dealSaleRub <= 0) return null;
  return Math.round((fundRub * dealSaleRub) / totalSale);
};

/** Spread remainder over deals with empty/zero okleyka, proportional to sale. */
export const distributeRemainder = (
  groups: OkleykaDealGroup[],
  remainderRub: number,
): Array<{ opportunityId: string; okleykaRub: number }> => {
  if (remainderRub <= 0) return [];
  const targets = groups.filter(
    (g) => (g.okleykaCostRub === null || g.okleykaCostRub === 0) && g.saleRub > 0,
  );
  const totalSale = targets.reduce((s, g) => s + g.saleRub, 0);
  if (targets.length === 0 || totalSale <= 0) return [];

  const result = targets.map((g) => ({
    opportunityId: g.opportunityId,
    okleykaRub: Math.round((remainderRub * g.saleRub) / totalSale),
  }));
  const diff = remainderRub - result.reduce((s, r) => s + r.okleykaRub, 0);
  if (diff !== 0) {
    const largest = targets.reduce((max, g) => (g.saleRub > max.saleRub ? g : max), targets[0]!);
    const target = result.find((r) => r.opportunityId === largest.opportunityId)!;
    target.okleykaRub += diff;
  }
  return result.filter((r) => r.okleykaRub > 0);
};

/** Latest fully finished period among candidate entries (max periodEnd, then max periodStart). */
export const pickPreviousPeriodEntries = (
  entries: OkleykaSalaryEntry[],
): OkleykaSalaryEntry[] => {
  if (entries.length === 0) return [];
  let best = '';
  for (const e of entries) {
    const key = `${e.periodEnd}_${e.periodStart}`;
    if (key > best) best = key;
  }
  return entries.filter((e) => `${e.periodEnd}_${e.periodStart}` === best);
};

export const latestRateByName = (
  entries: OkleykaSalaryEntry[],
  name: string,
): number | null => {
  const needle = name.trim().toLowerCase();
  if (!needle) return null;
  let bestEnd = '';
  let rate: number | null = null;
  for (const e of entries) {
    if (e.name.trim().toLowerCase() !== needle) continue;
    if (e.periodEnd > bestEnd) {
      bestEnd = e.periodEnd;
      rate = e.rateRub;
    }
  }
  return rate;
};
```

- [ ] **Step 5: Run — expect PASS**

Run: `yarn vitest run src/deals-board/salary/compute.test.ts src/deals-board/salary/fund.test.ts`

- [ ] **Step 6: Commit (only if user asked)**

```bash
git add src/deals-board/salary/compute.ts src/deals-board/salary/compute.test.ts src/deals-board/salary/fund.ts src/deals-board/salary/fund.test.ts src/deals-board/salary/export-excel.ts
git rm src/logic-functions/okleyka-salary-export.ts
git commit -m "feat(okleyka): deal-level economics and salary fund math"
```

---

### Task 4: API — deal groups loader, deal okleyka PATCH, salary entries CRUD

**Files:**
- Modify: `src/deals-board/salary/api.ts`
- Modify: `src/deals-board/salary/api.test.ts`
- Create: `src/deals-board/salary/salary-entries-api.ts`

**Interfaces:**
- Consumes: `buildOkleykaDealGroups`, `patchOpportunity` from `../api/opportunities`, `SalaryPeriod` from `./date-range`, `OkleykaSalaryEntry` from `./fund`.
- Produces:
  - `fetchOkleykaSalaryPageData(dateFrom: string, dateTo: string): Promise<OkleykaDealGroup[]>` — same flow as v1 but `restFieldNames: ['name', 'bitrixLink', 'loadDate', 'closeDate', 'rashodPechat', 'rashodFrezerovka', 'rashodOkleyka']` and returns groups via `buildOkleykaDealGroups`.
  - `patchOkleykaDealCost(opportunityId: string, rubles: number | null): Promise<void>` — `null` → `patchOpportunity(id, { rashodOkleyka: null })`; number → `{ rashodOkleyka: { amountMicros: Math.round(rubles * 1_000_000), currencyCode: 'RUB' } }`.
  - **Removed:** `patchOkleykaCost`, `fetchOkleykaSalaryLineItems`, `fetchOpportunitiesByIdsForSalary` (no remaining consumers after Task 3 deleted the LF).
  - In `salary-entries-api.ts`:
    - `fetchSalaryEntriesForPeriod(period: SalaryPeriod): Promise<OkleykaSalaryEntry[]>` — GET `/rest/okleykaSalaryEntries` with `filter=and(periodStart[eq]:"...",periodEnd[eq]:"...")`, paginate like the line-items loader.
    - `createSalaryEntry(input: { name: string; hours: number; rateRub: number; periodStart: string; periodEnd: string }): Promise<void>` — POST `/rest/okleykaSalaryEntries`.
    - `updateSalaryEntry(id: string, patch: Partial<{ name: string; hours: number; rateRub: number }>): Promise<void>` — PATCH `/rest/okleykaSalaryEntries/{id}`.
    - `deleteSalaryEntry(id: string): Promise<void>` — DELETE `/rest/okleykaSalaryEntries/{id}`.
    - `fetchEntriesEndedBefore(dateFrom: string, limit = 400): Promise<OkleykaSalaryEntry[]>` — `filter=periodEnd[lt]:"{dateFrom}"`; used for prev-period copy, name suggestions, and rate autofill (client picks with `fund.ts` helpers).

- [ ] **Step 1: Normalizer for entries**

In `salary-entries-api.ts`:

```ts
import { RestApiClient } from 'twenty-client-sdk/rest';

import { extractRestPageInfo, normalizeRestListResponse } from '../api/rest-list';
import type { SalaryPeriod } from './date-range';
import type { OkleykaSalaryEntry } from './fund';

const ENDPOINT = '/rest/okleykaSalaryEntries';
const LIST_KEY = 'okleykaSalaryEntries';
const PAGE_LIMIT = 200;

const toDateString = (value: unknown): string =>
  typeof value === 'string' ? value.slice(0, 10) : '';

const normalizeEntry = (raw: unknown): OkleykaSalaryEntry | null => {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== 'string') return null;
  return {
    id: record.id,
    name: typeof record.name === 'string' ? record.name : '',
    hours: typeof record.hours === 'number' && Number.isFinite(record.hours) ? record.hours : 0,
    rateRub:
      typeof record.rateRub === 'number' && Number.isFinite(record.rateRub) ? record.rateRub : 0,
    periodStart: toDateString(record.periodStart),
    periodEnd: toDateString(record.periodEnd),
  };
};

const fetchList = async (filter: string, maxRecords: number): Promise<OkleykaSalaryEntry[]> => {
  const client = new RestApiClient();
  const all: OkleykaSalaryEntry[] = [];
  let after: string | undefined;
  do {
    const response = await client.get<unknown>(ENDPOINT, {
      query: { filter, limit: PAGE_LIMIT, ...(after ? { after } : {}) },
    });
    const page = normalizeRestListResponse<unknown>(response, LIST_KEY)
      .map(normalizeEntry)
      .filter((entry): entry is OkleykaSalaryEntry => entry !== null);
    all.push(...page);
    if (all.length >= maxRecords) break;
    const pageInfo = extractRestPageInfo(response);
    after = pageInfo.hasNextPage && pageInfo.endCursor ? String(pageInfo.endCursor) : undefined;
  } while (after);
  return all;
};

export const fetchSalaryEntriesForPeriod = (period: SalaryPeriod) =>
  fetchList(
    `and(periodStart[eq]:"${period.dateFrom}",periodEnd[eq]:"${period.dateTo}")`,
    1000,
  );

export const fetchEntriesEndedBefore = (dateFrom: string, limit = 400) =>
  fetchList(`periodEnd[lt]:"${dateFrom}"`, limit);

export const createSalaryEntry = async (input: {
  name: string;
  hours: number;
  rateRub: number;
  periodStart: string;
  periodEnd: string;
}): Promise<void> => {
  const client = new RestApiClient();
  await client.post<unknown>(ENDPOINT, input);
};

export const updateSalaryEntry = async (
  id: string,
  patch: Partial<{ name: string; hours: number; rateRub: number }>,
): Promise<void> => {
  const client = new RestApiClient();
  await client.patch<unknown>(`${ENDPOINT}/${id}`, patch);
};

export const deleteSalaryEntry = async (id: string): Promise<void> => {
  const client = new RestApiClient();
  await client.delete<unknown>(`${ENDPOINT}/${id}`);
};
```

Verify the exact `RestApiClient` method names for PATCH/DELETE against `twenty-client-sdk/rest` typings (see how `updateLineItem` / delete flows are implemented in `src/deals-board/api/line-items.ts` and mirror them; if the client exposes e.g. `client.patch(path, body)` differently, adapt while keeping the exported function signatures above).

- [ ] **Step 2: Rework api.ts**

- `fetchOkleykaSalaryPageData`: add the three rashod REST fields, call `buildOkleykaDealGroups(matchedLineItems, dealsById)`, return `OkleykaDealGroup[]`.
- Add `patchOkleykaDealCost` (import `patchOpportunity` from `../api/opportunities`):

```ts
export const patchOkleykaDealCost = async (
  opportunityId: string,
  rubles: number | null,
): Promise<void> => {
  if (rubles === null) {
    await patchOpportunity(opportunityId, { rashodOkleyka: null });
    return;
  }
  await patchOpportunity(opportunityId, {
    rashodOkleyka: {
      amountMicros: Math.round(rubles * 1_000_000),
      currencyCode: 'RUB',
    },
  });
};
```

- Delete `patchOkleykaCost`, `fetchOkleykaSalaryLineItems`, `fetchOpportunitiesByIdsForSalary` and unused imports.

- [ ] **Step 3: Update api.test.ts**

Replace `buildOkleykaSalaryRows` mocks with `buildOkleykaDealGroups`; keep existing assertions about the line-item filter (`tip[eq]:"PLENKA"` etc.) and the date-scoped opportunity fetch; add an assertion that the opportunities fetch receives `restFieldNames` containing `'rashodPechat'`, `'rashodFrezerovka'`, `'rashodOkleyka'`. Add a `patchOkleykaDealCost` test mocking `patchOpportunity`:

```ts
it('patchOkleykaDealCost writes currency or null', async () => {
  await patchOkleykaDealCost('opp-1', 1500);
  expect(patchOpportunity).toHaveBeenCalledWith('opp-1', {
    rashodOkleyka: { amountMicros: 1_500_000_000, currencyCode: 'RUB' },
  });
  await patchOkleykaDealCost('opp-1', null);
  expect(patchOpportunity).toHaveBeenCalledWith('opp-1', { rashodOkleyka: null });
});
```

- [ ] **Step 4: Run — expect PASS**

Run: `yarn vitest run src/deals-board/salary/api.test.ts` and `yarn tsc --noEmit` (page may still reference old cell API — if so, apply only the minimal compile fix; full page rework is Task 5).

- [ ] **Step 5: Commit (only if user asked)**

```bash
git add src/deals-board/salary/api.ts src/deals-board/salary/api.test.ts src/deals-board/salary/salary-entries-api.ts
git commit -m "feat(okleyka): deal-level loading, okleyka patch, salary entries CRUD"
```

---

### Task 5: Table rework — deal-level editing cell + page layout

**Files:**
- Create: `src/deals-board/salary/OkleykaDealCostCell.tsx`
- Delete: `src/deals-board/salary/OkleykaCostCell.tsx`
- Modify: `src/deals-board/salary/OkleykaSalaryPage.tsx`

**Interfaces:**
- Consumes: `buildOkleykaDealGroups` output from query, `applyDealOkleykaOverride`, `sumOkleykaDealTotals`, `sortOkleykaDealGroups`, `patchOkleykaDealCost`, `resolveOkleykaDateRange(mode, splitDay)`, `DEFAULT_SPLIT_DAY`, `clampSplitDay`, `fetchOkleykaSalaryExcelBlob(groups)`.
- Produces: page with deal-level economics; salary panel comes in Task 6 (leave a `<aside>` placeholder slot). `hintRub` prop of the cell is wired to `null` in this task.

- [ ] **Step 1: OkleykaDealCostCell**

Copy `OkleykaCostCell.tsx` mechanics (one-shot autofocus via `prevAutoFocusRef`, `skipBlurSaveRef`, Tab/Enter/Esc) into `OkleykaDealCostCell.tsx` with these changes:

```ts
type Props = {
  opportunityId: string;
  valueRub: number | null;          // null = не задано
  hintRub: number | null;           // «по продаже ≈ N ₽», shown while editing
  autoFocus?: boolean;
  onOptimistic: (opportunityId: string, nextRub: number | null) => void;
  onRollback: (opportunityId: string, prevRub: number | null) => void;
  onMove: (opportunityId: string, direction: 1 | -1) => void;
  onFocusConsumed?: () => void;
};
```

- Idle display: `valueRub === null ? '—' : formatSalaryRub(valueRub)` (0 renders as `0 ₽`, not «—»).
- `draftFromValue(rub: number | null)` → `rub === null ? '' : String(rub)`.
- Save: empty draft → `patchOkleykaDealCost(opportunityId, null)` with optimistic `null` (NOT 0). No-change check: `parsed.rub === valueRub` covers both null and number.
- While editing, under the input render the hint when `hintRub !== null`:

```tsx
<span style={{ color: colors.textMuted, fontSize: font.sizeXs, whiteSpace: 'nowrap' }}>
  по продаже ≈ {formatSalaryRub(hintRub)}
</span>
```

- Calls `patchOkleykaDealCost` instead of `patchOkleykaCost`.

- [ ] **Step 2: Page state changes**

In `OkleykaSalaryPage.tsx`:

```tsx
const [splitDay, setSplitDay] = useState(DEFAULT_SPLIT_DAY);
const [dateMode, setDateMode] = useState<OkleykaDateMode>(() => getCurrentMonthMode());
const resolved = resolveOkleykaDateRange(dateMode, splitDay);
// overrides keyed by opportunityId, value number | null; sentinel needed to
// distinguish «no override» from «override to null»:
const [overrides, setOverrides] = useState<Record<string, number | null>>({});
const [focusId, setFocusId] = useState<string | null>(null); // opportunityId
```

Query stays `['okleyka-salary', refreshKey, dateFrom, dateTo]` but `queryFn` returns groups. Display groups:

```tsx
const baseGroups = query.data ?? [];
const displayGroups = useMemo(
  () =>
    baseGroups.map((g) =>
      Object.prototype.hasOwnProperty.call(overrides, g.opportunityId)
        ? applyDealOkleykaOverride(g, overrides[g.opportunityId] ?? null)
        : g,
    ),
  [baseGroups, overrides],
);
const totals = useMemo(() => sumOkleykaDealTotals(displayGroups), [displayGroups]);
const groups = useMemo(
  () => (sort ? sortOkleykaDealGroups(displayGroups, sort.key, sort.direction) : displayGroups),
  [displayGroups, sort],
);
const flatIds = useMemo(() => groups.map((g) => g.opportunityId), [groups]);
```

Override sync effect (clear when server matches, mirroring v1 but null-aware):

```tsx
useEffect(() => {
  setOverrides((prev) => {
    const keys = Object.keys(prev);
    if (keys.length === 0) return prev;
    let changed = false;
    const next = { ...prev };
    for (const id of keys) {
      const g = baseGroups.find((x) => x.opportunityId === id);
      if (g && g.okleykaCostRub === prev[id]) {
        delete next[id];
        changed = true;
      }
    }
    return changed ? next : prev;
  });
}, [baseGroups]);
```

- [ ] **Step 3: Filter controls — segment + splitDay**

Under the month input add a segment control (three `Button`s, `variant` `primary` when active / `ghost` otherwise): «Весь месяц» → `{ kind: 'month', ... }`, «1-я половина» / «2-я половина» → `{ kind: 'half', ..., half: 'first' | 'second' }`. Preserve current year/monthIndex when switching segments (fall back to `getCurrentMonthMode()` values when in `range` mode). Next to segments — split day input:

```tsx
<label style={{ display: 'flex', alignItems: 'center', gap: 4, color: colors.textMuted, fontSize: font.sizeXs }}>
  граница
  <Input
    theme={theme}
    type="number"
    min={10}
    max={25}
    value={splitDay}
    onChange={(e) => setSplitDay(clampSplitDay(Number(e.target.value)))}
    style={{ width: 56, padding: '5px 8px', fontSize: font.sizeSm }}
  />
</label>
```

Month input and range inputs behave as before (month input changing keeps the current `kind` if it is `half`, otherwise sets `month`).

- [ ] **Step 4: Table layout**

Header row: (chevron) · Сделка · Позиции · Продажа · Печать · Фреза · Оклейка · Расход · Прибыль · Маржа. Sortable: `sale`, `print`, `freza`, `okleyka`, `profit`, `margin` (update `SORTABLE_*` arrays to the new keys, single array is fine).

Group row: chevron, deal name + Bitrix + copy (unchanged), `{group.positions.length} поз.`, sale, print (`formatOptionalCost`), freza, **`OkleykaDealCostCell`** (`valueRub={group.okleykaCostRub}`, `hintRub={null}` for now, `autoFocus={focusId === group.opportunityId}`), cost, profit, margin (tinted).

Child rows (when expanded): indent name; columns Кол-во (`p.qty`), Цена (`formatSalaryRub(p.unitPriceRub)`), Продажа (`formatSalaryRub(p.saleRub)`); remaining 6 cells empty `<td/>`. Update `colSpan` of the empty-state row to 10.

Totals strip: Сделок · Позиций · Продажа · Печать · Фреза · Оклейка · Итого расход · Прибыль · Маржа.

Optimistic handlers keyed by opportunityId:

```tsx
const handleOptimistic = useCallback((id: string, next: number | null) => {
  setOverrides((prev) => ({ ...prev, [id]: next }));
}, []);
const handleRollback = useCallback((id: string, prevRub: number | null) => {
  setOverrides((prev) => {
    const next = { ...prev };
    const server = baseGroups.find((g) => g.opportunityId === id)?.okleykaCostRub ?? null;
    if (server === prevRub) delete next[id];
    else next[id] = prevRub;
    return next;
  });
}, [baseGroups]);
```

Excel button passes `displayGroups` to `fetchOkleykaSalaryExcelBlob`.

Wrap the content below the header in a horizontal flex row and add the panel slot:

```tsx
<div style={{ flex: 1, minHeight: 0, display: 'flex', gap: spacing.md }}>
  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: spacing.md }}>
    {/* totals strip + table (existing) */}
  </div>
  <aside style={{ width: 320, flexShrink: 0, minHeight: 0, overflow: 'auto' }}>
    {/* SalaryPanel — Task 6 */}
  </aside>
</div>
```

- [ ] **Step 5: Delete `OkleykaCostCell.tsx`**, run `yarn tsc --noEmit` and `yarn vitest run src/deals-board/salary` → PASS.

- [ ] **Step 6: Manual smoke (after apply)**

Deal row okleyka: click → edit → Enter jumps to next deal; empty save shows «—»; totals recalc; sort by Оклейка; positions show Кол-во/Цена/Продажа; Excel = one row per deal.

- [ ] **Step 7: Commit (only if user asked)**

```bash
git add src/deals-board/salary/OkleykaDealCostCell.tsx src/deals-board/salary/OkleykaSalaryPage.tsx
git rm src/deals-board/salary/OkleykaCostCell.tsx
git commit -m "feat(okleyka): deal-level table with inline deal budget editing"
```

---

### Task 6: SalaryPanel — people, fund, copy, autofill, hint, distribute

**Files:**
- Create: `src/deals-board/salary/SalaryPanel.tsx`
- Modify: `src/deals-board/salary/OkleykaSalaryPage.tsx`

**Interfaces:**
- Consumes: `salaryPeriodsForMode`, `periodKey`, `formatPeriodLabel`, `fetchSalaryEntriesForPeriod`, `fetchEntriesEndedBefore`, `createSalaryEntry`, `updateSalaryEntry`, `deleteSalaryEntry`, `buildFundSummary`, `saleShareHintRub`, `distributeRemainder`, `pickPreviousPeriodEntries`, `latestRateByName`, `patchOkleykaDealCost`, `entrySumRub`, `formatSalaryRub`.
- Produces: right-panel UI; page passes real `hintRub` into `OkleykaDealCostCell`.

- [ ] **Step 1: Page-level queries for entries**

In `OkleykaSalaryPage.tsx`:

```tsx
const periods = useMemo(() => salaryPeriodsForMode(dateMode, splitDay), [dateMode, splitDay]);
const periodsKey = periods.map(periodKey).join('|');

const entriesQuery = useQuery({
  queryKey: ['okleyka-salary-entries', periodsKey],
  enabled: periods.length > 0,
  queryFn: async () => {
    const lists = await Promise.all(periods.map((p) => fetchSalaryEntriesForPeriod(p)));
    return lists.flat();
  },
});
const entries = entriesQuery.data ?? [];

const historyQuery = useQuery({
  queryKey: ['okleyka-salary-history', periods[0]?.dateFrom ?? ''],
  enabled: periods.length > 0,
  queryFn: () => fetchEntriesEndedBefore(periods[0]!.dateFrom),
});
const historyEntries = historyQuery.data ?? [];

const fund = useMemo(
  () => buildFundSummary(entries, displayGroups),
  [entries, displayGroups],
);
```

`useQueryClient()` for invalidation: `const queryClient = useQueryClient();` and

```tsx
const refetchEntries = () =>
  queryClient.invalidateQueries({ queryKey: ['okleyka-salary-entries', periodsKey] });
```

- [ ] **Step 2: SalaryPanel component**

`SalaryPanel.tsx` props:

```ts
import type { OkleykaSalaryEntry } from './fund';
import type { SalaryPeriod } from './date-range';

type SalaryPanelProps = {
  periods: SalaryPeriod[];                 // [] → disabled hint
  entries: OkleykaSalaryEntry[];
  historyEntries: OkleykaSalaryEntry[];    // finished periods (suggestions, rates, copy)
  fund: { fundRub: number; spentRub: number; remainderRub: number };
  isLoading: boolean;
  onChanged: () => void;                   // invalidate entries query
  onDistribute: () => void;
  distributeDisabledReason: string | null; // null = enabled
};
```

Behaviour (all mutations call the api then `onChanged()`; disable controls while a mutation is in flight via a local `busy` state):

- `periods.length === 0` → render card: «Выберите месяц или полупериод, чтобы работать с фондом ЗП».
- One section per period: header `formatPeriodLabel(period)`; rows = `entries.filter(e => e.periodStart === period.dateFrom && e.periodEnd === period.dateTo)` sorted by name.
- Row: name (text), hours (`Input` number, width ~56), rate (`Input` number, width ~72), sum `formatSalaryRub(entrySumRub(entry))`, delete «×» button. Hours/rate commit `updateSalaryEntry(id, { hours })` / `({ rateRub })` on blur or Enter (parse `Number`, invalid/negative → revert draft, no request).
- Add form per section: name input with `<datalist>` of unique names from `historyEntries` (`[...new Set(historyEntries.map(e => e.name).filter(Boolean))]`), hours input, rate input, «Добавить» button (disabled while empty name). On name change: if the rate field has not been manually edited (`rateTouched` flag) — `latestRateByName(historyEntries, name)` and prefill when found.
- «Из прошлого периода» button per section: visible when the section has no entries; `pickPreviousPeriodEntries(historyEntries)` → if empty, disabled with title «Нет данных за прошлый период»; else `createSalaryEntry` for each with `{ name, hours: 0, rateRub, periodStart: period.dateFrom, periodEnd: period.dateTo }` sequentially, then `onChanged()`.
- Footer totals (tabular-nums): `Фонд {formatSalaryRub(fund.fundRub)}` · `Раскидано {formatSalaryRub(fund.spentRub)}` · `Остаток` colored `colors.danger` when `< 0`, else `colors.success ?? colors.text`.
- «Распределить остаток» button in the footer: disabled with muted reason text when `distributeDisabledReason !== null`, else calls `onDistribute()`.

Style: Apple Ops card — `backgroundColor: colors.bgSecondary`, `borderRadius: radius.lg`, `boxShadow: inset 0 0 0 1px ${colors.borderSubtle}`, padding `spacing.md`, font sizes `sizeSm`/`sizeXs`. No new colors.

- [ ] **Step 3: Wire hint + distribution in page**

Hint per group:

```tsx
const hintFor = (g: OkleykaDealGroup): number | null =>
  periods.length > 0 ? saleShareHintRub(g.saleRub, displayGroups, fund.fundRub) : null;
```

Pass `hintRub={hintFor(group)}` to each `OkleykaDealCostCell`.

Distribution (page level, because it patches deals and reuses optimistic overrides):

```tsx
const distribution = useMemo(
  () => distributeRemainder(displayGroups, fund.remainderRub),
  [displayGroups, fund.remainderRub],
);
const distributeDisabledReason =
  periods.length === 0
    ? 'Нужен месяц или полупериод'
    : fund.remainderRub <= 0
      ? 'Остаток фонда пуст'
      : distribution.length === 0
        ? 'Нет сделок без оклейки'
        : null;

const handleDistribute = async () => {
  const total = distribution.reduce((s, d) => s + d.okleykaRub, 0);
  const confirmed = window.confirm(
    `Распределить ${formatSalaryRub(total)} по ${distribution.length} сделкам без оклейки?`,
  );
  if (!confirmed) return;
  for (const d of distribution) {
    handleOptimistic(d.opportunityId, d.okleykaRub);
    try {
      await patchOkleykaDealCost(d.opportunityId, d.okleykaRub);
    } catch {
      handleRollback(d.opportunityId, null);
    }
  }
};
```

Render `<SalaryPanel …/>` in the Task 5 `<aside>` slot with all props.

- [ ] **Step 4: Checks**

Run: `yarn tsc --noEmit`, `yarn vitest run src/deals-board/salary` → PASS.

- [ ] **Step 5: Manual smoke (after apply)**

Add person → fund grows; enter okleyka on a deal → «Раскидано» grows, «Остаток» falls; hint appears while editing; copy from previous period (create entries in a past period first via panel by switching filter); distribute fills only empty deals and sums to remainder; month mode shows two period sections.

- [ ] **Step 6: Commit (only if user asked)**

```bash
git add src/deals-board/salary/SalaryPanel.tsx src/deals-board/salary/OkleykaSalaryPage.tsx
git commit -m "feat(okleyka): salary fund panel with copy, autofill and distribution"
```

---

### Task 7: Verification & acceptance

**Files:**
- Verify only (fix regressions where found)

- [ ] **Step 1: Full unit suite**

Run: `yarn vitest run` → all PASS (not just salary folder — compute/api are imported elsewhere).

- [ ] **Step 2: Typecheck + apply + hard refresh**

`yarn tsc --noEmit` → PASS. `yarn twenty apply` (expect the Windows blocker possibly; report as in Task 1). Hard refresh CRM (Ctrl+F5).

- [ ] **Step 3: Walk acceptance criteria 1–12** from `docs/superpowers/specs/2026-07-31-okleyka-deal-fund-design.md`, note each pass/fail.

- [ ] **Step 4: Non-goals check**

«Реализация»: margin, `rashodItogo`, `rashodVyezdnayaKomanda` untouched after setting `rashodOkleyka`. `okleykaSalaryEntry` has no navigation menu item.

- [ ] **Step 5: Migration note**

If any `dealLineItem.stoimostOkleyki` data exists in CRM (field may never have been applied — check), report the count; migration of old per-position values into `rashodOkleyka` is a separate follow-up decision, do not implement.

- [ ] **Step 6: Commit (only if user asked)**

```bash
git add -A
git commit -m "chore(okleyka): verify deal-level budget and salary fund acceptance"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Field `rashodOkleyka` on opportunity | 1 |
| Object `okleykaSalaryEntry` + index view | 1 |
| Sale = price × qty (qty≤0 → 1) | 3 |
| Deal-level margin with read-only print/freza | 3, 5 |
| null vs 0 okleyka semantics | 3, 5 |
| Half periods + splitDay + segment filter | 2, 5 |
| Salary entries CRUD by exact period | 4, 6 |
| Fund / Раскидано / Остаток | 3, 6 |
| Copy from previous period (hours 0) | 3 (pick), 6 (UI) |
| Rate autofill by name | 3 (lookup), 6 (UI) |
| Sale-share hint while editing | 3 (math), 6 (wiring) |
| Distribute remainder w/ confirm | 3 (math), 6 (UI) |
| Deal-row inline edit + Tab/Enter/Esc | 5 |
| Excel one row per deal, filtered | 3, 5 |
| LF okleyka-salary-export removed | 3 |
| No rashodItogo / Реализация coupling | 1, 4, 7 |

## Out of scope (do not implement)

- Migration of `dealLineItem.stoimostOkleyki` values (report only)
- Persisting splitDay / period choice in localStorage
- CRM workflows / automations
- Roles or permissions for `okleykaSalaryEntry`
- Navigation menu item for salary entries
- Mobile layout for the panel
