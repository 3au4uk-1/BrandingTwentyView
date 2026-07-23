# Deals Board — Universal Filters, TanStack Table, Manual Sync Harden, Polish

**Date:** 2026-07-23  
**Status:** Approved (brainstorming)  
**Repos:** `BrandingTwentyView`, `crmparserv2`  
**Approach:** TanStack Table as parent-table foundation + FilterAST hybrid UI + harden manual line-item survival

## Problem

TwentyView (`DealsBoard`) is a dense nested deals → positions board that works as an internal tool but lacks table-grade UX:

1. **Filters are hardcoded** in `QuickFiltersBar` (date presets, stages, types, companies, oplata, search). Operators cannot filter arbitrary deal/line-item fields.
2. **Table fundamentals are incomplete** — no reliable header-click sort / sticky key columns on a proper table foundation; toolbar feels noisy.
3. **Manual positions can disappear on re-parse** — colleagues report adding a position then losing it after parser resync. Existing 2026-07-13 design is largely implemented but has gaps (narrow draft guard, silent sync failures).
4. **Polish** — the board should feel like a finished SaaS surface (Linear / Notion / Twenty product UI), not an unfinished internal grid — **without** dropping full-row stage color coding, which is a hard product requirement.

## Goals

- Universal filtering for any filterable deal or line-item field (metadata-driven).
- Hybrid filter UX: keep date presets; replace hardcoded dropdowns with a FilterBuilder + chips.
- View-owned base filters + session overrides; Reset restores the view.
- Nested filter semantics: deal visible if ≥1 matching position; default show only matches; per-deal «Показать все позиции».
- Parent table on **TanStack Table**: header sort, sticky/pin columns, column sizing synced to views; preserve stage row colors including sticky cells.
- Desktop visual polish (toolbar hierarchy, quieter chrome) with row coloring kept.
- Harden manual line items so `TWENTY_RUCHNAYA` positions never vanish on resync when unsynced to parser; surface sync errors + retry.
- Mobile: same sync harden + simplified filters only (no full TanStack / table UX rewrite in this package).

## Non-Goals

- Removing or replacing full-row stage color coding.
- Keyboard spreadsheet navigation (Tab/arrows cell grid) in this package.
- Full mobile redesign or mobile TanStack parity.
- Kanban / calendar views.
- Rewriting child `LineItemsTable` to TanStack in v1 (optional later).
- Virtualization (`@tanstack/react-virtual`) unless profiling proves need — not mandatory v1.
- Replacing Twenty as host or moving off Twenty App front components.

## Decisions Summary

| Topic | Decision |
|-------|----------|
| Scope | Full package: filters + TanStack parent table + manual sync harden + desktop polish; mobile = sync + simplified filters |
| Filter UX | Hybrid: date presets + FilterBuilder + chips |
| Filter persistence | View base + session overrides; Reset → view; save via existing view settings |
| Nested LI filters | Semantics A + per-deal «show all positions» (session) |
| Table foundation | TanStack Table for parent (opportunities) |
| Row colors | Keep `getStageRowStyles`; sticky cells must inherit paint |
| Table UX extras | Header sort + sticky/pin; polish toolbar; no keyboard grid |
| Manual positions | Expand draft guard to all unsynced `TWENTY_RUCHNAYA`; visible sync errors + retry |
| Approach vs incremental | TanStack chosen over pure evolution of custom table (still compatible with Twenty App) |

## Architecture

```
Sidebar Twenty → «Реализация»
        ↓
DealsBoard (Front Component)
  ├── FilterBar
  │     ├── ViewSwitcher
  │     ├── DatePresets
  │     ├── FilterBuilder → chips (session / view)
  │     └── Search + Reset
  ├── BoardToolbar (expand, columns, settings — quieter)
  ├── DealsDataTable (@tanstack/react-table)
  │     ├── Parent rows: opportunities (stage row colors AS-IS)
  │     ├── Expanded: LineItemsTable (existing child UI in v1)
  │     ├── Header sort ↔ DealBoardSort
  │     └── Sticky: expand control + name (+ optional pinned field)
  └── Mobile: current layout + sync fix + simplified filters
        ↓
filter-model (FilterAST)
  ├── Deal-level clauses → fetchOpportunities (pagination)
  └── Line-item clauses → client filter after load
        ↓
manual-line-item pipeline (harden)
  create → istochnik=TWENTY_RUCHNAYA → sync parser → survive resync
```

