# Okleyka Clear + Half Distribute Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make okleyka clear persist as CRM `null` (green only when `> 0`), and in «Весь месяц» mode distribute each half’s salary fund only onto that half’s deals.

**Architecture:** Add `eventDate` on deal groups so month-mode can slice deals by half. Introduce `buildHalfDistributeScope` in `fund.ts` (entries + groups + fund + distribution for one half). Fix `patchOkleykaDealCost(null)` payload and treat input `0` as clear. Rework `SalaryPanel` so month mode shows per-half fund strips and two distribute buttons; half mode keeps one button.

**Tech Stack:** React, TanStack Query, Twenty REST/GraphQL via existing `patchOpportunity`, vitest.

**Spec:** `docs/superpowers/specs/2026-08-03-okleyka-clear-and-half-distribute-design.md`

## Global Constraints

- Empty / Backspace / typed `0` → store `null`; green iff `(okleykaCostRub ?? 0) > 0`.
- Month mode: two distribute actions scoped by half; no single combined-fund distribute.
- Default date mode stays «Весь месяц» (`getCurrentMonthMode`).
- No preview/undo/target-margin in this plan.
- Windows: `yarn twenty apply` may fail on backslash paths — note in report; do not block unit tests.
- Russian UI copy for buttons/disabled reasons.
- Commits only when the user asks (do not auto-commit unless user requested).

---

## File map

| File | Role |
|------|------|
| `src/deals-board/salary/compute.ts` | Add `eventDate` on `OkleykaDealGroup`; set from opportunity effective date |
| `src/deals-board/salary/compute.test.ts` | Cover `eventDate` |
| `src/deals-board/salary/fund.ts` | `filterGroupsInPeriod`, `buildHalfDistributeScope` |
| `src/deals-board/salary/fund.test.ts` | Half-scope distribute tests |
| `src/deals-board/salary/api.ts` | Clear CURRENCY payload that Twenty accepts |
| `src/deals-board/salary/api.test.ts` | Assert clear payload |
| `src/deals-board/salary/OkleykaDealCostCell.tsx` | Map `0` → `null` before save |
| `src/deals-board/salary/SalaryPanel.tsx` | Per-half fund + distribute in month; half mode one button |
| `src/deals-board/salary/OkleykaSalaryPage.tsx` | Wire scopes, green `> 0`, invalidate after patch, half-aware hint |

---

### Task 1: `eventDate` on deal groups + period filter

**Files:**
- Modify: `src/deals-board/salary/compute.ts`
- Modify: `src/deals-board/salary/compute.test.ts`
- Modify: `src/deals-board/salary/fund.ts`
- Modify: `src/deals-board/salary/fund.test.ts`

**Interfaces:**
- Consumes: `OpportunityRow.loadDate` / `closeDate`; `getOpportunityEffectiveDate` from `src/deals-board/utils/resolve-opportunity-date.ts`; `SalaryPeriod` from `date-range.ts`
- Produces:
  - `OkleykaDealGroup.eventDate: string` (calendar `YYYY-MM-DD`, empty string if unknown)
  - `filterGroupsInPeriod(groups, period): OkleykaDealGroup[]`
  - `buildHalfDistributeScope(args): { entries, groups, fund, distribution }`

- [ ] **Step 1: Failing tests for eventDate + half scope**

Add to `compute.test.ts` (adapt existing `deal()` helper to pass `loadDate`):

```ts
it('stores calendar eventDate from loadDate', () => {
  const groups = buildOkleykaDealGroups(
    [lineItem('li1', 'd1')],
    new Map([['d1', deal('d1', { loadDate: '2026-07-20T12:00:00.000Z' })]]),
  );
  expect(groups[0]?.eventDate).toMatch(/^2026-07-20/);
});
```

Add to `fund.test.ts`:

```ts
import { filterGroupsInPeriod, buildHalfDistributeScope } from './fund';
import type { OkleykaHalf } from './date-range';

it('filterGroupsInPeriod keeps deals whose eventDate is inside period', () => {
  const groups = [
    group({ opportunityId: 'a', eventDate: '2026-07-10', saleRub: 100 }),
    group({ opportunityId: 'b', eventDate: '2026-07-20', saleRub: 100 }),
  ];
  expect(
    filterGroupsInPeriod(groups, { dateFrom: '2026-07-01', dateTo: '2026-07-15' }).map(
      (g) => g.opportunityId,
    ),
  ).toEqual(['a']);
});

it('buildHalfDistributeScope does not spend first-half fund on second-half deals', () => {
  const entries = [
    entry({
      id: 'e1',
      hours: 10,
      rateRub: 100,
      periodStart: '2026-07-01',
      periodEnd: '2026-07-15',
    }),
  ];
  const groups = [
    group({
      opportunityId: 'early',
      eventDate: '2026-07-10',
      saleRub: 100,
      okleykaCostRub: null,
      profitRub: 100,
    }),
    group({
      opportunityId: 'late',
      eventDate: '2026-07-20',
      saleRub: 900,
      okleykaCostRub: null,
      profitRub: 900,
    }),
  ];
  const scope = buildHalfDistributeScope({
    half: 'first',
    year: 2026,
    monthIndex: 6,
    splitDay: 15,
    entries,
    groups,
    rule: 'sale',
  });
  expect(scope.fund.fundRub).toBe(1000);
  expect(scope.distribution.map((d) => d.opportunityId)).toEqual(['early']);
  expect(scope.distribution[0]?.okleykaRub).toBe(1000);
});
```

Update `group()` helper in `fund.test.ts` to include `eventDate: '2026-07-01'` by default.

- [ ] **Step 2: Run tests — expect FAIL**

```bash
node node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts src/deals-board/salary/compute.test.ts src/deals-board/salary/fund.test.ts
```

Expected: FAIL — missing `eventDate` / exports.

- [ ] **Step 3: Implement**

In `compute.ts`:

```ts
import { getOpportunityEffectiveDate } from '../utils/resolve-opportunity-date';
import { toLocalInputDate } from '../utils/date-filters';

// on OkleykaDealGroup:
eventDate: string;

// in buildOkleykaDealGroups when pushing group:
const effective = getOpportunityEffectiveDate(deal);
const eventDate = effective ? (toLocalInputDate(effective) ?? effective.slice(0, 10)) : '';
```

In `fund.ts`:

```ts
import { entryHalf, halfPeriod, type OkleykaHalf } from './date-range';
import type { SalaryPeriod } from './date-range';
import { buildFundSummary, distributeRemainder, type DistributeRule, type OkleykaSalaryEntry } from './fund';
// (same file — just add functions)

export const filterGroupsInPeriod = (
  groups: OkleykaDealGroup[],
  period: SalaryPeriod,
): OkleykaDealGroup[] =>
  groups.filter((g) => {
    const day = g.eventDate.slice(0, 10);
    return day >= period.dateFrom && day <= period.dateTo;
  });

export const buildHalfDistributeScope = (args: {
  half: OkleykaHalf;
  year: number;
  monthIndex: number;
  splitDay: number;
  entries: OkleykaSalaryEntry[];
  groups: OkleykaDealGroup[];
  rule: DistributeRule;
}) => {
  const period = halfPeriod(args.year, args.monthIndex, args.half, args.splitDay);
  const halfEntries = args.entries.filter((e) => entryHalf(e.periodStart) === args.half);
  const halfGroups = filterGroupsInPeriod(args.groups, period);
  const fund = buildFundSummary(halfEntries, halfGroups);
  const distribution = distributeRemainder(halfGroups, fund.remainderRub, args.rule);
  return { period, entries: halfEntries, groups: halfGroups, fund, distribution };
};
```

Fix all `OkleykaDealGroup` test fixtures to include `eventDate`.

- [ ] **Step 4: Run tests — expect PASS**

Same vitest command. Expected: all salary compute/fund tests pass.

- [ ] **Step 5: Commit** (only if user asked to commit)

```bash
git add src/deals-board/salary/compute.ts src/deals-board/salary/compute.test.ts src/deals-board/salary/fund.ts src/deals-board/salary/fund.test.ts
git commit -m "feat(okleyka): scope fund distribute by half via eventDate"
```

---

### Task 2: Persist clear + treat 0 as null + green `> 0`

**Files:**
- Modify: `src/deals-board/salary/api.ts`
- Modify: `src/deals-board/salary/api.test.ts`
- Modify: `src/deals-board/salary/OkleykaDealCostCell.tsx`
- Modify: `src/deals-board/salary/OkleykaSalaryPage.tsx` (green condition + invalidate after successful cell save — wire callback or invalidate in page handlers)

