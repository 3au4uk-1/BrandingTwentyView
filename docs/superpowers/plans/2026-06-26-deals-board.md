# Deals Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Построить Twenty App «Реализация» — полноэкранную nested-таблицу сделок с позициями, настраиваемыми views, inline-редактированием и деплоем через GitHub Actions.

**Architecture:** `Front Component` (`DealsBoard`) внутри `STANDALONE_PAGE` layout; данные через `CoreApiClient` (GraphQL); конфигурации views в custom object `dealBoardView`; новые поля на `dealLineItem` через `defineField`. UI — `twenty-sdk/ui` + `@tanstack/react-query` + `@tanstack/react-virtual`.

**Tech Stack:** twenty-sdk 2.16, twenty-client-sdk, React 19, TypeScript, Vitest, Yarn 4, GitHub Actions (ci.yml + cd.yml).

**Spec:** [docs/superpowers/specs/2026-06-26-deals-board-twenty-app-design.md](../specs/2026-06-26-deals-board-twenty-app-design.md)

---

## File Map

| Path | Responsibility |
|------|----------------|
| `src/objects/deal-board-view.object.ts` | Custom object для сохранённых views |
| `src/fields/deal-line-item-*.field.ts` | `stage`, `ssylkaNaMakety`, `plenka` на позиции |
| `src/constants/crm-objects.ts` | Universal IDs объектов workspace |
| `src/constants/stages.ts` | Enum + labels + colors стадий |
| `src/constants/column-definitions.ts` | Дефолтные колонки parent/child |
| `src/deals-board/types.ts` | Shared TS types |
| `src/deals-board/utils/summary.ts` | Агрегация стадий позиций |
| `src/deals-board/utils/columns.ts` | Parse/serialize column JSON |
| `src/deals-board/api/client.ts` | Singleton `CoreApiClient` |
| `src/deals-board/api/opportunities.ts` | Query opportunities |
| `src/deals-board/api/line-items.ts` | Query/mutate line items |
| `src/deals-board/api/views.ts` | CRUD dealBoardView |
| `src/deals-board/api/companies.ts` | Batch company names |
| `src/deals-board/hooks/*.ts` | React Query hooks |
| `src/deals-board/DealsBoard.tsx` | Root layout |
| `src/deals-board/ViewSwitcher.tsx` | Dropdown views |
| `src/deals-board/QuickFiltersBar.tsx` | Быстрые фильтры |
| `src/deals-board/DealsTable/*` | Parent + nested tables |
| `src/deals-board/editors/*` | Inline/popover editors |
| `src/deals-board/ColumnPicker.tsx` | Column config UI |
| `src/deals-board/AppSettingsModal.tsx` | Expand mode A↔C |
| `src/front-components/deals-board.tsx` | `defineFrontComponent` entry |
| `src/front-components/main-page.tsx` | **Delete** after migration |
| `src/page-layouts/main-page.page-layout.ts` | Point widget → deals-board component |
| `src/logic-functions/seed-default-view.ts` | Seed «Базовый обзор» on install |

---

### Task 1: CRM Metadata — поля и объект dealBoardView

**Files:**
- Create: `src/constants/crm-objects.ts`
- Create: `src/constants/stages.ts`
- Create: `src/fields/deal-line-item-stage.field.ts`
- Create: `src/fields/deal-line-item-ssylka-na-makety.field.ts`
- Create: `src/fields/deal-line-item-plenka.field.ts`
- Create: `src/objects/deal-board-view.object.ts`
- Modify: `src/constants/universal-identifiers.ts`
- Test: `src/__tests__/schema.integration-test.ts` (auto-updated by sync)

- [ ] **Step 1: Add CRM object identifiers**

```typescript
// src/constants/crm-objects.ts
/** dealLineItem object from warehouse app (workspace-specific, stable UUID) */
export const DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER =
  'a49785a0-9583-47d3-9090-88957201d23c';

import { STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

export const OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER =
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier;

export const COMPANY_OBJECT_UNIVERSAL_IDENTIFIER =
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier;
```

