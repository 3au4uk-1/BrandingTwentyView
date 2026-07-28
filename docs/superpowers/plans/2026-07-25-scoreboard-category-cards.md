# Scoreboard Category Cards Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace tip chips + expandable stage row with compact category cards showing total + печать/работа/готово; click toggles tip filter.

**Architecture:** Extend `compute.ts` with a per-tip card metrics helper; rewrite `ProductionScoreboard.tsx` to render cards; drop stage toggle from the scoreboard props in `DealsBoard.tsx`.

**Tech Stack:** React, existing deals-board theme tokens, vitest.

## Global Constraints

- Stage metrics on cards are display-only (positions counts for `V_PECHATI`, `V_RABOTE`, `GOTOVO`).
- Card click → existing `onToggleType(tip)` only.
- `NE_NASHE` card only when tip positions > 0.
- No second-row stage filter chips.

---

### Task 1: Card metrics helper + tests

**Files:**
- Modify: `src/deals-board/scoreboard/compute.ts`
- Modify: `src/deals-board/scoreboard/compute.test.ts`

**Interfaces:**
- Produces: `computeCategoryCardMetrics(lineItems): Record<LineItemType, CategoryCardMetrics>` where `CategoryCardMetrics = { total: number; inPrint: number; inWork: number; ready: number }`

- [ ] Add failing tests for card metrics
- [ ] Implement `computeCategoryCardMetrics` (reuse tip/stage bump logic)
- [ ] Run `yarn vitest run src/deals-board/scoreboard/compute.test.ts`

### Task 2: Rewrite ProductionScoreboard UI

**Files:**
- Modify: `src/deals-board/scoreboard/ProductionScoreboard.tsx`
- Modify: `src/deals-board/DealsBoard.tsx` (drop `onToggleStage` / `selectedStages` if unused)

- [ ] Cards: title, large total, `печать · работа · готово`
- [ ] Click → `onToggleType`; remove expand/stage chips
- [ ] Keep left summary `Сводка N поз · M сд`
- [ ] Smoke: board still compiles; watcher syncs

### Task 3: Commit

- [ ] `git commit` featuring scoreboard category cards
