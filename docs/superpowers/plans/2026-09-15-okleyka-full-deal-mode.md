# Okleyka Full-Deal Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an **Оклейка / Вся сделка** toggle on the salary page so allocators see every line item and full expenses of wrapping-qualified deals without changing compact economics or share math.

**Architecture:** Compact fetch and `isOkleykaSalaryLineItem` still define the deal set. `buildOkleykaDealGroups(..., mode)` switches sale/cost formulas and which positions appear. First switch to full mode lazy-fetches all line items plus `rashodLogistika`/`rashodBeznal`; React Query caches that payload. Person shares stay on the same table.

**Tech Stack:** TypeScript, React Query, Twenty REST (`RestApiClient`), vitest (`npx vitest run --config vitest.unit.config.ts`).

**Spec:** `docs/superpowers/specs/2026-09-15-okleyka-full-deal-mode-design.md`

## Global Constraints

- Qualifying filter unchanged: `tip === 'PLENKA' && tipDetail === 'NASHI' && stage ∈ {OKLEYKA, GOTOVO}`.
- Deal set identical in both modes (deal in view iff ≥1 qualifying position in the date range).
- Compact economics unchanged: sale = qualifying only; cost = print + freza + okleyka.
- Full economics: sale = all positions with `stage !== 'OTMENA'`; cost = print + freza + logistics + beznal + okleyka.
- Never display or add `rashodVyezdnayaKomanda` or `rashodItogo`.
- Shares / distribute / `rashodOkleyka` / fund panel unchanged and editable in both modes.
- Mode is React state only (default `'okleyka'`); no localStorage.
- Failed full fetch must not switch mode; error copy: `Не удалось загрузить все позиции`.
- Apple Ops tokens / existing `Chip` only; no row wash for qualifying highlight.
- Do not change Реализация, crmparserv2, or BrandingTeamApp.
- Tests: unit only, no live CRM, no `yarn twenty apply`.
- Test command: `npx vitest run --config vitest.unit.config.ts <files>`

## File structure

- Modify: `src/deals-board/salary/compute.ts` — `OkleykaViewMode`, extra group/position fields, mode-aware build/totals/xlsx, caption helper
- Modify: `src/deals-board/salary/compute.test.ts`
- Modify: `src/deals-board/salary/api.ts` — unfiltered line-item fetch + full page data
- Modify: `src/deals-board/salary/api.test.ts`
- Modify: `src/deals-board/types.ts` — optional `rashodLogistika` / `rashodBeznal` on `OpportunityRow`
- Modify: `src/deals-board/salary/OkleykaSalaryPage.tsx` — segment, columns, styles, lazy switch
- Modify: `src/deals-board/salary/export-excel.ts` — only if it needs a mode argument; prefer passing already-built groups / matrix from the page

Do not split `OkleykaSalaryPage.tsx` in this plan. Do not add CRM fields/objects.

---

### Task 1: Mode-aware deal groups and Excel matrix

**Files:**
- Modify: `src/deals-board/types.ts`
- Modify: `src/deals-board/salary/compute.ts`
- Modify: `src/deals-board/salary/compute.test.ts`

**Interfaces:**

```ts
export type OkleykaViewMode = 'okleyka' | 'full';

export type OkleykaPositionRow = {
  lineItemId: string;
  opportunityId: string;
  positionName: string;
  qty: number;
  unitPriceRub: number;
  saleRub: number;
  tip: string | null;
  stage: string | null;
  tipDetail: string | null;
  isQualifying: boolean;
  isCancelled: boolean;
};

export type OkleykaDealGroup = {
  opportunityId: string;
  dealName: string;
  bitrixUrl: string;
  positions: OkleykaPositionRow[];
  saleRub: number;
  qualifyingSaleRub: number;
  printCostRub: number;
  frezaCostRub: number;
  logisticsCostRub: number;
  beznalCostRub: number;
  okleykaCostRub: number | null;
  costRub: number;
  profitRub: number;
  marginPct: number | null;
  okleykaSharePct: number | null;
  eventDate: string;
};

export type OkleykaDealTotals = {
  deals: number;
  positions: number;
  sale: number;
  print: number;
  freza: number;
  logistics: number;
  beznal: number;
  okleyka: number;
  cost: number;
  profit: number;
  marginPct: number | null;
};

export const buildOkleykaDealGroups = (
  lineItems: LineItemRow[],
  dealsById: Map<string, OpportunityRow>,
  mode?: OkleykaViewMode, // default 'okleyka'
): OkleykaDealGroup[] => { /* ... */ };

export const applyDealOkleykaOverride = (
  group: OkleykaDealGroup,
  okleykaCostRub: number | null,
): OkleykaDealGroup => { /* ... */ };

export const sumOkleykaDealTotals = (groups: OkleykaDealGroup[]): OkleykaDealTotals => { /* ... */ };

export const dealGroupsToXlsxMatrix = (
  groups: OkleykaDealGroup[],
  mode?: OkleykaViewMode, // default 'okleyka'
): Array<Array<string | number>> => { /* ... */ };

export const formatOkleykaShareCaption = (pct: number | null): string | null => { /* ... */ };
```

