# Okleyka Reset + Zero-Sale Distribute Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a period-wide «Сбросить оклейку» button and include `saleRub = 0` deals in fund distribute (equal fallback for sale/margin).

**Architecture:** Extend `distributeRemainder` / `ruleShares` in `fund.ts` for zero-sale targets. Add pure `filledOkleykaDealIds(groups)` helper; wire confirm+clear in `SalaryPanel` / `OkleykaSalaryPage` via existing `patchOkleykaDealCost(null)` optimistic path.

**Tech Stack:** React, vitest, Twenty REST patch, GitHub CD.

**Spec:** `docs/superpowers/specs/2026-08-03-okleyka-reset-and-zero-sale-distribute-design.md`

## Global Constraints

- Reset scope: all deals in visible `displayGroups` with `(okleykaCostRub ?? 0) > 0`.
- Label: `Сбросить оклейку`; confirm before patch.
- Distribute targets: empty okleyka (`null` or `0`), **including** `saleRub = 0`.
- sale/margin: if any target `saleRub === 0` OR `sum(saleRub) === 0` → use equal shares for full target set.
- Commits when shipping; push staging then main for CD.
- Windows tests: `node node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts <path>`.

---

## File map

| File | Role |
|------|------|
| `src/deals-board/salary/fund.ts` | Target filter; equal fallback; `filledOkleykaDealIds` |
| `src/deals-board/salary/fund.test.ts` | Zero-sale + reset-id helper tests |
| `src/deals-board/salary/SalaryPanel.tsx` | Reset button + confirm UI |
| `src/deals-board/salary/OkleykaSalaryPage.tsx` | `handleResetOkleyka` wiring |

---

### Task 1: Zero-sale distribute + filled-ids helper

**Files:**
- Modify: `src/deals-board/salary/fund.ts`
- Modify: `src/deals-board/salary/fund.test.ts`

**Interfaces:**
- Produces:
  - `distributeRemainder` includes `saleRub === 0`
  - `filledOkleykaDealIds(groups: OkleykaDealGroup[]): string[]` — ids where `(okleykaCostRub ?? 0) > 0`

- [ ] **Step 1: Failing tests**

Update/remove the old expectation that `saleRub: 0` yields `[]`. Add:

```ts
it('sale rule includes saleRub 0 via equal fallback', () => {
  const groups = [
    group({ opportunityId: 'a', saleRub: 200, okleykaCostRub: null }),
    group({ opportunityId: 'z', saleRub: 0, okleykaCostRub: null }),
  ];
  const result = distributeRemainder(groups, 1000, 'sale');
  expect(result).toHaveLength(2);
  expect(result.reduce((s, r) => s + r.okleykaRub, 0)).toBe(1000);
  expect(result.find((r) => r.opportunityId === 'z')?.okleykaRub).toBe(500);
  expect(result.find((r) => r.opportunityId === 'a')?.okleykaRub).toBe(500);
});

it('sale rule stays proportional when all targets have sale > 0', () => {
  const groups = [
    group({ opportunityId: 'a', saleRub: 200, okleykaCostRub: null }),
    group({ opportunityId: 'b', saleRub: 100, okleykaCostRub: null }),
  ];
  const result = distributeRemainder(groups, 900, 'sale');
  expect(result.find((r) => r.opportunityId === 'a')?.okleykaRub).toBe(600);
  expect(result.find((r) => r.opportunityId === 'b')?.okleykaRub).toBe(300);
});

it('filledOkleykaDealIds returns only positive costs', () => {
  expect(
    filledOkleykaDealIds([
      group({ opportunityId: 'a', okleykaCostRub: 100 }),
      group({ opportunityId: 'b', okleykaCostRub: null }),
      group({ opportunityId: 'c', okleykaCostRub: 0 }),
    ]),
  ).toEqual(['a']);
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
node node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts src/deals-board/salary/fund.test.ts
```

- [ ] **Step 3: Implement**

In `fund.ts`:

```ts
export const filledOkleykaDealIds = (groups: OkleykaDealGroup[]): string[] =>
  groups.filter((g) => (g.okleykaCostRub ?? 0) > 0).map((g) => g.opportunityId);

export const distributeRemainder = (
  groups: OkleykaDealGroup[],
  remainderRub: number,
  rule: DistributeRule = 'sale',
): Array<{ opportunityId: string; okleykaRub: number }> => {
  if (remainderRub <= 0) return [];
  const targets = groups.filter(
    (g) => g.okleykaCostRub === null || g.okleykaCostRub === 0,
  );
  if (targets.length === 0) return [];

  const totalSale = targets.reduce((s, g) => s + g.saleRub, 0);
  const effectiveRule: DistributeRule =
    (rule === 'sale' || rule === 'margin') &&
    (totalSale <= 0 || targets.some((g) => g.saleRub === 0))
      ? 'equal'
      : rule;

  const shares = ruleShares(targets, remainderRub, effectiveRule);
  // ... same rounding as today
};
```

Fix `distribution edge cases` test: `distributeRemainder([group({ saleRub: 0 })], 500)` should now return a positive equal share (500), not `[]`.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit only if controller asks** (during SDD: leave working tree; controller commits at ship)

---

### Task 2: Reset UI

**Files:**
- Modify: `src/deals-board/salary/SalaryPanel.tsx`
- Modify: `src/deals-board/salary/OkleykaSalaryPage.tsx`

**Interfaces:**
- Consumes: `filledOkleykaDealIds`, `patchOkleykaDealCost`, optimistic handlers
- Produces: props on `SalaryPanel`:
  - `filledOkleykaCount: number`
  - `onResetOkleyka: () => void`
  - optional busy/error already present

- [ ] **Step 1: SalaryPanel UI**

Above distribute blocks (after rule radios / before half strips):

- Button `Сбросить оклейку`, disabled when `filledOkleykaCount === 0` or busy.
- Confirm pattern mirroring distribute: first click → confirming state showing `Сбросить N сделок?` + Cancel / Confirm; Confirm calls `onResetOkleyka`.

- [ ] **Step 2: Page handler**

```ts
const handleResetOkleyka = async () => {
  setDistributeError(null);
  const ids = filledOkleykaDealIds(displayGroups);
  let hadFailure = false;
  for (const id of ids) {
    const prev = displayGroups.find((g) => g.opportunityId === id)?.okleykaCostRub ?? null;
    handleOptimistic(id, null);
    try {
      await patchOkleykaDealCost(id, null);
    } catch {
      hadFailure = true;
      handleRollback(id, prev);
    }
  }
  if (hadFailure) setDistributeError('Не удалось сбросить оклейку по одной или нескольким сделкам');
  else if (ids.length > 0) void queryClient.invalidateQueries({ queryKey: ['okleyka-salary'] });
};
```

Pass `filledOkleykaCount={filledOkleykaDealIds(displayGroups).length}` and `onResetOkleyka={() => void handleResetOkleyka()}`.

- [ ] **Step 3: Smoke note** — Task 3

- [ ] **Step 4: No commit unless asked**

---

### Task 3: Ship staging + prod

- [ ] Unit: `node … vitest … src/deals-board/salary/`
- [ ] Commit feature (+ plan/spec if needed)
- [ ] Push `staging` → wait CD success
- [ ] Merge/push `main` → wait CD success
- [ ] Report run URLs

---

## Spec coverage

| Spec | Task |
|------|------|
| Zero-sale in distribute + equal fallback | 1 |
| filled ids / clear criterion `> 0` | 1 |
| Reset button + confirm + visible period | 2 |
| staging + prod | 3 |