**Interfaces:**
- Consumes: `patchOpportunity`
- Produces: `patchOkleykaDealCost(id, null)` clears field; cell never saves `0`

- [ ] **Step 1: Failing / updated api test for clear payload**

```ts
it('patchOkleykaDealCost clears with amountMicros null object', async () => {
  await patchOkleykaDealCost('opp-1', null);
  expect(patchOpportunity).toHaveBeenCalledWith('opp-1', {
    rashodOkleyka: { amountMicros: null, currencyCode: 'RUB' },
  });
});
```

(If existing test expects `{ rashodOkleyka: null }`, replace it — Twenty often ignores bare null on CURRENCY.)

Also add unit-level parse behavior in a tiny test or document in cell: after parse, `rub === 0` → `null`.

- [ ] **Step 2: Run api test — expect FAIL** if payload still bare null

- [ ] **Step 3: Implement clear + cell + green**

`api.ts`:

```ts
export const patchOkleykaDealCost = async (
  opportunityId: string,
  rubles: number | null,
): Promise<void> => {
  if (rubles === null) {
    await patchOpportunity(opportunityId, {
      rashodOkleyka: { amountMicros: null, currencyCode: 'RUB' },
    });
    return;
  }
  // existing positive branch
};
```

`OkleykaDealCostCell.tsx` inside `save`, after parse:

```ts
let nextRub = parsed.rub;
if (nextRub === 0) nextRub = null;
```

`OkleykaSalaryPage.tsx` row style:

```ts
backgroundColor:
  (group.okleykaCostRub ?? 0) > 0 ? colors.successMuted : colors.bgTertiary,
```

After successful distribute patches and after cell save: invalidate deals query so refresh matches CRM.

Preferred approach for cell: extend `OkleykaDealCostCell` with optional `onPersisted?: (id: string) => void` called after successful `patchOkleykaDealCost`; page handler:

```ts
const handlePersisted = useCallback(() => {
  void queryClient.invalidateQueries({ queryKey: ['okleyka-salary'] });
}, [queryClient]);
```

Keep existing optimistic overrides; sync-clear effect already drops overrides when server matches.

- [ ] **Step 4: Run salary tests**

```bash
node node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts src/deals-board/salary
```

Expected: PASS.

- [ ] **Step 5: Commit** (if requested)

```bash
git commit -m "fix(okleyka): clear rashodOkleyka as null currency and green only when > 0"
```

---

### Task 3: SalaryPanel dual distribute + page wiring + half-aware hint

**Files:**
- Modify: `src/deals-board/salary/SalaryPanel.tsx`
- Modify: `src/deals-board/salary/OkleykaSalaryPage.tsx`

**Interfaces:**
- Consumes: `buildHalfDistributeScope`, `DistributeRule`, `OkleykaHalf`, `formatPeriodLabel`, `formatSalaryRub`
- Produces: panel props for month vs half distribute UX

- [ ] **Step 1: Redesign SalaryPanel props**

Replace single `onDistribute` / `distributionTotalRub` / `distributionCount` / `distributeDisabledReason` / single `fund` with:

```ts
type HalfDistributeUi = {
  half: OkleykaHalf;
  fund: { fundRub: number; spentRub: number; remainderRub: number };
  distributionTotalRub: number;
  distributionCount: number;
  disabledReason: string | null;
};

type SalaryPanelProps = {
  periods: SalaryPeriod[];
  entries: OkleykaSalaryEntry[];
  historyEntries: OkleykaSalaryEntry[];
  isLoading: boolean;
  onChanged: () => void;
  distributeRule: DistributeRule;
  onDistributeRuleChange: (rule: DistributeRule) => void;
  /** One item in half mode; two in month mode; empty in range. */
  halfDistribute: HalfDistributeUi[];
  onDistributeHalf: (half: OkleykaHalf) => void;
};
```

UI rules:
- Render people `PeriodSection`s as today (filter entries by `entryHalf`).
- **Do not** render one footer fund from combined month entries.
- Under each period section (or after each): show that half’s Фонд · Раскидано · Остаток from matching `halfDistribute` entry; button «Раскидать» / «Раскидать 1-ю» / label via `formatPeriodLabel(period)`.
- Shared rule toggles once (above halves or in a single footer strip).
- Confirm UI stays inline (no `window.confirm`): «Раскидать N ₽ по M сделкам?» per pressed half.
- Half mode: `halfDistribute.length === 1` → one button.

