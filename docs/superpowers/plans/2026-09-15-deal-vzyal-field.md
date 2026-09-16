# Deal «Взял» Field Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add opportunity SELECT field `vzyal` («Взял») with five people, visible as a deals-board parent column and on the Twenty deal record.

**Architecture:** App-owned SELECT on `opportunity`. Options live in `src/constants/vzyal.ts` and are reused by `src/fields/vzyal.field.ts`. The board already edits opportunity SELECT via `SelectCell`; this work only seeds the field, keeps it REST-only (not Core GraphQL), and makes the parent column visible by default (including existing views that never saved it). Empty value stays `null` via the existing `—` option.

**Tech Stack:** twenty-sdk `defineField` / `FieldType.SELECT`, TwentyView deals board metadata merge, vitest (`yarn test:unit`).

**Spec:** `docs/superpowers/specs/2026-09-15-deal-vzyal-field-design.md`

## Global Constraints

- Field name `vzyal`, label `Взял`, object `opportunity`, type SELECT, single value.
- Options exactly: `ILYA` Илья blue, `KIRILL` Кирилл green, `ANDREY` Андрей orange, `VASYA` Вася purple, `DANYA` Даня yellow.
- Do not add `vzyal` to `OPPORTUNITY_KNOWN_GRAPHQL_FIELDS`.
- Do not bind `workspaceMember`, auto-fill the current user, filter, sort, scoreboard, or line items.
- Saved view `visible: false` for `vzyal` must stay hidden.
- New / unsaved `vzyal` column is visible and sits immediately after `name`.
- UUID v4 for the field: `e2be3cf6-3e5b-42df-8188-7548428a4eed` (do not generate another).
- Tests: unit only, no live CRM in Tasks 1–3. Task 4 applies to local Twenty.
- Do not change crmparserv2 or BrandingTeamApp.

## File structure

- Create: `src/constants/vzyal.ts` — option values, labels, colors
- Create: `src/constants/vzyal.test.ts`
- Create: `src/fields/vzyal.field.ts` — opportunity SELECT
- Modify: `src/constants/universal-identifiers.ts` — pin UUID
- Modify: `src/constants/opportunity-rest-fields.test.ts` — REST-only regression
- Modify: `src/constants/column-definitions.ts` — default parent column
- Modify: `src/deals-board/metadata/merge-columns.ts` — default visible after `name`
- Modify: `src/deals-board/metadata/merge-columns.test.ts`

---

### Task 1: Option constants

**Files:**
- Create: `src/constants/vzyal.ts`
- Create: `src/constants/vzyal.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `VZYAL = { ILYA: 'ILYA'; KIRILL: 'KIRILL'; ANDREY: 'ANDREY'; VASYA: 'VASYA'; DANYA: 'DANYA' }`
  - `type Vzyal = (typeof VZYAL)[keyof typeof VZYAL]`
  - `VZYAL_OPTIONS`: `{ value: Vzyal; label: string; position: number; color: string }[]` (readonly)

- [ ] **Step 1: Write the failing test**

Create `src/constants/vzyal.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { VZYAL, VZYAL_OPTIONS } from './vzyal';

