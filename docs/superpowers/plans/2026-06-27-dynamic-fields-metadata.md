# Dynamic Fields from Metadata — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сделать Deals Board metadata-driven — новые CRM-поля появляются в ColumnPicker (скрытыми), поддерживают inline-edit для простых типов на обеих таблицах; виртуальные колонки сохраняются.

**Architecture:** Runtime fetch полей через `MetadataApiClient`; merge saved view columns с CRM descriptors и virtual columns; единый `DynamicFieldCell` с override registry для особых полей и generic editors для TEXT/NUMBER/BOOLEAN/DATE/SELECT; dynamic GraphQL selection для opportunities; generic REST patch для обоих объектов.

**Tech Stack:** twenty-client-sdk 2.16, twenty-client-sdk/metadata, React 19, @tanstack/react-query, Vitest, TypeScript.

**Spec:** [docs/superpowers/specs/2026-06-27-dynamic-fields-metadata-design.md](../specs/2026-06-27-dynamic-fields-metadata-design.md)

---

## File Map

| Path | Responsibility |
|------|----------------|
| `src/deals-board/metadata/types.ts` | `FieldDescriptor`, `SelectOption`, board object names |
| `src/deals-board/metadata/field-registry.ts` | Normalize metadata → descriptors; `isEditable`; default widths |
| `src/deals-board/metadata/virtual-columns.ts` | Virtual parent column descriptors |
| `src/deals-board/metadata/merge-columns.ts` | Merge saved + CRM + virtual columns |
| `src/deals-board/metadata/fetch-object-fields.ts` | MetadataApiClient query |
| `src/deals-board/metadata/useObjectFields.ts` | React Query hook |
| `src/deals-board/metadata/build-opportunity-selection.ts` | Dynamic GraphQL node selection |
| `src/deals-board/metadata/crm-field-names.ts` | Extract CRM field names from merged columns |
| `src/deals-board/cells/DynamicFieldCell.tsx` | Unified cell renderer |
| `src/deals-board/cells/format-read-only-value.ts` | Read-only formatters by type |
| `src/deals-board/cells/overrides.tsx` | Override registry (stage, summary, links…) |
| `src/deals-board/editors/TextCell.tsx` | Generic TEXT inline editor |
| `src/deals-board/editors/BooleanCell.tsx` | Generic BOOLEAN toggle |
| `src/deals-board/editors/DateCell.tsx` | Generic DATE input |
| `src/deals-board/editors/SelectCell.tsx` | Generic SELECT from metadata options |
| `src/deals-board/editors/NumberCell.tsx` | Refactor to generic field name + object |
| `src/deals-board/hooks/useUpdateRecord.ts` | Unified mutation for opportunity + dealLineItem |
| `src/deals-board/hooks/useOpportunities.ts` | Add visible field names to query key |
| `src/constants/column-definitions.ts` | Fallback when metadata unavailable |
| `src/constants/date-filter-field.ts` | `loadDate` config for quick filter |
| `src/deals-board/api/opportunities.ts` | Dynamic fields + `patchOpportunity` |
| `src/deals-board/api/line-items.ts` | Generic `updateLineItem` patch |
| `src/deals-board/DealsBoard.tsx` | Wire metadata hooks, merged columns, banner |
| `src/deals-board/DealsTable/DealRow.tsx` | Use `DynamicFieldCell` |
| `src/deals-board/DealsTable/LineItemsTable.tsx` | Use `DynamicFieldCell` |
| `src/deals-board/ColumnPicker.tsx` | Accept merged columns with fresh labels |
| `src/__tests__/metadata.integration-test.ts` | Metadata API smoke test |

---

### Task 1: Field registry types and helpers

