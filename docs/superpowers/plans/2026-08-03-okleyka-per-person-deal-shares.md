# Okleyka Per-Person Deal Shares Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist equal-per-person shares on deals, show person columns + sum in the Оклейщики table, sync `rashodOkleyka` from the sum, replace fund-remainder distribute.

**Architecture:** New `okleykaDealShare` object (opportunityId + salaryEntryId + amountRub). Pure helpers compute equal splits and deal sums. Page loads shares, renders dynamic columns, upserts on edit/distribute, deletes on reset, patches `rashodOkleyka`.

**Tech Stack:** twenty-sdk objects/fields, RestApiClient, React, vitest, GitHub CD.

**Spec:** `docs/superpowers/specs/2026-08-03-okleyka-per-person-deal-shares-design.md`

## Global Constraints

- Storage: persist share per (opportunity, salaryEntry).
- Distribute half H: all deals in half H × all entries in half H; `amount = entrySumRub / N` equal; overwrite those pairs.
- `rashodOkleyka` = sum of shares on deal (>0 currency, else null); no manual OkleykaDealCostCell.
- Person cells editable; month mode shows both halves' people as columns.
- Remove sale/equal/margin rule UI.
- UUIDs (v4) below — use verbatim.
- Commits at ship; no commit mid-task unless asked.
- Tests: `node node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts <path>`

### Reserved UUIDs

```
OKLEYKA_DEAL_SHARE_OBJECT = ea49cb35-623b-4cee-a310-60ddf6dccec0
OKLEYKA_DEAL_SHARE_AMOUNT_RUB_FIELD = 93440dfd-fb5a-40f0-aa14-8db324ab5b87
OKLEYKA_DEAL_SHARE_OPPORTUNITY_ID_FIELD = d376b835-18a6-4d03-bb9e-861d49544ec6
OKLEYKA_DEAL_SHARE_SALARY_ENTRY_ID_FIELD = e7158b9d-57af-4c32-8900-8cdc86cb4967
```

(Use TEXT UUID fields for `opportunityId` / `salaryEntryId` to avoid Opportunity reverse-relation scaffolding; REST filters by these strings.)

---

## File map

| File | Role |
|------|------|
| `src/constants/universal-identifiers.ts` | New UUID exports |
| `src/objects/okleyka-deal-share.object.ts` | Object definition |
| `src/deals-board/salary/shares.ts` | Pure: equal split, sum by deal, column model |
| `src/deals-board/salary/shares.test.ts` | Unit tests |
| `src/deals-board/salary/shares-api.ts` | REST CRUD / list by opportunity ids |
| `src/deals-board/salary/OkleykaSalaryPage.tsx` | Columns, wire distribute/reset/edit |
| `src/deals-board/salary/SalaryPanel.tsx` | Remove rule buttons |
| `src/deals-board/salary/PersonShareCell.tsx` | Editable cell (optional small file) |
| `src/deals-board/salary/fund.ts` | Keep entrySumRub; old remainder distribute can remain unused or thin-wrap |

---

### Task 1: Object + share math helpers

**Files:**
- Modify: `src/constants/universal-identifiers.ts`
- Create: `src/objects/okleyka-deal-share.object.ts`
- Create: `src/deals-board/salary/shares.ts`
- Create: `src/deals-board/salary/shares.test.ts`

**Interfaces:**

```ts
export type OkleykaDealShare = {
  id: string;
  opportunityId: string;
  salaryEntryId: string;
  amountRub: number;
};

export const buildEqualPersonShares = (
  entryIds: string[],
  entrySumById: Record<string, number>,
  opportunityIds: string[],
): Array<{ opportunityId: string; salaryEntryId: string; amountRub: number }> => ...

export const sumSharesByOpportunity = (
  shares: Array<{ opportunityId: string; amountRub: number }>,
): Map<string, number> => ...

export const roundEqualParts = (totalRub: number, n: number): number[] => ...
// n parts summing to totalRub (integer ₽)
```

- [ ] **Step 1: Failing tests**