describe('VZYAL_OPTIONS', () => {
  it('lists five people with Russian labels', () => {
    expect(VZYAL.ILYA).toBe('ILYA');
    expect(VZYAL_OPTIONS.map((option) => option.value)).toEqual([
      'ILYA',
      'KIRILL',
      'ANDREY',
      'VASYA',
      'DANYA',
    ]);
    expect(VZYAL_OPTIONS.map((option) => option.label)).toEqual([
      'Илья',
      'Кирилл',
      'Андрей',
      'Вася',
      'Даня',
    ]);
  });

  it('uses the spec colors in order', () => {
    expect(VZYAL_OPTIONS.map((option) => option.color)).toEqual([
      'blue',
      'green',
      'orange',
      'purple',
      'yellow',
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit src/constants/vzyal.test.ts`

Expected: FAIL — cannot find module `./vzyal` (or `VZYAL` is not defined).

- [ ] **Step 3: Write minimal implementation**

Create `src/constants/vzyal.ts`:

```ts
export const VZYAL = {
  ILYA: 'ILYA',
  KIRILL: 'KIRILL',
  ANDREY: 'ANDREY',
  VASYA: 'VASYA',
  DANYA: 'DANYA',
} as const;

export type Vzyal = (typeof VZYAL)[keyof typeof VZYAL];

export const VZYAL_OPTIONS = [
  { value: VZYAL.ILYA, label: 'Илья', position: 0, color: 'blue' },
  { value: VZYAL.KIRILL, label: 'Кирилл', position: 1, color: 'green' },
  { value: VZYAL.ANDREY, label: 'Андрей', position: 2, color: 'orange' },
  { value: VZYAL.VASYA, label: 'Вася', position: 3, color: 'purple' },
  { value: VZYAL.DANYA, label: 'Даня', position: 4, color: 'yellow' },
] as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit src/constants/vzyal.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/constants/vzyal.ts src/constants/vzyal.test.ts
git commit -m "$(cat <<'EOF'
Add vzyal select options for who took a deal.

EOF
)"
```

On Windows PowerShell, if heredoc is unavailable:

```powershell
git add src/constants/vzyal.ts src/constants/vzyal.test.ts
git commit -m "Add vzyal select options for who took a deal."
```

---

### Task 2: Visible parent column and REST-only fetch

**Files:**
- Modify: `src/deals-board/metadata/merge-columns.ts`
- Modify: `src/deals-board/metadata/merge-columns.test.ts`
- Modify: `src/constants/column-definitions.ts`
- Modify: `src/constants/opportunity-rest-fields.test.ts`

**Interfaces:**
- Consumes: existing `mergeColumns(savedColumns, crmDescriptors, virtualDescriptors?)`
- Produces: same function; missing `vzyal` is `{ visible: true, width: 110 }` and ordered immediately after `name`. Saved `vzyal.visible` is unchanged. `DEFAULT_PARENT_COLUMNS` includes `vzyal` after `name`. `isOpportunityRestOnlyField('vzyal', [descriptor])` stays `true` (no production change to `opportunity-rest-fields.ts`).

- [ ] **Step 1: Write the failing tests**

Append to `src/deals-board/metadata/merge-columns.test.ts` (keep existing tests):

```ts
  it('inserts missing vzyal after name as visible', () => {
    const merged = mergeColumns(saved, [
      ...crmFields,
      { field: 'vzyal', label: 'Взял', source: 'crm', fieldType: 'SELECT', isEditable: true },
      { field: 'stage', label: 'Stage', source: 'crm', fieldType: 'SELECT', isEditable: true },
    ]);
    const name = merged.find((column) => column.field === 'name');
    const vzyal = merged.find((column) => column.field === 'vzyal');
    const stage = merged.find((column) => column.field === 'stage');
    expect(vzyal).toMatchObject({ visible: true, width: 110, label: 'Взял' });
    expect(vzyal!.order).toBeGreaterThan(name!.order);
    expect(vzyal!.order).toBeLessThan(stage!.order);
  });

  it('keeps saved hidden vzyal hidden', () => {
    const merged = mergeColumns(
      [
        ...saved,
        { field: 'vzyal', label: 'Взял', order: 1.5, visible: false, width: 110 },
      ],
      [
        ...crmFields,
        { field: 'vzyal', label: 'Взял', source: 'crm', fieldType: 'SELECT', isEditable: true },
      ],
    );
    expect(merged.find((column) => column.field === 'vzyal')).toMatchObject({
      visible: false,
      width: 110,
    });
  });
```

Add this test inside the existing `describe('isOpportunityRestOnlyField'` in `src/constants/opportunity-rest-fields.test.ts`:

```ts
  it('treats vzyal as REST-only when present in metadata', () => {
    expect(
      isOpportunityRestOnlyField('vzyal', [
        {
          field: 'vzyal',
          label: 'Взял',
          source: 'crm',
          fieldType: 'SELECT',
          isEditable: true,
        },
      ]),
    ).toBe(true);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
yarn test:unit src/deals-board/metadata/merge-columns.test.ts src/constants/opportunity-rest-fields.test.ts
```

Expected: FAIL on `inserts missing vzyal after name as visible` (`visible: false` and/or order not between `name` and `stage`). REST-only `vzyal` test should already PASS (existing helper). If the REST test fails, stop and fix `isOpportunityRestOnlyField` — do not add `vzyal` to `OPPORTUNITY_KNOWN_GRAPHQL_FIELDS`.

- [ ] **Step 3: Make the column visible by default**

In `src/deals-board/metadata/merge-columns.ts`:

1. Add `vzyal: 'Взял'` to `LABEL_OVERRIDES`.
2. Replace the CRM-descriptor append loop with:

```ts
  for (const descriptor of crmDescriptors) {
    if (savedByField.has(descriptor.field)) continue;

    const isStage = descriptor.field === 'stage';
    const isTipDetail = descriptor.field === 'tipDetail';
    const isPrevyu = descriptor.field === 'prevyuOkleyki';
    const isVzyal = descriptor.field === 'vzyal';
    const nameOrder = merged.find((column) => column.field === 'name')?.order;

    let order = nextOrder++;
    if (typeof nameOrder === 'number') {
      if (isVzyal) order = nameOrder + 0.25;
      else if (isStage) order = nameOrder + 0.5;
    }

    merged.push({
      field: descriptor.field,
      label: resolveLabel(descriptor.field, descriptor.label),
      order,
      visible: isStage || isTipDetail || isPrevyu || isVzyal,
      width: isVzyal
        ? 110
        : isStage
          ? 148
          : isTipDetail
            ? 140
            : isPrevyu
              ? 100
              : defaultWidthForFieldType(descriptor.fieldType, descriptor.field),
    });
  }
```

Keep the final `sort` + reindex as it is today.

In `src/constants/column-definitions.ts`, insert `vzyal` after `name` and bump later `order` values:

```ts
export const DEFAULT_PARENT_COLUMNS: ColumnConfig[] = [
  { field: 'name', label: 'Сделка', order: 0, visible: true, width: 300 },
  { field: 'vzyal', label: 'Взял', order: 1, visible: true, width: 110 },
  { field: 'stage', label: 'Стадия', order: 2, visible: true, width: 148 },
  { field: 'loadDate', label: 'Дата', order: 3, visible: true, width: 220 },
  { field: 'companyName', label: 'Компания', order: 4, visible: true, width: 160 },
  { field: 'summary', label: 'Сводка позиций', order: 5, visible: true, width: 200 },
  { field: 'links', label: 'Ссылки', order: 6, visible: false, width: 80 },
];
```

Do not edit `opportunity-rest-fields.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
yarn test:unit src/deals-board/metadata/merge-columns.test.ts src/constants/opportunity-rest-fields.test.ts
```

Expected: PASS, including the older `inserts missing stage after name as visible` test.

- [ ] **Step 5: Commit**

```powershell
git add src/deals-board/metadata/merge-columns.ts src/deals-board/metadata/merge-columns.test.ts src/constants/column-definitions.ts src/constants/opportunity-rest-fields.test.ts
git commit -m "Show Vzyal as a default deals-board column."
```

---

### Task 3: Opportunity field definition

**Files:**
- Modify: `src/constants/universal-identifiers.ts`
- Create: `src/fields/vzyal.field.ts`

**Interfaces:**
- Consumes: `VZYAL_OPTIONS` from `src/constants/vzyal.ts`; `OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER` from `src/constants/crm-objects.ts`
- Produces: `OPPORTUNITY_VZYAL_FIELD_UNIVERSAL_IDENTIFIER = 'e2be3cf6-3e5b-42df-8188-7548428a4eed'`; `defineField` named `vzyal` on opportunity

- [ ] **Step 1: Pin the UUID**

In `src/constants/universal-identifiers.ts`, immediately after `OPPORTUNITY_RASHOD_OKLEYKA_FIELD_UNIVERSAL_IDENTIFIER`, add:

```ts
export const OPPORTUNITY_VZYAL_FIELD_UNIVERSAL_IDENTIFIER =
  'e2be3cf6-3e5b-42df-8188-7548428a4eed';
```

Do not invent a different UUID. Do not copy an id from production.

- [ ] **Step 2: Create the field file**

Create `src/fields/vzyal.field.ts` by hand (do not run interactive `yarn twenty dev:add` unless you then replace the generated UUID with `e2be3cf6-3e5b-42df-8188-7548428a4eed`):

```ts
import { defineField, FieldType } from 'twenty-sdk/define';
import { OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import { VZYAL_OPTIONS } from 'src/constants/vzyal';
import { OPPORTUNITY_VZYAL_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: OPPORTUNITY_VZYAL_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'vzyal',
  type: FieldType.SELECT,
  label: 'Взял',
  icon: 'IconUser',
  options: VZYAL_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
    position: option.position,
    color: option.color,
  })),
});
```

- [ ] **Step 3: Typecheck the field**

Run: `yarn test:unit src/constants/vzyal.test.ts`

Expected: PASS. If the SDK rejects `color` typing, keep `color` as a string (`'blue' | 'green' | 'orange' | 'purple' | 'yellow'`) matching `zatraty-na-rabotu.field.ts`.

- [ ] **Step 4: Commit**

```powershell
git add src/constants/universal-identifiers.ts src/fields/vzyal.field.ts
git commit -m "Define opportunity.vzyal select field."
```

---

### Task 4: Apply to local Twenty and smoke

**Files:**
- None in git beyond Task 3 (sync only)

**Interfaces:**
- Consumes: `src/fields/vzyal.field.ts` from Task 3
- Produces: field present on local Opportunity; board column editable

- [ ] **Step 1: Run unit tests**

Run: `yarn test:unit`

Expected: PASS.

- [ ] **Step 2: Sync the app**

Run: `yarn twenty apply`

Expected: exit 0. Field `vzyal` / «Взял» is created on opportunity. If apply says the field already exists with a different UUID, stop and report — do not invent a warehouse UUID.

- [ ] **Step 3: Hard-refresh smoke (local `http://localhost:2020`)**

Log in as `tim@apple.dev` / `tim@apple.dev`. Open «Реализация». Ctrl+F5.

Checklist:

1. Parent column «Взял» is visible immediately after «Сделка».
2. Dropdown lists Илья, Кирилл, Андрей, Вася, Даня plus «—».
3. Choosing Кирилл saves (reload / another row still shows Кирилл).
4. Choosing «—» clears the value.
5. Open the same opportunity record in Twenty: field «Взял» shows Кирилл (or empty after clear).
6. In column picker, hiding «Взял» and saving the view keeps it hidden after reload.

Mobile: if a phone viewport is available, the same column appears on the deal card. If not, note that desktop parent columns were verified.

- [ ] **Step 4: Commit only if smoke required extra code**

If smoke needed a bugfix, commit that fix with a message that says why (example: `Fix vzyal column width after metadata merge.`). If apply/smoke needed no extra code, do not create an empty commit.

Staging/prod `yarn twenty apply` is out of this task; do it in the usual deploy cycle after merge.