- Consumes: existing `isOkleykaSalaryLineItem`, `currencyToRub`, `LineItemRow`, `OpportunityRow`
- Produces: the signatures above. Compact callers omit `mode` and keep current numbers (logistics/beznal = 0, `okleykaSharePct` = 100 or null only if sale is 0).

- [ ] **Step 1: Write the failing tests**

In `compute.test.ts`:

1. Extend the `group()` helper with the new required fields so existing tests still typecheck:

```ts
const group = (over: Partial<OkleykaDealGroup>): OkleykaDealGroup => ({
  opportunityId: 'd1',
  dealName: 'Сделка',
  bitrixUrl: '',
  positions: [],
  saleRub: 100,
  qualifyingSaleRub: 100,
  printCostRub: 0,
  frezaCostRub: 0,
  logisticsCostRub: 0,
  beznalCostRub: 0,
  okleykaCostRub: null,
  costRub: 0,
  profitRub: 100,
  marginPct: 100,
  okleykaSharePct: 100,
  eventDate: '2026-07-01',
  ...over,
});
```

2. Add these cases (keep every existing test; they must still pass with `mode` default `'okleyka'`):

```ts
it('full mode keeps only deals that have a qualifying position', () => {
  const groups = buildOkleykaDealGroups(
    [
      item({ id: 'banner', opportunityId: 'd2', tip: 'BANNERA', tipDetail: 'YURA', stage: 'GOTOVO' }),
      item({ id: 'wrap', opportunityId: 'd1' }),
    ],
    new Map([
      ['d1', deal('d1')],
      ['d2', deal('d2')],
    ]),
    'full',
  );
  expect(groups.map((g) => g.opportunityId)).toEqual(['d1']);
});

it('full mode lists sibling positions and excludes OTMENA from sale', () => {
  const groups = buildOkleykaDealGroups(
    [
      item({ id: 'wrap', name: 'Оклейка наши' }),
      item({
        id: 'banner',
        name: 'Баннер',
        tip: 'BANNERA',
        tipDetail: 'YURA',
        stage: 'GOTOVO',
        kolichestvo: 1,
        amount: { amountMicros: 40_000_000, currencyCode: 'RUB' },
      }),
      item({
        id: 'cancel',
        name: 'Отмена',
        tip: 'PODRYAD',
        tipDetail: 'SVOE',
        stage: 'OTMENA',
        kolichestvo: 1,
        amount: { amountMicros: 999_000_000, currencyCode: 'RUB' },
      }),
      item({
        id: 'draft',
        name: 'Новая позиция',
        tip: 'PROIZVODSTVO',
        tipDetail: null,
        stage: 'NOVYY',
        kolichestvo: 1,
        amount: { amountMicros: 10_000_000, currencyCode: 'RUB' },
      }),
    ],
    new Map([
      [
        'd1',
        deal('d1', {
          rashodLogistika: { amountMicros: 8_000_000, currencyCode: 'RUB' },
          rashodBeznal: { amountMicros: 2_000_000, currencyCode: 'RUB' },
          rashodVyezdnayaKomanda: { amountMicros: 50_000_000, currencyCode: 'RUB' },
          rashodItogo: { amountMicros: 99_000_000, currencyCode: 'RUB' },
        }),
      ],
    ]),
    'full',
  );
  const g = groups[0]!;
  expect(g.positions).toHaveLength(4);
  expect(g.positions.find((p) => p.lineItemId === 'wrap')?.isQualifying).toBe(true);
  expect(g.positions.find((p) => p.lineItemId === 'cancel')?.isCancelled).toBe(true);
  expect(g.positions.find((p) => p.lineItemId === 'cancel')?.isQualifying).toBe(false);
  expect(g.saleRub).toBe(100 + 40 + 10);
  expect(g.qualifyingSaleRub).toBe(100);
  expect(g.printCostRub).toBe(10);
  expect(g.frezaCostRub).toBe(5);
  expect(g.logisticsCostRub).toBe(8);
  expect(g.beznalCostRub).toBe(2);
  expect(g.costRub).toBe(10 + 5 + 8 + 2);
  expect(g.okleykaSharePct).toBeCloseTo((100 / 150) * 100);
});

it('compact mode ignores logistics/beznal even when present on the deal', () => {
  const groups = buildOkleykaDealGroups(
    [item({})],
    new Map([
      [
        'd1',
        deal('d1', {
          rashodLogistika: { amountMicros: 8_000_000, currencyCode: 'RUB' },
          rashodBeznal: { amountMicros: 2_000_000, currencyCode: 'RUB' },
        }),
      ],
    ]),
  );
  expect(groups[0]?.logisticsCostRub).toBe(0);
  expect(groups[0]?.beznalCostRub).toBe(0);
  expect(groups[0]?.costRub).toBe(15);
  expect(groups[0]?.positions).toHaveLength(1);
});

it('applyDealOkleykaOverride keeps logistics/beznal in cost', () => {
  const g = buildOkleykaDealGroups(
    [item({})],
    new Map([
      [
        'd1',
        deal('d1', {
          rashodLogistika: { amountMicros: 8_000_000, currencyCode: 'RUB' },
          rashodBeznal: { amountMicros: 2_000_000, currencyCode: 'RUB' },
        }),
      ],
    ]),
    'full',
  )[0]!;
  const next = applyDealOkleykaOverride(g, 30);
  expect(next.costRub).toBe(10 + 5 + 8 + 2 + 30);
});

it('formatOkleykaShareCaption rounds and hides empty', () => {
  expect(formatOkleykaShareCaption(null)).toBeNull();
  expect(formatOkleykaShareCaption((100 / 150) * 100)).toBe('оклейка 67%');
});

it('full xlsx inserts logistics, beznal, and оклейка %', () => {
  const groups = buildOkleykaDealGroups(
    [item({})],
    new Map([
      [
        'd1',
        deal('d1', {
          rashodLogistika: { amountMicros: 8_000_000, currencyCode: 'RUB' },
          rashodBeznal: { amountMicros: 2_000_000, currencyCode: 'RUB' },
        }),
      ],
    ]),
    'full',
  );
  const matrix = dealGroupsToXlsxMatrix(groups, 'full');
  expect(matrix[0]).toEqual([
    'Bitrix',
    'Сделка',
    'Дата',
    'Позиций',
    'Продажа',
    'Оклейка %',
    'Расход печать',
    'Расход фреза',
    'Расход логистика',
    'Расход безнал',
    'Расход оклейка',
    'Расход итого',
    'Прибыль',
    'Маржа %',
  ]);
  expect(matrix[1]![5]).toBe(100);
});
```