- [ ] **Step 2: Add stage constants**

```typescript
// src/constants/stages.ts
export const LINE_ITEM_STAGES = [
  { value: 'NOVYY', label: 'Новый', color: 'blue' },
  { value: 'V_RABOTE', label: 'В работе', color: 'purple' },
  { value: 'V_PECHATI', label: 'В печати', color: 'orange' },
  { value: 'OKLEYKA', label: 'Оклейка', color: 'yellow' },
  { value: 'GOTOVO', label: 'Готово', color: 'green' },
  { value: 'RESTAVRACIYA', label: 'Реставрация', color: 'pink' },
  { value: 'OTMENA', label: 'Отмена', color: 'red' },
] as const;

export type LineItemStage = (typeof LINE_ITEM_STAGES)[number]['value'];

export const DONE_STAGES: LineItemStage[] = ['GOTOVO', 'OTMENA'];

export const getStageLabel = (value: string): string =>
  LINE_ITEM_STAGES.find((s) => s.value === value)?.label ?? value;

export const getStageColor = (value: string): string =>
  LINE_ITEM_STAGES.find((s) => s.value === value)?.color ?? 'gray';
```

- [ ] **Step 3: Create dealLineItem fields (3 files)**

```typescript
// src/fields/deal-line-item-stage.field.ts
import { defineField, FieldType } from 'twenty-sdk/define';
import { DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import { LINE_ITEM_STAGES } from 'src/constants/stages';

export default defineField({
  universalIdentifier: 'b1c2d3e4-f5a6-7890-abcd-ef1234567001',
  objectUniversalIdentifier: DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'stage',
  type: FieldType.SELECT,
  label: 'Стадия',
  icon: 'IconStatusChange',
  options: LINE_ITEM_STAGES.map((s, i) => ({
    value: s.value,
    label: s.label,
    position: i,
    color: s.color,
  })),
});
```

```typescript
// src/fields/deal-line-item-ssylka-na-makety.field.ts
import { defineField, FieldType } from 'twenty-sdk/define';
import { DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';

export default defineField({
  universalIdentifier: 'b1c2d3e4-f5a6-7890-abcd-ef1234567002',
  objectUniversalIdentifier: DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'ssylkaNaMakety',
  type: FieldType.LINKS,
  label: 'Ссылка на макеты',
  icon: 'IconLink',
});
```

```typescript
// src/fields/deal-line-item-plenka.field.ts
import { defineField, FieldType } from 'twenty-sdk/define';
import { DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';

export default defineField({
  universalIdentifier: 'b1c2d3e4-f5a6-7890-abcd-ef1234567003',
  objectUniversalIdentifier: DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'plenka',
  type: FieldType.RICH_TEXT,
  label: 'Плёнка',
  icon: 'IconFileText',
});
```

- [ ] **Step 4: Create dealBoardView object**

```typescript
// src/objects/deal-board-view.object.ts
import { defineField, defineObject, FieldType } from 'twenty-sdk/define';

export const DEAL_BOARD_VIEW_OBJECT_UNIVERSAL_IDENTIFIER =
  'c3d4e5f6-a7b8-9012-cdef-345678901234';

export default defineObject({
  universalIdentifier: DEAL_BOARD_VIEW_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'dealBoardView',
  namePlural: 'dealBoardViews',
  labelSingular: 'View реализации',
  labelPlural: 'Views реализации',
  icon: 'IconTable',
  fields: [
    defineField({
      universalIdentifier: 'd4e5f6a7-b8c9-0123-defa-456789012301',
      name: 'visibility',
      type: FieldType.SELECT,
      label: 'Видимость',
      options: [
        { value: 'personal', label: 'Личный', position: 0, color: 'blue' },
        { value: 'workspace', label: 'Общий', position: 1, color: 'green' },
      ],
    }),
    defineField({
      universalIdentifier: 'd4e5f6a7-b8c9-0123-defa-456789012302',
      name: 'parentColumns',
      type: FieldType.RAW_JSON,
      label: 'Колонки сделок',
    }),
    defineField({
      universalIdentifier: 'd4e5f6a7-b8c9-0123-defa-456789012303',
      name: 'childColumns',
      type: FieldType.RAW_JSON,
      label: 'Колонки позиций',
    }),
    defineField({
      universalIdentifier: 'd4e5f6a7-b8c9-0123-defa-456789012304',
      name: 'filters',
      type: FieldType.RAW_JSON,
      label: 'Фильтры',
    }),
    defineField({
      universalIdentifier: 'd4e5f6a7-b8c9-0123-defa-456789012305',
      name: 'sort',
      type: FieldType.RAW_JSON,
      label: 'Сортировка',
    }),
    defineField({
      universalIdentifier: 'd4e5f6a7-b8c9-0123-defa-456789012306',
      name: 'isDefault',
      type: FieldType.BOOLEAN,
      label: 'По умолчанию',
      defaultValue: false,
    }),
  ],
});
```

