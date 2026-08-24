# Suppliers, type sections, evening digest — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Banner/contractor уточнение becomes a workspace-wide Supplier combobox (by category); optional in-deal type section rows; evening Telegram text batch the day before loadDate plus same-day catch-up.

**Architecture:** TwentyView owns CRM metadata (supplier `category`, line-item `supplier` relation), board combobox, and `localStorage` type-section toggle. crmparserv2 owns `banner_podryad.evening` chat map, hour setting, Bot API `sendMessage`, SQLite idempotency, hourly cron, and `/twenty/telegram/events` catch-up. Spec: `docs/superpowers/specs/2026-08-24-suppliers-type-sections-evening-digest-design.md`.

**Tech Stack:** Twenty SDK 2.31 (`defineField` / `yarn twenty apply`), React + vitest (TwentyView), Express + better-sqlite3 + node-cron + vitest (crmparserv2), Telegram Bot API (`callTelegram`).

## Global Constraints

- UUID v4 from the spec (do not regenerate): category `3d719539-872e-4819-8bf3-462bbe7e69c3`; line-item relation source `b6abc724-6526-4b39-8d1e-f9da6e58eff7`; inverse `d686ae8a-d456-4652-8b42-50db8e02a609`; relation pair `9033d2ae-59fc-4920-93d1-9cdad9d7f9c7`.
- `tipDetail` stays for Плёнка / Производство / salary. Banner/contractor picker is the supplier relation, not new enum values.
- Hide from list = `isActive: false`, never DELETE from the board UI.
- Type sections default **off**; storage key `deals-board-type-sections`; desktop `LineItemsTable` only.
- Evening hour default **18**, timezone `Europe/Moscow`; chat key `banner_podryad.evening`; do not clobber `okleyka.send` or `digest.morning`.
- Transport for this digest: **Bot API** (`telegram_bot_token` + `callTelegram`), not the okleyka user-bot.
- Errors on the board: `window.alert` (existing pattern), not a new toast system.
- Do not commit tokens or chat ids.
- After Twenty front/field changes: `yarn twenty apply` + hard refresh. Unit: TwentyView `yarn test:unit`; crmparser `cd backend && npm test -- <file>`.

## File structure

| File | Responsibility |
|------|----------------|
| `src/constants/supplier-category.ts` | Category SELECT options (= tip values) |
| `src/deals-board/suppliers/supplier-name.ts` | Normalize / match names |
| `src/deals-board/suppliers/picker.ts` | Filter picker list; tip→supplier clear rules |
| `src/fields/supplier-category.field.ts` | App field on `supplier` |
| `src/fields/deal-line-item-supplier.field.ts` | MANY_TO_ONE relation (plus inverse on object if SDK splits it) |
| `src/objects/supplier.object.ts` | Inverse ONE_TO_MANY if not in field file |
| `src/views/suppliers-index.view.ts` | Show category column |
| `src/deals-board/api/suppliers.ts` | REST list/create/patch suppliers |
| `src/deals-board/api/line-items.ts` | `depth=1` so `supplier: { id, name }` loads |
| `src/deals-board/editors/SupplierCombobox.tsx` | Combobox UI |
| `src/deals-board/editors/TipDetailSelect.tsx` | Unchanged for non-banner tips |
| `src/deals-board/cells/overrides.tsx` | Switch уточнение editor |
| `src/deals-board/editors/TypeSelect.tsx` | Clear supplier on tip change |
| `src/deals-board/type-sections/group.ts` | Section order + empty skip |
| `src/deals-board/hooks/useTypeSections.ts` | localStorage toggle |
| `src/deals-board/TypeSectionsToggle.tsx` | Switch next to «Умное» |
| `src/deals-board/DealsTable/LineItemsTable.tsx` | Separator rows |
| `scripts/migrate-tip-detail-to-suppliers.js` | Seed + backfill |
| crmparserv2 `backend/src/telegram/banner-podryad/*` | Window, fetch, render, run, cron |
| crmparserv2 `backend/src/telegram/settings.js` | Chat key + hour |
| crmparserv2 `backend/src/db/migrate.js` + `schema.sql` | `load_date` on send log |
| crmparserv2 `frontend/src/pages/Telegram.jsx` | Destination + hour + test send |

---

### Task 1: Supplier name + picker helpers (TDD)

**Files:**
- Create: `src/deals-board/suppliers/supplier-name.ts`
- Create: `src/deals-board/suppliers/supplier-name.test.ts`
- Create: `src/deals-board/suppliers/picker.ts`
- Create: `src/deals-board/suppliers/picker.test.ts`
- Create: `src/constants/supplier-category.ts`

**Interfaces:**
- Consumes: `LineItemType` from `src/constants/line-item-types.ts`
- Produces: `normalizeSupplierName`, `supplierNamesEqual`, `SUPPLIER_CATEGORY_OPTIONS`, `usesSupplierPicker(tip)`, `filterSuppliersForPicker`, `nextSupplierOnTipChange`

- [ ] **Step 1: Write failing tests**

```ts
// src/deals-board/suppliers/supplier-name.test.ts
import { describe, expect, it } from 'vitest';
import { normalizeSupplierName, supplierNamesEqual } from './supplier-name';

describe('normalizeSupplierName', () => {
  it('trims and collapses inner spaces', () => {
    expect(normalizeSupplierName('  Саша   Марда ')).toBe('Саша Марда');
  });
  it('rejects empty', () => {
    expect(normalizeSupplierName('   ')).toBe('');
  });
});

describe('supplierNamesEqual', () => {
  it('ignores case and spacing', () => {
    expect(supplierNamesEqual('Саша Марда', 'саша  марда')).toBe(true);
  });
});
```