Import `formatOkleykaShareCaption`. Existing compact xlsx assertion must stay the 11-column header.

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx vitest run --config vitest.unit.config.ts src/deals-board/salary/compute.test.ts
```

Expected: FAIL — `buildOkleykaDealGroups` has no third argument / missing fields / `formatOkleykaShareCaption` is not exported.

- [ ] **Step 3: Minimal implementation**

In `src/deals-board/types.ts` add on `OpportunityRow`:

```ts
rashodLogistika?: { amountMicros: number; currencyCode: string } | null;
rashodBeznal?: { amountMicros: number; currencyCode: string } | null;
```

In `compute.ts`:

```ts
export type OkleykaViewMode = 'okleyka' | 'full';

export type OkleykaPositionRow = {
  lineItemId: string;
  opportunityId: string;
  positionName: string;
  qty: number;
  unitPriceRub: number;
  saleRub: number;
  tip: string | null;
  stage: string | null;
  tipDetail: string | null;
  isQualifying: boolean;
  isCancelled: boolean;
};

export type OkleykaDealGroup = {
  opportunityId: string;
  dealName: string;
  bitrixUrl: string;
  positions: OkleykaPositionRow[];
  saleRub: number;
  qualifyingSaleRub: number;
  printCostRub: number;
  frezaCostRub: number;
  logisticsCostRub: number;
  beznalCostRub: number;
  okleykaCostRub: number | null;
  costRub: number;
  profitRub: number;
  marginPct: number | null;
  okleykaSharePct: number | null;
  eventDate: string;
};

const toPositionRow = (item: LineItemRow): OkleykaPositionRow => {
  const unitPriceRub = currencyToRub(item.amount as CurrencyAmount | undefined);
  const qty = typeof item.kolichestvo === 'number' && item.kolichestvo > 0 ? item.kolichestvo : 1;
  const isQualifying = isOkleykaSalaryLineItem(item);
  const isCancelled = item.stage === 'OTMENA';
  return {
    lineItemId: item.id,
    opportunityId: item.opportunityId,
    positionName: item.name || '—',
    qty,
    unitPriceRub,
    saleRub: unitPriceRub * qty,
    tip: item.tip ?? null,
    stage: item.stage ?? null,
    tipDetail: item.tipDetail ?? null,
    isQualifying,
    isCancelled,
  };
};

