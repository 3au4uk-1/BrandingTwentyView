# Deal Amount Min Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the deals board, a «Сумма» filter keeps only opportunities whose `amount` is >= a user-entered ruble threshold.

**Architecture:** Store the threshold as a `deal` + `amount` + `gte` FilterClause (value in rubles). Map it to `DealBoardFilters.amountMinRub` and add `{ amount: { amountMicros: { gte } } }` inside `buildOpportunityFilter` so GraphQL pagination stays correct. UI is one number field in the existing FilterBar builder and MobileFiltersSheet.

**Tech Stack:** TwentyView TypeScript, existing FilterClause model, GraphQL opportunity `CurrencyFilter`, vitest (`npx vitest run --config vitest.unit.config.ts`).

**Spec:** `docs/superpowers/specs/2026-09-14-deal-amount-min-filter-design.md`

## Global Constraints

- Filter `opportunity.amount` only (column «Сумма»), never line-item totals or `summaPostupleniy`.
- Inclusive `>=` only. Do not add `lte`, `gt`, or a max field.
- Clause `value` is rubles (what the user typed), not micros.
- GraphQL shape is `{ amount: { amountMicros: { gte: Math.round(amountMinRub * 1_000_000) } } }`.
- Invalid / empty / negative input removes the clause. No `window.alert`.
- Do not change crmparserv2, BrandingTeamApp, docker-compose, or realtime code.
- Sentence-case chip: `Сумма: от 100 000`.
- Tests: unit only, no live CRM.

## File structure

- Create: `src/deals-board/filter-model/amount-min.ts` — parse, micros, chip number format, apply clause
- Create: `src/deals-board/filter-model/amount-min.test.ts`
- Modify: `src/deals-board/filter-model/types.ts` — `'gte'` operator
- Modify: `src/deals-board/types.ts` — `amountMinRub?: number`
- Modify: `src/deals-board/filter-model/clauses-to-deal-board-filters.ts`
- Modify: `src/deals-board/filter-model/clauses-to-deal-board-filters.test.ts`
- Modify: `src/deals-board/utils/search.ts` — GraphQL gte
- Modify: `src/deals-board/utils/search.test.ts`
- Modify: `src/deals-board/filter-model/format-clause-label.ts`
- Modify: `src/deals-board/filter-model/format-clause-label.test.ts`
- Modify: `src/deals-board/filter-model/use-filter-clause-editor.ts`
- Modify: `src/deals-board/filter-model/use-filter-clause-editor.test.ts`
- Modify: `src/deals-board/FilterBar.tsx`
- Modify: `src/deals-board/mobile/MobileFiltersSheet.tsx`

---

### Task 1: Parse rubles and apply amount clause

**Files:**
- Create: `src/deals-board/filter-model/amount-min.ts`
- Create: `src/deals-board/filter-model/amount-min.test.ts`

**Interfaces:**
- Consumes: `FilterClause` from `./types`
- Produces:
  - `parseAmountMinRub(raw: string): number | undefined`
  - `rublesToAmountMicros(rubles: number): number`
  - `formatAmountMinRub(rubles: number): string`
  - `applyAmountMinToClauses(clauses: FilterClause[], raw: string): FilterClause[]`

- [ ] **Step 1: Write the failing test**