Add to `src/constants/universal-identifiers.ts`:
```typescript
export const DEALS_BOARD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  'e5f6a7b8-c9d0-1234-efab-567890123456';
```

- [ ] **Step 5: Sync metadata**

Run: `yarn twenty dev --once`
Expected: exit 0; new fields visible on dealLineItem in Twenty settings

- [ ] **Step 6: Commit**

```bash
git add src/constants/crm-objects.ts src/constants/stages.ts src/fields/ src/objects/ src/constants/universal-identifiers.ts
git commit -m "feat: add dealLineItem fields and dealBoardView object"
```

---

### Task 2: Shared types, utils, unit tests

**Files:**
- Create: `src/constants/column-definitions.ts`
- Create: `src/deals-board/types.ts`
- Create: `src/deals-board/utils/summary.ts`
- Create: `src/deals-board/utils/columns.ts`
- Create: `src/deals-board/utils/summary.test.ts`
- Create: `src/deals-board/utils/columns.test.ts`
- Modify: `package.json` (add `test:unit` script)

- [ ] **Step 1: Write failing summary test**

```typescript
// src/deals-board/utils/summary.test.ts
import { describe, expect, it } from 'vitest';
import { buildStageSummary } from './summary';

describe('buildStageSummary', () => {
  it('aggregates stages into chips text', () => {
    const result = buildStageSummary([
      { stage: 'V_PECHATI' },
      { stage: 'V_PECHATI' },
      { stage: 'OKLEYKA' },
    ]);
    expect(result).toBe('3 поз.: 2 печать · 1 оклейка');
  });

  it('returns zero positions text', () => {
    expect(buildStageSummary([])).toBe('0 позиций');
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `yarn vitest run src/deals-board/utils/summary.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement summary + column utils**

```typescript
// src/deals-board/types.ts
import type { LineItemStage } from 'src/constants/stages';

export type ColumnConfig = {
  field: string;
  label: string;
  width?: number;
  order: number;
  visible: boolean;
};

export type DealBoardFilters = {
  dateFrom?: string;
  dateTo?: string;
  stages?: LineItemStage[];
  oplata?: string;
  search?: string;
};

export type DealBoardSort = { field: string; direction: 'AscNullsFirst' | 'DescNullsLast' };

export type DealBoardViewRecord = {
  id: string;
  name: string;
  visibility: 'personal' | 'workspace';
  parentColumns: ColumnConfig[];
  childColumns: ColumnConfig[];
  filters: DealBoardFilters;
  sort: DealBoardSort[];
  isDefault: boolean;
};

export type OpportunityRow = {
  id: string;
  name: string;
  loadDate?: string;
  companyId?: string;
  companyName?: string;
  amount?: { amountMicros: number; currencyCode: string };
  tonyLink?: { primaryLinkUrl?: string };
  bitrixLink?: { primaryLinkUrl?: string };
  oplata?: string | null;
};

export type LineItemRow = {
  id: string;
  opportunityId: string;
  name: string;
  kolichestvo?: number;
  amount?: { amountMicros: number; currencyCode: string };
  kommentariy?: string;
  stage?: LineItemStage | null;
  ssylkaNaMakety?: { primaryLinkUrl?: string; primaryLinkLabel?: string };
  plenka?: { markdown?: string };
};
```