const dealEconomics = (
  saleRub: number,
  printCostRub: number,
  frezaCostRub: number,
  logisticsCostRub: number,
  beznalCostRub: number,
  okleykaCostRub: number | null,
) => {
  const costRub =
    printCostRub + frezaCostRub + logisticsCostRub + beznalCostRub + (okleykaCostRub ?? 0);
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
  mode: OkleykaViewMode = 'okleyka',
): OkleykaDealGroup[] => {
  const positionsByDeal = new Map<string, OkleykaPositionRow[]>();
  for (const item of lineItems) {
    if (!dealsById.has(item.opportunityId)) continue;
    if (mode === 'okleyka' && !isOkleykaSalaryLineItem(item)) continue;
    const list = positionsByDeal.get(item.opportunityId) ?? [];
    list.push(toPositionRow(item));
    positionsByDeal.set(item.opportunityId, list);
  }

  const groups: OkleykaDealGroup[] = [];
  for (const [opportunityId, positions] of positionsByDeal) {
    if (!positions.some((p) => p.isQualifying)) continue;
    const deal = dealsById.get(opportunityId)!;
    const qualifyingSaleRub = positions
      .filter((p) => p.isQualifying)
      .reduce((s, p) => s + p.saleRub, 0);
    const saleRub =
      mode === 'full'
        ? positions.filter((p) => !p.isCancelled).reduce((s, p) => s + p.saleRub, 0)
        : qualifyingSaleRub;
    const printCostRub = currencyToRub(deal.rashodPechat as CurrencyAmount | undefined);
    const frezaCostRub = currencyToRub(deal.rashodFrezerovka as CurrencyAmount | undefined);
    const logisticsCostRub =
      mode === 'full' ? currencyToRub(deal.rashodLogistika as CurrencyAmount | undefined) : 0;
    const beznalCostRub =
      mode === 'full' ? currencyToRub(deal.rashodBeznal as CurrencyAmount | undefined) : 0;
    const okleykaCostRub = currencyToRubOrNull(deal.rashodOkleyka);
    const effective = getOpportunityEffectiveDate(deal);
    const eventDate = effective
      ? (toLocalInputDate(effective) ?? effective.slice(0, 10))
      : '';
    groups.push({
      opportunityId,
      dealName: deal.name || '—',
      bitrixUrl: deal.bitrixLink?.primaryLinkUrl?.trim() ?? '',
      positions: [...positions].sort((a, b) =>
        a.positionName.localeCompare(b.positionName, 'ru'),
      ),
      saleRub,
      qualifyingSaleRub,
      printCostRub,
      frezaCostRub,
      logisticsCostRub,
      beznalCostRub,
      okleykaCostRub,
      eventDate,
      okleykaSharePct: saleRub > 0 ? (qualifyingSaleRub / saleRub) * 100 : null,
      ...dealEconomics(
        saleRub,
        printCostRub,
        frezaCostRub,
        logisticsCostRub,
        beznalCostRub,
        okleykaCostRub,
      ),
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
  ...dealEconomics(
    group.saleRub,
    group.printCostRub,
    group.frezaCostRub,
    group.logisticsCostRub,
    group.beznalCostRub,
    okleykaCostRub,
  ),
});

export const sumOkleykaDealTotals = (groups: OkleykaDealGroup[]): OkleykaDealTotals => {
  const sale = groups.reduce((s, g) => s + g.saleRub, 0);
  const print = groups.reduce((s, g) => s + g.printCostRub, 0);
  const freza = groups.reduce((s, g) => s + g.frezaCostRub, 0);
  const logistics = groups.reduce((s, g) => s + g.logisticsCostRub, 0);
  const beznal = groups.reduce((s, g) => s + g.beznalCostRub, 0);
  const okleyka = groups.reduce((s, g) => s + (g.okleykaCostRub ?? 0), 0);
  const cost = print + freza + logistics + beznal + okleyka;
  const profit = sale - cost;
  return {
    deals: groups.length,
    positions: groups.reduce((s, g) => s + g.positions.length, 0),
    sale,
    print,
    freza,
    logistics,
    beznal,
    okleyka,
    cost,
    profit,
    marginPct: sale > 0 ? (profit / sale) * 100 : null,
  };
};

export const formatOkleykaShareCaption = (pct: number | null): string | null => {
  if (pct === null || !Number.isFinite(pct)) return null;
  return `оклейка ${Math.round(pct)}%`;
};

export const dealGroupsToXlsxMatrix = (
  groups: OkleykaDealGroup[],
  mode: OkleykaViewMode = 'okleyka',
): Array<Array<string | number>> => {
  if (mode === 'full') {
    const header = [
      'Bitrix',
      'Сделка',
      'Дата',
      'Позиций',
      'Продажа',
      'Оклейка %',
      'Расход печать',
      'Расход фреза',
      'Расход логистика',
      'Расход безнал',
      'Расход оклейка',
      'Расход итого',
      'Прибыль',
      'Маржа %',
    ];
    return [
      header,
      ...groups.map((g) => [
        g.bitrixUrl,
        g.dealName,
        g.eventDate || '',
        g.positions.length,
        Math.round(g.saleRub),
        g.okleykaSharePct === null ? '' : Math.round(g.okleykaSharePct),
        Math.round(g.printCostRub),
        Math.round(g.frezaCostRub),
        Math.round(g.logisticsCostRub),
        Math.round(g.beznalCostRub),
        g.okleykaCostRub === null ? '' : Math.round(g.okleykaCostRub),
        Math.round(g.costRub),
        Math.round(g.profitRub),
        g.marginPct === null ? '' : Number(g.marginPct.toFixed(1)),
      ]),
    ];
  }
  // existing compact header + rows (print/freza/okleyka only)
};
```

Keep the compact branch of `dealGroupsToXlsxMatrix` identical to today's 11 columns.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run --config vitest.unit.config.ts src/deals-board/salary/compute.test.ts
```

Expected: PASS. Also run `src/deals-board/salary/api.test.ts` — TypeScript on mocked `OkleykaDealGroup` literals may fail; if so, add the new fields to those mock objects (`qualifyingSaleRub`, `logisticsCostRub: 0`, `beznalCostRub: 0`, `okleykaSharePct`, and position `tip`/`stage`/`tipDetail`/`isQualifying`/`isCancelled`) without changing fetch behaviour.

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/types.ts src/deals-board/salary/compute.ts src/deals-board/salary/compute.test.ts src/deals-board/salary/api.test.ts
git commit -m "feat(okleyka): compute full-deal sale, expenses, and excel columns"
```

---

### Task 2: Lazy full line-item + expense fetch

**Files:**
- Modify: `src/deals-board/salary/api.ts`
- Modify: `src/deals-board/salary/api.test.ts`

**Interfaces:**

```ts
export const buildOkleykaSalaryLineItemsFilter = (opportunityIds: string[]): string =>
  `and(opportunityId[in]:${JSON.stringify(opportunityIds)},tip[eq]:"PLENKA",tipDetail[eq]:"NASHI",stage[in]:["OKLEYKA","GOTOVO"])`;

export const buildOkleykaAllLineItemsFilter = (opportunityIds: string[]): string =>
  `opportunityId[in]:${JSON.stringify(opportunityIds)}`;

export const fetchOkleykaSalaryPageData = (
  dateFrom: string,
  dateTo: string,
): Promise<OkleykaDealGroup[]> => { /* compact, calls buildOkleykaDealGroups(items, deals) */ };

export const fetchOkleykaSalaryFullPageData = (
  dateFrom: string,
  dateTo: string,
  opportunityIds: string[],
): Promise<OkleykaDealGroup[]> => { /* full, calls buildOkleykaDealGroups(items, deals, 'full') */ };
```

- Consumes: `buildOkleykaDealGroups` third argument from Task 1
- Produces: `buildOkleykaAllLineItemsFilter`, `fetchOkleykaSalaryFullPageData`

- [ ] **Step 1: Write the failing tests**

Keep the existing compact filter test unchanged (regression). Add:

```ts
describe('buildOkleykaAllLineItemsFilter', () => {
  it('filters only by opportunity ids', () => {
    const filter = buildOkleykaAllLineItemsFilter(['opp-1', 'opp-2']);
    expect(filter).toContain('opportunityId[in]:["opp-1","opp-2"]');
    expect(filter).not.toContain('PLENKA');
    expect(filter).not.toContain('NASHI');
    expect(filter).not.toContain('OKLEYKA');
  });
});

describe('fetchOkleykaSalaryFullPageData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns [] without REST when opportunityIds is empty', async () => {
    const get = vi.fn();
    vi.mocked(RestApiClient).mockImplementation(
      () => ({ get }) as unknown as RestApiClient,
    );
    await expect(
      fetchOkleykaSalaryFullPageData('2026-07-01', '2026-07-31', []),
    ).resolves.toEqual([]);
    expect(fetchOpportunities).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
  });

  it('loads unfiltered line items and extra rashod, then builds full groups', async () => {
    const get = vi.fn().mockResolvedValue({ data: [] });
    vi.mocked(RestApiClient).mockImplementation(
      () => ({ get }) as unknown as RestApiClient,
    );
    vi.mocked(fetchOpportunities).mockResolvedValue({
      records: [
        { id: 'opp-1', name: 'Deal', loadDate: '2026-07-10' },
        { id: 'opp-skip', name: 'Other', loadDate: '2026-07-10' },
      ],
      totalCount: 2,
    });
    vi.mocked(buildOkleykaDealGroups).mockReturnValue([]);

    await fetchOkleykaSalaryFullPageData('2026-07-01', '2026-07-31', ['opp-1']);

    expect(fetchOpportunities).toHaveBeenCalledWith(
      expect.objectContaining({
        restFieldNames: expect.arrayContaining([
          'rashodLogistika',
          'rashodBeznal',
          'rashodPechat',
          'rashodFrezerovka',
          'rashodOkleyka',
        ]),
      }),
    );
    const restNames = vi.mocked(fetchOpportunities).mock.calls[0]?.[0]?.restFieldNames as string[];
    expect(restNames).not.toContain('rashodVyezdnayaKomanda');
    expect(restNames).not.toContain('rashodItogo');
    expect(get.mock.calls[0]?.[1]?.query?.filter).toBe(
      buildOkleykaAllLineItemsFilter(['opp-1']),
    );
    expect(buildOkleykaDealGroups).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Map),
      'full',
    );
    const dealsById = vi.mocked(buildOkleykaDealGroups).mock.calls[0]?.[1] as Map<string, { id: string }>;
    expect(dealsById.has('opp-1')).toBe(true);
    expect(dealsById.has('opp-skip')).toBe(false);
  });
});
```

Import the new functions. `api.ts` currently mocks `./compute` as `{ buildOkleykaDealGroups: vi.fn() }` — leave that mock; full fetch still uses it.

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run --config vitest.unit.config.ts src/deals-board/salary/api.test.ts
```