### Module boundaries

| Module | Responsibility | Does not |
|--------|----------------|----------|
| `filter-model` | AST, merge view+session, legacy migration, serialize to `dealBoardView.filters` | UI rendering |
| `FilterBar` | Presets, builder, chips, search, reset | Data fetching |
| `DealsDataTable` | TanStack parent: columns, sort UI, pin/sticky, expand slot | Parser sync rules |
| `manual-line-item-*` + parser diff | Survive resync, sync/archive | Filters / table chrome |

## Filter model

### Shape

```ts
type FilterLevel = 'deal' | 'lineItem';

type FilterClause = {
  id: string;
  level: FilterLevel;
  field: string;
  operator: FilterOperator; // eq | in | contains | between | isEmpty | ...
  value: unknown;
};

type FilterState = {
  datePreset?: DealBoardDatePreset;
  dateFrom?: string;
  dateTo?: string;
  clauses: FilterClause[];       // view-owned when saved
  /** Full working clause list while session-dirty; `undefined` means «use view.clauses». */
  sessionClauses?: FilterClause[];
  search?: string;
};
```

**Session model (copy-on-write):**

- While `sessionClauses` is `undefined`, effective clauses = `view.clauses`.
- First add/edit/remove in the FilterBar copies `view.clauses` into `sessionClauses`, then applies the change. Further edits mutate only `sessionClauses`.
- All effective clauses are combined with **AND**.
- Date preset / range follow the same pattern: session override fields when dirty; otherwise view.
- Search: session input wins when non-empty; empty search falls back to view.search if present (same spirit as today).

**Reset** sets `sessionClauses` (and session date/search overrides) back to `undefined` / cleared → restore view.  
**Save view** persists the effective clauses + date (+ search if included in view settings today) into `dealBoardView.filters`, then clears session dirtiness.

### Compatibility

Legacy flat `DealBoardFilters` (`stages`, `types`, `companyIds`, `oplata`, …) are **read-migrated** into `clauses` on load. After migration helper exists, **writes use only the new shape** (no long-lived dual-write).

Date presets remain first-class shortcuts over `datePreset` / range fields — not a second filter system.

Hardcoded Stage / Type / Company dropdowns in `QuickFiltersBar` are removed in favor of FilterBuilder entries (same operators/values).

### Application layer

| Level | Example fields | Where applied |
|-------|----------------|---------------|
| Deal | load/close date, company, oplata, deal name, amount | `fetchOpportunities` (keep pagination / fetchAll rules) |
| Line item | stage, tip, groups, position name, … | Client-side after line items load |

Non-filterable / virtual fields are omitted or disabled in the builder.

### Nested semantics

1. A deal is visible if **at least one** line item matches line-item filters (or there are no LI filters).
2. By default, only **matching** line items are shown inside the deal.
3. Per-deal session toggle **«Показать все позиции»**:
   - On: all positions of that deal; matches may keep a light visual marker; non-matches visible.
   - Off: matching only again.
4. Search stays OR across deal + positions and uses the same nested visibility rules.

### FilterBar layout (desktop)

Left → right: ViewSwitcher · Date presets · «+ Фильтр» · active chips · Search · Сбросить.

## TanStack Table (parent)

### Role

`@tanstack/react-table` owns parent column defs, sorting state wiring, column sizing, column pinning. Cell renderers stay custom (`DynamicFieldCell`, editors, portals).

**Preserved outside TanStack:**

- Stage row colors via `getStageRowStyles` (parent + child).
- Expand / smart-expand / group chip modes.
- Child field groups and horizontal group strip.
- Portal host for menus/dropdowns inside Twenty chrome.

### Nested positions

- Parent = TanStack opportunities table.
- Expanded row content = existing `LineItemsTable` in v1 (TanStack child optional later).
- Expand state remains controlled (smart / collapsed / manual); do not break smart-expand.

### Sort

- Header click on parent updates `DealBoardSort[]` (session over view; persist via save view).
- Primary sort drives `fetchOpportunities`.
- Child (line item) sort: client-only inside an expanded deal, session-only, **not** in view in v1.

### Sticky / pin

- Pin left: expand control + deal name (optional additional pinned field from view config later).
- Sticky headers inside existing host height-lock scroll container.
- Column resize remains; TanStack sizing syncs to `ColumnConfig.width` and view save.
- Sticky cells **must** inherit full stage background + inset accent so pin does not break row paint.