```typescript
// src/deals-board/utils/summary.ts
import { getStageLabel } from 'src/constants/stages';

const SHORT_LABELS: Record<string, string> = {
  NOVYY: 'нов',
  V_RABOTE: 'работа',
  V_PECHATI: 'печать',
  OKLEYKA: 'оклейка',
  GOTOVO: 'готово',
  RESTAVRACIYA: 'реставр',
  OTMENA: 'отмена',
};

export const buildStageSummary = (
  items: ReadonlyArray<{ stage?: string | null }>,
): string => {
  if (items.length === 0) return '0 позиций';

  const counts = new Map<string, number>();
  for (const item of items) {
    const key = item.stage ?? 'NOVYY';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const parts = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([stage, count]) => `${count} ${SHORT_LABELS[stage] ?? getStageLabel(stage)}`);

  return `${items.length} поз.: ${parts.join(' · ')}`;
};
```

```typescript
// src/deals-board/utils/columns.ts
import type { ColumnConfig } from '../types';

export const parseColumns = (raw: unknown, fallback: ColumnConfig[]): ColumnConfig[] => {
  if (!Array.isArray(raw)) return fallback;
  return raw
    .filter((c): c is ColumnConfig => typeof c?.field === 'string')
    .sort((a, b) => a.order - b.order);
};

export const visibleColumns = (columns: ColumnConfig[]): ColumnConfig[] =>
  columns.filter((c) => c.visible);
```

```typescript
// src/constants/column-definitions.ts
import type { ColumnConfig } from 'src/deals-board/types';

export const DEFAULT_PARENT_COLUMNS: ColumnConfig[] = [
  { field: 'name', label: 'Сделка', order: 0, visible: true, width: 320 },
  { field: 'loadDate', label: 'Дата', order: 1, visible: true, width: 100 },
  { field: 'companyName', label: 'Компания', order: 2, visible: true, width: 160 },
  { field: 'summary', label: 'Сводка позиций', order: 3, visible: true, width: 200 },
  { field: 'links', label: 'Ссылки', order: 4, visible: true, width: 80 },
];

export const DEFAULT_CHILD_COLUMNS: ColumnConfig[] = [
  { field: 'name', label: 'Позиция', order: 0, visible: true, width: 240 },
  { field: 'stage', label: 'Стадия', order: 1, visible: true, width: 120 },
  { field: 'ssylkaNaMakety', label: 'Макеты', order: 2, visible: true, width: 100 },
  { field: 'plenka', label: 'Плёнка', order: 3, visible: true, width: 80 },
  { field: 'kolichestvo', label: 'Кол-во', order: 4, visible: true, width: 70 },
  { field: 'amount', label: 'Сумма', order: 5, visible: true, width: 100 },
  { field: 'kommentariy', label: 'Комментарий', order: 6, visible: false, width: 120 },
];
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `yarn vitest run src/deals-board/utils/`
Expected: all PASS

- [ ] **Step 5: Add test:unit script to package.json**

```json
"test:unit": "vitest run src/deals-board/utils/"
```

Update `ci.yml` lint step is not in current ci - only yarn test. Add unit tests to vitest config or run together:
```json
"test": "vitest run"
```
(already runs all tests including unit)

- [ ] **Step 6: Commit**

```bash
git add src/deals-board/ src/constants/column-definitions.ts package.json
git commit -m "feat: add deals-board types and summary utils with tests"
```

---

### Task 3: API layer (CoreApiClient)

**Files:**
- Create: `src/deals-board/api/client.ts`
- Create: `src/deals-board/api/opportunities.ts`
- Create: `src/deals-board/api/line-items.ts`
- Create: `src/deals-board/api/companies.ts`
- Create: `src/deals-board/api/views.ts`

- [ ] **Step 1: Create API client wrapper**

```typescript
// src/deals-board/api/client.ts
import { CoreApiClient } from 'twenty-sdk/clients';