Expected: FAIL — `buildOkleykaAllLineItemsFilter` / `fetchOkleykaSalaryFullPageData` not exported.

- [ ] **Step 3: Minimal implementation**

Refactor the existing pagination loop into a helper that takes a filter builder, then:

```ts
export const buildOkleykaAllLineItemsFilter = (opportunityIds: string[]): string =>
  `opportunityId[in]:${JSON.stringify(opportunityIds)}`;

const fetchLineItemsForOpportunityIds = async (
  opportunityIds: string[],
  buildFilter: (ids: string[]) => string,
): Promise<LineItemRow[]> => {
  if (opportunityIds.length === 0) return [];
  const client = new RestApiClient();
  const all: LineItemRow[] = [];
  for (const chunk of chunkIds(opportunityIds)) {
    const filter = buildFilter(chunk);
    let after: string | undefined;
    do {
      const response = await client.get<unknown>('/rest/dealLineItems', {
        query: { filter, limit: PAGE_LIMIT, ...(after ? { after } : {}) },
      });
      const page = normalizeRestListResponse<unknown>(response, 'dealLineItems')
        .map(normalizeLineItem)
        .filter((row): row is LineItemRow => row !== null);
      all.push(...page);
      const pageInfo = extractRestPageInfo(response);
      after =
        pageInfo.hasNextPage && pageInfo.endCursor ? String(pageInfo.endCursor) : undefined;
    } while (after);
  }
  return all;
};

export const fetchOkleykaSalaryPageData = async (dateFrom: string, dateTo: string) => {
  // same as today, but:
  // lineItems = await fetchLineItemsForOpportunityIds(opportunityIds, buildOkleykaSalaryLineItemsFilter)
  // return buildOkleykaDealGroups(matchedLineItems, dealsById)
};

export const fetchOkleykaSalaryFullPageData = async (
  dateFrom: string,
  dateTo: string,
  opportunityIds: string[],
): Promise<OkleykaDealGroup[]> => {
  if (opportunityIds.length === 0) return [];
  const filters: DealBoardFilters = { datePreset: 'custom', dateFrom, dateTo };
  const { records } = await fetchOpportunities({
    limit: PAGE_LIMIT,
    offset: 0,
    sort: [],
    filters,
    visibleCrmFieldNames: ['loadDate'],
    restFieldNames: [
      'name',
      'bitrixLink',
      'loadDate',
      'closeDate',
      'rashodPechat',
      'rashodFrezerovka',
      'rashodOkleyka',
      'rashodLogistika',
      'rashodBeznal',
    ],
    includeCompanyRelation: false,
    fetchAll: true,
  });
  const allowed = new Set(opportunityIds);
  const dealsById = new Map<string, OpportunityRow>();
  for (const deal of records) {
    if (!allowed.has(deal.id)) continue;
    if (opportunityMatchesDateFilter(deal, filters)) dealsById.set(deal.id, deal);
  }
  const lineItems = await fetchLineItemsForOpportunityIds(
    opportunityIds,
    buildOkleykaAllLineItemsFilter,
  );
  const matched = lineItems.filter((item) => dealsById.has(item.opportunityId));
  return buildOkleykaDealGroups(matched, dealsById, 'full');
};
```

