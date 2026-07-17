# Tip / Stage Options Split Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Move «Реставрация» from line-item stage to tip, add «Не наше», migrate 7 records.

**Architecture:** Update Twenty SELECT metadata first, migrate data, remove stage option, sync app constants.

**Tech Stack:** Twenty MCP metadata/CRUD, TypeScript constants, Vitest.

## Global Constraints

- Order: tip options → migrate data → remove stage option → app constants
- Preserve existing tip option IDs for BANNERA / PLENKA / PODRYAD
- Opportunity stages unchanged
- tip field id: `838c2131-80db-40fc-a777-4f0d39b97f02`
- stage field id: `1b22f151-d8c5-4f4d-aba0-723ea86099eb`

---

### Task 1: Update tip metadata

- [x] Add `RESTAVRACIYA` and `NE_NASHE` to tip options via `update_field_metadata`
- [x] Verify tip has 5 options

### Task 2: Migrate 7 records

- [x] Set `tip=RESTAVRACIYA`, `stage=NOVYY` for all `stage=RESTAVRACIYA` records (9 records at runtime)
- [x] Verify zero records remain with `stage=RESTAVRACIYA`

### Task 3: Remove RESTAVRACIYA from stage metadata

- [x] Update stage options without RESTAVRACIYA
- [x] Verify stage has 6 options

### Task 4: App constants + tests

- [x] Update `line-item-types.ts` / tests
- [x] Update `stages.ts` / tests
- [x] Update `summary.ts` short labels
- [ ] Bump version, run unit tests + build
- [ ] Commit and push