```ts
// src/deals-board/suppliers/picker.test.ts
import { describe, expect, it } from 'vitest';
import { filterSuppliersForPicker, nextSupplierOnTipChange, usesSupplierPicker } from './picker';

const yura = {
  id: 's1',
  name: 'Юра',
  category: 'BANNERA',
  isActive: true,
};
const hidden = { ...yura, id: 's2', name: 'Саша Марда', isActive: false };
const print = {
  id: 's3',
  name: 'Глав принт',
  category: 'PODRYAD',
  isActive: true,
};

describe('usesSupplierPicker', () => {
  it('is true only for banner and contractor', () => {
    expect(usesSupplierPicker('BANNERA')).toBe(true);
    expect(usesSupplierPicker('PODRYAD')).toBe(true);
    expect(usesSupplierPicker('PLENKA')).toBe(false);
  });
});

describe('filterSuppliersForPicker', () => {
  it('keeps active matches plus current even if inactive', () => {
    const list = filterSuppliersForPicker([yura, hidden, print], 'BANNERA', 's2');
    expect(list.map((s) => s.id)).toEqual(['s1', 's2']);
  });
});

describe('nextSupplierOnTipChange', () => {
  it('clears when leaving picker tips', () => {
    expect(
      nextSupplierOnTipChange({
        nextTip: 'PLENKA',
        currentSupplierId: 's1',
        currentSupplierCategory: 'BANNERA',
      }),
    ).toBeNull();
  });
  it('clears when banner↔contractor category mismatches', () => {
    expect(
      nextSupplierOnTipChange({
        nextTip: 'PODRYAD',
        currentSupplierId: 's1',
        currentSupplierCategory: 'BANNERA',
      }),
    ).toBeNull();
  });
  it('keeps when category matches new tip', () => {
    expect(
      nextSupplierOnTipChange({
        nextTip: 'BANNERA',
        currentSupplierId: 's1',
        currentSupplierCategory: 'BANNERA',
      }),
    ).toBe('s1');
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
yarn test:unit src/deals-board/suppliers/supplier-name.test.ts src/deals-board/suppliers/picker.test.ts
```

Expected: cannot find modules.

- [ ] **Step 3: Implement**

```ts
// src/constants/supplier-category.ts
export const SUPPLIER_CATEGORY_OPTIONS = [
  { value: 'BANNERA', label: 'Баннера', color: 'green' },
  { value: 'PODRYAD', label: 'Подряд', color: 'purple' },
  { value: 'PLENKA', label: 'Плёнка', color: 'blue' },
  { value: 'PROIZVODSTVO', label: 'Производство', color: 'orange' },
  { value: 'RESTAVRACIYA', label: 'Рест. плёнка', color: 'pink' },
] as const;

export type SupplierCategory = (typeof SUPPLIER_CATEGORY_OPTIONS)[number]['value'];
```

```ts
// src/deals-board/suppliers/supplier-name.ts
export const normalizeSupplierName = (raw: string): string =>
  raw.trim().replace(/\s+/g, ' ');

export const supplierNamesEqual = (a: string, b: string): boolean =>
  normalizeSupplierName(a).toLocaleLowerCase('ru-RU') ===
  normalizeSupplierName(b).toLocaleLowerCase('ru-RU');
```

```ts
// src/deals-board/suppliers/picker.ts
import type { LineItemType } from 'src/constants/line-item-types';

export type SupplierRow = {
  id: string;
  name: string;
  category: string | null;
  isActive: boolean;
};

export const usesSupplierPicker = (tip: string | null | undefined): boolean =>
  tip === 'BANNERA' || tip === 'PODRYAD';

export const filterSuppliersForPicker = (
  suppliers: SupplierRow[],
  tip: string,
  selectedId: string | null,
): SupplierRow[] =>
  suppliers.filter(
    (supplier) =>
      supplier.category === tip &&
      (supplier.isActive || supplier.id === selectedId),
  );

export const nextSupplierOnTipChange = ({
  nextTip,
  currentSupplierId,
  currentSupplierCategory,
}: {
  nextTip: LineItemType | string | null;
  currentSupplierId: string | null | undefined;
  currentSupplierCategory: string | null | undefined;
}): string | null => {
  if (!currentSupplierId) return null;
  if (!usesSupplierPicker(nextTip)) return null;
  if (currentSupplierCategory !== nextTip) return null;
  return currentSupplierId;
};
```

