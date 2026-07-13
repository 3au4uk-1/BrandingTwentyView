# Manual Twenty Line Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Manual positions created in BrandingTwentyView sync to crmparser after first meaningful edit, survive resync, and contribute to `opportunity.amount` while active.

**Architecture:** Board pushes edits to crmparser via logic-function proxy (`/sync`, `/archive`). Parser stores `deal_items` with `classification=manual_twenty` and `sync_override=include`. Resync matches manual rows by `twenty_id`, parsed rows by normalized name. Draft rows (`istochnik=TWENTY_RUCHNAYA`, not yet in parser) are protected from resync deletion.

**Tech Stack:** Node.js ESM, Express, better-sqlite3, Vitest; React 19, TypeScript, twenty-client-sdk, @tanstack/react-query.

**Spec:** `docs/superpowers/specs/2026-07-13-manual-twenty-line-items-design.md`

---

## File Structure

### crmparserv2

| File | Responsibility |
|------|----------------|
| `backend/src/services/manual-twenty-line-item.js` | Upsert/archive `deal_items` from Twenty payload |
| `backend/src/services/twenty-line-items-sync.js` | Extended `computeLineItemDiff` (twenty_id + draft guard) |
| `backend/src/services/twenty-line-item.js` | Set `istochnik=PARSER` on parser-created line items |
| `backend/src/routes/twenty.js` | `POST .../sync`, `POST .../archive` routes |
| `backend/tests/manual-twenty-line-item.test.js` | Service unit tests |
| `backend/tests/twenty-line-items-sync.test.js` | Extended diff tests |
| `backend/tests/twenty-routes.test.js` | Route integration tests |

### BrandingTwentyView

| File | Responsibility |
|------|----------------|
| `src/fields/istochnik.field.ts` | SELECT field on `dealLineItem` (scaffold) |
| `src/constants/line-item-origin.ts` | `PARSER`, `TWENTY_RUCHNAYA` enum values |
| `src/constants/universal-identifiers.ts` | Logic function + field UUIDs |
| `src/logic-functions/line-item-sync.ts` | Proxy POST sync |
| `src/logic-functions/line-item-archive.ts` | Proxy POST archive |
| `src/deals-board/utils/manual-line-item-sync.ts` | Meaningful-change detector + payload builder |
| `src/deals-board/api/crmparser.ts` | `syncManualLineItem`, `archiveManualLineItem` |
| `src/deals-board/api/line-items.ts` | Set `istochnik` on create |
| `src/deals-board/hooks/useLineItems.ts` | Baseline tracking, post-create patch |
| `src/deals-board/hooks/useManualLineItemParserSync.ts` | Trigger sync after updates |
| `src/deals-board/realtime/apply-object-record-event.ts` | Archive on `DELETED` |
| `package.json` | Version bump `0.2.81` → `0.2.82` |

---

## Part A — crmparserv2

### Task 1: Manual line item service (upsert + archive)

**Files:**
- Create: `backend/src/services/manual-twenty-line-item.js`
- Test: `backend/tests/manual-twenty-line-item.test.js`

- [ ] **Step 1: Write failing tests**