let client: CoreApiClient | null = null;

export const getApiClient = (): CoreApiClient => {
  if (!client) client = new CoreApiClient();
  return client;
};
```

- [ ] **Step 2: Implement opportunities query**

```typescript
// src/deals-board/api/opportunities.ts
import { getApiClient } from './client';
import type { DealBoardFilters, DealBoardSort, OpportunityRow } from '../types';

const OPPORTUNITY_FIELDS = {
  id: true,
  name: true,
  loadDate: true,
  companyId: true,
  amount: { amountMicros: true, currencyCode: true },
  tonyLink: { primaryLinkUrl: true, primaryLinkLabel: true },
  bitrixLink: { primaryLinkUrl: true, primaryLinkLabel: true },
  oplata: true,
} as const;

export const fetchOpportunities = async (params: {
  limit: number;
  offset: number;
  sort: DealBoardSort[];
  filters: DealBoardFilters;
}): Promise<{ records: OpportunityRow[]; totalCount: number }> => {
  const client = getApiClient();
  const orderBy = params.sort.length
    ? params.sort.map((s) => ({ [s.field]: s.direction }))
    : [{ loadDate: 'AscNullsFirst' as const }];

  const result = await client.query({
    opportunities: {
      __args: {
        first: params.limit,
        offset: params.offset,
        orderBy,
        filter: buildOpportunityFilter(params.filters),
      },
      edges: { node: OPPORTUNITY_FIELDS },
      totalCount: true,
    },
  });

  const records = (result.opportunities?.edges ?? []).map((e) => e.node as OpportunityRow);
  return { records, totalCount: result.opportunities?.totalCount ?? 0 };
};

const buildOpportunityFilter = (filters: DealBoardFilters) => {
  const and: Record<string, unknown>[] = [];
  if (filters.dateFrom) and.push({ loadDate: { gte: filters.dateFrom } });
  if (filters.dateTo) and.push({ loadDate: { lte: filters.dateTo } });
  if (filters.oplata) and.push({ oplata: { eq: filters.oplata } });
  if (filters.search) and.push({ name: { ilike: `%${filters.search}%` } });
  return and.length ? { and } : undefined;
};
```

- [ ] **Step 3: Implement line items query + mutation**

```typescript
// src/deals-board/api/line-items.ts
import { getApiClient } from './client';
import type { LineItemRow } from '../types';

const LINE_ITEM_FIELDS = {
  id: true,
  opportunityId: true,
  name: true,
  kolichestvo: true,
  amount: { amountMicros: true, currencyCode: true },
  kommentariy: true,
  stage: true,
  ssylkaNaMakety: { primaryLinkUrl: true, primaryLinkLabel: true },
  plenka: { markdown: true },
} as const;

export const fetchLineItemsByOpportunityIds = async (
  opportunityIds: string[],
  stageFilter?: string[],
): Promise<LineItemRow[]> => {
  if (opportunityIds.length === 0) return [];
  const client = getApiClient();
  const filter: Record<string, unknown> = {
    opportunityId: { in: opportunityIds },
  };
  if (stageFilter?.length) filter.stage = { in: stageFilter };

  const result = await client.query({
    dealLineItems: {
      __args: { first: 500, filter },
      edges: { node: LINE_ITEM_FIELDS },
    },
  });

  return (result.dealLineItems?.edges ?? []).map((e) => e.node as LineItemRow);
};