- [ ] **Step 4: Re-run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/constants/supplier-category.ts src/deals-board/suppliers/supplier-name.ts src/deals-board/suppliers/supplier-name.test.ts src/deals-board/suppliers/picker.ts src/deals-board/suppliers/picker.test.ts
git commit -m "feat(deals-board): add supplier picker helpers"
```

---

### Task 2: CRM metadata — category + relation

**Files:**
- Modify: `src/constants/universal-identifiers.ts` (append the four spec UUIDs + view field UUID for category column)
- Create: `src/fields/supplier-category.field.ts`
- Create: `src/fields/deal-line-item-supplier.field.ts` (after `yarn twenty dev:add field` if the generator exists; then **replace** generated UUIDs with spec values)
- Modify: `src/objects/supplier.object.ts` if inverse field lives on the object
- Modify: `src/views/suppliers-index.view.ts` — add category at position 0, shift others

**Interfaces:**
- Consumes: `SUPPLIER_OBJECT_UNIVERSAL_IDENTIFIER`, `DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER`, `SUPPLIER_CATEGORY_OPTIONS`
- Produces: fields `category` on supplier, `supplier` on dealLineItem (REST may expose `supplierId` + nested `supplier`)

- [ ] **Step 1: Add identifiers** (exact strings from spec)

```ts
export const SUPPLIER_CATEGORY_FIELD_UNIVERSAL_IDENTIFIER =
  '3d719539-872e-4819-8bf3-462bbe7e69c3';
export const DEAL_LINE_ITEM_SUPPLIER_FIELD_UNIVERSAL_IDENTIFIER =
  'b6abc724-6526-4b39-8d1e-f9da6e58eff7';
export const SUPPLIER_DEAL_LINE_ITEMS_FIELD_UNIVERSAL_IDENTIFIER =
  'd686ae8a-d456-4652-8b42-50db8e02a609';
export const DEAL_LINE_ITEM_SUPPLIER_RELATION_UNIVERSAL_IDENTIFIER =
  '9033d2ae-59fc-4920-93d1-9cdad9d7f9c7';
```

New view-field UUID (v4): `a1c4e8b2-7d3f-4a91-9e26-5b8c0d1f2a47` for the category column.

- [ ] **Step 2: Category field** — mirror `src/fields/product-stream.field.ts`:

```ts
import { defineField, FieldType } from 'twenty-sdk/define';
import { SUPPLIER_CATEGORY_OPTIONS } from 'src/constants/supplier-category';
import { SUPPLIER_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { SUPPLIER_CATEGORY_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: SUPPLIER_CATEGORY_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: SUPPLIER_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'category',
  type: FieldType.SELECT,
  label: 'Категория',
  icon: 'IconTag',
  options: SUPPLIER_CATEGORY_OPTIONS.map((option, position) => ({
    value: option.value,
    label: option.label,
    position,
    color: option.color,
  })),
});
```

- [ ] **Step 3: Relation field**

Run `yarn twenty dev:add field` and choose relation dealLineItem → supplier if the wizard offers it. Then pin spec UUIDs.

If the SDK shape differs, follow [Twenty relations](https://docs.twenty.com/developers/extend/apps/data/relations.md) for 2.31. Required names: source `supplier` (label `Поставщик`), MANY_TO_ONE, `onDelete` SET NULL. Inverse ONE_TO_MANY on supplier.

- [ ] **Step 4: Index view** — prepend category using `SUPPLIER_CATEGORY_FIELD_UNIVERSAL_IDENTIFIER` as `fieldMetadataUniversalIdentifier`, `isVisible: true`, `size: 140`. Bump existing field `position` values by +1.

- [ ] **Step 5: Apply locally**

```bash
yarn twenty apply
```

Expected: no UUID conflict; supplier form shows Категория; dealLineItem has Поставщик.

- [ ] **Step 6: Commit**

```bash
git add src/constants/universal-identifiers.ts src/fields/supplier-category.field.ts src/fields/deal-line-item-supplier.field.ts src/objects/supplier.object.ts src/views/suppliers-index.view.ts
git commit -m "feat(app): add supplier category and line-item relation"
```

---

### Task 3: REST load suppliers + nested supplier on line items

**Files:**
- Create: `src/deals-board/api/suppliers.ts`
- Create: `src/deals-board/api/suppliers.test.ts`
- Modify: `src/deals-board/api/line-items.ts` — add `depth: 1` to GET query objects in `fetchLineItemsPage` and search/filter GETs
- Modify: `src/deals-board/api/line-items.test.ts` — expect `depth: 1`
- Modify: `src/deals-board/types.ts` — `supplier?: { id: string; name: string } | null; supplierId?: string | null`
- Modify: `src/deals-board/api/line-items.ts` `normalizeLineItemRow` — if `supplier` is `{ id, name }`, copy `supplierId` from it
- Modify: `src/logic-functions/shared/deals-board-page-rest.ts` — same `depth: 1` on dealLineItems GET if that path omits nested relations
- Modify: `src/deals-board/realtime/query-key-registry.ts` — add `supplier: ['suppliers']` only if realtime emits supplier objects; otherwise skip

**Interfaces:**
- Produces: `fetchSuppliers()`, `createSupplier({ name, category })`, `updateSupplier(id, { isActive })`, `findSupplierByNameAndCategory(list, name, category)`

- [ ] **Step 1: Failing test for depth**

In `src/deals-board/api/line-items.test.ts`, extend the existing GET assertion for `/rest/dealLineItems` to include `depth: 1` in `query`. Run — FAIL.

- [ ] **Step 2: Add `depth: 1`** to every `client.get('/rest/dealLineItems', { query })` in `line-items.ts` and `deals-board-page-rest.ts`.

- [ ] **Step 3: `suppliers.ts`**

```ts
import { RestApiClient } from 'twenty-client-sdk/rest';
import type { SupplierRow } from '../suppliers/picker';
import { normalizeSupplierName, supplierNamesEqual } from '../suppliers/supplier-name';