```js
// backend/tests/manual-twenty-line-item.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, initDb } from '../src/db/connection.js';
import { migrate } from '../src/db/migrate.js';
import {
  upsertManualTwentyLineItem,
  archiveManualTwentyLineItem,
} from '../src/services/manual-twenty-line-item.js';

describe('manual-twenty-line-item', () => {
  beforeEach(() => {
    initDb();
    migrate();
    const db = getDb();
    db.prepare('DELETE FROM deal_items').run();
    db.prepare('DELETE FROM deals').run();
    db.prepare(`
      INSERT INTO deals (crm_event_id, deal_key, data_source, title, twenty_id, approval_status)
      VALUES ('e1', 'e1#cal', 'calendar', 'Deal', 'opp-1', 'synced')
    `).run();
  });

  it('upsertManualTwentyLineItem creates manual row', () => {
    const db = getDb();
    const result = upsertManualTwentyLineItem(db, 'li-1', {
      opportunityId: 'opp-1',
      name: 'Баннер',
      kolichestvo: 2,
      amountMicros: 1_500_000_000,
      currencyCode: 'RUB',
    });
    const row = db.prepare('SELECT * FROM deal_items WHERE twenty_id = ?').get('li-1');
    expect(result.dealItemId).toBe(row.id);
    expect(row.classification).toBe('manual_twenty');
    expect(row.sync_override).toBe('include');
    expect(row.name).toBe('Баннер');
    expect(row.quantity_num).toBe(2);
    expect(row.sum).toBe(1500);
  });

  it('upsertManualTwentyLineItem updates existing row', () => {
    const db = getDb();
    upsertManualTwentyLineItem(db, 'li-1', {
      opportunityId: 'opp-1',
      name: 'A',
      kolichestvo: 1,
      amountMicros: 0,
      currencyCode: 'RUB',
    });
    upsertManualTwentyLineItem(db, 'li-1', {
      opportunityId: 'opp-1',
      name: 'B',
      kolichestvo: 3,
      amountMicros: 500_000_000,
      currencyCode: 'RUB',
    });
    const row = db.prepare('SELECT * FROM deal_items WHERE twenty_id = ?').get('li-1');
    expect(row.name).toBe('B');
    expect(row.quantity_num).toBe(3);
  });

  it('archiveManualTwentyLineItem sets exclude', () => {
    const db = getDb();
    upsertManualTwentyLineItem(db, 'li-1', {
      opportunityId: 'opp-1',
      name: 'A',
      kolichestvo: 1,
      amountMicros: 0,
      currencyCode: 'RUB',
    });
    archiveManualTwentyLineItem(db, 'li-1');
    const row = db.prepare('SELECT sync_override FROM deal_items WHERE twenty_id = ?').get('li-1');
    expect(row.sync_override).toBe('exclude');
  });

  it('upsert throws 404 when deal missing', () => {
    const db = getDb();
    expect(() =>
      upsertManualTwentyLineItem(db, 'li-1', {
        opportunityId: 'missing',
        name: 'A',
        kolichestvo: 1,
        amountMicros: 0,
        currencyCode: 'RUB',
      }),
    ).toThrow(/not found/i);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd backend && npm test -- manual-twenty-line-item.test.js
```

- [ ] **Step 3: Implement service**

```js
// backend/src/services/manual-twenty-line-item.js
export const MANUAL_TWENTY_CLASSIFICATION = 'manual_twenty';

export function findDealByTwentyOpportunityId(db, opportunityId) {
  const deal = db.prepare('SELECT * FROM deals WHERE twenty_id = ?').get(opportunityId);
  if (!deal) {
    const err = new Error('Deal not found in parser');
    err.status = 404;
    throw err;
  }
  return deal;
}

function amountMicrosToRubles(amountMicros) {
  return Math.round((Number(amountMicros) || 0) / 1_000_000);
}

export function upsertManualTwentyLineItem(db, twentyLineItemId, payload) {
  const deal = findDealByTwentyOpportunityId(db, payload.opportunityId);
  const qty = Number(payload.kolichestvo) > 0 ? Number(payload.kolichestvo) : 1;
  const totalRub = amountMicrosToRubles(payload.amountMicros);
  const unitPrice = qty > 0 ? totalRub / qty : 0;

  const existing = db
    .prepare('SELECT * FROM deal_items WHERE twenty_id = ?')
    .get(twentyLineItemId);

  if (existing) {
    db.prepare(`
      UPDATE deal_items
      SET name = ?, price = ?, quantity = ?, quantity_num = ?, sum = ?,
          classification = ?, sync_override = 'include'
      WHERE id = ?
    `).run(
      payload.name,
      unitPrice,
      String(qty),
      qty,
      totalRub,
      MANUAL_TWENTY_CLASSIFICATION,
      existing.id,
    );
    return { dealItemId: existing.id };
  }

  const result = db.prepare(`
    INSERT INTO deal_items (
      deal_id, name, price, quantity, quantity_num, sum,
      classification, sync_override, twenty_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'include', ?)
  `).run(
    deal.id,
    payload.name,
    unitPrice,
    String(qty),
    qty,
    totalRub,
    MANUAL_TWENTY_CLASSIFICATION,
    twentyLineItemId,
  );

  return { dealItemId: result.lastInsertRowid };
}

export function archiveManualTwentyLineItem(db, twentyLineItemId) {
  const existing = db.prepare('SELECT id FROM deal_items WHERE twenty_id = ?').get(twentyLineItemId);
  if (!existing) {
    const err = new Error('Line item not found in parser');
    err.status = 404;
    throw err;
  }
  db.prepare(`UPDATE deal_items SET sync_override = 'exclude' WHERE twenty_id = ?`).run(twentyLineItemId);
  return { success: true };
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd backend && npm test -- manual-twenty-line-item.test.js
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/manual-twenty-line-item.js backend/tests/manual-twenty-line-item.test.js
git commit -m "feat: add manual Twenty line item upsert/archive service"
```