export const updateLineItem = async (
  id: string,
  data: Partial<Pick<LineItemRow, 'stage' | 'kolichestvo' | 'kommentariy'>> & {
    ssylkaNaMakety?: { primaryLinkUrl: string; primaryLinkLabel?: string };
    plenka?: { markdown: string };
  },
): Promise<void> => {
  const client = getApiClient();
  await client.mutation({
    updateDealLineItem: {
      __args: { id, data },
      id: true,
    },
  });
};
```

- [ ] **Step 4: Implement companies + views API** (same pattern; views use `dealBoardViews` GraphQL object name from `namePlural`)

- [ ] **Step 5: Manual smoke test**

Run: `yarn twenty dev` → open browser console in DealsBoard (temporary button) calling `fetchOpportunities({ limit: 5, offset: 0, sort: [], filters: {} })`
Expected: 5 opportunity records returned

- [ ] **Step 6: Commit**

```bash
git add src/deals-board/api/
git commit -m "feat: add GraphQL API layer for deals board"
```

---

### Task 4: React Query hooks + expand mode

**Files:**
- Create: `src/deals-board/hooks/useExpandMode.ts`
- Create: `src/deals-board/hooks/useOpportunities.ts`
- Create: `src/deals-board/hooks/useLineItems.ts`
- Create: `src/deals-board/hooks/useDealBoardViews.ts`
- Modify: `package.json` — add `@tanstack/react-query`

- [ ] **Step 1: Install dependency**

```bash
yarn add @tanstack/react-query
```

- [ ] **Step 2: Implement useExpandMode (localStorage)**

```typescript
// src/deals-board/hooks/useExpandMode.ts
import { useCallback, useState } from 'react';

export type ExpandMode = 'collapsed' | 'smart';

const STORAGE_KEY = 'deals-board-expand-mode';

export const useExpandMode = () => {
  const [mode, setModeState] = useState<ExpandMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'smart' ? 'smart' : 'collapsed';
  });

  const setMode = useCallback((next: ExpandMode) => {
    localStorage.setItem(STORAGE_KEY, next);
    setModeState(next);
  }, []);

  return { mode, setMode };
};
```

- [ ] **Step 3: Implement useOpportunities + useLineItems with React Query**

Query keys:
- `['opportunities', viewId, quickFilters, page]`
- `['lineItems', opportunityIds, stageFilter]`
- `['dealBoardViews']`

Mutations invalidate on success; `updateLineItem` uses optimistic update for `stage`.

- [ ] **Step 4: Commit**

```bash
git add package.json yarn.lock src/deals-board/hooks/
git commit -m "feat: add React Query hooks and expand mode preference"
```

---

### Task 5: DealsBoard shell + parent table (flat)

**Files:**
- Create: `src/deals-board/DealsBoard.tsx`
- Create: `src/deals-board/DealsTable/DealsTable.tsx`
- Create: `src/deals-board/DealsTable/DealRow.tsx`
- Create: `src/front-components/deals-board.tsx`
- Modify: `src/page-layouts/main-page.page-layout.ts` — widget → `DEALS_BOARD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER`
- Delete: `src/front-components/main-page.tsx` (or keep as backup until Task 5 verified)

- [ ] **Step 1: Create DealsBoard root**

```tsx
// src/deals-board/DealsBoard.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useColorScheme } from 'twenty-sdk/front-component';
import { DealsTable } from './DealsTable/DealsTable';

const queryClient = new QueryClient();