### Polish (desktop)

- Quieter toolbar: group secondary actions (columns / edit view); clearer deal → positions hierarchy.
- Do **not**: drop row paint, add marketing-landing aesthetics, or keyboard grid.

### Dependency

- Add `@tanstack/react-table`.
- `@tanstack/react-virtual` only if profiling requires it — out of mandatory v1.

## Manual line items (must-fix)

### Context

Design/plan `2026-07-13-manual-twenty-line-items` is largely in code: create sets `istochnik=TWENTY_RUCHNAYA`, sync/archive logic functions, parser `classification=manual_twenty` + `sync_override`, diff matches manuals by `twenty_id`.

### Likely failure mode (colleague reports)

Parser `isManualTwentyDraft` only preserves unsynced manuals whose name normalizes to «Новая позиция». If parser sync fails (errors currently `console.error` only) and the operator renames or edits, resync can `toDelete` the Twenty row while stage is `NOVYY`.

### Target contract

| State | Resync behavior |
|-------|-----------------|
| In parser as manual (`include` + `twenty_id`) | Match by `twenty_id`; do not delete |
| `istochnik=TWENTY_RUCHNAYA` and **not** in parser (any name) | **Preserve** (widen draft guard → unsynced manual) |
| Create / meaningful edit | Sync to parser; on failure show toast/banner + retry |
| Delete in Twenty | Archive in parser (`exclude`) — unchanged |

**Hard rule:** a `TWENTY_RUCHNAYA` line item is never deleted by parser resync solely because it is missing from parser SQLite.

### Code touchpoints

- `crmparserv2` `twenty-line-items-sync.js`: broaden `isManualTwentyDraft` / rename to unsynced-manual guard (drop “default name only” requirement; keep `istochnik` + not-in-parser).
- `BrandingTwentyView` `useManualLineItemParserSync`: surface errors, retry; optional “not synced to parser” affordance.
- Mobile create/update paths share the same sync helpers.

## Data flow

1. Load active `dealBoardView` → view `FilterState`.
2. Session overrides / presets / search → effective filters.
3. Deal-level clauses + date → `fetchOpportunities`.
4. Load line items → apply LI filters (semantics A) → optional per-deal show-all.
5. TanStack parent: sort UI ↔ sort state → refetch opportunities as needed.
6. Mutations → Twenty; manual line items → parser sync with visible errors.

## Error handling

| Case | UX |
|------|-----|
| Unsupported filter field | Omitted or disabled in builder + tooltip |
| Opportunities fetch fail | Clear board error/empty state |
| Manual sync fail | Toast + Retry; row remains in Twenty |
| LI filters vs pagination | Single documented mode: when LI filters are active, prefer existing `fetchAll` path within current product limits (same spirit as date/search fetch-all today). Do not silently filter only the current page without indication. |

## Testing (minimum)

- FilterAST: merge view+session, reset, legacy `stages`/`types`/`companyIds` migration.
- Nested filter: semantics A + show-all toggle.
- Parser diff: unsynced manual with non-default name is **not** in `toDelete`.
- Board sync: create → rename with failed sync → retry; success sets synced flag.
- TanStack wiring: header sort updates sort state; sticky cells receive stage background.

## Implementation order

1. Manual positions harden (parser + board errors/retry) — data integrity first.
2. FilterAST + migration + FilterBar (replace QuickFiltersBar).
3. TanStack parent table (sort, sticky, colors, resize sync).
4. Desktop toolbar / hierarchy polish.
5. Mobile: sync harden + simplified filter entry (no full TanStack).

## Out of scope reminders

- Keyboard cell grid.
- Dropping row color coding.
- Full mobile table parity.
- Mandatory virtualization.
- Child table TanStack migration in v1.

## References

- `docs/superpowers/specs/2026-06-26-deals-board-twenty-app-design.md`
- `docs/superpowers/specs/2026-07-13-manual-twenty-line-items-design.md`
- `docs/superpowers/specs/2026-06-27-dynamic-fields-metadata-design.md`
- Existing: `QuickFiltersBar.tsx`, `DealsTable/*`, `useManualLineItemParserSync.ts`, `crmparserv2/backend/src/services/twenty-line-items-sync.js`
