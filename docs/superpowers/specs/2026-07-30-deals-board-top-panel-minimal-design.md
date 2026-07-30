# Deals board top panel — quiet minimal redesign

Date: 2026-07-30  
Status: approved (conversation)  
Repo: BrandingTwentyView  
Scope: visual + layout of `BoardToolbar` + `BoardInsightPanel` only.  
Related: `2026-07-27-wave1-quiet-ui-attention-design.md`, `2026-07-25-scoreboard-category-cards-design.md`, skill `twentyview-apple-ops-ui`.

## Problem

The top block (toolbar + attention + category cards) is hard to scan: too tall, too much chrome (colored pills, emoji/symbol icons), and flat hierarchy — filters, money, attention, and production status compete equally.

## Goals

1. Keep **all important controls and status visible** (no progressive hide of attention or category summary).
2. Reduce vertical height and visual noise while staying in the **dark Apple ops** theme.
3. Clear hierarchy: **Control first**, then **Insight** (attention + categories).
4. Preserve existing click/filter/search/analytics/collapse behavior.

## Non-goals

- Light / editorial theme, bento landing layout, or `/minimalist-ui` warm-bone palette on this board.
- Changing filter model, attention compute, scoreboard metrics, or tip/stage enums.
- Reintroducing a separate `AttentionStrip` above the insight panel.
- Prefix chips as a second loud row in the toolbar.

## Approach (chosen)

**Two zones, dark ops, denser chrome** (conversation option B).

```
┌─ Control (BoardToolbar) ─────────────────────────────────────────────┐
│ View · date presets · +Фильтр │ Search… │ N сд · sum ₽ · Умное · ⚙ │
└──────────────────────────────────────────────────────────────────────┘
┌─ Insight (BoardInsightPanel) ────────────────────────────────────────┐
│ Требует внимания [N] · tip ghosts │ Сводка · поз · сд          [▾] │
│ [Баннера  10] [Плёнка 13] [Подряд 9] …  flat row-cards, stage dots │
└──────────────────────────────────────────────────────────────────────┘
│ Table …                                                              │
```

## Zone 1 — Control (`BoardToolbar.tsx`)

### Layout

- Single primary visual band (~48–56px content height), `flex` row, wrap only on narrow widths.
- Left cluster: `ViewSwitcher` + `FilterBar` (`layout="compact-top"`).
- Center/flex: search field (shorter placeholder when empty: e.g. `Поиск…`; keep Enter multi-term behavior).
- Right cluster: deal count · turnover · `ExpandModeToggle` · `ToolbarSettingsCluster`.

### Demotions

- **Prefix counts** (ПРО / Аренда / АРТ / Биржа): remove as always-visible chip row. Put counts in `title` on `{N} сд` and/or a single quiet overflow control if operators still need glanceable prefixes later. Default for this spec: **title-only** on the deal-count span.
- **Turnover button**: drop success-green pill. Use tabular-nums text in `colors.text` / muted; hover = subtle underline or `colors.bgElevated`. Still opens analytics on click.
- Search shell: keep border + elevated fill; avoid extra nested chrome.

### Behavior (unchanged)

- Search debounce, Enter → term chip, Backspace removes last term, reset, view switch, filters, expand mode, settings/column editors, analytics open.

## Zone 2 — Insight (`BoardInsightPanel.tsx`)

### Shared surface

- Keep one section with `bgSecondary` + inset `1px borderSubtle` (no second AttentionStrip).
- Row 1 (header): attention (if `total > 0`) · summary meta · collapse toggle.
- Row 2 (body): category metrics; collapsible as today (`tv.dealsBoard.scoreboardCollapsed`).

### Attention

- Label: «Требует внимания» + muted warning badge with count (no ⚠ emoji).
- Tip filters: ghost chips; tip color = **6px dot only**; empty tips stay disabled/faded.
- Click = `onToggleAttentionTip` (unchanged).

### Category summary

- Same tips / metrics / click → `onToggleType` as today (`computeCategoryCardMetrics`).
- Visual: **flat row-cards** — `1px borderSubtle`, radius ≤ `radius.md` (≤10), no tip-colored fills, no ▣▭◇⬡↻ glyphs.
- Title + total (semifold tabular); stage line `Печать / Работа / Готово` with existing stage-dot colors at 5px.
- Active: inset `1–1.5px accent` outline only.
- Empty (0): remain visible, lowered opacity (~0.45).

### Summary meta

- Keep `Сводка · {поз} · {сд}` on the header row (muted).

## Visual rules (ops + quiet)

| Element | Rule |
|---------|------|
| Theme | Dark tokens from `theme/tokens.ts` — no light canvas |
| Color scarcity | Hue only on dots / warning badge / active accent outline |
| Icons | No emoji; prefer no decorative unicode — dots or nothing |
| Shadows | None / inset hairlines only |
| Radius | Existing theme radii; no large pills for money |
| Density | Ops-usable; do not add landing-scale vertical padding |

Update `.cursor/skills/twentyview-apple-ops-ui/SKILL.md` locked notes if toolbar/prefix guidance drifts (prefix chips no longer default chrome).

## Files

| File | Change |
|------|--------|
| `src/deals-board/BoardToolbar.tsx` | Compact single-band layout; demote prefixes + turnover chrome |
| `src/deals-board/BoardInsightPanel.tsx` | Quiet attention header; flat category rows; drop TIP_ICON glyphs |
| `src/deals-board/theme/*` | Only if token tweaks needed for toolbar/insight spacing |
| `.cursor/skills/twentyview-apple-ops-ui/SKILL.md` | Sync locked top-block notes |

## Out of scope files

- `AttentionStrip.tsx` (leave unused / do not re-wire)
- Filter model, scoreboard compute, attention compute (logic unchanged)

## Acceptance

1. On desktop, top block reads as two bands; table starts higher than today (noticeably less vertical chrome).
2. Prefix chips are not a permanent toolbar row; deal count + sum remain visible.
3. Attention + all category cards remain visible when scoreboard expanded; collapse still works.
4. Tip/category/search/analytics interactions unchanged.
5. No new emojis; tip color only as small dots; sum is not a green pill.
6. Dark theme preserved; no light editorial skin.

## Self-review

- No placeholders / TBD left in requirements.
- Does not contradict wave1 “one BoardInsightPanel” or category-card click semantics — only chrome/layout.
- Scope limited to toolbar + insight panel visuals.