export const DealsBoard = () => {
  const colorScheme = useColorScheme();
  return (
    <QueryClientProvider client={queryClient}>
      <div
        data-theme={colorScheme}
        style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
      >
        <DealsTable />
      </div>
    </QueryClientProvider>
  );
};
```

- [ ] **Step 2: Wire front component**

```tsx
// src/front-components/deals-board.tsx
import { defineFrontComponent } from 'twenty-sdk/define';
import { APP_DISPLAY_NAME, DEALS_BOARD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { DealsBoard } from 'src/deals-board/DealsBoard';

export default defineFrontComponent({
  universalIdentifier: DEALS_BOARD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'deals-board',
  description: `${APP_DISPLAY_NAME} — таблица сделок`,
  component: DealsBoard,
});
```

- [ ] **Step 3: Update page layout widget reference**

In `main-page.page-layout.ts`, change `frontComponentUniversalIdentifier` to `DEALS_BOARD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER`.

- [ ] **Step 4: Implement flat DealsTable** — render parent columns from active view; pagination 50/page; loading/empty states.

- [ ] **Step 5: Sync and verify**

Run: `yarn twenty dev --once`
Open: sidebar → «Реализация»
Expected: table with opportunities, no nested rows yet

- [ ] **Step 6: Commit**

```bash
git add src/deals-board/ src/front-components/deals-board.tsx src/page-layouts/
git commit -m "feat: add DealsBoard shell with flat opportunities table"
```

---

### Task 6: Nested LineItemsTable + summary chips + expand

**Files:**
- Create: `src/deals-board/DealsTable/LineItemsTable.tsx`
- Create: `src/deals-board/DealsTable/DealSummaryChips.tsx`
- Modify: `src/deals-board/DealsTable/DealRow.tsx`
- Modify: `src/deals-board/DealsTable/DealsTable.tsx`

- [ ] **Step 1: DealSummaryChips component** — uses `buildStageSummary` + `Tag` from twenty-sdk/ui with stage colors

- [ ] **Step 2: Expand/collapse state** — `expandedIds: Set<string>` in DealsTable; session-persisted in `sessionStorage`

- [ ] **Step 3: Smart expand logic**

```typescript
const shouldAutoExpand = (items: LineItemRow[], mode: ExpandMode): boolean =>
  mode === 'smart' && items.some((i) => i.stage && !DONE_STAGES.includes(i.stage));
```

On data load: auto-add to `expandedIds` when `shouldAutoExpand` true.

- [ ] **Step 4: LineItemsTable** — nested table with child columns from view; deal with 0 items shows no ▶ arrow

- [ ] **Step 5: Verify manually** — expand deal, see line items + summary in collapsed state

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: add nested line items table with summary chips"
```

---

### Task 7: Inline and popover editors

**Files:**
- Create: `src/deals-board/editors/StageSelect.tsx`
- Create: `src/deals-board/editors/LinkCell.tsx`
- Create: `src/deals-board/editors/NumberCell.tsx`
- Create: `src/deals-board/editors/RichTextPopover.tsx`
- Modify: `src/deals-board/DealsTable/LineItemsTable.tsx`

- [ ] **Step 1: StageSelect** — `<select>` with stage options; onChange → `updateLineItem` mutation; retry once on network error

- [ ] **Step 2: LinkCell** — click to edit URL inline; show 🔗 icon when `primaryLinkUrl` set

- [ ] **Step 3: NumberCell** — inline `<input type="number">` for `kolichestvo`

- [ ] **Step 4: RichTextPopover** — click 📝 opens popover with `<textarea>` for `plenka.markdown` and `kommentariy`; Save/Cancel buttons

- [ ] **Step 5: Wire editors into LineItemsTable** per column `field` type mapping

- [ ] **Step 6: Verify** — change stage on a line item, refresh page, value persisted

- [ ] **Step 7: Commit**

```bash
git commit -m "feat: add hybrid inline/popover editors for line items"
```

---

### Task 8: Views system (switcher, column picker, persistence)

**Files:**
- Create: `src/deals-board/ViewSwitcher.tsx`
- Create: `src/deals-board/ColumnPicker.tsx`
- Create: `src/deals-board/ViewSettingsModal.tsx`
- Create: `src/logic-functions/seed-default-view.ts`
- Modify: `src/application-config.ts` — add `onInstall` hook if supported, or seed in DealsBoard on mount

- [ ] **Step 1: Seed default view «Базовый обзор»**

On first `useDealBoardViews` load: if no workspace views exist, create one with `visibility: workspace`, `isDefault: true`, default columns from `column-definitions.ts`.

- [ ] **Step 2: ViewSwitcher** — dropdown list (personal + workspace views); «+ Новый view» opens ViewSettingsModal

- [ ] **Step 3: ViewSettingsModal** — name, visibility (personal/workspace), save → `createDealBoardView` mutation

- [ ] **Step 4: ColumnPicker** — toggle visibility + reorder (up/down buttons); separate instances for parent/child; save updates active view

- [ ] **Step 5: Verify** — create personal view, switch between views, columns change

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: add configurable views with column picker"
```

---

### Task 9: Quick filters + AppSettingsModal

**Files:**
- Create: `src/deals-board/QuickFiltersBar.tsx`
- Create: `src/deals-board/AppSettingsModal.tsx`
- Modify: `src/deals-board/DealsBoard.tsx`

- [ ] **Step 1: QuickFiltersBar** — date range presets (сегодня/неделя/месяц), stage multiselect, oplata select, search input, «Сбросить» button

- [ ] **Step 2: Stage filter logic** — filter opportunities client-side OR server-side: show deal if any line item matches selected stages (fetch line items with stage filter, derive opportunity IDs)

- [ ] **Step 3: AppSettingsModal** — radio: «Свёрнуто» / «Умное раскрытие»; uses `useExpandMode`

- [ ] **Step 4: Wire into DealsBoard header** — ViewSwitcher | QuickFiltersBar | ⚙ Settings

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add quick filters and expand mode settings"
```

---

### Task 10: Virtual scroll + polish + CI

**Files:**
- Modify: `src/deals-board/DealsTable/DealsTable.tsx`
- Modify: `package.json` — add `@tanstack/react-virtual`
- Modify: `.github/workflows/ci.yml` — add lint step if missing
- Delete: `src/front-components/main-page.tsx` (cleanup)

- [ ] **Step 1: Install virtual scroll**

```bash
yarn add @tanstack/react-virtual
```

- [ ] **Step 2: Wrap deal rows in `useVirtualizer`** — estimate row height 48px collapsed, dynamic when expanded

- [ ] **Step 3: Sticky first column** — CSS `position: sticky; left: 0` on deal name cell

- [ ] **Step 4: Empty/error states** — «Нет сделок по фильтрам» + reset button; toast on save error (simple `alert` fallback if no toast SDK)

- [ ] **Step 5: Remove scaffold main-page.tsx**; update navigation icon to `IconTargetArrow`

- [ ] **Step 6: Run full test suite**

Run: `yarn lint && yarn test`
Expected: PASS (integration tests may need updated schema assertions)

- [ ] **Step 7: Sync + push**

```bash
yarn twenty dev --once
git push origin main
```

Verify GitHub Actions CI green.

- [ ] **Step 8: Final commit**

```bash
git commit -m "feat: add virtual scroll and polish deals board UI"
```

---

## Spec Coverage Checklist

| Spec requirement | Task |
|------------------|------|
| Nested table opportunities + line items | Task 5, 6 |
| Configurable columns parent/child | Task 8 |
| Views (personal/workspace) | Task 8 |
| Quick filters (date, stage, oplata, search) | Task 9 |
| Expand mode A↔C toggle | Task 4, 9 |
| stage/ssylkaNaMakety/plenka on line item | Task 1 |
| dealBoardView object | Task 1, 8 |
| Hybrid editing | Task 7 |
| Summary chips in collapsed row | Task 6 |
| Virtual scroll | Task 10 |
| twenty-sdk/ui styling | Task 5–10 |
| GitHub Actions deploy | Already done (pre-task) |
| Default view «Базовый обзор» | Task 8 |
| No expense view / no migration | Excluded ✓ |

## Manual Test Checklist (post-implementation)

- [ ] Open «Реализация» — 50+ deals load
- [ ] Collapsed row shows summary chips
- [ ] Expand deal — line items visible
- [ ] Change stage inline — persists after reload
- [ ] Edit plenka via popover — persists
- [ ] Create personal view — switch works
- [ ] Quick filter by stage — correct deals shown
- [ ] Toggle expand mode in settings — behavior changes
- [ ] Scroll 200+ deals — smooth virtual scroll