Create `src/deals-board/filter-model/amount-min.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { FilterClause } from './types';
import {
  applyAmountMinToClauses,
  formatAmountMinRub,
  parseAmountMinRub,
  rublesToAmountMicros,
} from './amount-min';

describe('parseAmountMinRub', () => {
  it('parses spaces and comma decimals', () => {
    expect(parseAmountMinRub('100 000')).toBe(100000);
    expect(parseAmountMinRub('100000,5')).toBe(100000.5);
  });

  it('returns undefined for empty, text, and negative', () => {
    expect(parseAmountMinRub('')).toBeUndefined();
    expect(parseAmountMinRub('  ')).toBeUndefined();
    expect(parseAmountMinRub('abc')).toBeUndefined();
    expect(parseAmountMinRub('-1')).toBeUndefined();
  });
});

describe('rublesToAmountMicros', () => {
  it('converts 100000 rubles to micros', () => {
    expect(rublesToAmountMicros(100000)).toBe(100_000_000_000);
  });

  it('rounds fractional rubles', () => {
    expect(rublesToAmountMicros(100000.5)).toBe(Math.round(100000.5 * 1_000_000));
  });
});

describe('formatAmountMinRub', () => {
  it('uses regular spaces as thousands separators', () => {
    expect(formatAmountMinRub(100000)).toBe('100 000');
  });
});

describe('applyAmountMinToClauses', () => {
  const stageClause: FilterClause = {
    id: 'stage-1',
    level: 'deal',
    field: 'stage',
    operator: 'in',
    value: ['NOVYY'],
  };

  it('upserts a gte amount clause and keeps other clauses', () => {
    const next = applyAmountMinToClauses([stageClause], '100 000');
    expect(next).toHaveLength(2);
    expect(next).toContainEqual(stageClause);
    expect(next.find((clause) => clause.field === 'amount')).toEqual({
      id: expect.any(String),
      level: 'deal',
      field: 'amount',
      operator: 'gte',
      value: 100000,
    });
  });

  it('keeps the existing amount clause id on update', () => {
    const existing: FilterClause = {
      id: 'amt-1',
      level: 'deal',
      field: 'amount',
      operator: 'gte',
      value: 1,
    };
    const next = applyAmountMinToClauses([existing], '50');
    expect(next).toEqual([
      { id: 'amt-1', level: 'deal', field: 'amount', operator: 'gte', value: 50 },
    ]);
  });

  it('removes the amount clause when input is empty or invalid', () => {
    const existing: FilterClause = {
      id: 'amt-1',
      level: 'deal',
      field: 'amount',
      operator: 'gte',
      value: 100000,
    };
    expect(applyAmountMinToClauses([stageClause, existing], '')).toEqual([stageClause]);
    expect(applyAmountMinToClauses([existing], 'abc')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --config vitest.unit.config.ts src/deals-board/filter-model/amount-min.test.ts`

Expected: FAIL — `amount-min` module not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/deals-board/filter-model/amount-min.ts`:

```ts
import { createId } from '../utils/create-id';

import type { FilterClause } from './types';

export const parseAmountMinRub = (raw: string): number | undefined => {
  const trimmed = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed;
};

export const rublesToAmountMicros = (rubles: number): number =>
  Math.round(rubles * 1_000_000);

export const formatAmountMinRub = (rubles: number): string =>
  rubles.toLocaleString('ru-RU', { maximumFractionDigits: 2 }).replace(/\u00a0/g, ' ');