---

### Task 2: API routes sync + archive

**Files:**
- Modify: `backend/src/routes/twenty.js`
- Modify: `backend/tests/twenty-routes.test.js`

- [ ] **Step 1: Write failing route tests**

Add to `backend/tests/twenty-routes.test.js`:

```js
it('POST sync upserts manual line item', async () => {
  const res = await request(createApp())
    .post('/api/twenty/line-items/li-sync-1/sync')
    .set('Authorization', 'Bearer test-secret')
    .send({
      opportunityId: 'opp-1',
      name: 'Ручная позиция',
      kolichestvo: 1,
      amountMicros: 0,
      currencyCode: 'RUB',
    });
  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  const db = getDb();
  const row = db.prepare('SELECT classification FROM deal_items WHERE twenty_id = ?').get('li-sync-1');
  expect(row.classification).toBe('manual_twenty');
});

it('POST archive sets exclude', async () => {
  await request(createApp())
    .post('/api/twenty/line-items/li-arch-1/sync')
    .set('Authorization', 'Bearer test-secret')
    .send({ opportunityId: 'opp-1', name: 'X', kolichestvo: 1, amountMicros: 0, currencyCode: 'RUB' });

  const res = await request(createApp())
    .post('/api/twenty/line-items/li-arch-1/archive')
    .set('Authorization', 'Bearer test-secret');
  expect(res.status).toBe(200);
  const db = getDb();
  expect(db.prepare('SELECT sync_override FROM deal_items WHERE twenty_id = ?').get('li-arch-1').sync_override).toBe('exclude');
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd backend && npm test -- twenty-routes.test.js
```

- [ ] **Step 3: Add routes**

```js
// backend/src/routes/twenty.js (add imports + routes)
import {
  upsertManualTwentyLineItem,
  archiveManualTwentyLineItem,
} from '../services/manual-twenty-line-item.js';

router.post('/line-items/:twentyLineItemId/sync', (req, res, next) => {
  try {
    const db = getDb();
    const { opportunityId, name, kolichestvo, amountMicros, currencyCode } = req.body ?? {};
    const { dealItemId } = upsertManualTwentyLineItem(db, req.params.twentyLineItemId, {
      opportunityId,
      name,
      kolichestvo,
      amountMicros,
      currencyCode,
    });
    res.json({ success: true, dealItemId });
  } catch (err) {
    next(err);
  }
});

router.post('/line-items/:twentyLineItemId/archive', (req, res, next) => {
  try {
    const db = getDb();
    archiveManualTwentyLineItem(db, req.params.twentyLineItemId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd backend && npm test -- twenty-routes.test.js
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/twenty.js backend/tests/twenty-routes.test.js
git commit -m "feat: add Twenty manual line item sync/archive API routes"
```

---

### Task 3: Extended `computeLineItemDiff` (twenty_id + drafts)

**Files:**
- Modify: `backend/src/services/twenty-line-items-sync.js`
- Modify: `backend/tests/twenty-line-items-sync.test.js`

- [ ] **Step 1: Write failing diff tests**