let restClient: RestApiClient | null = null;
const getRestClient = (): RestApiClient => {
  if (!restClient) restClient = new RestApiClient();
  return restClient;
};

const mapSupplier = (raw: Record<string, unknown>): SupplierRow | null => {
  if (typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;
  return {
    id: raw.id,
    name: raw.name,
    category: typeof raw.category === 'string' ? raw.category : null,
    isActive: raw.isActive !== false,
  };
};

export const findSupplierByNameAndCategory = (
  suppliers: SupplierRow[],
  name: string,
  category: string,
): SupplierRow | undefined =>
  suppliers.find(
    (row) =>
      row.category === category && supplierNamesEqual(row.name, normalizeSupplierName(name)),
  );

export const fetchSuppliers = async (): Promise<SupplierRow[]> => {
  const response = await getRestClient().get<unknown>('/rest/suppliers', {
    query: { limit: 200, depth: 0 },
  });
  const body = response as Record<string, unknown>;
  const list =
    (body.data as { suppliers?: unknown[] } | undefined)?.suppliers ??
    (body as { suppliers?: unknown[] }).suppliers ??
    [];
  return (Array.isArray(list) ? list : [])
    .map((row) => (row && typeof row === 'object' ? mapSupplier(row as Record<string, unknown>) : null))
    .filter((row): row is SupplierRow => row !== null);
};

export const createSupplier = async (input: {
  name: string;
  category: string;
}): Promise<SupplierRow> => {
  const name = normalizeSupplierName(input.name);
  if (!name) throw new Error('Пустое имя поставщика');
  const response = await getRestClient().post<unknown>('/rest/suppliers', {
    name,
    category: input.category,
    isActive: true,
  });
  const record =
    (response as { data?: { supplier?: Record<string, unknown> } }).data?.supplier ??
    (response as { supplier?: Record<string, unknown> }).supplier ??
    (response as Record<string, unknown>);
  const mapped = mapSupplier(record as Record<string, unknown>);
  if (!mapped) throw new Error('Не удалось создать поставщика');
  return mapped;
};

export const updateSupplier = async (
  id: string,
  data: { isActive?: boolean; category?: string },
): Promise<void> => {
  await getRestClient().patch(`/rest/suppliers/${id}`, data);
};
```

- [ ] **Step 4: Tests for `findSupplierByNameAndCategory`** in `suppliers.test.ts` (no network). PATCH relation: `updateLineItem(id, { supplierId: id | null })` — confirm against local REST after apply; if Twenty wants `{ supplier: { id } }`, use that in the combobox only.

- [ ] **Step 5: `yarn test:unit` for touched tests — PASS, then commit**

```bash
git commit -m "feat(deals-board): load suppliers and nested line-item relation"
```

---

### Task 4: Combobox + уточнение cell + tip change

**Files:**
- Create: `src/deals-board/editors/SupplierCombobox.tsx`
- Modify: `src/deals-board/cells/overrides.tsx` `case 'tipDetail'`
- Modify: `src/deals-board/editors/TypeSelect.tsx` — pass `supplierId` / `supplierCategory`, write `supplierId: nextSupplierOnTipChange(...)`
- Modify: `src/deals-board/hooks/useLineItems.ts` — extend `applyOptimisticPatch` so `supplierId: null` clears `supplier` and `supplierId` on the cached row; a string id sets `supplierId` (leave `supplier.name` until refetch)
- Create: `src/deals-board/hooks/useSuppliers.ts` — `useQuery({ queryKey: ['suppliers'], queryFn: fetchSuppliers, staleTime: 30_000 })`

**Interfaces:**
- Consumes: Task 1 helpers, Task 3 API
- Produces: Board cell for BANNERA/PODRYAD

- [ ] **Step 1: `TipDetailCell` switch** in `overrides.tsx`:

```tsx
case 'tipDetail':
  if (variant !== 'child') return null;
  {
    const tip =
      typeof props.row?.tip === 'string' ? (props.row.tip as LineItemType) : null;
    if (usesSupplierPicker(tip)) {
      return (
        <SupplierCombobox
          recordId={recordId}
          tip={tip}
          supplierId={
            typeof props.row?.supplierId === 'string'
              ? props.row.supplierId
              : typeof (props.row?.supplier as { id?: string } | undefined)?.id === 'string'
                ? (props.row.supplier as { id: string }).id
                : null
          }
          supplierName={
            typeof (props.row?.supplier as { name?: string } | undefined)?.name === 'string'
              ? (props.row.supplier as { name: string }).name
              : null
          }
          tipDetail={typeof props.row?.tipDetail === 'string' ? props.row.tipDetail : null}
        />
      );
    }
    return (
      <TipDetailSelect
        recordId={recordId}
        tip={tip}
        value={typeof value === 'string' ? value : null}
      />
    );
  }
```

- [ ] **Step 2: Implement `SupplierCombobox`**

Behavior (must match spec):
- Load `useSuppliers()`; `options = filterSuppliersForPicker(data, tip, supplierId)`.
- Native `<select>` plus a text input is OK if a fancy combobox would take too long: **minimum** is `<input list>` (`<datalist>`) with option ids, Enter commits.
- Display selected: `supplierName` else `getTipDetailLabel(tipDetail)` if no supplier (legacy Юра).
- Placeholder when no options: `введи имя`.
- Commit name: `normalizeSupplierName`; empty → `updateLineItem(id, { supplierId: null })` only if clearing; do not `createSupplier`.
- Else `findSupplierByNameAndCategory`; if found and `!isActive`, `updateSupplier(id, { isActive: true })`; if missing, `createSupplier`. Then `updateLineItem(recordId, { supplierId: row.id })`.
- Hide: button/menu «убрать из списка» → `updateSupplier(id, { isActive: false })` then `invalidateQueries(['suppliers'])`. Do not clear the line item.
- Failures: `window.alert` with the error message (create/hide/patch).
- After successful create/select: `invalidateQueries(['suppliers', 'lineItems', 'deals-board-page'])`.

Keep the component under ~200 lines; extract `commitSupplierName(name: string)` in the same file or `suppliers/commit.ts` if it grows.

- [ ] **Step 3: TypeSelect** — add optional `supplierId` and `supplierCategory` props from `overrides.tsx` (`row.supplier`). On change:

```ts
data: {
  tip: normalizedNext,
  tipDetail: nextDetail,
  supplierId: nextSupplierOnTipChange({
    nextTip: normalizedNext,
    currentSupplierId: supplierId ?? null,
    currentSupplierCategory: supplierCategory ?? null,
  }),
},
```

Twenty may require `supplierId: null` explicitly to clear.

- [ ] **Step 4: Manual check localhost** after `yarn twenty apply`: BANNERA cell is not the old SELECT-only list; typing a new name persists.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(deals-board): supplier combobox for banner and contractor"
```

---

### Task 5: Seed + backfill script

**Files:**
- Create: `scripts/migrate-tip-detail-to-suppliers.js`

**Interfaces:**
- Consumes: same REST as seed scripts (`scripts/seed-50-deals.js` token from `~/.cursor/mcp.json`)
- Produces: idempotent upsert of Юра/Мага/Топильский (`BANNERA`) and подряд labels; PATCH line items where `tip` + `tipDetail` map

Map (do not seed `KTO_EDET`):

| tipDetail | name | category |
|-----------|------|----------|
| YURA | Юра | BANNERA |
| MAGA | Мага | BANNERA |
| TOPILSKIY | Топильский | BANNERA |
| GLAV_PRINT | Глав принт | PODRYAD |
| PASHA_VINDER | Паша виндер | PODRYAD |
| ZARYA | Заря | PODRYAD |
| LIZA_SUKNO | Лиза сукно | PODRYAD |
| KUVALDIN_KLISHE | Кувалдин клише | PODRYAD |
| SVOE | Своё | PODRYAD |

- [ ] **Step 1: Script logic**

1. Fetch all suppliers (paginate).
2. For each map row: if no name+category match, POST; else skip.
3. Fetch dealLineItems with `tip` in BANNERA/PODRYAD (paginate, `depth: 1`).
4. If `supplierId` already set, skip. Else if `tipDetail` in map, PATCH `supplierId`.

Print counts: created, reused, patched, skipped.

- [ ] **Step 2: Run against local Twenty** (`http://localhost:2020`). Do not run prod in this task.

- [ ] **Step 3: Commit script only**

```bash
git commit -m "feat(scripts): backfill banner and contractor suppliers"
```

---

### Task 6: Type-section grouping helper (TDD)

**Files:**
- Create: `src/deals-board/type-sections/group.ts`
- Create: `src/deals-board/type-sections/group.test.ts`

**Interfaces:**
- Produces: `TYPE_SECTION_ORDER`, `getTypeSectionKey`, `buildTypeSectionRows`

```ts
export type TypeSectionKey =
  | 'RESTAVRACIYA'
  | 'PLENKA'
  | 'BANNERA'
  | 'PODRYAD'
  | 'PROIZVODSTVO'
  | 'NE_NASHE'
  | 'UNKNOWN';

export type TypeSectionRow =
  | { kind: 'separator'; key: TypeSectionKey; label: string }
  | { kind: 'item'; item: { id: string; tip?: string | null } };
```

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { buildTypeSectionRows } from './group';

describe('buildTypeSectionRows', () => {
  it('keeps relative order inside a section', () => {
    const items = [
      { id: 'b2', tip: 'BANNERA' },
      { id: 'p1', tip: 'PLENKA' },
      { id: 'b1', tip: 'BANNERA' },
    ];
    const rows = buildTypeSectionRows(items);
    expect(rows.map((row) => (row.kind === 'separator' ? row.label : row.item.id))).toEqual([
      'Плёнка',
      'p1',
      'Баннера',
      'b2',
      'b1',
    ]);
  });

  it('omits empty sections', () => {
    const rows = buildTypeSectionRows([{ id: '1', tip: 'PODRYAD' }]);
    expect(rows.filter((row) => row.kind === 'separator').map((row) => row.label)).toEqual([
      'Подряд',
    ]);
  });

  it('splits не наше and unknown when both exist', () => {
    const rows = buildTypeSectionRows([
      { id: 'u', tip: null },
      { id: 'n', tip: 'NE_NASHE' },
    ]);
    expect(rows.filter((r) => r.kind === 'separator').map((r) => r.label)).toEqual([
      'Не наше',
      'Без типа',
    ]);
  });
});
```

- [ ] **Step 2: Run — FAIL, then implement**

```ts
const LABELS: Record<TypeSectionKey, string> = {
  RESTAVRACIYA: 'Реставрация',
  PLENKA: 'Плёнка',
  BANNERA: 'Баннера',
  PODRYAD: 'Подряд',
  PROIZVODSTVO: 'Производство',
  NE_NASHE: 'Не наше',
  UNKNOWN: 'Без типа',
};

export const TYPE_SECTION_ORDER: TypeSectionKey[] = [
  'RESTAVRACIYA',
  'PLENKA',
  'BANNERA',
  'PODRYAD',
  'PROIZVODSTVO',
  'NE_NASHE',
  'UNKNOWN',
];

export const getTypeSectionKey = (tip: string | null | undefined): TypeSectionKey => {
  if (tip === 'RESTAVRACIYA') return 'RESTAVRACIYA';
  if (tip === 'PLENKA') return 'PLENKA';
  if (tip === 'BANNERA') return 'BANNERA';
  if (tip === 'PODRYAD') return 'PODRYAD';
  if (tip === 'PROIZVODSTVO') return 'PROIZVODSTVO';
  if (tip === 'NE_NASHE') return 'NE_NASHE';
  return 'UNKNOWN';
};

export const buildTypeSectionRows = <T extends { id: string; tip?: string | null }>(
  items: T[],
): Array<{ kind: 'separator'; key: TypeSectionKey; label: string } | { kind: 'item'; item: T }> => {
  const buckets = new Map<TypeSectionKey, T[]>();
  for (const key of TYPE_SECTION_ORDER) buckets.set(key, []);
  for (const item of items) {
    buckets.get(getTypeSectionKey(item.tip))!.push(item);
  }
  const rows: Array<
    { kind: 'separator'; key: TypeSectionKey; label: string } | { kind: 'item'; item: T }
  > = [];
  for (const key of TYPE_SECTION_ORDER) {
    const group = buckets.get(key)!;
    if (!group.length) continue;
    rows.push({ kind: 'separator', key, label: LABELS[key] });
    for (const item of group) rows.push({ kind: 'item', item });
  }
  return rows;
};
```

- [ ] **Step 3: Tests PASS, commit**

```bash
git commit -m "feat(deals-board): group line items into type sections"
```

---

### Task 7: Toggle + LineItemsTable separators

**Files:**
- Create: `src/deals-board/hooks/useTypeSections.ts` (copy `useExpandMode.tsx` pattern: key `deals-board-type-sections`, values `'on' | 'off'`, default `'off'` when storage missing/invalid)
- Create: `src/deals-board/TypeSectionsToggle.tsx` (copy `ExpandModeToggle.tsx`: label `По типам`, `role="switch"`, `aria-checked`)
- Modify: `src/deals-board/DealsBoard.tsx` — wrap `TypeSectionsProvider` next to `ExpandModeProvider`
- Modify: `src/deals-board/BoardToolbar.tsx` — render `<TypeSectionsToggle />` immediately after `<ExpandModeToggle />`
- Modify: `src/deals-board/DealsTable/LineItemsTable.tsx` — when `enabled`, map `buildTypeSectionRows(displayItems)` instead of `displayItems.map`; separator `<tr>` with `colSpan={2 + ungrouped.length}` (drag handle + columns + groups th count — match actual `td` count), styles from `formatDaySeparatorLabel` row in `DealsDataTable.tsx` (`colors.bgSecondary`, `font.sizeXs`, `colors.textMuted`)
- When `enabled`, do **not** start order-drag (`OrderDragHandle` `disabled={true}`) so section order cannot fight `poryadok` mid-drag
- Mobile: do not group (no change to `MobileLineItemRow`)

**Interfaces:**
- Consumes: `buildTypeSectionRows`, `useTypeSections`

- [ ] **Step 1: Hook tests** in `src/deals-board/hooks/useTypeSections.test.ts`: stub `localStorage` the same way as `src/deals-board/hooks/useShowAllPreference.test.ts` — default false; writing `'on'` persists.

- [ ] **Step 2: Wire UI** as above. Separator `key={`section-${key}`}` must not collide with item ids.

- [ ] **Step 3: `yarn test:unit` + desktop: toggle off = old order; on = headers.**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(deals-board): optional type section rows inside a deal"
```

---

### Task 8: crmparser chat map + hour (sibling repo)

Work in `C:\Users\Василий\Documents\projects\crmparserv2`.

**Files:**
- Modify: `backend/src/telegram/settings.js` — add `'banner_podryad.evening'` to `CHAT_DESTINATION_KEYS`; add:

```js
export const BANNER_PODRYAD_HOUR_KEY = 'telegram_banner_podryad_hour';
export const DEFAULT_BANNER_PODRYAD_HOUR = 18;

export function getBannerPodryadHour(db) {
  const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(BANNER_PODRYAD_HOUR_KEY);
  const n = Number.parseInt(row?.value ?? '', 10);
  if (Number.isInteger(n) && n >= 0 && n <= 23) return n;
  return DEFAULT_BANNER_PODRYAD_HOUR;
}

export function setBannerPodryadHour(db, hour) {
  const n = Number(hour);
  if (!Number.isInteger(n) || n < 0 || n > 23) {
    throw Object.assign(new Error('hour must be 0–23'), { status: 400 });
  }
  db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`).run(
    BANNER_PODRYAD_HOUR_KEY,
    String(n),
  );
  return n;
}
```

- Modify: `backend/tests/telegram-chat-map-merge.test.js` — merge `banner_podryad.evening` like `digest.morning`; preserve `okleyka.send` and `digest.morning` when patching the new key
- Modify: `backend/src/routes/telegram.js` GET `/settings` include `bannerPodryadHour: getBannerPodryadHour(db)`; PUT accept `bannerPodryadHour`
- Modify: `backend/tests/telegram-test-send.test.js` + `POST /test-send`: if `event === 'banner_podryad.evening'`, require destination, `callTelegram(token, 'sendMessage', { chat_id, text: 'Тест пачки баннер/подряд', message_thread_id? })`. Missing chat → 400. Missing bot token → 400.

- [ ] **Step 1: Write merge tests first, run FAIL, add key, PASS**

- [ ] **Step 2: Hour getter tests** in `backend/tests/telegram-banner-podryad-hour.test.js` (default 18, clamp invalid to default, set 20)

- [ ] **Step 3: `cd backend && npm test -- telegram-chat-map-merge.test.js telegram-banner-podryad-hour.test.js telegram-test-send.test.js`**

- [ ] **Step 4: Commit in crmparserv2**

```bash
git commit -m "feat(telegram): banner/contractor evening destination and hour"
```

---

### Task 9: Eligibility, message text, send-log load_date

**Files:**
- Create: `backend/src/telegram/banner-podryad/window.js`
- Create: `backend/tests/telegram-banner-podryad-window.test.js`
- Create: `backend/src/telegram/banner-podryad/render.js`
- Create: `backend/tests/telegram-banner-podryad-render.test.js`
- Modify: `backend/src/db/schema.sql` and `backend/src/db/migrate.js` — `ALTER TABLE telegram_send_log ADD COLUMN load_date TEXT;` (guard if column exists). Unique index: `CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_send_log_event_line_load ON telegram_send_log(event, line_item_id, load_date) WHERE load_date IS NOT NULL;`
- Modify: `backend/src/telegram/send-log.js` — `findSendForLoadDate(db, event, lineItemId, loadDate)`, `insertSendLog` accepts `loadDate`

Event string: `'banner_podryad.evening'` (evening and catch-up share it).

- [ ] **Step 1: Window tests**

```js
import { describe, expect, it } from 'vitest';
import { shouldCatchUp, isEveningTick } from '../src/telegram/banner-podryad/window.js';