export const applyAmountMinToClauses = (
  clauses: FilterClause[],
  raw: string,
): FilterClause[] => {
  const withoutAmount = clauses.filter(
    (clause) => !(clause.level === 'deal' && clause.field === 'amount'),
  );
  const parsed = parseAmountMinRub(raw);
  if (parsed === undefined) return withoutAmount;

  const existing = clauses.find((clause) => clause.level === 'deal' && clause.field === 'amount');
  return [
    ...withoutAmount,
    {
      id: existing?.id ?? createId(),
      level: 'deal',
      field: 'amount',
      operator: 'gte',
      value: parsed,
    },
  ];
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --config vitest.unit.config.ts src/deals-board/filter-model/amount-min.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/filter-model/amount-min.ts src/deals-board/filter-model/amount-min.test.ts
git commit -m "feat: parse deal amount min filter input"
```

---

### Task 2: Map clause to GraphQL amount filter

**Files:**
- Modify: `src/deals-board/filter-model/types.ts`
- Modify: `src/deals-board/types.ts`
- Modify: `src/deals-board/filter-model/clauses-to-deal-board-filters.ts`
- Modify: `src/deals-board/filter-model/clauses-to-deal-board-filters.test.ts`
- Modify: `src/deals-board/utils/search.ts`
- Modify: `src/deals-board/utils/search.test.ts`

**Interfaces:**
- Consumes: `parseAmountMinRub` / `rublesToAmountMicros` from Task 1; `FilterClause.value` as `number`
- Produces: `FilterOperator` includes `'gte'`. `DealBoardFilters.amountMinRub?: number`. `clausesToDealBoardFilters` sets `amountMinRub` only when a valid gte clause exists. `buildOpportunityFilter` adds `{ amount: { amountMicros: { gte } } }` when `amountMinRub` is a finite number `>= 0`.

- [ ] **Step 1: Write the failing tests**

In `clauses-to-deal-board-filters.test.ts` add (do not add `amountMinRub: undefined` to existing expected objects — only spread the key when set):

```ts
  it('maps deal amount gte clause to amountMinRub', () => {
    const clauses: FilterClause[] = [
      { id: '1', level: 'deal', field: 'amount', operator: 'gte', value: 100000 },
    ];
    expect(clausesToDealBoardFilters(clauses).amountMinRub).toBe(100000);
  });

  it('ignores negative or non-numeric amount clauses', () => {
    expect(
      clausesToDealBoardFilters([
        { id: '1', level: 'deal', field: 'amount', operator: 'gte', value: -1 },
      ]).amountMinRub,
    ).toBeUndefined();
    expect(
      clausesToDealBoardFilters([
        { id: '1', level: 'deal', field: 'amount', operator: 'gte', value: '100000' },
      ]).amountMinRub,
    ).toBeUndefined();
  });
```

In `search.test.ts` inside `describe('buildOpportunityFilter')` add:

```ts
  it('adds amountMicros gte from amountMinRub', () => {
    expect(buildOpportunityFilter({ amountMinRub: 100000 })).toEqual({
      and: [{ amount: { amountMicros: { gte: 100_000_000_000 } } }],
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --config vitest.unit.config.ts src/deals-board/filter-model/clauses-to-deal-board-filters.test.ts src/deals-board/utils/search.test.ts`

Expected: FAIL — `amountMinRub` missing; GraphQL clause missing.

- [ ] **Step 3: Implement mapping**

`src/deals-board/filter-model/types.ts` — change operator union:

```ts
export type FilterOperator = 'eq' | 'in' | 'contains' | 'between' | 'isEmpty' | 'gte';
```

`src/deals-board/types.ts` — on `DealBoardFilters` add after `companyIds`:

```ts
  companyIds?: string[];
  /** Inclusive ruble floor for opportunity.amount. */
  amountMinRub?: number;
  clauses?: FilterClause[];
```

`src/deals-board/filter-model/clauses-to-deal-board-filters.ts` — add helper and include the key only when valid:

```ts
const resolveAmountMinRub = (clauses: FilterClause[]): number | undefined => {
  const clause = clauses.find(
    (item) => item.level === 'deal' && item.field === 'amount' && item.operator === 'gte',
  );
  return typeof clause?.value === 'number' && Number.isFinite(clause.value) && clause.value >= 0
    ? clause.value
    : undefined;
};
```

In the returned object of `clausesToDealBoardFilters`:

```ts
  oplata: resolveOplata(clauses),
  ...(amountMinRub !== undefined ? { amountMinRub } : {}),
```

where `const amountMinRub = resolveAmountMinRub(clauses);` is computed above the return.

`src/deals-board/utils/search.ts` — import `rublesToAmountMicros` from `../filter-model/amount-min`. Inside `buildOpportunityFilter`, after the opportunityStages block:

```ts
  if (typeof filters.amountMinRub === 'number' && Number.isFinite(filters.amountMinRub) && filters.amountMinRub >= 0) {
    and.push({
      amount: { amountMicros: { gte: rublesToAmountMicros(filters.amountMinRub) } },
    });
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --config vitest.unit.config.ts src/deals-board/filter-model/clauses-to-deal-board-filters.test.ts src/deals-board/utils/search.test.ts`

Expected: PASS (existing `toEqual` fixtures stay valid because `amountMinRub` is omitted when unset).

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/filter-model/types.ts src/deals-board/types.ts src/deals-board/filter-model/clauses-to-deal-board-filters.ts src/deals-board/filter-model/clauses-to-deal-board-filters.test.ts src/deals-board/utils/search.ts src/deals-board/utils/search.test.ts
git commit -m "feat: send opportunity amount gte in board GraphQL filter"
```

---

### Task 3: Chip label and builder field

**Files:**
- Modify: `src/deals-board/filter-model/format-clause-label.ts`
- Modify: `src/deals-board/filter-model/format-clause-label.test.ts`
- Modify: `src/deals-board/filter-model/use-filter-clause-editor.ts`
- Modify: `src/deals-board/filter-model/use-filter-clause-editor.test.ts`

**Interfaces:**
- Consumes: `formatAmountMinRub`, `applyAmountMinToClauses` from Task 1
- Produces: `formatFilterClauseLabel` for `field === 'amount'` returns `Сумма: от ${formatAmountMinRub(value)}`. `FILTER_BUILDER_FIELDS` includes `{ level: 'deal', field: 'amount', label: 'Сумма', kind: 'amount' }`. `FilterBuilderField.kind` union includes `'amount'`. Hook returns `setAmountMin(raw: string): void` and `getAmountMinDraft(): string`.

- [ ] **Step 1: Write the failing tests**

In `format-clause-label.test.ts` add:

```ts
  it('labels deal amount gte as Сумма: от', () => {
    expect(
      formatFilterClauseLabel({
        id: '1',
        level: 'deal',
        field: 'amount',
        operator: 'gte',
        value: 100000,
      }),
    ).toBe('Сумма: от 100 000');
  });
```

In `use-filter-clause-editor.test.ts` add:

```ts
  it('exposes amount as a deal builder field', () => {
    const amount = FILTER_BUILDER_FIELDS.find(
      (field) => field.level === 'deal' && field.field === 'amount',
    );
    expect(amount).toMatchObject({
      label: 'Сумма',
      kind: 'amount',
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --config vitest.unit.config.ts src/deals-board/filter-model/format-clause-label.test.ts src/deals-board/filter-model/use-filter-clause-editor.test.ts`

Expected: FAIL — label is `'amount'`; no amount builder field.

- [ ] **Step 3: Implement labels and hook API**

`format-clause-label.ts` — import `formatAmountMinRub` from `./amount-min`. Add `amount: 'Сумма'` to `FIELD_LABELS`. Before the final `return fieldLabel;`:

```ts
  if (clause.field === 'amount' && clause.operator === 'gte' && typeof clause.value === 'number') {
    return `${fieldLabel}: от ${formatAmountMinRub(clause.value)}`;
  }
```

`use-filter-clause-editor.ts`:

Change `FilterBuilderField.kind` to `'multi-select' | 'company' | 'oplata' | 'amount'`.

Append to `FILTER_BUILDER_FIELDS` (after oplata):

```ts
  {
    level: 'deal',
    field: 'amount',
    label: 'Сумма',
    kind: 'amount',
  },
```

Import `applyAmountMinToClauses` from `./amount-min`.

Add:

```ts
  const setAmountMin = (raw: string): void => {
    withSessionClauses((clauses) => applyAmountMinToClauses(clauses, raw));
  };

  const getAmountMinDraft = (): string => {
    const existing = effectiveClauses.find(
      (clause) => clause.level === 'deal' && clause.field === 'amount',
    );
    return typeof existing?.value === 'number' ? String(existing.value) : '';
  };
```

Return `setAmountMin` and `getAmountMinDraft` from the hook alongside `setOplata`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --config vitest.unit.config.ts src/deals-board/filter-model/format-clause-label.test.ts src/deals-board/filter-model/use-filter-clause-editor.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/filter-model/format-clause-label.ts src/deals-board/filter-model/format-clause-label.test.ts src/deals-board/filter-model/use-filter-clause-editor.ts src/deals-board/filter-model/use-filter-clause-editor.test.ts
git commit -m "feat: label and expose deal amount min filter field"
```

---

### Task 4: Desktop and mobile amount input

**Files:**
- Modify: `src/deals-board/FilterBar.tsx`
- Modify: `src/deals-board/mobile/MobileFiltersSheet.tsx`

**Interfaces:**
- Consumes: `applyAmountMinToClauses` (FilterBar local upsert path), `setAmountMin` / `getAmountMinDraft` (mobile hook), `FILTER_BUILDER_FIELDS` kind `'amount'`
- Produces: Filter → «Сумма» shows a number `Input`; Enter and blur apply. Empty/invalid clears the clause. Chip already comes from `formatFilterClauseLabel`. Mobile sheet has a «Сумма» section with the same input. No alerts.

- [ ] **Step 1: Add FilterBar amount panel**

Import `applyAmountMinToClauses` from `./filter-model/amount-min`.

Add `useState` for the builder draft (next to `companySearch`):

```ts
  const [amountDraft, setAmountDraft] = useState('');
```

When opening an amount field, seed the draft. Change `openBuilderField`:

```ts
  const openBuilderField = (field: FilterBuilderField) => {
    setActiveBuilderField(field);
    setIsBuilderOpen(true);
    if (field.kind !== 'company') {
      setCompanySearch('');
    }
    if (field.kind === 'amount') {
      const existing = effectiveClauses.find(
        (clause) => clause.level === 'deal' && clause.field === 'amount',
      );
      setAmountDraft(typeof existing?.value === 'number' ? String(existing.value) : '');
    }
  };
```

Add helper used by Enter/blur:

```ts
  const commitAmountDraft = () => {
    withSessionClauses((clauses) => applyAmountMinToClauses(clauses, amountDraft));
  };
```

In `renderBuilderPanel`, after the `oplata` block and **before** the multi-select `existing` lookup, insert:

```ts
    if (activeBuilderField.kind === 'amount') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, minWidth: '220px' }}>
          <button
            type="button"
            onClick={() => setActiveBuilderField(null)}
            style={{
              alignSelf: 'flex-start',
              border: 'none',
              background: 'transparent',
              color: colors.textMuted,
              fontSize: font.sizeXs,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ← Назад
          </button>
          <Input
            theme={theme}
            inputMode="decimal"
            placeholder="от, ₽"
            value={amountDraft}
            onChange={(event) => setAmountDraft(event.target.value)}
            onBlur={commitAmountDraft}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitAmountDraft();
              }
            }}
            style={{ padding: '5px 8px', fontSize: font.sizeSm }}
          />
        </div>
      );
    }
```

Do not add `window.alert`. Chip list already maps `effectiveClauses` through `formatFilterClauseLabel`.

- [ ] **Step 2: Add mobile sheet field**

In `MobileFiltersSheet.tsx`, destructure `setAmountMin` and `getAmountMinDraft` from `useFilterClauseEditor`.

Add local draft state so typing does not apply on every keystroke:

```ts
  const amountValue = getAmountMinDraft();
  const [amountDraft, setAmountDraft] = useState(amountValue);

  useEffect(() => {
    setAmountDraft(amountValue);
  }, [amountValue]);
```

Import `useEffect` from `react` if the file does not already (it currently does not — add it).

Insert a section **before** the oplata section:

```tsx
        <section>
          <div style={sectionTitleStyle}>Сумма</div>
          <Input
            theme={theme}
            inputMode="decimal"
            placeholder="от, ₽"
            value={amountDraft}
            onChange={(event) => setAmountDraft(event.target.value)}
            onBlur={() => setAmountMin(amountDraft)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                setAmountMin(amountDraft);
              }
            }}
            style={{ width: '100%', minHeight: 44 }}
          />
        </section>
