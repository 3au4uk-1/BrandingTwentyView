# Okleyka Date Column + Bonus + Restorations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add event-date column (default sort ↑) on Оклейщики deals table, persist salary `bonusRub` in fund math, and show restoration position count + yellow chips from crmparser `restorationMatch`.

**Architecture:** Reuse existing `OkleykaDealGroup.eventDate` for a sortable first column. Add CRM NUMBER field `bonusRub` on `okleykaSalaryEntry` and fold it into `entrySumRub`. Prefetch line-item list-status for visible positions; count `restorationMatch` above distribute UI and render the same yellow chip as deals-board on child rows.

**Tech Stack:** React, TanStack Query, twenty-sdk object fields, RestApiClient, vitest, `yarn twenty apply`.

**Spec:** `docs/superpowers/specs/2026-08-03-okleyka-date-column-bonus-design.md`

## Global Constraints

- Date display: `Intl.DateTimeFormat('ru-RU', { dateStyle: 'short' })`; empty → `—`.
- When `sort === null`, table order is date ↑; empty dates last.
- `entrySumRub = hours * rateRub + bonusRub`; missing bonus → `0`.
- Restoration identity: crmparser `restorationMatch` only (not tip `RESTAVRACIYA`, not `restavraciyaPechati`).
- Chip copy exactly: `реставрация · 0 ₽`, `color="yellow"`, reuse `Chip`.
- UUID for new field must be UUID v4: `bf973b3c-e6d5-4336-a29b-42824924bae8`.
- Commits only when the user asks (do not auto-commit unless requested).
- Apply to staging then prod after implementation; hard-refresh UI.

---

## File map

| File | Role |
|------|------|
| `src/constants/universal-identifiers.ts` | Export `OKLEYKA_SALARY_ENTRY_BONUS_RUB_FIELD_UNIVERSAL_IDENTIFIER` |
| `src/objects/okleyka-salary-entry.object.ts` | Add `bonusRub` NUMBER field |
| `src/deals-board/salary/fund.ts` | `bonusRub` on entry type; `entrySumRub` includes bonus |
| `src/deals-board/salary/fund.test.ts` | Bonus fund tests |
| `src/deals-board/salary/salary-entries-api.ts` | Normalize/create/update `bonusRub` |
| `src/deals-board/salary/compute.ts` | `OkleykaSortKey` + `'date'`; sort empty last; Excel date col; `formatOkleykaEventDate` |
| `src/deals-board/salary/compute.test.ts` | Date sort + format + excel tests |
| `src/deals-board/salary/restoration-count.ts` | Pure `countRestorationMatches(statuses)` |
| `src/deals-board/salary/restoration-count.test.ts` | Count helper tests |
| `src/deals-board/salary/SalaryPanel.tsx` | Bonus input column; create with bonus 0 |
| `src/deals-board/salary/OkleykaSalaryPage.tsx` | Date column/sort default; prefetch; count; chips; aside width |

---

### Task 1: Date column + default date sort + Excel

**Files:**
- Modify: `src/deals-board/salary/compute.ts`
- Modify: `src/deals-board/salary/compute.test.ts`
- Modify: `src/deals-board/salary/OkleykaSalaryPage.tsx`

**Interfaces:**
- Consumes: `OkleykaDealGroup.eventDate: string`
- Produces:
  - `OkleykaSortKey` includes `'date'`
  - `formatOkleykaEventDate(eventDate: string): string` (`—` if empty/invalid)
  - `sortOkleykaDealGroups` empty dates last for `'date'`
  - `dealGroupsToXlsxMatrix` first data column after Bitrix or include `Дата` as `YYYY-MM-DD`

- [ ] **Step 1: Failing tests**

Add to `compute.test.ts`:

```ts
import {
  formatOkleykaEventDate,
  sortOkleykaDealGroups,
  dealGroupsToXlsxMatrix,
} from './compute';

it('formatOkleykaEventDate uses ru short or em dash', () => {
  expect(formatOkleykaEventDate('')).toBe('—');
  expect(formatOkleykaEventDate('2026-07-20')).toMatch(/20/);
});

it('sorts by date asc with empty last', () => {
  const groups = [
    group({ opportunityId: 'b', eventDate: '2026-07-20', dealName: 'B' }),
    group({ opportunityId: 'a', eventDate: '2026-07-10', dealName: 'A' }),
    group({ opportunityId: 'z', eventDate: '', dealName: 'Z' }),
  ];
  const sorted = sortOkleykaDealGroups(groups, 'date', 'asc');
  expect(sorted.map((g) => g.opportunityId)).toEqual(['a', 'b', 'z']);
});

it('xlsx includes Дата column as YYYY-MM-DD', () => {
  const matrix = dealGroupsToXlsxMatrix([
    group({ eventDate: '2026-07-10', dealName: 'A' }),
  ]);
  expect(matrix[0]).toContain('Дата');
  const dateIdx = matrix[0]!.indexOf('Дата');
  expect(matrix[1]![dateIdx]).toBe('2026-07-10');
});
```