**Files:**
- Create: `src/deals-board/metadata/types.ts`
- Create: `src/deals-board/metadata/field-registry.ts`
- Test: `src/deals-board/metadata/field-registry.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/deals-board/metadata/field-registry.test.ts
import { describe, expect, it } from 'vitest';
import {
  defaultWidthForFieldType,
  isEditableFieldType,
  toFieldDescriptor,
} from './field-registry';
import type { RawFieldMetadata } from './types';

describe('isEditableFieldType', () => {
  it('returns true for simple types', () => {
    expect(isEditableFieldType('TEXT')).toBe(true);
    expect(isEditableFieldType('SELECT')).toBe(true);
  });

  it('returns false for complex types', () => {
    expect(isEditableFieldType('LINKS')).toBe(false);
    expect(isEditableFieldType('RELATION')).toBe(false);
  });
});

describe('toFieldDescriptor', () => {
  it('marks UI read-only fields as not editable', () => {
    const raw: RawFieldMetadata = {
      name: 'name',
      label: 'Name',
      type: 'TEXT',
      isUIReadOnly: true,
    };
    expect(toFieldDescriptor(raw).isEditable).toBe(false);
  });

  it('parses SELECT options', () => {
    const raw: RawFieldMetadata = {
      name: 'stage',
      label: 'Stage',
      type: 'SELECT',
      options: [{ value: 'NOVYY', label: 'Новый' }],
    };
    const descriptor = toFieldDescriptor(raw);
    expect(descriptor.options).toEqual([{ value: 'NOVYY', label: 'Новый' }]);
  });
});

describe('defaultWidthForFieldType', () => {
  it('returns 80 for NUMBER', () => {
    expect(defaultWidthForFieldType('NUMBER')).toBe(80);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/deals-board/metadata/field-registry.test.ts`  
Expected: FAIL — module not found

- [ ] **Step 3: Implement types and registry**

```typescript
// src/deals-board/metadata/types.ts
export type BoardObjectName = 'opportunity' | 'dealLineItem';

export type SelectOption = { value: string; label: string };

export type FieldDescriptor = {
  field: string;
  label: string;
  source: 'crm' | 'virtual';
  fieldType?: string;
  isEditable: boolean;
  options?: SelectOption[];
};

export type RawFieldMetadata = {
  name: string;
  label: string;
  type: string;
  isActive?: boolean;
  isSystem?: boolean;
  isUIReadOnly?: boolean;
  options?: unknown;
};
```

```typescript
// src/deals-board/metadata/field-registry.ts
import type { FieldDescriptor, RawFieldMetadata, SelectOption } from './types';

const EDITABLE_TYPES = new Set(['TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'SELECT']);

export const isEditableFieldType = (type: string): boolean => EDITABLE_TYPES.has(type);

const parseSelectOptions = (raw: unknown): SelectOption[] | undefined => {
  if (!Array.isArray(raw)) return undefined;
  const options = raw
    .filter((item): item is { value: string; label: string } =>
      Boolean(item && typeof item === 'object' && typeof (item as { value?: unknown }).value === 'string'),
    )
    .map((item) => ({ value: item.value, label: String(item.label ?? item.value) }));
  return options.length ? options : undefined;
};

export const toFieldDescriptor = (raw: RawFieldMetadata): FieldDescriptor => ({
  field: raw.name,
  label: raw.label,
  source: 'crm',
  fieldType: raw.type,
  isEditable: !raw.isUIReadOnly && isEditableFieldType(raw.type),
  options: raw.type === 'SELECT' ? parseSelectOptions(raw.options) : undefined,
});

export const defaultWidthForFieldType = (fieldType: string | undefined, fieldName?: string): number => {
  if (fieldName === 'summary') return 200;
  if (fieldName === 'name') return 240;
  switch (fieldType) {
    case 'NUMBER':
      return 80;
    case 'DATE':
    case 'DATE_TIME':
      return 100;
    case 'BOOLEAN':
      return 60;
    case 'RICH_TEXT':
    case 'LINKS':
      return 120;
    case 'SELECT':
    case 'TEXT':
    default:
      return 160;
  }
};

export const filterActiveCrmFields = (fields: RawFieldMetadata[]): RawFieldMetadata[] =>
  fields.filter((field) => field.isActive !== false && field.isSystem !== true);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run src/deals-board/metadata/field-registry.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/metadata/types.ts src/deals-board/metadata/field-registry.ts src/deals-board/metadata/field-registry.test.ts
git commit -m "feat: add metadata field registry with editable type rules"
```

---

### Task 2: Virtual columns and merge-columns

**Files:**
- Create: `src/deals-board/metadata/virtual-columns.ts`
- Create: `src/deals-board/metadata/merge-columns.ts`
- Test: `src/deals-board/metadata/merge-columns.test.ts`
- Modify: `src/constants/column-definitions.ts`

- [ ] **Step 1: Write failing merge tests**