```js
it('matches manual_twenty parser items by twenty_id not name', () => {
  const existing = [
    { id: 'li-manual', name: 'Баннер', stage: 'NOVYY', istochnik: 'TWENTY_RUCHNAYA' },
    { id: 'li-parsed', name: 'Баннер', stage: 'NOVYY', istochnik: 'PARSER' },
  ];
  const eligible = [
    { id: 1, name: 'Другое имя', classification: 'manual_twenty', twenty_id: 'li-manual', price: 100 },
    { id: 2, name: 'Баннер', classification: 'keyword_match', twenty_id: 'li-parsed', price: 200 },
  ];
  const diff = computeLineItemDiff(existing, eligible);
  expect(diff.toUpdate.map((x) => x.twentyId).sort()).toEqual(['li-manual', 'li-parsed']);
  expect(diff.toDelete).toEqual([]);
});

it('does not delete TWENTY_RUCHNAYA draft without parser row', () => {
  const existing = [
    { id: 'li-draft', name: 'Новая позиция', stage: 'NOVYY', istochnik: 'TWENTY_RUCHNAYA' },
  ];
  const diff = computeLineItemDiff(existing, []);
  expect(diff.toDelete).toEqual([]);
});

it('deletes TWENTY_RUCHNAYA row once archived in parser (exclude)', () => {
  const existing = [
    { id: 'li-gone', name: 'Баннер', stage: 'NOVYY', istochnik: 'TWENTY_RUCHNAYA' },
  ];
  // eligible empty — archived manual not included by getItemsForTwenty
  const diff = computeLineItemDiff(existing, []);
  expect(diff.toDelete).toEqual(['li-gone']);
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd backend && npm test -- twenty-line-items-sync.test.js
```

- [ ] **Step 3: Refactor `computeLineItemDiff`**

Key changes in `twenty-line-items-sync.js`:

1. Import `MANUAL_TWENTY_CLASSIFICATION` from `./manual-twenty-line-item.js`.
2. Split `eligibleItems` into `manualItems` (classification `manual_twenty` + `twenty_id`) and `parsedItems` (rest).
3. Build `existingById` map from Twenty `existingLineItems`.
4. **toUpdate:** manual → match `item.twenty_id` to `existing.id`; parsed → existing name map (unchanged).
5. **toCreate:** manual without Twenty row; parsed without name match (unchanged).
6. **toDelete:** for each Twenty `li`, skip if:
   - `manualItems` has `twenty_id === li.id`, OR
   - `parsedItems` has normalized name match, OR
   - protected stage, OR
   - `li.istochnik === 'TWENTY_RUCHNAYA'` and no manual parser row for `li.id` (draft guard).

7. Update `listLineItemsForOpportunity` GraphQL to fetch `istochnik`:

```graphql
edges { node { id name stage istochnik } }
```

8. In `syncLineItemsDiff` update loop: for manual items use `twentyId` from `item.twenty_id` directly.

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd backend && npm test -- twenty-line-items-sync.test.js
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/twenty-line-items-sync.js backend/tests/twenty-line-items-sync.test.js
git commit -m "feat: diff manual line items by twenty_id and protect drafts"
```

---

### Task 4: Set `istochnik=PARSER` on parser-created line items

**Files:**
- Modify: `backend/src/services/twenty-line-item.js`
- Modify: `backend/tests/twenty-line-item.test.js`

- [ ] **Step 1: Write failing test** — `buildLineItemCreateInput` includes `istochnik: 'PARSER'`.

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Add field to create/update GraphQL inputs**

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit** — `feat: mark parser-created line items with istochnik PARSER`

---

### Task 5: Eligibility test for manual_twenty + exclude

**Files:**
- Modify: `backend/tests/twenty-items.test.js`

- [ ] **Step 1: Add tests**

```js
it('manual_twenty with include is eligible via sync_override', () => {
  const items = [{ name: 'X', classification: 'manual_twenty', sync_override: 'include' }];
  expect(getItemsForTwenty(items)).toHaveLength(1);
});

it('manual_twenty with exclude is not eligible', () => {
  const items = [{ name: 'X', classification: 'manual_twenty', sync_override: 'exclude' }];
  expect(getItemsForTwenty(items)).toHaveLength(0);
});
```

- [ ] **Step 2–4: Run tests (should pass without code change — documents behaviour)**

- [ ] **Step 5: Commit** — `test: document manual_twenty eligibility via sync_override`

---

## Part B — BrandingTwentyView

### Task 6: `istochnik` field metadata

**Files:**
- Create: `src/fields/istochnik.field.ts` (via scaffold)
- Create: `src/constants/line-item-origin.ts`
- Modify: `src/constants/universal-identifiers.ts`

- [ ] **Step 1: Scaffold field**

```bash
yarn twenty dev:add field
# Name: istochnik, object: dealLineItem, type: SELECT
# Options: PARSER / TWENTY_RUCHNAYA
```

- [ ] **Step 2: Add constants**

```ts
// src/constants/line-item-origin.ts
export const LINE_ITEM_ORIGIN = {
  PARSER: 'PARSER',
  TWENTY_MANUAL: 'TWENTY_RUCHNAYA',
} as const;