(Reuse or add local `group()` helper matching `fund.test.ts` shape if not already in compute.test.)

- [ ] **Step 2: Run tests — expect FAIL**

```bash
yarn test:unit src/deals-board/salary/compute.test.ts
```

- [ ] **Step 3: Implement compute helpers**

In `compute.ts`:

```ts
export type OkleykaSortKey =
  | 'date'
  | 'sale'
  | 'print'
  | 'freza'
  | 'okleyka'
  | 'profit'
  | 'margin';

const shortDateFormatter = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short' });

export const formatOkleykaEventDate = (eventDate: string): string => {
  if (!eventDate) return '—';
  const date = new Date(eventDate.length === 10 ? `${eventDate}T12:00:00` : eventDate);
  if (Number.isNaN(date.getTime())) return '—';
  return shortDateFormatter.format(date);
};

export const sortOkleykaDealGroups = (
  groups: OkleykaDealGroup[],
  key: OkleykaSortKey,
  direction: 'asc' | 'desc',
): OkleykaDealGroup[] => {
  const sign = direction === 'asc' ? 1 : -1;
  return [...groups].sort((a, b) => {
    if (key === 'date') {
      const aEmpty = !a.eventDate;
      const bEmpty = !b.eventDate;
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;
      return sign * a.eventDate.localeCompare(b.eventDate);
    }
    return sign * (groupMetric(a, key) - groupMetric(b, key));
  });
};
```

Update `dealGroupsToXlsxMatrix` header/rows to include `'Дата'` with `g.eventDate` (empty string if missing). Place Дата after Сделка or as early column — prefer after Bitrix/Сделка: `['Bitrix','Сделка','Дата', ...]`.

- [ ] **Step 4: Wire OkleykaSalaryPage**

- Import `formatOkleykaEventDate`.
- Add sortable header `Дата` with key `'date'` as first data column after expand.
- Parent row: date cell with `formatOkleykaEventDate(group.eventDate)`.
- Child rows: empty date `<td />`.
- Change groups memo:

```ts
const groups = useMemo(() => {
  if (sort) return sortOkleykaDealGroups(displayGroups, sort.key, sort.direction);
  return sortOkleykaDealGroups(displayGroups, 'date', 'asc');
}, [displayGroups, sort]);
```

- Keep `sort` initial state `null`.
- Fix `colSpan` for empty state (+1 for date).
- Child row cells: add one empty `<td>` for date column alignment.

- [ ] **Step 5: Re-run tests — expect PASS**

```bash
yarn test:unit src/deals-board/salary/compute.test.ts
```

- [ ] **Step 6: Commit only if user asked**

---

### Task 2: `bonusRub` schema + fund formula + API

**Files:**
- Modify: `src/constants/universal-identifiers.ts`
- Modify: `src/objects/okleyka-salary-entry.object.ts`
- Modify: `src/deals-board/salary/fund.ts`
- Modify: `src/deals-board/salary/fund.test.ts`
- Modify: `src/deals-board/salary/salary-entries-api.ts`

**Interfaces:**
- Produces:
  - `OKLEYKA_SALARY_ENTRY_BONUS_RUB_FIELD_UNIVERSAL_IDENTIFIER = 'bf973b3c-e6d5-4336-a29b-42824924bae8'`
  - `OkleykaSalaryEntry.bonusRub: number`
  - `entrySumRub(entry) => entry.hours * entry.rateRub + entry.bonusRub`
  - API create/update/normalize include `bonusRub` (default `0`)

- [ ] **Step 1: Failing fund tests**

Update `entry()` helper default `bonusRub: 0`. Add:

```ts
it('entrySumRub includes bonus', () => {
  expect(entrySumRub(entry({ hours: 10, rateRub: 500, bonusRub: 1000 }))).toBe(6000);
  expect(entrySumRub(entry({ hours: 10, rateRub: 500, bonusRub: 0 }))).toBe(5000);
});

it('sumFundRub includes bonuses', () => {
  expect(
    sumFundRub([
      entry({ hours: 10, rateRub: 500, bonusRub: 500 }),
      entry({ id: 'e2', hours: 8, rateRub: 600, bonusRub: 200 }),
    ]),
  ).toBe(10500);
});
```

Update existing `fund and remainder` expectations if they break (add `bonusRub: 0` to helpers — sums unchanged).

- [ ] **Step 2: Run — expect FAIL**

```bash
yarn test:unit src/deals-board/salary/fund.test.ts
```

- [ ] **Step 3: Schema + formula + API**

`universal-identifiers.ts`:

```ts
export const OKLEYKA_SALARY_ENTRY_BONUS_RUB_FIELD_UNIVERSAL_IDENTIFIER =
  'bf973b3c-e6d5-4336-a29b-42824924bae8';
```

`okleyka-salary-entry.object.ts` — add field after `rateRub`:

```ts
{
  universalIdentifier: OKLEYKA_SALARY_ENTRY_BONUS_RUB_FIELD_UNIVERSAL_IDENTIFIER,
  name: 'bonusRub',
  type: FieldType.NUMBER,
  label: 'Бонус ₽',
  icon: 'IconCoin',
  settings: { dataType: NumberDataType.FLOAT, decimals: 2 },
},
```

`fund.ts`:

```ts
export type OkleykaSalaryEntry = {
  id: string;
  name: string;
  hours: number;
  rateRub: number;
  bonusRub: number;
  periodStart: string;
  periodEnd: string;
};

export const entrySumRub = (entry: OkleykaSalaryEntry): number =>
  entry.hours * entry.rateRub + entry.bonusRub;
```

`salary-entries-api.ts` — in `normalizeEntry`:

```ts
bonusRub:
  typeof record.bonusRub === 'number' && Number.isFinite(record.bonusRub)
    ? record.bonusRub
    : 0,
```

Extend create/update `Partial`/`input` with `bonusRub?: number`.

- [ ] **Step 4: Run — expect PASS**

```bash
yarn test:unit src/deals-board/salary/fund.test.ts
```

- [ ] **Step 5: Commit only if user asked**

---

### Task 3: SalaryPanel bonus UI

**Files:**
- Modify: `src/deals-board/salary/SalaryPanel.tsx`
- Modify: `src/deals-board/salary/OkleykaSalaryPage.tsx` (aside width `320` → `360`)

**Interfaces:**
- Consumes: `updateSalaryEntry(id, { bonusRub })`, `createSalaryEntry({ ..., bonusRub: 0 })`, `entrySumRub`

- [ ] **Step 1: EntryRow — add bonus draft + commit**

Mirror `commitRate` for bonus. Grid columns:

```ts
gridTemplateColumns: '1fr 48px 56px 56px auto 24px'
```

Order: name | hours | rate | bonus | sum | ×  

Live sum:

```ts
formatSalaryRub(
  entrySumRub({
    ...entry,
    hours: Number(hoursDraft) || 0,
    rateRub: Number(rateDraft) || 0,
    bonusRub: Number(bonusDraft) || 0,
  }),
)
```

Sync drafts when `entry.hours/rateRub/bonusRub` change (if current code resets on prop change — add `useEffect` or key=`entry.id` already remounts; if not, set drafts from entry when ids match on blur revert only — follow existing hours/rate pattern: local state init from entry; parent refetch remounts via key).

- [ ] **Step 2: Add-person row**

Add bonus input (placeholder `бон`, default empty → save `0`). Grid: `'1fr 48px 56px 56px auto'`. `createSalaryEntry({ ..., bonusRub: parseNonNegative(addBonus) ?? 0 })`.

Copy-from-previous: pass `bonusRub: prev.bonusRub`.

- [ ] **Step 3: Aside width**

In `OkleykaSalaryPage.tsx`: `width: 360` on aside.

- [ ] **Step 4: Manual smoke after apply** (save for Task 5)

- [ ] **Step 5: Commit only if user asked**

---

### Task 4: Restoration count + chips

**Files:**
- Create: `src/deals-board/salary/restoration-count.ts`
- Create: `src/deals-board/salary/restoration-count.test.ts`
- Modify: `src/deals-board/salary/OkleykaSalaryPage.tsx`