```typescript
// src/deals-board/metadata/merge-columns.test.ts
import { describe, expect, it } from 'vitest';
import type { ColumnConfig } from '../types';
import { mergeColumns } from './merge-columns';
import type { FieldDescriptor } from './types';
import { VIRTUAL_PARENT_FIELD_DESCRIPTORS } from './virtual-columns';

const crmFields: FieldDescriptor[] = [
  { field: 'name', label: 'Сделка', source: 'crm', fieldType: 'TEXT', isEditable: true },
  { field: 'loadDate', label: 'Дата загрузки', source: 'crm', fieldType: 'DATE', isEditable: true },
  { field: 'newField', label: 'Новое поле', source: 'crm', fieldType: 'TEXT', isEditable: true },
];

const saved: ColumnConfig[] = [
  { field: 'name', label: 'Old label', order: 0, visible: true, width: 320 },
  { field: 'loadDate', label: 'Old date', order: 1, visible: true, width: 100 },
  { field: 'removedField', label: 'Gone', order: 2, visible: true, width: 100 },
];

describe('mergeColumns', () => {
  it('updates labels from descriptors and keeps saved order/width/visible', () => {
    const merged = mergeColumns(saved, crmFields, VIRTUAL_PARENT_FIELD_DESCRIPTORS);
    expect(merged.find((c) => c.field === 'name')).toMatchObject({
      label: 'Сделка',
      order: 0,
      visible: true,
      width: 320,
    });
  });

  it('appends new CRM fields as hidden at the end', () => {
    const merged = mergeColumns(saved, crmFields, VIRTUAL_PARENT_FIELD_DESCRIPTORS);
    const added = merged.find((c) => c.field === 'newField');
    expect(added).toMatchObject({ visible: false, label: 'Новое поле' });
    expect(added!.order).toBeGreaterThan(merged.filter((c) => c.field !== 'newField').length - 1);
  });

  it('drops orphan saved columns not in descriptors', () => {
    const merged = mergeColumns(saved, crmFields, VIRTUAL_PARENT_FIELD_DESCRIPTORS);
    expect(merged.some((c) => c.field === 'removedField')).toBe(false);
  });

  it('appends missing virtual columns with defaults', () => {
    const merged = mergeColumns(saved, crmFields, VIRTUAL_PARENT_FIELD_DESCRIPTORS);
    expect(merged.some((c) => c.field === 'summary')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/deals-board/metadata/merge-columns.test.ts`  
Expected: FAIL

- [ ] **Step 3: Implement virtual columns and merge**

```typescript
// src/deals-board/metadata/virtual-columns.ts
import type { FieldDescriptor } from './types';

export const VIRTUAL_PARENT_FIELD_DESCRIPTORS: FieldDescriptor[] = [
  { field: 'summary', label: 'Сводка позиций', source: 'virtual', isEditable: false },
  { field: 'companyName', label: 'Компания', source: 'virtual', isEditable: false },
  { field: 'links', label: 'Ссылки', source: 'virtual', isEditable: false },
];

export const VIRTUAL_PARENT_DEFAULTS: Record<string, { visible: boolean; width: number; order: number }> = {
  summary: { visible: true, width: 200, order: 3 },
  companyName: { visible: true, width: 160, order: 2 },
  links: { visible: false, width: 80, order: 4 },
};
```

```typescript
// src/deals-board/metadata/merge-columns.ts
import type { ColumnConfig } from '../types';
import { defaultWidthForFieldType } from './field-registry';
import type { FieldDescriptor } from './types';
import { VIRTUAL_PARENT_DEFAULTS } from './virtual-columns';

const descriptorMap = (descriptors: FieldDescriptor[]) =>
  new Map(descriptors.map((descriptor) => [descriptor.field, descriptor]));

export const mergeColumns = (
  savedColumns: ColumnConfig[],
  crmDescriptors: FieldDescriptor[],
  virtualDescriptors: FieldDescriptor[] = [],
): ColumnConfig[] => {
  const allDescriptors = [...crmDescriptors, ...virtualDescriptors];
  const byField = descriptorMap(allDescriptors);
  const savedByField = new Map(savedColumns.map((column) => [column.field, column]));

  const merged: ColumnConfig[] = [];

  for (const saved of [...savedColumns].sort((a, b) => a.order - b.order)) {
    const descriptor = byField.get(saved.field);
    if (!descriptor) continue;
    merged.push({
      ...saved,
      label: descriptor.label,
    });
  }

  let nextOrder = merged.reduce((max, column) => Math.max(max, column.order), -1) + 1;

  for (const descriptor of allDescriptors) {
    if (savedByField.has(descriptor.field)) continue;

    const virtualDefaults = VIRTUAL_PARENT_DEFAULTS[descriptor.field];
    merged.push({
      field: descriptor.field,
      label: descriptor.label,
      order: virtualDefaults?.order ?? nextOrder++,
      visible: virtualDefaults?.visible ?? false,
      width:
        virtualDefaults?.width ??
        defaultWidthForFieldType(descriptor.fieldType, descriptor.field),
    });
  }

  return merged.sort((a, b) => a.order - b.order);
};
```

