# Okleyka Budget + Salary Page UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On «Оклейщики», let users enter per-position wrapping cost (`stoimostOkleyki`), filter by event date, and use a grouped Apple Ops table with sorting, expense breakdown, and keyboard-friendly editing — without touching «Реализация» margin.

**Architecture:** New CURRENCY field on `dealLineItem`. Pure compute layer builds rows / deal groups / totals including okleyka. API loads opportunities in the active date range first, then salary line items for those IDs. Page UI: sticky filters + totals, collapsible deal groups, inline PATCH editor for «Оклейка». Excel uses the on-screen row set (local OOXML path remains source of truth).

**Tech Stack:** twenty-sdk fields, React + TanStack Query, RestApiClient / existing GraphQL opportunity fetch patterns, vitest, Apple Ops theme tokens.

**Spec:** `docs/superpowers/specs/2026-07-30-okleyka-budget-ux-design.md`

## Global Constraints

- Do **not** include `stoimostOkleyki` in `rashodItogo`, «Реализация» margin, or `rashodVyezdnayaKomanda`.
- Do **not** add the field to default «Реализация» columns.
- Position filter stays: `tip=PLENKA`, `tipDetail=NASHI`, `stage ∈ {OKLEYKA, GOTOVO}`.
- Event date = `loadDate` else `closeDate` (`getOpportunityEffectiveDate`).
- Default period = **current calendar month**.
- All new UUIDs must be UUID v4 — use the constant in Task 1 (do not regenerate).
- Visual system: existing deals-board Apple Ops tokens only.
- Commits only when the user explicitly asks (skip commit steps otherwise).
- After field / front-component changes: `yarn twenty apply` + hard refresh before claiming UI works.

## File map

| Path | Role |
|------|------|
| `src/constants/universal-identifiers.ts` | `DEAL_LINE_ITEM_STOIMOST_OKLEYKI_FIELD_UNIVERSAL_IDENTIFIER` |
| `src/fields/stoimost-okleyki.field.ts` | New CURRENCY field |
| `src/deals-board/types.ts` | Optional typed `stoimostOkleyki` on `LineItemRow` |
| `src/deals-board/salary/compute.ts` | Row math, totals, groups, sort, margin tint, xlsx/csv |
| `src/deals-board/salary/compute.test.ts` | Unit tests for compute |
| `src/deals-board/salary/date-range.ts` | Month / custom range helpers |
| `src/deals-board/salary/date-range.test.ts` | Date-range unit tests |
| `src/deals-board/salary/api.ts` | Date-scoped load + reuse `updateLineItem` for PATCH |
| `src/deals-board/salary/api.test.ts` | API filter / load tests (mock client where existing) |
| `src/deals-board/salary/OkleykaCostCell.tsx` | Inline editor + keyboard handoff |
| `src/deals-board/salary/OkleykaSalaryPage.tsx` | Filters, totals, grouped table, sort, export |
| `src/deals-board/salary/export-excel.ts` | Unchanged API; matrix gains column via compute |
| `src/logic-functions/okleyka-salary-export.ts` | Optional parity: if kept, accept date query later; v1 may stay unfiltered LF fallback (local export is SoT) |

---

### Task 1: Field `stoimostOkleyki`

**Files:**
- Modify: `src/constants/universal-identifiers.ts`
- Create: `src/fields/stoimost-okleyki.field.ts`
- Modify: `src/deals-board/types.ts` (optional explicit field)

**Interfaces:**
- Produces: field `stoimostOkleyki` (CURRENCY) on `dealLineItem`
- UUID (fixed): `e1bc970f-6891-49b7-a01b-b428210b5b7a`

- [ ] **Step 1: Add universal identifier**

In `src/constants/universal-identifiers.ts`, next to the other stoimost constants:

```ts
export const DEAL_LINE_ITEM_STOIMOST_OKLEYKI_FIELD_UNIVERSAL_IDENTIFIER =
  'e1bc970f-6891-49b7-a01b-b428210b5b7a';
```

- [ ] **Step 2: Create field file**

Create `src/fields/stoimost-okleyki.field.ts` mirroring `stoimost-pechati.field.ts`:

```ts
import { defineField, FieldType } from 'twenty-sdk/define';
import { DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import { DEAL_LINE_ITEM_STOIMOST_OKLEYKI_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

/** Wrapping labor cost per position; not yet part of rashodItogo. */
export default defineField({
  universalIdentifier: DEAL_LINE_ITEM_STOIMOST_OKLEYKI_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'stoimostOkleyki',
  type: FieldType.CURRENCY,
  label: 'Стоимость оклейки',
  icon: 'IconCurrencyRubel',
  description:
    'Расход на оклейку по позиции (зеркало «Расход: выездная команда»; пока не входит в rashodItogo)',
});
```

- [ ] **Step 3: Type hint on LineItemRow (optional but preferred)**

In `src/deals-board/types.ts` inside `LineItemRow`, add:

```ts
  stoimostPechati?: { amountMicros: number; currencyCode: string };
  stoimostFrezy?: { amountMicros: number; currencyCode: string };
  stoimostOkleyki?: { amountMicros: number; currencyCode: string } | null;
```

(Only add pechati/frezy if not already typed; index signature already allows them.)

- [ ] **Step 4: Apply field to CRM**

Run: `yarn twenty apply`  
Expected: field appears on `dealLineItem` without error.  
If apply fails on UUID conflict, stop and report — do not invent a new UUID without user approval.

- [ ] **Step 5: Commit (only if user asked)**

```bash
git add src/constants/universal-identifiers.ts src/fields/stoimost-okleyki.field.ts src/deals-board/types.ts
git commit -m "feat(okleyka): add stoimostOkleyki currency field"
```

---

### Task 2: Compute — okleyka cost, totals, groups, sort, margin tint, export matrix

**Files:**
- Modify: `src/deals-board/salary/compute.ts`
- Modify: `src/deals-board/salary/compute.test.ts`

**Interfaces:**
- Consumes: `LineItemRow.stoimostOkleyki`, existing `currencyToRub`
- Produces:
  - `OkleykaSalaryRow` with `okleykaCostRub: number` and `costRub: number`
  - `OkleykaSalaryTotals = { count, sale, print, freza, okleyka, cost, profit, marginPct }`
  - `sumOkleykaSalaryTotals(rows: OkleykaSalaryRow[]): OkleykaSalaryTotals`
  - `OkleykaSalaryGroup = { opportunityId, dealName, bitrixUrl, rows: OkleykaSalaryRow[], totals: OkleykaSalaryTotals }`
  - `buildOkleykaSalaryGroups(rows: OkleykaSalaryRow[]): OkleykaSalaryGroup[]`
  - `OkleykaSortKey = 'saleRub' | 'printCostRub' | 'frezaCostRub' | 'okleykaCostRub' | 'profitRub' | 'marginPct'`
  - `sortOkleykaSalaryGroups(groups, key, direction: 'asc' | 'desc'): OkleykaSalaryGroup[]`
  - `marginPctTone(marginPct: number | null): 'muted' | 'danger' | 'warning' | 'ok'`
  - Updated `salaryRowsToCsv` / `salaryRowsToXlsxMatrix` include «Расход оклейка» column after фреза

- [ ] **Step 1: Write failing tests**

Extend `compute.test.ts`:

```ts
it('subtracts okleyka cost from profit and margin', () => {
  const deals = new Map<string, OpportunityRow>([
    ['deal-1', { id: 'deal-1', name: 'Сделка', bitrixLink: { primaryLinkUrl: 'https://b' } }],
  ]);
  const rows = buildOkleykaSalaryRows(
    [
      item({
        id: 'a',
        amount: { amountMicros: 100_000_000, currencyCode: 'RUB' },
        stoimostPechati: { amountMicros: 10_000_000, currencyCode: 'RUB' },
        stoimostFrezy: { amountMicros: 5_000_000, currencyCode: 'RUB' },
        stoimostOkleyki: { amountMicros: 20_000_000, currencyCode: 'RUB' },
      }),
    ],
    deals,
  );
  expect(rows[0]?.okleykaCostRub).toBe(20);
  expect(rows[0]?.costRub).toBe(35);
  expect(rows[0]?.profitRub).toBe(65);
  expect(rows[0]?.marginPct).toBeCloseTo(65);
});

it('sums totals with separate expense articles', () => {
  const totals = sumOkleykaSalaryTotals([
    {
      lineItemId: 'a',
      opportunityId: 'd',
      bitrixUrl: '',
      dealName: 'A',
      positionName: 'P',
      qty: 1,
      saleRub: 100,
      printCostRub: 10,
      frezaCostRub: 5,
      okleykaCostRub: 20,
      costRub: 35,
      profitRub: 65,
      marginPct: 65,
    },
  ]);
  expect(totals).toMatchObject({
    count: 1,
    sale: 100,
    print: 10,
    freza: 5,
    okleyka: 20,
    cost: 35,
    profit: 65,
  });
  expect(totals.marginPct).toBeCloseTo(65);
});

it('groups by deal and sorts groups by margin desc', () => {
  const rows: OkleykaSalaryRow[] = [
    {
      lineItemId: '1',
      opportunityId: 'd1',
      bitrixUrl: 'https://1',
      dealName: 'Alpha',
      positionName: 'P1',
      qty: 1,
      saleRub: 100,
      printCostRub: 0,
      frezaCostRub: 0,
      okleykaCostRub: 90,
      costRub: 90,
      profitRub: 10,
      marginPct: 10,
    },
    {
      lineItemId: '2',
      opportunityId: 'd2',
      bitrixUrl: 'https://2',
      dealName: 'Beta',
      positionName: 'P2',
      qty: 1,
      saleRub: 100,
      printCostRub: 0,
      frezaCostRub: 0,
      okleykaCostRub: 10,
      costRub: 10,
      profitRub: 90,
      marginPct: 90,
    },
  ];
  const groups = sortOkleykaSalaryGroups(buildOkleykaSalaryGroups(rows), 'marginPct', 'desc');
  expect(groups.map((g) => g.dealName)).toEqual(['Beta', 'Alpha']);
});

it('marginPctTone thresholds', () => {
  expect(marginPctTone(null)).toBe('muted');
  expect(marginPctTone(-1)).toBe('danger');
  expect(marginPctTone(10)).toBe('warning');
  expect(marginPctTone(20)).toBe('ok');
});

it('xlsx matrix includes okleyka column', () => {
  const matrix = salaryRowsToXlsxMatrix([
    {
      lineItemId: 'a',
      opportunityId: 'd',
      bitrixUrl: 'https://x',
      dealName: 'Сделка',
      positionName: 'Поз',
      qty: 1,
      saleRub: 100,
      printCostRub: 10,
      frezaCostRub: 5,
      okleykaCostRub: 20,
      costRub: 35,
      profitRub: 65,
      marginPct: 65,
    },
  ]);
  expect(matrix[0]).toContain('Расход оклейка');
  const header = matrix[0] as Array<string | number>;
  const okleykaIdx = header.indexOf('Расход оклейка');
  expect(matrix[1]?.[okleykaIdx]).toBe(20);
});
```

Also update existing fixture rows in older tests to include `okleykaCostRub: 0` and `costRub: print+freza` so TypeScript compiles.

- [ ] **Step 2: Run tests — expect FAIL**

Run: `yarn vitest run src/deals-board/salary/compute.test.ts`  
Expected: FAIL (missing exports / fields).

- [ ] **Step 3: Implement compute**

Update `OkleykaSalaryRow`:

```ts
export type OkleykaSalaryRow = {
  lineItemId: string;
  opportunityId: string;
  bitrixUrl: string;
  dealName: string;
  positionName: string;
  qty: number;
  saleRub: number;
  printCostRub: number;
  frezaCostRub: number;
  okleykaCostRub: number;
  costRub: number;
  profitRub: number;
  marginPct: number | null;
};
```

In `buildOkleykaSalaryRows`:

```ts
const okleykaCostRub = currencyToRub(item.stoimostOkleyki as CurrencyAmount | undefined);
const costRub = printCostRub + frezaCostRub + okleykaCostRub;
const profitRub = saleRub - costRub;
const marginPct = saleRub > 0 ? (profitRub / saleRub) * 100 : null;
```

Add:

```ts
export type OkleykaSalaryTotals = {
  count: number;
  sale: number;
  print: number;
  freza: number;
  okleyka: number;
  cost: number;
  profit: number;
  marginPct: number | null;
};

export const sumOkleykaSalaryTotals = (rows: OkleykaSalaryRow[]): OkleykaSalaryTotals => {
  const sale = rows.reduce((s, r) => s + r.saleRub, 0);
  const print = rows.reduce((s, r) => s + r.printCostRub, 0);
  const freza = rows.reduce((s, r) => s + r.frezaCostRub, 0);
  const okleyka = rows.reduce((s, r) => s + r.okleykaCostRub, 0);
  const cost = print + freza + okleyka;
  const profit = sale - cost;
  return {
    count: rows.length,
    sale,
    print,
    freza,
    okleyka,
    cost,
    profit,
    marginPct: sale > 0 ? (profit / sale) * 100 : null,
  };
};

export type OkleykaSalaryGroup = {
  opportunityId: string;
  dealName: string;
  bitrixUrl: string;
  rows: OkleykaSalaryRow[];
  totals: OkleykaSalaryTotals;
};

export const buildOkleykaSalaryGroups = (rows: OkleykaSalaryRow[]): OkleykaSalaryGroup[] => {
  const byDeal = new Map<string, OkleykaSalaryRow[]>();
  for (const row of rows) {
    const list = byDeal.get(row.opportunityId) ?? [];
    list.push(row);
    byDeal.set(row.opportunityId, list);
  }
  const groups: OkleykaSalaryGroup[] = [];
  for (const [opportunityId, groupRows] of byDeal) {
    const first = groupRows[0]!;
    groups.push({
      opportunityId,
      dealName: first.dealName,
      bitrixUrl: first.bitrixUrl,
      rows: [...groupRows].sort((a, b) => a.positionName.localeCompare(b.positionName, 'ru')),
      totals: sumOkleykaSalaryTotals(groupRows),
    });
  }
  return groups.sort((a, b) => a.dealName.localeCompare(b.dealName, 'ru'));
};

export type OkleykaSortKey =
  | 'saleRub'
  | 'printCostRub'
  | 'frezaCostRub'
  | 'okleykaCostRub'
  | 'profitRub'
  | 'marginPct';

const metricValue = (row: OkleykaSalaryRow, key: OkleykaSortKey): number => {
  const value = row[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
};

const groupMetricValue = (group: OkleykaSalaryGroup, key: OkleykaSortKey): number => {
  if (key === 'saleRub') return group.totals.sale;
  if (key === 'printCostRub') return group.totals.print;
  if (key === 'frezaCostRub') return group.totals.freza;
  if (key === 'okleykaCostRub') return group.totals.okleyka;
  if (key === 'profitRub') return group.totals.profit;
  return group.totals.marginPct ?? Number.NEGATIVE_INFINITY;
};

export const sortOkleykaSalaryGroups = (
  groups: OkleykaSalaryGroup[],
  key: OkleykaSortKey,
  direction: 'asc' | 'desc',
): OkleykaSalaryGroup[] => {
  const sign = direction === 'asc' ? 1 : -1;
  return [...groups]
    .map((group) => ({
      ...group,
      rows: [...group.rows].sort(
        (a, b) => sign * (metricValue(a, key) - metricValue(b, key)),
      ),
    }))
    .sort((a, b) => sign * (groupMetricValue(a, key) - groupMetricValue(b, key)));
};

export const marginPctTone = (
  marginPct: number | null,
): 'muted' | 'danger' | 'warning' | 'ok' => {
  if (marginPct === null || !Number.isFinite(marginPct)) return 'muted';
  if (marginPct < 0) return 'danger';
  if (marginPct < 20) return 'warning';
  return 'ok';
};
```

Update CSV/XLSX headers to insert `'Расход оклейка'` after `'Расход фреза'`, and include `Math.round(row.okleykaCostRub)` in each data row. Keep Bitrix + Сделка columns (flat export).

- [ ] **Step 4: Run tests — expect PASS**

