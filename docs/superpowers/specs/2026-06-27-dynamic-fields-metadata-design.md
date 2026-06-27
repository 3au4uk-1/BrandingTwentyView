# Dynamic Fields from Metadata — Design Spec

**Date:** 2026-06-27  
**Status:** Approved (brainstorming)  
**Audience:** Implementation team  
**Builds on:** [2026-06-26-deals-board-twenty-app-design.md](./2026-06-26-deals-board-twenty-app-design.md)

## Summary

Сделать Deals Board metadata-driven: при добавлении нового поля в CRM (`opportunity` или `dealLineItem`) оно автоматически появляется в ColumnPicker (скрытым по умолчанию) и поддерживает inline-редактирование для простых типов. Виртуальные колонки приложения (`summary`, `companyName`, `links`) сохраняются. Quick filters остаются без изменений.

## Problem

Сейчас поля, колонки и рендер ячеек захардкожены в нескольких местах:

| Layer | Location | Hardcoded |
|-------|----------|-----------|
| Default columns | `column-definitions.ts` | Field list + labels |
| Cell renderers | `DealRow.tsx`, `LineItemsTable.tsx` | `if (field === '...')` chains |
| Types | `types.ts` | Fixed `OpportunityRow`, `LineItemRow` |
| GraphQL/REST | `api/opportunities.ts`, `api/line-items.ts` | Fixed field selection |
| Filters | `QuickFiltersBar.tsx` | Date, stages, search (unchanged) |

Adding a new CRM field requires code changes in all these layers. Views store column config in JSON but only reference pre-known fields.

## Goals

- New CRM fields appear in ColumnPicker without app redeploy
- Inline editing for simple field types on **both** parent and child tables
- Preserve virtual columns and their current UX
- Existing saved views keep their visible columns unchanged
- Labels come from Twenty metadata (always up to date)

## Non-Goals

- Automatic quick filters for new fields
- Inline editing for LINKS, RICH_TEXT, RELATION, FILES, CURRENCY, PHONES, EMAILS (read-only display)
- Kanban or other view types
- Eager migration of existing views when new fields appear
- Removing or replacing virtual columns

## Decisions (brainstorming)

| Question | Decision |
|----------|----------|
| Automation depth | Display + inline editing |
| Tables | Both `opportunity` (parent) and `dealLineItem` (child) |
| Virtual columns | Keep all: `summary`, `companyName`, `links` |
| New CRM fields default | Hidden; user enables via ColumnPicker |
| Inline edit types | TEXT, NUMBER, BOOLEAN, DATE, SELECT only |
| Approach | Hybrid: runtime metadata + override registry for special fields |

## Architecture

### Approach

**Recommended and approved:** Hybrid metadata-driven runtime with explicit override registry.

Alternatives considered:

1. **Runtime metadata only** — same as chosen approach without overrides; rejected because it would lose custom UX for `stage`, `plenka`, virtual columns.
2. **Codegen on app sync** — rejected; does not solve runtime dynamism when CRM fields change without redeploying the app.

```
DealsBoard
  ├── useObjectFields('opportunity')      ← MetadataApiClient
  ├── useObjectFields('dealLineItem')     ← MetadataApiClient
  ├── mergeColumns(savedView, metadata, virtualColumns)
  ├── DynamicFieldCell(field, type, value)
  │     ├── override registry (stage, plenka, links, summary…)
  │     └── generic editors (TEXT, NUMBER, DATE, SELECT, BOOLEAN)
  └── Dynamic fetch/update
        ├── opportunities: GraphQL (fields from visible columns)
        └── dealLineItems: REST PATCH (generic field updates)
```

### Column sources for ColumnPicker

```
CRM fields (metadata, active, non-system)
  + virtual columns (summary, companyName, links)
  → merge with parentColumns / childColumns from active view
  → new CRM fields: visible=false, order=last, default width by type
```

Quick filters (date, stages, search, oplata) remain hardcoded.

## Components

### Metadata layer (`src/deals-board/metadata/`)

| Module | Purpose |
|--------|---------|
| `useObjectFields(objectName)` | React Query + `MetadataApiClient` — active fields for object |
| `field-registry.ts` | Normalize metadata → `FieldDescriptor` |
| `virtual-columns.ts` | Virtual parent column definitions |
| `merge-columns.ts` | Merge saved view + metadata + virtual columns |

```typescript
type FieldDescriptor = {
  field: string;
  label: string;
  source: 'crm' | 'virtual';
  fieldType?: string;
  isEditable: boolean;
  options?: SelectOption[];
};
```

**`isEditable` rules:**

- `source: 'virtual'` → always `false`
- CRM + type in { TEXT, NUMBER, BOOLEAN, DATE, SELECT } → `true` (unless metadata marks read-only)
- All other CRM types → `false`

### merge-columns algorithm

```
mergeColumns(savedColumns, fieldDescriptors, virtualColumns)
```