export type LineItemOrigin = (typeof LINE_ITEM_ORIGIN)[keyof typeof LINE_ITEM_ORIGIN];

export const DEFAULT_MANUAL_LINE_ITEM_NAME = 'Новая позиция';
```

- [ ] **Step 3: Register field UUID in `universal-identifiers.ts`**

- [ ] **Step 4: Build app**

```bash
yarn twenty dev:build
```

Expected: exit 0

- [ ] **Step 5: Commit** — `feat: add dealLineItem.istochnik field for manual origin tracking`

---

### Task 7: Meaningful-change detector (unit tests first)

**Files:**
- Create: `src/deals-board/utils/manual-line-item-sync.ts`
- Create: `src/deals-board/utils/manual-line-item-sync.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  isMeaningfulManualLineItemChange,
  buildManualLineItemSyncPayload,
} from './manual-line-item-sync';
import { DEFAULT_MANUAL_LINE_ITEM_NAME } from 'src/constants/line-item-origin';

describe('isMeaningfulManualLineItemChange', () => {
  const baseline = { name: DEFAULT_MANUAL_LINE_ITEM_NAME, kolichestvo: 1, amountMicros: 0 };

  it('returns false for unchanged defaults', () => {
    expect(isMeaningfulManualLineItemChange(baseline, baseline)).toBe(false);
  });

  it('returns true when name changes', () => {
    expect(isMeaningfulManualLineItemChange(baseline, { ...baseline, name: 'Баннер' })).toBe(true);
  });

  it('returns true when amount becomes positive', () => {
    expect(isMeaningfulManualLineItemChange(baseline, { ...baseline, amountMicros: 100 })).toBe(true);
  });

  it('returns true when quantity changes', () => {
    expect(isMeaningfulManualLineItemChange(baseline, { ...baseline, kolichestvo: 2 })).toBe(true);
  });
});