Run: `yarn vitest run src/deals-board/salary/compute.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit (only if user asked)**

```bash
git add src/deals-board/salary/compute.ts src/deals-board/salary/compute.test.ts
git commit -m "feat(okleyka): include wrapping cost in salary compute and groups"
```

---

### Task 3: Date range helpers

**Files:**
- Create: `src/deals-board/salary/date-range.ts`
- Create: `src/deals-board/salary/date-range.test.ts`

**Interfaces:**
- Produces:
  - `OkleykaDateMode = { kind: 'month'; year: number; monthIndex: number } | { kind: 'range'; dateFrom: string; dateTo: string }`
  - `getCurrentMonthMode(now?: Date): OkleykaDateMode` — `{ kind:'month', year, monthIndex:0-11 }`
  - `resolveOkleykaDateRange(mode: OkleykaDateMode): { dateFrom: string; dateTo: string } | { error: string }`
  - Month → first/last calendar day via existing `toInputDate` from `../utils/date-filters`
  - Range mode: if either bound missing or `dateFrom > dateTo` → `{ error: 'Укажите корректный диапазон дат' }`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { getCurrentMonthMode, resolveOkleykaDateRange } from './date-range';

describe('okleyka date-range', () => {
  it('defaults to calendar month of now', () => {
    const mode = getCurrentMonthMode(new Date(2026, 6, 30));
    expect(mode).toEqual({ kind: 'month', year: 2026, monthIndex: 6 });
    expect(resolveOkleykaDateRange(mode)).toEqual({
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
    });
  });

  it('accepts custom range', () => {
    expect(
      resolveOkleykaDateRange({ kind: 'range', dateFrom: '2026-07-01', dateTo: '2026-07-15' }),
    ).toEqual({ dateFrom: '2026-07-01', dateTo: '2026-07-15' });
  });

  it('rejects inverted range', () => {
    expect(
      resolveOkleykaDateRange({ kind: 'range', dateFrom: '2026-07-20', dateTo: '2026-07-01' }),
    ).toEqual({ error: 'Укажите корректный диапазон дат' });
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `yarn vitest run src/deals-board/salary/date-range.test.ts`

- [ ] **Step 3: Implement**

```ts
import { toInputDate } from '../utils/date-filters';

export type OkleykaDateMode =
  | { kind: 'month'; year: number; monthIndex: number }
  | { kind: 'range'; dateFrom: string; dateTo: string };

export const getCurrentMonthMode = (now = new Date()): OkleykaDateMode => ({
  kind: 'month',
  year: now.getFullYear(),
  monthIndex: now.getMonth(),
});