- [ ] **Step 2: Wire OkleykaSalaryPage**

```ts
const halfDistribute = useMemo(() => {
  if (dateMode.kind === 'range') return [];
  const halves: OkleykaHalf[] =
    dateMode.kind === 'half' ? [dateMode.half] : ['first', 'second'];
  return halves.map((half) => {
    const scope = buildHalfDistributeScope({
      half,
      year,
      monthIndex,
      splitDay,
      entries: monthEntries,
      groups: displayGroups,
      rule: distributeRule,
    });
    const disabledReason =
      scope.fund.remainderRub <= 0
        ? 'Остаток фонда пуст'
        : scope.distribution.length === 0
          ? 'Нет сделок без оклейки'
          : null;
    return {
      half,
      fund: scope.fund,
      distributionTotalRub: scope.distribution.reduce((s, d) => s + d.okleykaRub, 0),
      distributionCount: scope.distribution.length,
      disabledReason,
      distribution: scope.distribution, // keep in page closure, not necessarily pass to panel
    };
  });
}, [dateMode, year, monthIndex, splitDay, monthEntries, displayGroups, distributeRule]);

const handleDistributeHalf = async (half: OkleykaHalf) => {
  const row = halfDistribute.find((h) => h.half === half);
  // recompute scope for fresh distribution list
  const scope = buildHalfDistributeScope({ ... });
  // same patch loop as current handleDistribute, then invalidate okleyka-salary
};
```

Remove old combined `fund` / `distribution` / single `handleDistribute`.

Hint:

```ts
const hintFor = (g: OkleykaDealGroup): number | null => {
  if (periods.length === 0) return null;
  const half: OkleykaHalf =
    dateMode.kind === 'half'
      ? dateMode.half
      : g.eventDate.slice(0, 10) <= halfPeriod(year, monthIndex, 'first', splitDay).dateTo
        ? 'first'
        : 'second';
  const scope = buildHalfDistributeScope({
    half,
    year,
    monthIndex,
    splitDay,
    entries: monthEntries,
    groups: displayGroups,
    rule: distributeRule,
  });
  return saleShareHintRub(g.saleRub, scope.groups, scope.fund.fundRub);
};
```

(Optional micro-opt: memoize two scopes once and reuse for hints/buttons.)

- [ ] **Step 3: Manual checklist (document in PR/report)**

1. Clear a green cell → `—`, no green; hard refresh → still empty.
2. Month mode: fill people only in 1st half; «Раскидать» on 1st → only early-month empty deals change; late-month untouched.
3. Half mode: single button still works.
4. Type `0` → clears to `—`.

- [ ] **Step 4: Run full salary unit suite**

```bash
node node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts src/deals-board/salary
```

Expected: all PASS.

- [ ] **Step 5: Commit** (if requested)

```bash
git commit -m "fix(okleyka): distribute each half fund only onto that half deals"
```

---

### Task 4: Spec self-check + verification report

**Files:**
- Read: `docs/superpowers/specs/2026-08-03-okleyka-clear-and-half-distribute-design.md`
- Optional note: `.superpowers/sdd/` only if team uses it; do not require

- [ ] **Step 1: Map acceptance → evidence**

| Acceptance | Evidence |
|------------|----------|
| Clear persists | api test + manual F5 |
| `0` → null | cell code + manual |
| Month 1st distribute ≠ 2nd deals | `buildHalfDistributeScope` test + manual |
| Half mode OK | manual / existing flow |
| Green only `> 0` | page condition |

- [ ] **Step 2: Run salary tests once more; note unrelated suite failures if any**

```bash
node node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts src/deals-board/salary
```

- [ ] **Step 3: Stop — offer push only if user asks**

---

## Spec coverage (plan self-review)

| Spec item | Task |
|-----------|------|
| Clear → null + resilient payload | Task 2 |
| `0` as clear | Task 2 |
| Green `> 0` | Task 2 |
| Invalidate/refetch after clear | Task 2 |
| `eventDate` + half deal filter | Task 1 |
| Month: two distributes | Task 3 |
| Half: one distribute | Task 3 |
| Per-half fund strip in month | Task 3 |
| Hint uses deal’s half fund | Task 3 |
| Default month unchanged | no code change |
| Non-goals (preview/undo/…) | omitted |

No TBD placeholders. Types: `HalfDistributeUi`, `buildHalfDistributeScope`, `eventDate` consistent across tasks.