```

- [ ] **Step 3: Run unit tests that still apply**

Run: `npx vitest run --config vitest.unit.config.ts src/deals-board/filter-model src/deals-board/utils/search.test.ts`

Expected: PASS. There is no FilterBar component test; do not add a live CRM test.

- [ ] **Step 4: Manual check (after `yarn twenty apply` or prod CD)**

On «Реализация»: Фильтр → Сумма → `100000` → Enter. Chip `Сумма: от 100 000`. Board refetch shows only deals with amount >= 100000. Clear the input / × on chip restores the previous list. Repeat on mobile sheet.

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/FilterBar.tsx src/deals-board/mobile/MobileFiltersSheet.tsx
git commit -m "feat: add deal amount min input to board filters"
```

---

## Spec coverage

| Spec section | Task |
|--------------|------|
| Clause `deal`/`amount`/`gte`, rubles | 1, 2 |
| `FilterOperator` + `amountMinRub` | 2 |
| GraphQL `amount.amountMicros.gte` | 2 |
| Empty/invalid/negative drops clause, no alert | 1, 4 |
| Builder field «Сумма», desktop Enter/blur | 3, 4 |
| Mobile same field | 4 |
| Chip `Сумма: от 100 000` | 1 (`formatAmountMinRub`), 3 |
| Parse `100 000` and `100000,5` | 1 |
| View persistence via existing clauses | 2–4 (no extra storage) |
| No `lte`, parser, client page filter | Global constraints |

## Placeholder scan

No TBD / “similar to Task N” / unimplemented error-handling steps.