export const resolveOkleykaDateRange = (
  mode: OkleykaDateMode,
): { dateFrom: string; dateTo: string } | { error: string } => {
  if (mode.kind === 'month') {
    const start = new Date(mode.year, mode.monthIndex, 1);
    const end = new Date(mode.year, mode.monthIndex + 1, 0);
    return { dateFrom: toInputDate(start), dateTo: toInputDate(end) };
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
```

- [ ] **Step 4: Run — expect PASS**

Run: `yarn vitest run src/deals-board/salary/date-range.test.ts`

- [ ] **Step 5: Commit (only if user asked)**

```bash
git add src/deals-board/salary/date-range.ts src/deals-board/salary/date-range.test.ts
git commit -m "feat(okleyka): month and range helpers for salary page"
```

---

### Task 4: Date-scoped API load + PATCH helper

**Files:**
- Modify: `src/deals-board/salary/api.ts`
- Modify: `src/deals-board/salary/api.test.ts` (extend if patterns exist; otherwise add focused unit tests for filter string builders)

**Interfaces:**
- Consumes: `resolveOkleykaDateRange` result `{ dateFrom, dateTo }`, `buildDealLineItemsFilter`, `opportunityMatchesDateFilter`, `enrichOpportunityRowsWithRestFields`, `updateLineItem`
- Produces:
  - `fetchOkleykaSalaryPageData(dateFrom: string, dateTo: string): Promise<OkleykaSalaryRow[]>`  
    Flow:
    1. `fetchOpportunities({ filters: { datePreset: 'custom', dateFrom, dateTo }, sort: [], visibleCrmFieldNames: ['loadDate'], restFieldNames: ['name','bitrixLink','loadDate','closeDate'], ...minimal })` **or** dedicated REST/GraphQL helper that returns id+dates+name+bitrix for deals in range.
    2. If zero opportunities → `[]`.
    3. Chunk opportunity IDs (50) and GET `/rest/dealLineItems` with  
       `and(opportunityId[in]:[...],tip[eq]:"PLENKA",tipDetail[eq]:"NASHI",stage[in]:["OKLEYKA","GOTOVO"])`.
    4. Build `dealsById` map; drop deals that fail `opportunityMatchesDateFilter` safety net.
    5. `return buildOkleykaSalaryRows(lineItems, dealsById)`.
  - Keep `fetchOkleykaSalaryLineItems` for LF export fallback if needed, but page must use date-scoped loader.
  - `patchOkleykaCost(lineItemId: string, rubles: number | null): Promise<void>`  
    - `null` → `updateLineItem(id, { stoimostOkleyki: null })`  
    - number → `updateLineItem(id, { stoimostOkleyki: { amountMicros: Math.round(rubles * 1_000_000), currencyCode: 'RUB' } })`

**Implementation note:** Prefer reusing `fetchOpportunities` from `../api/opportunities` with `datePreset: 'custom'` to inherit loadDate/closeDate OR filter + client refine. Pass empty search. Ensure `loadDate`/`closeDate` are present for the safety net. Enrich `bitrixLink` via REST fields as today.

- [ ] **Step 1: Write / extend tests for filter composition**

If `api.test.ts` already mocks RestApiClient, assert the line-item filter includes tip/stage and opportunityId chunk. Example assertion target:

```ts
expect(filter).toContain('tip[eq]:"PLENKA"');
expect(filter).toContain('tipDetail[eq]:"NASHI"');
expect(filter).toContain('OKLEYKA');
```

For `patchOkleykaCost`, unit-test a thin wrapper by mocking `updateLineItem` if easy; otherwise smoke-test in Task 6 manually.

- [ ] **Step 2: Implement `fetchOkleykaSalaryPageData` and `patchOkleykaCost`**

Import `updateLineItem` from `../api/line-items`.  
Import `fetchOpportunities` from `../api/opportunities`.  
Import `opportunityMatchesDateFilter` from `../utils/resolve-opportunity-date`.  
Import `buildOkleykaSalaryRows` from `./compute`.

Chunk helper (same as board):

```ts
const ID_CHUNK = 50;
const chunkIds = (ids: string[]): string[][] => {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += ID_CHUNK) out.push(ids.slice(i, i + ID_CHUNK));
  return out;
};
```

Line-item fetch per chunk:

```ts
const filter = `and(opportunityId[in]:${JSON.stringify(chunk)},tip[eq]:"PLENKA",tipDetail[eq]:"NASHI",stage[in]:["OKLEYKA","GOTOVO"])`;
```

- [ ] **Step 3: Run API / related unit tests**

Run: `yarn vitest run src/deals-board/salary/api.test.ts src/deals-board/salary/compute.test.ts`  
Expected: PASS.

- [ ] **Step 4: Commit (only if user asked)**

```bash
git add src/deals-board/salary/api.ts src/deals-board/salary/api.test.ts
git commit -m "feat(okleyka): date-scoped salary load and cost patch"
```

---

### Task 5: Page shell — filters + totals strip

**Files:**
- Modify: `src/deals-board/salary/OkleykaSalaryPage.tsx`

**Interfaces:**
- Consumes: `getCurrentMonthMode`, `resolveOkleykaDateRange`, `fetchOkleykaSalaryPageData`, `sumOkleykaSalaryTotals`, formatters
- Produces: working filtered page (still flat table OK until Task 6)

- [ ] **Step 1: Wire date mode state**

```tsx
const [dateMode, setDateMode] = useState<OkleykaDateMode>(() => getCurrentMonthMode());
const resolved = resolveOkleykaDateRange(dateMode);
const dateFrom = 'dateFrom' in resolved ? resolved.dateFrom : null;
const dateTo = 'dateTo' in resolved ? resolved.dateTo : null;
const dateError = 'error' in resolved ? resolved.error : null;
```

- [ ] **Step 2: Query with date key**

```tsx
const query = useQuery({
  queryKey: ['okleyka-salary', refreshKey, dateFrom, dateTo],
  enabled: Boolean(dateFrom && dateTo),
  queryFn: () => fetchOkleykaSalaryPageData(dateFrom!, dateTo!),
});
```

- [ ] **Step 3: Filter controls UI**

In sticky header under title:
- `<input type="month">` bound to `YYYY-MM` derived from month mode; on change → `setDateMode({ kind:'month', year, monthIndex })`.
- Two `<input type="date">` for from/to; on change → `setDateMode({ kind:'range', dateFrom, dateTo })` (leaves month mode).
- Show `dateError` in danger text when present.
- Keep Обновить / Excel.

- [ ] **Step 4: Totals strip articles**

Use `sumOkleykaSalaryTotals(rows)` and render:

Позиций · Продажа · Печать · Фреза · Оклейка · Итого расход · Прибыль · Маржа

- [ ] **Step 5: Manual smoke (after apply)**

Open «Оклейщики»: default = current month; change month; set custom range; totals update; empty month shows «Нет подходящих позиций».

- [ ] **Step 6: Commit (only if user asked)**

```bash
git add src/deals-board/salary/OkleykaSalaryPage.tsx
git commit -m "feat(okleyka): date filters and expense breakdown totals"
```

---

### Task 6: Grouped table, sort, Bitrix, copy name, margin tint

**Files:**
- Modify: `src/deals-board/salary/OkleykaSalaryPage.tsx`

**Interfaces:**
- Consumes: `buildOkleykaSalaryGroups`, `sortOkleykaSalaryGroups`, `marginPctTone`, theme colors
- Produces: grouped collapsible table matching spec columns

- [ ] **Step 1: State for expand + sort**

```tsx
const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set()); // empty = all expanded
const [sort, setSort] = useState<{ key: OkleykaSortKey; direction: 'asc' | 'desc' } | null>(null);