Do not add vyezdnaya/itogo to `restFieldNames`. Compact `fetchOkleykaSalaryPageData` rest fields stay the three current rashod fields.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run --config vitest.unit.config.ts src/deals-board/salary/api.test.ts src/deals-board/salary/compute.test.ts
```

Expected: PASS, including the compact filter regression.

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/salary/api.ts src/deals-board/salary/api.test.ts
git commit -m "feat(okleyka): lazy-fetch all positions and extra deal expenses"
```

---

### Task 3: Toolbar segment, table chrome, and safe mode switch

**Files:**
- Modify: `src/deals-board/salary/OkleykaSalaryPage.tsx`
- Modify: `src/deals-board/salary/export-excel.ts` only if `dealGroupsToXlsxMatrix` is called there — it currently imports from `compute` and is used via `fetchOkleykaSalaryExcelBlob(groups)`. Change the page to pass mode into a new optional argument:

```ts
// export-excel.ts
export const fetchOkleykaSalaryExcelBlob = async (
  groups: OkleykaDealGroup[],
  mode: OkleykaViewMode = 'okleyka',
): Promise<{ blob: Blob; filename: string }> => {
  if (!groups.length) throw new Error('Нет строк для экспорта.');
  const bytes = buildXlsxFromRows(dealGroupsToXlsxMatrix(groups, mode));
  // same Blob wrapping as today
};
```

Excel shape is already tested via `dealGroupsToXlsxMatrix` in Task 1. Thread `mode` through `fetchOkleykaSalaryExcelBlob` / `handleExportExcel`. Do not add `export-excel.test.ts`.

**Interfaces:**

```ts
type OkleykaViewMode = 'okleyka' | 'full'; // import from './compute'

const compactQuery = useQuery({ queryKey: ['okleyka-salary', refreshKey, dateFrom, dateTo], ... });
const fullQuery = useQuery({
  queryKey: ['okleyka-salary-full', refreshKey, dateFrom, dateTo, compactOpportunityIdsKey],
  enabled: false, // fetched on demand via fetchQuery
});
```

- Consumes: `fetchOkleykaSalaryFullPageData`, `formatOkleykaShareCaption`, `OkleykaViewMode`, group fields from Task 1
- Produces: working page toggle; no new exported module required

- [ ] **Step 1: Thread mode through Excel helper**

Update `src/deals-board/salary/export-excel.ts`:

```ts
import { buildXlsxFromRows, XLSX_MIME } from 'src/logic-functions/shared/build-xlsx';
import {
  buildOkleykaSalaryFilename,
  dealGroupsToXlsxMatrix,
  type OkleykaDealGroup,
  type OkleykaViewMode,
} from './compute';

export const buildOkleykaSalaryExcelBlobFromGroups = (
  groups: OkleykaDealGroup[],
  mode: OkleykaViewMode = 'okleyka',
): Blob => {
  const bytes = buildXlsxFromRows(dealGroupsToXlsxMatrix(groups, mode));
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer], { type: XLSX_MIME });
};

export const fetchOkleykaSalaryExcelBlob = async (
  groups: OkleykaDealGroup[],
  mode: OkleykaViewMode = 'okleyka',
): Promise<{ blob: Blob; filename: string }> => {
  if (!groups.length) throw new Error('Нет строк для экспорта.');
  return {
    blob: buildOkleykaSalaryExcelBlobFromGroups(groups, mode),
    filename: buildOkleykaSalaryFilename(),
  };
};
```