describe('isEveningTick', () => {
  it('matches configured hour in Europe/Moscow', () => {
    expect(isEveningTick(new Date('2026-08-24T15:00:00.000Z'), 18)).toBe(true); // 18:00 MSK
    expect(isEveningTick(new Date('2026-08-24T14:00:00.000Z'), 18)).toBe(false);
  });
});

describe('shouldCatchUp', () => {
  const hour = 18;
  it('true when loadDate is today', () => {
    expect(
      shouldCatchUp({
        loadDateYmd: '2026-08-24',
        todayYmd: '2026-08-24',
        tomorrowYmd: '2026-08-25',
        now: new Date('2026-08-24T08:00:00.000Z'),
        hour,
      }),
    ).toBe(true);
  });
  it('true when loadDate is tomorrow and hour already passed', () => {
    expect(
      shouldCatchUp({
        loadDateYmd: '2026-08-25',
        todayYmd: '2026-08-24',
        tomorrowYmd: '2026-08-25',
        now: new Date('2026-08-24T15:30:00.000Z'),
        hour,
      }),
    ).toBe(true);
  });
  it('false when loadDate is tomorrow before evening hour', () => {
    expect(
      shouldCatchUp({
        loadDateYmd: '2026-08-25',
        todayYmd: '2026-08-24',
        tomorrowYmd: '2026-08-25',
        now: new Date('2026-08-24T14:00:00.000Z'),
        hour,
      }),
    ).toBe(false);
  });
});
```

Use `getCrmCalendarDate` / existing digest `addCalendarDays` + hour via `Intl` `hour: 'numeric', hour12: false` in `CRM_TIMEZONE`.

- [ ] **Step 2: Render tests**

Input items `{ booking, name }` grouped by booking. Output:

```
Накануне отгрузки 25.08