const groups = useMemo(() => {
  const base = buildOkleykaSalaryGroups(rows);
  return sort ? sortOkleykaSalaryGroups(base, sort.key, sort.direction) : base;
}, [rows, sort]);
```

Toggle header click cycles: null → desc → asc → null for that key.

- [ ] **Step 2: Render group header + children**

Group row columns (use `colSpan` thoughtfully or a dedicated layout):
- Chevron button toggles `opportunityId` in `collapsed`
- Deal name
- Bitrix link (`target="_blank" rel="noreferrer"`) when URL present
- Copy button: `navigator.clipboard.writeText(dealName)` then brief local toast state «Скопировано» (2s)
- Group totals: sale / print / freza / okleyka / cost / profit / margin (tinted)

Child rows (when not collapsed):
Позиция · Кол-во · Продажа · Печать · Фреза · Оклейка (placeholder read-only until Task 7) · Прибыль · Маржа

Map `marginPctTone` → `colors.textMuted` / `colors.danger` / `colors.warning` (or `textSecondary`) / `colors.text`.

- [ ] **Step 3: Sticky thead + Apple Ops chrome**

Reuse existing tokens: `bgSecondary`, `borderSubtle`, `radius.lg`, row padding ~10–12px, `fontVariantNumeric: 'tabular-nums'` on money cells. No full-row washes.

- [ ] **Step 4: Excel still exports flat `rows` (current filtered set)** — already includes okleyka via Task 2 matrix.

- [ ] **Step 5: Manual smoke**

Groups expand/collapse; copy name; Bitrix opens; sort by Маржа / Продажа; margin colors for negative / low / ok.

- [ ] **Step 6: Commit (only if user asked)**

```bash
git add src/deals-board/salary/OkleykaSalaryPage.tsx
git commit -m "feat(okleyka): grouped salary table with sort and deal actions"
```

---

### Task 7: Inline «Оклейка» editor + keyboard navigation

**Files:**
- Create: `src/deals-board/salary/OkleykaCostCell.tsx`
- Modify: `src/deals-board/salary/OkleykaSalaryPage.tsx`

**Interfaces:**
- Consumes: `patchOkleykaCost`, parent callbacks for optimistic row patch
- Produces: editable cell with Tab/Shift+Tab/Enter/Esc

- [ ] **Step 1: Implement `OkleykaCostCell`**

Props:

```ts
type Props = {
  lineItemId: string;
  valueRub: number;
  autoFocus?: boolean;
  onOptimistic: (lineItemId: string, nextRub: number) => void;
  onRollback: (lineItemId: string, prevRub: number) => void;
  onMove: (lineItemId: string, direction: 1 | -1) => void;
  onSavedMoveNext?: boolean;
};
```

Behavior:
- Display `formatSalaryRub(valueRub)` when idle; click → input.
- Parse draft like `CurrencyAmountCell` (trim, comma→dot); empty on save → `patchOkleykaCost(id, null)` and optimistic `0`.
- Invalid non-empty → keep editing, show small error text under cell (no `alert` required).
- On save success: clear saving state; if Enter → `onMove(id, 1)`.
- Tab → preventDefault, save, `onMove(id, 1)`; Shift+Tab → save, `onMove(id, -1)`.
- Esc → restore draft from `valueRub`, exit edit.
- Show «…» or muted «сохранение» while pending; danger text on error.

- [ ] **Step 2: Wire optimistic rows in page**

Keep `rows` in React Query cache **or** local overlay map `Record<lineItemId, okleykaCostRub>` merged when building display rows. Simplest robust approach:

```tsx
const [overrides, setOverrides] = useState<Record<string, number>>({});
const displayRows = useMemo(
  () =>
    rows.map((row) => {
      if (overrides[row.lineItemId] === undefined) return row;
      const okleykaCostRub = overrides[row.lineItemId]!;
      const costRub = row.printCostRub + row.frezaCostRub + okleykaCostRub;
      const profitRub = row.saleRub - costRub;
      return {
        ...row,
        okleykaCostRub,
        costRub,
        profitRub,
        marginPct: row.saleRub > 0 ? (profitRub / row.saleRub) * 100 : null,
      };
    }),
  [rows, overrides],
);
```

On successful PATCH, either leave override or `queryClient.invalidateQueries`. Prefer invalidate after success + clear override for that id.

- [ ] **Step 3: Focus order across groups**

```tsx
const flatIds = useMemo(
  () => groups.flatMap((g) => (collapsed.has(g.opportunityId) ? [] : g.rows.map((r) => r.lineItemId))),
  [groups, collapsed],
);
const [focusId, setFocusId] = useState<string | null>(null);