- [ ] **Step 2: Page state and data selection**

In `OkleykaSalaryPageInner`:

```ts
const [viewMode, setViewMode] = useState<OkleykaViewMode>('okleyka');
const [fullError, setFullError] = useState<string | null>(null);
```

Do **not** persist `viewMode`.

`baseGroups` today is `query.data ?? []`. Keep that compact query. Derive:

```ts
const compactOpportunityIds = useMemo(
  () => (query.data ?? []).map((g) => g.opportunityId),
  [query.data],
);
const compactOpportunityIdsKey = compactOpportunityIds.join(',');
```

On-demand full load (do not `enabled: viewMode === 'full'` — that would flip the segment before data exists):

```ts
const requestFullMode = async () => {
  setFullError(null);
  if (compactOpportunityIds.length === 0) {
    setViewMode('full');
    return;
  }
  try {
    await queryClient.fetchQuery({
      queryKey: ['okleyka-salary-full', refreshKey, dateFrom, dateTo, compactOpportunityIdsKey],
      queryFn: () =>
        fetchOkleykaSalaryFullPageData(dateFrom!, dateTo!, compactOpportunityIds),
    });
    setViewMode('full');
  } catch {
    setViewMode('okleyka');
    setFullError('Не удалось загрузить все позиции');
  }
};
```

Read cached full groups:

```ts
const fullGroups =
  queryClient.getQueryData<OkleykaDealGroup[]>([
    'okleyka-salary-full',
    refreshKey,
    dateFrom,
    dateTo,
    compactOpportunityIdsKey,
  ]) ?? [];
```

That `getQueryData` will not subscribe. Use `useQuery` with the same key and `enabled: false` so cache updates re-render:

```ts
const fullQuery = useQuery({
  queryKey: ['okleyka-salary-full', refreshKey, dateFrom, dateTo, compactOpportunityIdsKey],
  queryFn: () => fetchOkleykaSalaryFullPageData(dateFrom!, dateTo!, compactOpportunityIds),
  enabled: false,
});
```

`requestFullMode` must use `queryClient.fetchQuery` with that same key (not `setViewMode` first). After the promise resolves, `setViewMode('full')`. `fullQuery.data` reads the cache and re-renders because `useQuery` shares the key.

```ts
const rawGroups = viewMode === 'full' ? (fullQuery.data ?? []) : (query.data ?? []);
```

Then keep the existing `overrides` → `displayGroups` map using `applyDealOkleykaOverride` (Task 1 already includes logistics/beznal).

When `viewMode === 'full'` and `fullQuery.data` is missing (period changed, cache empty), do not render compact numbers as full P&L: if `viewMode === 'full' && !fullQuery.data`, call `requestFullMode` in an effect **or** treat as loading. Simplest: if period/refreshKey changes while `viewMode === 'full'`, `useEffect` re-runs `requestFullMode`; until data arrives, show the existing table loading/empty, not compact groups labelled as full.

```ts
useEffect(() => {
  if (viewMode !== 'full') return;
  if (!dateFrom || !dateTo) return;
  if (fullQuery.data) return;
  void requestFullMode();
}, [viewMode, dateFrom, dateTo, compactOpportunityIdsKey, refreshKey]);
```

If this effect fights the click handler, keep `requestFullMode` as the only writer of `viewMode` and have the effect only refetch when already full and cache is empty.

`handlePersisted` must also invalidate `['okleyka-salary-full']`.

- [ ] **Step 3: Segment UI**

In the half-button row (next to «Весь месяц / 1-я / 2-я»), add:

```tsx
<Button
  theme={theme}
  size="sm"
  variant={viewMode === 'okleyka' ? 'primary' : 'ghost'}
  onClick={() => {
    setFullError(null);
    setViewMode('okleyka');
  }}
>
  Оклейка
</Button>
<Button
  theme={theme}
  size="sm"
  variant={viewMode === 'full' ? 'primary' : 'ghost'}
  disabled={fullQuery.isFetching}
  onClick={() => void requestFullMode()}
>
  {fullQuery.isFetching ? 'Вся сделка…' : 'Вся сделка'}
</Button>
```

Render `fullError` in `colors.danger` / `font.sizeSm` near `exportError`.

- [ ] **Step 4: Totals, columns, rows**

`tableColSpan = (viewMode === 'full' ? 13 : 11) + visiblePersonEntries.length`.

Totals strip: after Фреза, if `viewMode === 'full'`, show Логистика and Безнал with `formatSalaryRub(totals.logistics)` / `totals.beznal`. «Итого расход» already uses `totals.cost`.

Header: after Фреза, if full, two extra `th`: Логистика, Безнал (not sortable in this iteration — do not add sort keys).

Deal row after print/freza: two extra `td` with `formatOptionalCost`.

Sale cell in full mode:

```tsx
<td style={{ padding: cellPad, ...moneyCellStyle, fontWeight: font.weightMedium }}>
  <div>{formatSalaryRub(group.saleRub)}</div>
  {viewMode === 'full' && formatOkleykaShareCaption(group.okleykaSharePct) ? (
    <div style={{ color: colors.textMuted, fontSize: font.sizeXs }}>
      {formatOkleykaShareCaption(group.okleykaSharePct)}
    </div>
  ) : null}
</td>
```

Position count stays `group.positions.length` (compact = qualifying only; full = all).

Extend `PositionNameCell` props:

```tsx
const PositionNameCell = ({
  lineItemId,
  positionName,
  showMeta = false,
  tip,
  stage,
  isQualifying = false,
  isCancelled = false,
}: {
  lineItemId: string;
  positionName: string;
  showMeta?: boolean;
  tip?: string | null;
  stage?: string | null;
  isQualifying?: boolean;
  isCancelled?: boolean;
}) => {
  const theme = useTheme();
  const { colors } = theme;
  const { data } = useLineItemListStatus(lineItemId);
  const nameColor = isCancelled
    ? colors.textMuted
    : isQualifying
      ? getChipPalette('blue', theme.colorScheme).text
      : colors.textSecondary;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <span
        title={positionName}
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: nameColor,
          fontWeight: isQualifying ? theme.font.weightSemibold : undefined,
          minWidth: 0,
          flex: 1,
        }}
      >
        {positionName}
      </span>
      {showMeta && tip ? (
        <Chip text={getLineItemTypeLabel(tip)} color={getLineItemTypeColor(tip) as ChipColor} theme={theme} />
      ) : null}
      {showMeta && stage ? (
        <Chip text={getStageLabel(stage)} color={getStageColor(stage) as ChipColor} theme={theme} />
      ) : null}
      {data?.restorationMatch ? (
        <Chip text="реставрация · 0 ₽" color="yellow" theme={theme} />
      ) : null}
    </div>
  );
};
```

Import `getChipPalette`, `ChipColor` from `../Chip`; `getLineItemTypeLabel` / `getLineItemTypeColor` from `src/constants/line-item-types`; `getStageLabel` / `getStageColor` from `src/constants/stages`.

Child row: pass `showMeta={viewMode === 'full'}` and the position flags. Child sale cell: `position.isCancelled ? '—' : formatSalaryRub(position.saleRub)`. Muted whole child row when cancelled (`color: colors.textMuted` on the `tr` is enough).

Add two extra empty `<td />` on child rows when `viewMode === 'full'` so person columns still align (after the print/freza empty cells).

`handleExportExcel` must call `fetchOkleykaSalaryExcelBlob(displayGroups, viewMode)`.

Person cells, distribute, reset, green row: no logic changes.

- [ ] **Step 5: Typecheck-adjacent unit run**

There is no page component test. Run:

```bash
npx vitest run --config vitest.unit.config.ts src/deals-board/salary
```

Expected: PASS.

If oxlint is used in this repo for the page, run:

```bash
yarn lint src/deals-board/salary/OkleykaSalaryPage.tsx src/deals-board/salary/compute.ts src/deals-board/salary/api.ts src/deals-board/salary/export-excel.ts
```

Expected: no new errors.

- [ ] **Step 6: Manual check (localhost if CRM is up)**

1. Open «Оклейщики», current month: still compact, only wrapping-nashi rows.
2. Click «Вся сделка»: mixed deal shows banner/other/cancel; wrapping row bold blue; cancel sale `—`; logistics/beznal columns; caption `оклейка N%`.
3. Edit a person share: sum and green row update; compact mode still has the same shares.
4. Kill network / force REST fail once: stay on «Оклейка», see `Не удалось загрузить все позиции`.
5. Excel in both modes: compact 11 money headers; full has Оклейка %, логистика, безнал.
6. Reload page: mode is «Оклейка» again.

If localhost CRM is down, record that in the task report and rely on unit tests.

- [ ] **Step 7: Commit**

```bash
git add src/deals-board/salary/OkleykaSalaryPage.tsx src/deals-board/salary/export-excel.ts
git commit -m "feat(okleyka): toggle full-deal positions and expenses on the salary page"
```

---

## Spec coverage

| Spec requirement | Task |
|---|---|
| Segment Оклейка / Вся сделка, default Оклейка, no localStorage | 3 |
| Deal set = qualifying filter unchanged | 1 + 2 compact regression |
| Full lists all line items; OTMENA visible, not in sale | 1 |
| Qualifying highlight semi-bold + Chip blue | 3 |
| Full cost = print+freza+logistics+beznal+okleyka; no vyezdnaya/itogo | 1 + 2 |
| Caption `оклейка N%` | 1 helper + 3 UI |
| Shares/distribute unchanged | 3 (no fund/shares edits) |
| Lazy fetch, cache, fail stays compact | 2 + 3 |
| Totals + Excel follow mode | 1 matrix + 3 strip/export |
| Vitest cases in spec §6 | 1 + 2 |

## Self-review

- No TBD/TODO in task steps.
- `applyDealOkleykaOverride` / `sumOkleykaDealTotals` use logistics/beznal so optimistic share edits stay correct in full mode.
- Compact `group()` / api mocks updated so TypeScript does not drift.
- Sort keys intentionally omit logistics/beznal (YAGNI).
- `fullQuery` uses `enabled: false` + `fetchQuery`/`refetch` so the segment cannot show full P&L on compact data.