Update `column-definitions.ts` header comment: used as **fallback** when metadata API fails; keep current arrays unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run src/deals-board/metadata/merge-columns.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/metadata/virtual-columns.ts src/deals-board/metadata/merge-columns.ts src/deals-board/metadata/merge-columns.test.ts src/constants/column-definitions.ts
git commit -m "feat: merge saved view columns with CRM and virtual descriptors"
```

---

### Task 3: Metadata fetch and React Query hook

**Files:**
- Create: `src/deals-board/metadata/fetch-object-fields.ts`
- Create: `src/deals-board/metadata/useObjectFields.ts`
- Test: `src/__tests__/metadata.integration-test.ts`

- [ ] **Step 1: Write integration test**

```typescript
// src/__tests__/metadata.integration-test.ts
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { describe, expect, it } from 'vitest';
import { fetchObjectFields } from 'src/deals-board/metadata/fetch-object-fields';

describe('Metadata API', () => {
  it('returns active fields for opportunity', async () => {
    const fields = await fetchObjectFields('opportunity');
    expect(fields.length).toBeGreaterThan(0);
    expect(fields.some((field) => field.name === 'name')).toBe(true);
  });

  it('returns active fields for dealLineItem', async () => {
    const fields = await fetchObjectFields('dealLineItem');
    expect(fields.length).toBeGreaterThan(0);
    expect(fields.some((field) => field.name === 'name')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/__tests__/metadata.integration-test.ts`  
Expected: FAIL — `fetchObjectFields` not found

- [ ] **Step 3: Implement fetch + hook**

```typescript
// src/deals-board/metadata/fetch-object-fields.ts
import { MetadataApiClient } from 'twenty-client-sdk/metadata';

import { filterActiveCrmFields, toFieldDescriptor } from './field-registry';
import type { BoardObjectName, FieldDescriptor, RawFieldMetadata } from './types';

let metadataClient: MetadataApiClient | null = null;

const getMetadataClient = (): MetadataApiClient => {
  if (!metadataClient) metadataClient = new MetadataApiClient();
  return metadataClient;
};

export const fetchObjectFields = async (
  objectNameSingular: BoardObjectName,
): Promise<RawFieldMetadata[]> => {
  const client = getMetadataClient();
  const result = await client.query({
    objects: {
      __args: {
        filter: { nameSingular: { eq: objectNameSingular } },
        paging: { first: 1 },
      },
      edges: {
        node: {
          nameSingular: true,
          fieldsList: {
            name: true,
            label: true,
            type: true,
            isActive: true,
            isSystem: true,
            isUIReadOnly: true,
            options: true,
          },
        },
      },
    },
  });

  const fieldsList = result.objects?.edges?.[0]?.node?.fieldsList ?? [];
  return filterActiveCrmFields(fieldsList as RawFieldMetadata[]);
};

export const fetchFieldDescriptors = async (
  objectNameSingular: BoardObjectName,
): Promise<FieldDescriptor[]> => {
  const rawFields = await fetchObjectFields(objectNameSingular);
  return rawFields.map(toFieldDescriptor);
};
```

```typescript
// src/deals-board/metadata/useObjectFields.ts
import { useQuery } from '@tanstack/react-query';

import { fetchFieldDescriptors } from './fetch-object-fields';
import type { BoardObjectName, FieldDescriptor } from './types';

export const objectFieldsQueryKey = (objectName: BoardObjectName) =>
  ['objectFields', objectName] as const;

export const useObjectFields = (objectName: BoardObjectName) =>
  useQuery<FieldDescriptor[]>({
    queryKey: objectFieldsQueryKey(objectName),
    queryFn: () => fetchFieldDescriptors(objectName),
    staleTime: 5 * 60_000,
  });
```

- [ ] **Step 4: Run integration test**

Run: `yarn vitest run src/__tests__/metadata.integration-test.ts`  
Expected: PASS (requires local Twenty server from vitest global setup)

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/metadata/fetch-object-fields.ts src/deals-board/metadata/useObjectFields.ts src/__tests__/metadata.integration-test.ts
git commit -m "feat: fetch CRM field descriptors from Metadata API"
```

---

### Task 4: Dynamic GraphQL selection for opportunities

**Files:**
- Create: `src/deals-board/metadata/build-opportunity-selection.ts`
- Create: `src/deals-board/metadata/crm-field-names.ts`
- Test: `src/deals-board/metadata/build-opportunity-selection.test.ts`
- Modify: `src/deals-board/api/opportunities.ts`
- Create: `src/constants/date-filter-field.ts`

- [ ] **Step 1: Write failing selection tests**

```typescript
// src/deals-board/metadata/build-opportunity-selection.test.ts
import { describe, expect, it } from 'vitest';
import { buildOpportunityNodeSelection } from './build-opportunity-selection';

describe('buildOpportunityNodeSelection', () => {
  it('always includes base fields', () => {
    const selection = buildOpportunityNodeSelection([]);
    expect(selection).toMatchObject({ id: true, name: true, companyId: true });
  });

  it('includes nested company when companyName is visible', () => {
    const selection = buildOpportunityNodeSelection(['companyName']);
    expect(selection.company).toEqual({ id: true, name: true });
  });

  it('includes amount sub-selection for currency field', () => {
    const selection = buildOpportunityNodeSelection(['amount']);
    expect(selection.amount).toEqual({ amountMicros: true, currencyCode: true });
  });

  it('includes link sub-selection for LINKS fields', () => {
    const selection = buildOpportunityNodeSelection(['tonyLink']);
    expect(selection.tonyLink).toEqual({ primaryLinkUrl: true, primaryLinkLabel: true });
  });
});
```

```typescript
// src/deals-board/metadata/crm-field-names.test.ts
import { describe, expect, it } from 'vitest';
import type { ColumnConfig } from '../types';
import { crmFieldNamesFromColumns } from './crm-field-names';

describe('crmFieldNamesFromColumns', () => {
  it('skips virtual columns but maps companyName to company fetch needs', () => {
    const columns: ColumnConfig[] = [
      { field: 'name', label: 'Name', order: 0, visible: true },
      { field: 'summary', label: 'Summary', order: 1, visible: true },
      { field: 'loadDate', label: 'Date', order: 2, visible: true },
    ];
    expect(crmFieldNamesFromColumns(columns)).toEqual(['name', 'loadDate']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn vitest run src/deals-board/metadata/build-opportunity-selection.test.ts src/deals-board/metadata/crm-field-names.test.ts`  
Expected: FAIL

- [ ] **Step 3: Implement helpers and update opportunities API**

```typescript
// src/constants/date-filter-field.ts
/** Opportunity DATE field used by quick filters (must exist in workspace metadata). */
export const OPPORTUNITY_DATE_FILTER_FIELD = 'loadDate';
```

```typescript
// src/deals-board/metadata/crm-field-names.ts
import type { ColumnConfig } from '../types';

const VIRTUAL_FIELDS = new Set(['summary', 'companyName', 'links']);

export const crmFieldNamesFromColumns = (columns: ColumnConfig[]): string[] => {
  const names = new Set<string>();
  for (const column of columns.filter((item) => item.visible)) {
    if (VIRTUAL_FIELDS.has(column.field)) continue;
    names.add(column.field);
  }
  return [...names];
};

export const needsCompanyRelation = (columns: ColumnConfig[]): boolean =>
  columns.some((column) => column.visible && (column.field === 'companyName' || column.field === 'company'));
```

```typescript
// src/deals-board/metadata/build-opportunity-selection.ts
const LINK_FIELD_NAMES = new Set(['tonyLink', 'bitrixLink', 'ssylkaNaMakety']);

export const buildOpportunityNodeSelection = (
  visibleCrmFieldNames: string[],
  includeCompanyRelation = false,
): Record<string, unknown> => {
  const selection: Record<string, unknown> = {
    id: true,
    name: true,
    companyId: true,
  };

  if (includeCompanyRelation) {
    selection.company = { id: true, name: true };
  }

  for (const field of visibleCrmFieldNames) {
    if (field === 'company' || field === 'companyName') continue;
    if (field === 'amount') {
      selection.amount = { amountMicros: true, currencyCode: true };
      continue;
    }
    if (LINK_FIELD_NAMES.has(field) || field.endsWith('Link')) {
      selection[field] = { primaryLinkUrl: true, primaryLinkLabel: true };
      continue;
    }
    selection[field] = true;
  }

  return selection;
};
```

Update `src/deals-board/api/opportunities.ts`:

- Add param `visibleCrmFieldNames: string[]` and `includeCompanyRelation: boolean`
- Replace fixed `OPPORTUNITY_FIELDS` with `buildOpportunityNodeSelection(...)`
- Cast node selection in query: `edges: { node: nodeSelection as typeof OPPORTUNITY_FIELDS }`
- Change `buildOpportunityFilter` to use `OPPORTUNITY_DATE_FILTER_FIELD` instead of hardcoded `closeDate`
- Add `patchOpportunity(id, data: Record<string, unknown>)` via GraphQL `updateOpportunity`

- [ ] **Step 4: Run unit tests**

Run: `yarn vitest run src/deals-board/metadata/build-opportunity-selection.test.ts src/deals-board/metadata/crm-field-names.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/metadata/build-opportunity-selection.ts src/deals-board/metadata/crm-field-names.ts src/deals-board/metadata/build-opportunity-selection.test.ts src/deals-board/metadata/crm-field-names.test.ts src/deals-board/api/opportunities.ts src/constants/date-filter-field.ts
git commit -m "feat: build dynamic GraphQL field selection for opportunities"
```

---

### Task 5: Generic inline editors

**Files:**
- Create: `src/deals-board/editors/TextCell.tsx`
- Create: `src/deals-board/editors/BooleanCell.tsx`
- Create: `src/deals-board/editors/DateCell.tsx`
- Create: `src/deals-board/editors/SelectCell.tsx`
- Modify: `src/deals-board/editors/NumberCell.tsx`
- Create: `src/deals-board/hooks/useUpdateRecord.ts`

- [ ] **Step 1: Implement unified update hook**

```typescript
// src/deals-board/hooks/useUpdateRecord.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { patchOpportunity } from '../api/opportunities';
import { updateLineItem } from '../api/line-items';
import type { BoardObjectName } from '../metadata/types';

type UpdateRecordInput = {
  objectName: BoardObjectName;
  id: string;
  data: Record<string, unknown>;
};

export const useUpdateRecord = (objectName: BoardObjectName) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: Omit<UpdateRecordInput, 'objectName'>) =>
      objectName === 'dealLineItem'
        ? updateLineItem(id, data)
        : patchOpportunity(id, data),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: objectName === 'dealLineItem' ? ['lineItems'] : ['opportunities'],
      });
    },
  });
};
```

- [ ] **Step 2: Refactor NumberCell to generic field**

Change `NumberCell` props to:

```typescript
type NumberCellProps = {
  objectName: BoardObjectName;
  recordId: string;
  fieldName: string;
  value?: number;
};
```

Replace hardcoded `kolichestvo` in `mutateAsync` with `{ [fieldName]: parsed }`.

- [ ] **Step 3: Add TextCell, BooleanCell, DateCell, SelectCell**

Each follows NumberCell pattern (click to edit / toggle, save on blur or change):

- `TextCell` — `<Input type="text">`, save string on blur/Enter
- `BooleanCell` — checkbox, save immediately on change
- `DateCell` — `<Input type="date">`, save ISO date string on blur
- `SelectCell` — `<select>` with `options` prop, save on change

All use `useUpdateRecord(objectName)`.

- [ ] **Step 4: Extend line-items update signature**

In `src/deals-board/api/line-items.ts`:

```typescript
export const updateLineItem = async (
  id: string,
  data: Record<string, unknown>,
): Promise<void> => {
  const client = getRestClient();
  await client.patch(`/rest/dealLineItems/${id}`, data);
};
```

Update `useLineItems.ts` optimistic patch to spread generic keys:

```typescript
const applyOptimisticPatch = (item: LineItemRow, data: Record<string, unknown>): LineItemRow => ({
  ...item,
  ...data,
});
```

- [ ] **Step 5: Run unit tests**

Run: `yarn vitest run --config vitest.unit.config.ts`  
Expected: PASS (existing tests; no regressions)

- [ ] **Step 6: Commit**

```bash
git add src/deals-board/hooks/useUpdateRecord.ts src/deals-board/editors/TextCell.tsx src/deals-board/editors/BooleanCell.tsx src/deals-board/editors/DateCell.tsx src/deals-board/editors/SelectCell.tsx src/deals-board/editors/NumberCell.tsx src/deals-board/api/line-items.ts src/deals-board/hooks/useLineItems.ts
git commit -m "feat: add generic inline editors and record update hook"
```

---

### Task 6: DynamicFieldCell and read-only formatters

**Files:**
- Create: `src/deals-board/cells/format-read-only-value.ts`
- Create: `src/deals-board/cells/overrides.tsx`
- Create: `src/deals-board/cells/DynamicFieldCell.tsx`
- Test: `src/deals-board/cells/format-read-only-value.test.ts`

- [ ] **Step 1: Write formatter tests**

```typescript
// src/deals-board/cells/format-read-only-value.test.ts
import { describe, expect, it } from 'vitest';
import { formatReadOnlyValue } from './format-read-only-value';

describe('formatReadOnlyValue', () => {
  it('formats currency amount objects', () => {
    expect(
      formatReadOnlyValue('CURRENCY', {
        amountMicros: 1_500_000,
        currencyCode: 'RUB',
      }),
    ).toContain('1');
  });

  it('formats link primary url', () => {
    expect(
      formatReadOnlyValue('LINKS', { primaryLinkUrl: 'https://example.com' }),
    ).toBe('https://example.com');
  });
});
```

- [ ] **Step 2: Implement formatters and DynamicFieldCell**

`format-read-only-value.ts` handles: CURRENCY, LINKS, RICH_TEXT (markdown strip/truncate), RELATION (name/id), BOOLEAN, DATE, fallback JSON stringify.

`overrides.tsx` exports `renderFieldOverride(props)` returning `ReactNode | null` for:
`stage`, `ssylkaNaMakety`, `plenka`, `kommentariy`, `summary`, `companyName`, `links`, `name` (expand chevron variant for parent only — pass `variant: 'parent-name' | 'child-name'`).

`DynamicFieldCell.tsx` props:

```typescript
type DynamicFieldCellProps = {
  objectName: BoardObjectName;
  recordId: string;
  field: string;
  descriptor?: FieldDescriptor;
  value: unknown;
  variant?: 'parent' | 'child';
  // override context
  lineItems?: LineItemRow[];
  isExpanded?: boolean;
  companyName?: string;
  tonyLink?: { primaryLinkUrl?: string };
  bitrixLink?: { primaryLinkUrl?: string };
};
```

Resolution order:
1. Override registry
2. If `descriptor.isEditable` → generic editor by `fieldType`
3. Read-only formatter

- [ ] **Step 3: Run formatter tests**

Run: `yarn vitest run src/deals-board/cells/format-read-only-value.test.ts`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/deals-board/cells/format-read-only-value.ts src/deals-board/cells/format-read-only-value.test.ts src/deals-board/cells/overrides.tsx src/deals-board/cells/DynamicFieldCell.tsx
git commit -m "feat: add DynamicFieldCell with overrides and read-only formatters"
```

---

### Task 7: Wire tables and DealsBoard

**Files:**
- Modify: `src/deals-board/DealsTable/DealRow.tsx`
- Modify: `src/deals-board/DealsTable/LineItemsTable.tsx`
- Modify: `src/deals-board/DealsTable/DealsTable.tsx`
- Modify: `src/deals-board/DealsBoard.tsx`
- Modify: `src/deals-board/hooks/useOpportunities.ts`
- Modify: `src/deals-board/types.ts`

- [ ] **Step 1: Loosen row types**

```typescript
// src/deals-board/types.ts — extend rows
export type OpportunityRow = {
  id: string;
  name: string;
  companyId?: string;
  companyName?: string;
  [key: string]: unknown;
};

export type LineItemRow = {
  id: string;
  opportunityId: string;
  name: string;
  [key: string]: unknown;
};
```

Add optional `fieldDescriptors?: Map<string, FieldDescriptor>` to table props or pass descriptor lookup function.

- [ ] **Step 2: Replace DealRow / LineItemsTable cell rendering**

In both files, replace the `if (column.field === ...)` block with:

```typescript
<DynamicFieldCell
  objectName="opportunity" // or dealLineItem
  recordId={row.id}
  field={column.field}
  descriptor={descriptorByField.get(column.field)}
  value={resolveFieldValue(row, column.field)}
  variant="parent"
  lineItems={lineItems}
  isExpanded={isExpanded}
  companyName={row.companyName}
  tonyLink={row.tonyLink as { primaryLinkUrl?: string } | undefined}
  bitrixLink={row.bitrixLink as { primaryLinkUrl?: string } | undefined}
/>
```

Add `resolveFieldValue(row, field)` helper: direct property access; map `companyName` from row.companyName.

- [ ] **Step 3: Wire DealsBoard metadata merge**

In `DealsBoardContent`:

```typescript
const parentFieldsQuery = useObjectFields('opportunity');
const childFieldsQuery = useObjectFields('dealLineItem');

const mergedParentColumns = useMemo(
  () =>
    mergeColumns(
      activeView?.parentColumns ?? DEFAULT_PARENT_COLUMNS,
      parentFieldsQuery.data ?? [],
      VIRTUAL_PARENT_FIELD_DESCRIPTORS,
    ),
  [activeView?.parentColumns, parentFieldsQuery.data],
);

const mergedChildColumns = useMemo(
  () =>
    mergeColumns(
      activeView?.childColumns ?? DEFAULT_CHILD_COLUMNS,
      childFieldsQuery.data ?? [],
    ),
  [activeView?.childColumns, childFieldsQuery.data],
);
```

Pass merged columns to `ColumnPicker`, `DealsTable`, and `useOpportunities`:

```typescript
const visibleParentCrmFields = crmFieldNamesFromColumns(mergedParentColumns);

const opportunitiesQuery = useOpportunities({
  ...
  visibleCrmFieldNames: visibleParentCrmFields,
  includeCompanyRelation: needsCompanyRelation(mergedParentColumns),
});
```

Show warning banner when metadata query fails:

```typescript
{parentFieldsQuery.isError ? (
  <div>Не удалось обновить список полей — используются сохранённые колонки</div>
) : null}
```

- [ ] **Step 4: Update useOpportunities query key**

Add `visibleCrmFieldNames` to `opportunitiesQueryKey` so column changes trigger refetch.

- [ ] **Step 5: Manual smoke test**

1. Open «Реализация» in Twenty
2. Confirm existing columns render (summary, stage, etc.)
3. Open ColumnPicker — labels match CRM
4. Toggle a hidden column — data appears

- [ ] **Step 6: Commit**

```bash
git add src/deals-board/DealsBoard.tsx src/deals-board/DealsTable/DealRow.tsx src/deals-board/DealsTable/LineItemsTable.tsx src/deals-board/DealsTable/DealsTable.tsx src/deals-board/hooks/useOpportunities.ts src/deals-board/types.ts
git commit -m "feat: wire metadata-driven columns into DealsBoard and tables"
```

---

### Task 8: Final verification

**Files:**
- Modify: `src/deals-board/api/line-items.test.ts` (if needed for generic patch)

- [ ] **Step 1: Run full test suite**

Run: `yarn test:unit`  
Expected: all unit tests PASS

Run: `yarn test`  
Expected: integration tests PASS (with Twenty server)

- [ ] **Step 2: Run linter**

Run: `yarn lint`  
Expected: no errors

- [ ] **Step 3: Manual acceptance (from spec)**

1. Add TEXT field on `dealLineItem` in Twenty → hidden in ColumnPicker
2. Enable column → inline edit works
3. Add RELATION field → read-only
4. Virtual `summary` / `links` unchanged
5. Existing view visible columns unchanged

- [ ] **Step 4: Commit any fixes**

```bash
git commit -m "test: verify dynamic metadata columns end-to-end"
```

---

## Spec Coverage Checklist

| Spec requirement | Task |
|------------------|------|
| Metadata runtime fetch | Task 3 |
| mergeColumns algorithm | Task 2 |
| Virtual columns preserved | Task 2, 6, 7 |
| New fields hidden by default | Task 2 |
| Inline edit simple types | Task 5, 6 |
| Override registry | Task 6 |
| Dynamic opportunity fetch | Task 4, 7 |
| Generic line item patch | Task 5 |
| patchOpportunity | Task 4, 5 |
| Metadata fallback banner | Task 7 |
| Date filter field alignment | Task 4 |
| Unit + integration tests | Tasks 1, 2, 4, 6, 8 |

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-27-dynamic-fields-metadata.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — execute tasks in this session with checkpoints

Which approach?