const onMove = (id: string, direction: 1 | -1) => {
  const idx = flatIds.indexOf(id);
  if (idx < 0) return;
  const next = flatIds[idx + direction];
  if (next) setFocusId(next);
};
```

Pass `autoFocus={focusId === row.lineItemId}` into cell; cell `useEffect` focuses input when `autoFocus` becomes true.

- [ ] **Step 4: Manual keyboard smoke**

Edit one cell → Tab moves to next position (including next deal) → Enter saves and advances → Esc cancels → refresh page and value persists from CRM.

- [ ] **Step 5: Commit (only if user asked)**

```bash
git add src/deals-board/salary/OkleykaCostCell.tsx src/deals-board/salary/OkleykaSalaryPage.tsx
git commit -m "feat(okleyka): inline wrapping cost editor with keyboard nav"
```

---

### Task 8: Export parity + verification

**Files:**
- Modify if needed: `src/logic-functions/okleyka-salary-export.ts` (optional — local client export is SoT; LF may remain unfiltered; do **not** block on LF date params in v1)
- Verify: `src/deals-board/salary/export-excel.ts` uses updated matrix automatically

- [ ] **Step 1: Confirm Excel column**

Export filtered month → open xlsx → column «Расход оклейка» present; values match UI; only current filter rows included (client path).

- [ ] **Step 2: Confirm non-goals**

On «Реализация»: margin / `rashodItogo` unchanged after setting `stoimostOkleyki`. Field not in default child columns.

- [ ] **Step 3: Unit suite regression**

Run: `yarn vitest run src/deals-board/salary`  
Expected: all PASS.

- [ ] **Step 4: Apply + hard refresh**

Run: `yarn twenty apply`  
Hard refresh CRM UI (`Ctrl+F5`). Walk acceptance criteria from the spec (1–11).

- [ ] **Step 5: Commit (only if user asked)**

```bash
git add src/deals-board/salary src/logic-functions/okleyka-salary-export.ts
git commit -m "chore(okleyka): verify export and salary page acceptance"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Field `stoimostOkleyki` | 1 |
| Formula with okleyka | 2 |
| Totals articles Печать/Фреза/Оклейка/Итого | 2, 5 |
| Month + range filters on event date | 3, 4, 5 |
| Default current month | 3, 5 |
| Date-scoped loading | 4 |
| Grouped collapsible table | 6 |
| Bitrix + copy name | 6 |
| Numeric sort | 2, 6 |
| Margin tint thresholds | 2, 6 |
| Inline edit + Tab/Enter/Esc | 7 |
| Excel column + filtered set | 2, 8 |
| No Реализация / rashodItogo coupling | 1, 7, 8 |
| Apple Ops tokens only | 5, 6 |

## Out of scope (do not implement)

- Highlight empty okleyka budgets
- Stage-only filter toggle
- Persist month in localStorage
- field_staffs assignment
- Migration into `rashodVyezdnayaKomanda` / `rashodItogo`