describe('buildManualLineItemSyncPayload', () => {
  it('maps line item row to parser body', () => {
    expect(
      buildManualLineItemSyncPayload({
        id: 'li-1',
        opportunityId: 'opp-1',
        name: 'Баннер',
        kolichestvo: 2,
        amount: { amountMicros: 500_000_000, currencyCode: 'RUB' },
      }),
    ).toEqual({
      opportunityId: 'opp-1',
      name: 'Баннер',
      kolichestvo: 2,
      amountMicros: 500_000_000,
      currencyCode: 'RUB',
    });
  });
});
```

- [ ] **Step 2: Run — FAIL**

```bash
yarn test src/deals-board/utils/manual-line-item-sync.test.ts
```

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit** — `feat: add manual line item meaningful-change helpers`

---

### Task 8: Logic functions + crmparser client

**Files:**
- Create: `src/logic-functions/line-item-sync.ts`
- Create: `src/logic-functions/line-item-archive.ts`
- Modify: `src/deals-board/api/crmparser.ts`
- Modify: `src/deals-board/api/crmparser.test.ts`
- Modify: `src/constants/universal-identifiers.ts`

- [ ] **Step 1: Write failing client tests** for `syncManualLineItem` and `archiveManualLineItem` (mirror `addLineItemToList` pattern).

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement logic functions + client methods**

```ts
// crmparser.ts additions
export async function syncManualLineItem(lineItemId: string, body: ManualLineItemSyncBody) {
  return logicFunctionFetch<{ success: boolean; dealItemId?: number }>(
    `/crmparser/line-items/${encodeURIComponent(lineItemId)}/sync`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export async function archiveManualLineItem(lineItemId: string) {
  return logicFunctionFetch<{ success: boolean }>(
    `/crmparser/line-items/${encodeURIComponent(lineItemId)}/archive`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}
```

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Commit** — `feat: add parser sync/archive proxy for manual line items`

---

### Task 9: Create flow — set `istochnik` + baseline

**Files:**
- Modify: `src/deals-board/api/line-items.ts`
- Modify: `src/deals-board/hooks/useLineItems.ts`
- Modify: `src/deals-board/api/line-items.test.ts`

- [ ] **Step 1: Write failing test** — `createLineItem` patches `istochnik=TWENTY_RUCHNAYA` after POST.

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement create flow**

After REST `POST /rest/dealLineItems`, read `id` from response, then:

```ts
await client.patch(`/rest/dealLineItems/${id}`, { istochnik: LINE_ITEM_ORIGIN.TWENTY_MANUAL });
```

Store baseline in `useCreateLineItem` via React Query `meta` map:

```ts
// queryClient.setQueryData(['manualLineItemBaselines'], (prev) => ({ ...prev, [id]: baseline }))
```

Use a small module `manual-line-item-baselines.ts` with get/set helpers (keeps hook thin).

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Commit** — `feat: mark board-created line items as TWENTY_RUCHNAYA`

---

### Task 10: Update flow — trigger parser sync

**Files:**
- Create: `src/deals-board/hooks/useManualLineItemParserSync.ts`
- Modify: `src/deals-board/hooks/useUpdateRecord.ts` OR wire from editors

- [ ] **Step 1: Write failing hook test** (mock `syncManualLineItem`).

- [ ] **Step 2: Implement `useManualLineItemParserSync`**

```ts
export async function maybeSyncManualLineItemToParser(params: {
  lineItem: LineItemRow;
  patch: Record<string, unknown>;
  baseline?: ManualLineItemBaseline;
  syncedToParser: boolean;
}): Promise<boolean> {
  const merged = { ...lineItem, ...patch };
  const snapshot = toSyncSnapshot(merged);
  if (!params.syncedToParser && !isMeaningfulManualLineItemChange(params.baseline, snapshot)) {
    return false;
  }
  await syncManualLineItem(lineItem.id, buildManualLineItemSyncPayload(merged));
  return true;
}
```

Track `syncedToParser` in query meta `['manualLineItemsSynced', lineItemId]`.

- [ ] **Step 3: Wire into `useUpdateRecord` onSettled for `dealLineItem`**

On success: call `maybeSyncManualLineItemToParser`; errors logged, do not rollback Twenty patch.

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Commit** — `feat: sync manual line item edits to crmparser`

---

### Task 11: Delete flow — archive via realtime

**Files:**
- Modify: `src/deals-board/realtime/apply-object-record-event.ts`
- Modify: `src/deals-board/realtime/apply-object-record-event.test.ts`

- [ ] **Step 1: Write failing test** — `DELETED` dealLineItem calls `archiveManualLineItem` when synced.

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Handle `event.action === 'DELETED'`**

```ts
if (event.action === 'DELETED' && event.objectNameSingular === 'dealLineItem') {
  if (queryClient.getQueryData(['manualLineItemsSynced', event.recordId])) {
    void archiveManualLineItem(event.recordId).catch(() => undefined);
  }
  invalidateObjectQueries(queryClient, 'dealLineItem');
  return;
}
```

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Commit** — `feat: archive manual line items in parser on Twenty delete`

---

### Task 12: Version bump + integration smoke

**Files:**
- Modify: `package.json` → `0.2.82`

- [ ] **Step 1: Run full unit suites**

```bash
# crmparserv2
cd backend && npm test

# BrandingTwentyView
yarn test && yarn lint && yarn twenty dev:build
```

- [ ] **Step 2: Manual smoke** (see spec Testing section)

- [ ] **Step 3: Commit** — `chore: release manual line items sync (0.2.82)`

---

## Deploy Order

1. Deploy **crmparserv2** (API + diff) first.
2. Deploy **BrandingTwentyView** `0.2.82` (field + hooks).
3. Verify `CRMPARSER_API_INTERNAL_URL` / `CRMPARSER_API_SECRET` in Twenty app settings.
4. Run `yarn twenty dev:sync` or CD pipeline so `istochnik` field appears in workspace.

---

## Spec Coverage Checklist

| Spec requirement | Task |
|------------------|------|
| Sync after meaningful edit | Task 7, 10 |
| `sync_override=include` while active | Task 1 |
| Archive on delete (`exclude`) | Task 1, 2, 11 |
| Mirror name/amount/qty ongoing | Task 10 |
| Amount includes active manual items | Task 5 (existing `getItemsForTwenty`) |
| Draft protection | Task 3, 9 |
| Duplicate names (B) | Task 3 |
| `istochnik` field | Task 6 |
| Logic function proxy | Task 8 |
| Parser sets `PARSER` origin | Task 4 |