1. Start from `savedColumns` in view (preserves order, width, visible)
2. Append **new CRM fields** missing from saved → `{ visible: false, order: max+1, width: defaultByType }`
3. Append **virtual columns** missing from saved (defaults from `virtual-columns.ts`)
4. **Removed CRM fields** (orphans in saved JSON) — ignored at render, hidden from picker
5. Labels always from metadata / virtual constants; width/visible/order from saved

### DynamicFieldCell

Single renderer replacing `if/else` chains in `DealRow` and `LineItemsTable`:

**Override registry (by field name):**

| Field | Component |
|-------|-----------|
| `stage` | `StageSelect` |
| `ssylkaNaMakety` | `LinkCell` |
| `plenka` | `RichTextPopover` |
| `kommentariy` | `RichTextPopover` |
| `summary` | `DealSummaryChips` |
| `companyName` | Text from `companyNameMap` |
| `links` | Tony / Bitrix buttons |

**Generic editors (when `isEditable`):**

| Type | Editor |
|------|--------|
| TEXT | Inline input, save on blur |
| NUMBER | Generic `NumberCell` |
| BOOLEAN | Checkbox toggle |
| DATE | Date input |
| SELECT | Select from metadata options |

**Read-only formatters:** LINKS, RICH_TEXT, RELATION, CURRENCY, etc. — formatted display, no edit.

### Dynamic fetch

**Opportunities (GraphQL):**

- Base: `id`, `name`, `companyId`
- Plus all visible CRM parent column fields
- Fetch `company` relation when `companyName` virtual or `company` field is visible

**Line items (REST):**

- Base: `id`, `name`, `opportunityId`, `stage` (for filters + summary)
- Plus visible CRM child column fields

Query keys include hash of visible field names → refetch on column change.

### Mutations

- `dealLineItem` — extend existing REST `patch` to accept generic `{ [fieldName]: value }`
- `opportunity` — new `patchOpportunity` via GraphQL mutation or REST

Optimistic update + error toast; one retry on network error for stage (existing pattern).

## Virtual columns (unchanged behavior)

| Column | Source | Behavior |
|--------|--------|----------|
| `summary` | Computed from child line items | Chips in collapsed row only; not editable |
| `companyName` | Resolved from `companyId` via separate company fetch | Read-only text |
| `links` | Combines `tonyLink` + `bitrixLink` | Read-only T/B buttons |

Virtual and CRM equivalents may coexist in ColumnPicker (e.g. `companyName` vs `company`, `links` vs `tonyLink`/`bitrixLink`).

## Default column widths

| Type | Width |
|------|-------|
| TEXT / SELECT | 160px |
| NUMBER | 80px |
| DATE | 100px |
| BOOLEAN | 60px |
| RICH_TEXT / LINKS | 120px |
| virtual `summary` | 200px |

Sticky first column remains `name` only.

## Error handling

| Situation | Behavior |
|-----------|----------|
| Metadata API unavailable | Fallback to `column-definitions.ts`; banner warning |
| Field removed from CRM | Ignored at render; hidden from picker |
| Field added to CRM | Appears hidden in picker; views unchanged |
| Inline save failed | Rollback optimistic update + toast |
| No write permission / read-only field | `isEditable: false` |
| Unknown field type | Read-only string display |

## Edge cases

- **Summary** reflects line items on current page; respects stage filter (current behavior)
- **Date filter:** align quick filter with configured DATE field on opportunity (fix `closeDate` vs `loadDate` mismatch)
- **Orphan columns** in saved JSON are silently skipped

## File changes

| File | Change |
|------|--------|
| `src/deals-board/metadata/*` | New metadata layer |
| `column-definitions.ts` | Virtual defaults + metadata-unavailable fallback |
| `DealRow.tsx` | Replace if/else with `DynamicFieldCell` |
| `LineItemsTable.tsx` | Same |
| `types.ts` | Looser row types + `FieldDescriptor` |
| `api/opportunities.ts` | Dynamic field selection; `patchOpportunity` |
| `api/line-items.ts` | Generic update |
| `ColumnPicker.tsx` | Labels from merged descriptors |

## Testing

**Unit tests:**

- `merge-columns.ts` — new field hidden, orphan ignored, labels from metadata, virtual appended
- `field-registry.ts` — `isEditable` by type
- `build-dynamic-query.ts` — visible fields → GraphQL selection

**Integration tests:**

- Metadata API returns fields for opportunity and dealLineItem
- REST patch generic field on dealLineItem

**Manual test plan:**

1. Add TEXT field on `dealLineItem` in Twenty → appears hidden in ColumnPicker
2. Enable column → value visible, inline edit works
3. Add RELATION field → read-only display
4. Virtual `summary` / `links` unchanged
5. Existing view visible columns unchanged after new field added

## Data flow

```
Metadata API ──► field descriptors
                      │
dealBoardView ──► saved columns ──► mergeColumns ──► ColumnPicker + table headers
                      │
visible CRM fields ──► dynamic GraphQL/REST fetch ──► row data
                      │
user edit ──► patch mutation ──► optimistic update + query invalidation
```
