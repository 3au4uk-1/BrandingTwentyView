# Wave 1 Quiet UI + Attention Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Quiet dark-gray board chrome, single toolbar row, prefix deal counts on summary, and MSK working-day attention strip with filter+highlight.

**Architecture:** Token/layout lift first; pure helpers (`parseDealPrefix`, `workingDaysUntil`, `computeAttention`) with unit tests; wire AttentionStrip + prefix strip into DealsBoard above ProductionScoreboard; attention activation uses session highlight set + deal/line filter without new CRM fields.

**Tech Stack:** React, existing theme tokens, vitest (`yarn test:unit`).

## Global Constraints

- Today = calendar date Europe/Moscow; event = opportunity `loadDate`.
- Working days = Mon–Fri only.
- Attention stages exclude `NOVYY`, `GOTOVO`, `OTMENA`.
- Tip windows: PROIZVODSTVO/BANNERA/PODRYAD = 4; PLENKA/RESTAVRACIYA = 3.
- Prefix strip display-only (ПРО/Аренда/АРТ/Биржа/БС).
- Attention chip click = filter + highlight; no green empty state.
- Spec: `docs/superpowers/specs/2026-07-27-wave1-quiet-ui-attention-design.md`

## File map

| File | Role |
|------|------|
| `src/deals-board/theme/tokens.ts` | Dark gray ladder + row heights |
| `src/deals-board/theme/GlobalThemeStyles.tsx` | Cell padding if needed |
| `.cursor/skills/twentyview-apple-ops-ui/SKILL.md` | Locked token notes |
| `src/deals-board/utils/deal-prefix.ts` | `parseDealPrefix` + prefix counts |
| `src/deals-board/utils/working-days.ts` | MSK today + `workingDaysUntil` |
| `src/deals-board/attention/compute.ts` | Attention eligibility + by-tip counts |
| `src/deals-board/attention/AttentionStrip.tsx` | UI chips |
| `src/deals-board/scoreboard/ProductionScoreboard.tsx` | Prefix strip |
| `src/deals-board/DealsBoard.tsx` | Layout + wire attention state |
| `src/deals-board/DealsTable/DealRow.tsx` | Attention highlight |

---

### Task 1: Tokens + density

- [ ] Dark `bg` → `#1c1c1e`; shift secondary/tertiary/elevated one step; soften borders slightly
- [ ] `rowHeight` 46px, `childRowHeight` 40px; bump DealRow/LineItems cell padding if hardcoded
- [ ] Update apple-ops skill locked colors
- [ ] Commit `style: quiet dark-gray canvas and taller rows`

### Task 2: Prefix helper + scoreboard strip

- [ ] TDD `parseDealPrefix` / `countDealsByPrefix`
- [ ] Show muted prefix counts on ProductionScoreboard from visible deals
- [ ] Commit `feat: show deal prefix counts on scoreboard`

### Task 3: Working days + attention compute

- [ ] TDD `getTodayInputDateMsk`, `workingDaysUntil`
- [ ] TDD `computeAttention` matrix
- [ ] Commit `feat: attention working-day eligibility helpers`

### Task 4: Attention strip + filter/highlight

- [ ] `AttentionStrip` under toolbar
- [ ] State: active tip filter for attention; highlight matching line/deal ids
- [ ] Wire into filtered board data + DealRow amber cue
- [ ] Reset clears attention
- [ ] Commit `feat: attention strip with filter and row highlight`

### Task 5: Single-row toolbar

- [ ] Merge second toolbar row into first / settings overflow
- [ ] Commit `style: collapse deals board toolbar to one row`