```ts
it('roundEqualParts splits 10000 into 15 parts summing to 10000', () => {
  const parts = roundEqualParts(10000, 15);
  expect(parts).toHaveLength(15);
  expect(parts.reduce((a, b) => a + b, 0)).toBe(10000);
  expect(parts.every((p) => p === 666 || p === 667)).toBe(true);
});

it('buildEqualPersonShares assigns per entry across deals', () => {
  const rows = buildEqualPersonShares(
    ['e1', 'e2'],
    { e1: 10000, e2: 20000 },
    ['d1', 'd2', 'd3'],
  );
  expect(rows).toHaveLength(6);
  const e1 = rows.filter((r) => r.salaryEntryId === 'e1');
  expect(e1.reduce((s, r) => s + r.amountRub, 0)).toBe(10000);
});

it('sumSharesByOpportunity totals amounts', () => {
  const map = sumSharesByOpportunity([
    { opportunityId: 'd1', amountRub: 100 },
    { opportunityId: 'd1', amountRub: 50 },
    { opportunityId: 'd2', amountRub: 10 },
  ]);
  expect(map.get('d1')).toBe(150);
  expect(map.get('d2')).toBe(10);
});
```

- [ ] **Step 2: Run FAIL** then implement object + helpers → PASS

Object fields: `amountRub` NUMBER; `opportunityId` TEXT; `salaryEntryId` TEXT (labels in Russian).

- [ ] **Step 3: No commit**

---

### Task 2: shares-api REST

**Files:**
- Create: `src/deals-board/salary/shares-api.ts`
- Create: `src/deals-board/salary/shares-api.test.ts` (mock RestApiClient like salary-entries-api tests if present)

**Interfaces:**

```ts
fetchSharesForOpportunities(opportunityIds: string[]): Promise<OkleykaDealShare[]>
upsertShare(input: { opportunityId; salaryEntryId; amountRub; existingId?: string }): Promise<void>
deleteShare(id: string): Promise<void>
deleteShares(ids: string[]): Promise<void> // sequential or Promise.allSettled
```

List filter: batch opportunity ids (chunk if needed). Normalize like salary entries.

- [ ] **Step 1–4:** TDD normalize + upsert payload if practical; else implement + light test; no commit

---

### Task 3: Distribute / reset using shares

**Files:**
- Modify: `src/deals-board/salary/shares.ts` (add `planHalfPersonDistribute`)
- Modify: `src/deals-board/salary/shares.test.ts`
- Modify: `src/deals-board/salary/OkleykaSalaryPage.tsx` (handlers)

**Interfaces:**

```ts
export const planHalfPersonDistribute = (args: {
  entries: OkleykaSalaryEntry[];
  opportunityIds: string[];
}): Array<{ opportunityId: string; salaryEntryId: string; amountRub: number }>
```

Uses `entrySumRub` from fund.ts + `buildEqualPersonShares`.

Page `handleDistributeHalf`:
1. Scope half entries + half deal ids (reuse `filterGroupsInPeriod` / `entryHalf`)
2. `planHalfPersonDistribute`
3. Load existing shares for those deals; upsert each planned row (match by opportunityId+salaryEntryId)
4. For each affected deal: `patchOkleykaDealCost(id, sum or null)`
5. Invalidate shares + salary queries

`handleResetOkleyka`:
1. All shares for `displayGroups` ids → delete
2. patch each deal cost null
3. invalidate

- [ ] Tests for `planHalfPersonDistribute`
- [ ] Wire handlers; remove old `distributeRemainder` call path from page
- [ ] No commit

---

### Task 4: Table columns + editable cells + SalaryPanel cleanup

**Files:**
- Create: `src/deals-board/salary/PersonShareCell.tsx` (or inline)
- Modify: `src/deals-board/salary/OkleykaSalaryPage.tsx`
- Modify: `src/deals-board/salary/SalaryPanel.tsx`

**UI:**

- Column set for people = `monthEntries` filtered by visible halves (month: all month entries; half mode: that half only). Sort by name.
- Header = entry.name
- Cell = `PersonShareCell` amount for `(opportunityId, entry.id)`; empty if no share
- **Сумма** column = sum for deal
- Remove `OkleykaDealCostCell`; remove sale-share `hintRub`
- Prefetch/load shares via react-query key `['okleyka-shares', opportunityIdsKey]`
- SalaryPanel: remove `DISTRIBUTE_RULES` buttons and `distributeRule` props if unused

Child rows: empty tds for new columns; fix colSpan.

- [ ] Manual layout check after apply
- [ ] No commit

---

### Task 5: Ship

- [ ] `vitest` salary suite green
- [ ] Commit feature + docs
- [ ] Push staging → CD OK
- [ ] PR/merge main → CD OK
- [ ] Hard-refresh note

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| Object persist shares | 1–2 |
| Equal per person / half deals | 1, 3 |
| rashodOkleyka sync; no manual cell | 3–4 |
| Editable person cells + sum column | 4 |
| Remove rules UI | 4 |
| Month both halves columns | 4 |
| Deploy | 5 |