Бронь: 180288
• Баннер 3x6
  Фото в чат
```

Catch-up title: `Догон · отгрузка 25.08`. Empty booking → `Бронь: —`. Skip empty item lists → `''`.

Reuse booking parse from TwentyView if copied: grep `extractBookingId` in BrandingTwentyView (`src/deals-board/automations/okleyka-message.ts` or similar) and **copy the function** into `backend/src/telegram/banner-podryad/booking.js` (do not import across repos).

- [ ] **Step 3: Item filter helper** `isBannerPodryadReminderItem(item)` → `tip` in `BANNERA|PODRYAD` and `stage !== 'OTMENA'` (GOTOVO included). Test it.

- [ ] **Step 4: migrate + send-log find by load_date. Tests in `telegram-send-log.test.js`.**

- [ ] **Step 5: npm test those files, commit**

```bash
git commit -m "feat(telegram): banner/contractor reminder window and copy"
```

---

### Task 10: Fetch, send, hourly cron

**Files:**
- Create: `backend/src/telegram/banner-podryad/fetch.js` — GraphQL opportunities by `loadDate` bounds from `getDigestDayMeta` (reuse `fetchDigestDayData` pattern but request `dealLineItems { id opportunityId name tip stage }`). Cancelled **opportunities** (`stage === 'OTMENA'`) excluded like morning digest.
- Create: `backend/src/telegram/banner-podryad/send-bot.js` — `sendBannerPodryadText({ token, chatId, threadId, text })` calling `callTelegram` `sendMessage` with `message_thread_id` when threadId set. Retry once on throw.
- Create: `backend/src/telegram/banner-podryad/run.js` — `runEveningBatch({ db, now })` and `runCatchUpSweep({ db, now, lineItemIds? })`
- Create: `backend/src/telegram/banner-podryad/cron.js` — `initBannerPodryadCron()` schedules `0 * * * *` `CRM_TIMEZONE`. Each tick: catch-up sweep; if `isEveningTick(now, getBannerPodryadHour(db))` then evening batch for tomorrow.
- Modify: `backend/src/index.js` — `initBannerPodryadCron()` next to `initDigestCron()`
- Tests: `telegram-banner-podryad-run.test.js` (mock fetch/send/log); `telegram-banner-podryad-cron.test.js` (mock `node-cron` like digest)

**runEveningBatch:**
1. Dest missing or token missing → log, `{ skipped: true }`, no send-log.
2. Fetch tomorrow’s opps + items; filter reminder items; drop items already in `findSendForLoadDate`.
3. If none left, return `{ ok: true, sent: false }`.
4. `sendBannerPodryadText`; on success `insertSendLog` per item with `load_date = tomorrowYmd`.
5. Twenty throw → no insert.

**runCatchUpSweep:** same send path, title catch-up, `loadDate` today or tomorrow-in-window; skip logged ids. Optional `lineItemIds` from HTTP to limit.

Debounce: module-level `pendingIds = Set` + `timeout`; HTTP handler adds ids and waits 45s then `runCatchUpSweep`. Document 45s in a one-line comment.

- [ ] Implement TDD for run: already-logged items not sent; empty universe no sendMessage.

- [ ] Commit

```bash
git commit -m "feat(telegram): evening banner/contractor batch and hourly catch-up"
```

---

### Task 11: Catch-up HTTP + board fire + Telegram UI

**Files (crmparserv2):**
- Modify: `backend/src/routes/twenty.js` `POST /telegram/events` — allow `okleyka.send` (existing) and `banner_podryad.catchup`. Body: `{ event, lineItemId, opportunityId, loadDate }`. Handler queues catch-up (Task 10 debounce). Unknown event still 400.
- Tests: extend dispatcher/route tests.

**Files (TwentyView):**
- Modify: `src/logic-functions/telegram-okleyka-send.ts` **or** add `telegram-banner-podryad-catchup.ts` logic function with path `/crmparser/telegram/banner-podryad-catchup` proxying the same `/twenty/telegram/events` with `event: 'banner_podryad.catchup'`. Prefer a **new** logic function + UUID v4 `c8e2a1b4-5d6f-4c7a-8e9b-0a1c2d3e4f56` so okleyka send stays untouched.
- Modify: `src/deals-board/api/crmparser.ts` — `notifyBannerPodryadCatchup(body)`
- Modify: `SupplierCombobox` and `TypeSelect` after successful patch when `usesSupplierPicker(nextTip)`: fire-and-forget notify (catch errors, do not alert). Include `loadDate` from `findOpportunityInCache` if cheap; else omit and let sweep use Twenty data.

**Files (crmparserv2 frontend):**
- Modify: `frontend/src/pages/Telegram.jsx` — third destination block cloned from digest: labels «Баннер/подряд · вечер»; bind `banner_podryad.evening`; number input hour 0–23; save via existing PUT; test button `useTestTelegramSend({ event: 'banner_podryad.evening' })`.
- Modify GET settings sync in `useEffect` that currently fills digest chat fields.

- [ ] **Step 1: Route tests FAIL then PASS**

- [ ] **Step 2: UI + logic function + board notify**

- [ ] **Step 3: `yarn twenty apply` for the new logic function**

- [ ] **Step 4: Two commits (one per repo)**

```bash
# crmparserv2
git commit -m "feat(telegram): catch-up event and settings UI for banner/contractor"