**Interfaces:**
- Consumes: `usePrefetchLineItemListStatuses`, `useLineItemListStatus`, `Chip`, `LineItemListStatus`
- Produces: `countRestorationMatches(statuses: Array<LineItemListStatus | null | undefined>): number`

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from 'vitest';
import { countRestorationMatches } from './restoration-count';

describe('countRestorationMatches', () => {
  it('counts only restorationMatch true', () => {
    expect(
      countRestorationMatches([
        { restorationMatch: true, blacklisted: false, podryadMatch: false, bannerMatch: false, pattern: null, dealId: null, dealTwentyId: null },
        { restorationMatch: false, blacklisted: false, podryadMatch: false, bannerMatch: false, pattern: null, dealId: null, dealTwentyId: null },
        null,
        undefined,
      ]),
    ).toBe(1);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
yarn test:unit src/deals-board/salary/restoration-count.test.ts
```

- [ ] **Step 3: Implement helper**

```ts
import type { LineItemListStatus } from '../api/crmparser';

export const countRestorationMatches = (
  statuses: Array<LineItemListStatus | null | undefined>,
): number => statuses.reduce((n, s) => n + (s?.restorationMatch ? 1 : 0), 0);
```

- [ ] **Step 4: Wire page**

```ts
const lineItemIds = useMemo(
  () => displayGroups.flatMap((g) => g.positions.map((p) => p.lineItemId)),
  [displayGroups],
);
const listStatusQuery = usePrefetchLineItemListStatuses(lineItemIds, lineItemIds.length > 0);
const restorationCount = useMemo(() => {
  const statuses = listStatusQuery.data
    ? lineItemIds.map((id) => listStatusQuery.data?.[id])
    : [];
  return countRestorationMatches(statuses);
}, [listStatusQuery.data, lineItemIds]);
```

Above aside `SalaryPanel` (над раскидыванием — put a compact line at top of aside before panel, or pass prop into panel above distribute blocks). Preferred: in `OkleykaSalaryPage` aside, before `<SalaryPanel>`:

```tsx
<div style={{ fontSize: font.sizeSm, color: colors.textSecondary, marginBottom: spacing.xs }}>
  Реставрации: <strong style={{ color: colors.text }}>{restorationCount}</strong>
</div>
```

Child position name cell: flex row with name + optional chip component:

```tsx
const PositionNameCell = ({ lineItemId, positionName }: { lineItemId: string; positionName: string }) => {
  const theme = useTheme();
  const { data } = useLineItemListStatus(lineItemId);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <span ...>{positionName}</span>
      {data?.restorationMatch ? (
        <Chip text="реставрация · 0 ₽" color="yellow" theme={theme} />
      ) : null}
    </div>
  );
};
```

(Can live inline in `OkleykaSalaryPage.tsx` or small local component in same file.)

- [ ] **Step 5: Run — expect PASS**

```bash
yarn test:unit src/deals-board/salary/restoration-count.test.ts src/deals-board/salary/compute.test.ts src/deals-board/salary/fund.test.ts
```

- [ ] **Step 6: Commit only if user asked**

---

### Task 5: Apply staging + prod

**Files:** none (ops)

- [ ] **Step 1: Unit suite for salary**

```bash
yarn test:unit src/deals-board/salary/
```

Expected: all pass.

- [ ] **Step 2: Apply staging**

Confirm Twenty CLI target is staging (check `.twenty` / env / skill docs). Then:

```bash
yarn twenty apply
```

If Windows path errors, retry with documented workaround from twenty-crm-app skill notes; report outcome.

- [ ] **Step 3: Smoke staging**

Hard-refresh Оклейщики: date column default ↑; sort toggle; bonus save; fund = hours×rate+bonus; «Реставрации: N»; chips on matching positions.

- [ ] **Step 4: Apply prod**

Switch target to prod (same process as prior ship), `yarn twenty apply`, hard-refresh smoke again.

- [ ] **Step 5: Report URLs / any apply failures**

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| Date column first + ru short | 1 |
| Default date ↑; click cycle | 1 |
| Excel Дата YYYY-MM-DD | 1 |
| bonusRub CRM field UUID | 2 |
| entrySumRub + fund | 2 |
| Bonus UI + aside width | 3 |
| Restoration count A + chips | 4 |
| staging + prod apply | 5 |