# BrandingTwentyView
git commit -m "feat(deals-board): notify parser on banner/contractor catch-up"
```

---

### Task 12: Verification

- [ ] TwentyView: `yarn test:unit`
- [ ] crmparserv2: `cd backend && npm test -- telegram-banner-podryad telegram-chat-map-merge telegram-test-send telegram-send-log`
- [ ] Manual: combobox «Саша Марда»; second browser sees it after refresh; hide keeps name on row; «По типам»; Telegram test into Тест-Оклейка; hour field saves.
- [ ] Do not claim done without command output.

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| Supplier category SELECT | 2 |
| Line-item relation | 2–4 |
| Shared list / create / reactivate / hide | 1, 3, 4 |
| tipDetail leftover + type change | 1, 4, 5 |
| Seed Юра/Мага/подряд | 5 |
| Type sections + toggle default off | 6–7 |
| Mobile sections out | 7 |
| Evening 18:00 + hour UI + chat key | 8, 10, 11 |
| Batch text / GOTOVO in / OTMENA out | 9–10 |
| Catch-up today / after hour | 9–11 |
| Bot API not okleyka user-bot | 8, 10 |
| Idempotency per item+loadDate | 9–10 |

## Execution notes

Tasks 1–7 and 12 (TwentyView) can proceed before crmparser. Tasks 8–11 need the sibling repo. Catch-up from the board (Task 11) is useless until Task 10’s run function exists.
