---
name: twentyview-apple-ops-ui
description: Apple-like minimal visual system for the TwentyView deals board (Реализация). Use when changing deals-board UI, theme tokens, scoreboard, margin chip, toolbar, table chrome, chips, or when the user asks for visual polish / minimalism / Apple style.
---

# TwentyView Apple Ops UI

## Goal

Quiet, readable ops UI — SF/system fonts, iOS HIG colors, low chrome. Not agency bento, not brutalist, not purple SaaS. Status readable at a glance without a rainbow of full-color surfaces.

## Source of truth

- Tokens: `src/deals-board/theme/tokens.ts`
- Global CSS: `src/deals-board/theme/GlobalThemeStyles.tsx`
- Chips: `src/deals-board/Chip.tsx`
- Top insight panel: `src/deals-board/BoardInsightPanel.tsx`
- Row stage cue: `src/deals-board/utils/stage-row-styles.ts`

## Locked choices

- Font: `-apple-system, BlinkMacSystemFont, "SF Pro Text", …` + SF Mono only for dense numbers when needed
- Accent: system blue (`#007AFF` light / `#0A84FF` dark)
- Dark surfaces: `#1c1c1e` → `#2c2c2e` → `#3a3a3c` → `#48484a` (quiet gray canvas, not OLED black)
- Density: parent row ~46px, child ~40px; soft borders
- Radius: 6 / 10 / 14 / pill
- Motion: `cubic-bezier(0.25, 0.1, 0.25, 1)`; active `scale(0.98)`
- Labels: sentence case — **no** mono + SCREAMING uppercase chrome
- **Top block:** compact `BoardToolbar` (view · filters · search · deal count · quiet turnover · toggles) + one `BoardInsightPanel` (attention ghost chips + collapsible flat category rows). Prefix counts live in `{N} сд` `title`, not toolbar chips. Shared insight surface, not two separate bars. No emoji / tip glyphs — dots only.
- **Turnover control:** tabular text button (opens analytics) — never success-green pill
- **Category color = small cue only:** 6px dots / ghost select text — never paint whole cards or rows in tip color
- **Stage rows:** no wash — solid 4px left rail only; filled stage select carries the readable color chip
- **Category/tip:** ghost select (colored text); tip colors via dots in insight panel only
- Stage colors: Новый none · В печати yellow · Оклейка blue · В работе purple · Готово green · Отмена red
- Tip colors: Баннера green · Плёнка/Оклейка blue · Подряд purple · Производство orange · Рест. soft pink · Не наше gray
- Typography: base weight 500+, slightly larger sm/md
- Margin control: compact toolbar chip (month + margin + ›); details in `title`
- Deal stage: visible parent column by default; **filled** `ColoredStageSelect`

## Anti-patterns (do not reintroduce)

- Backdrop-blur on non-sticky toolbar
- Heavy gradients on scoreboard / finance
- Rainbow: saturated full-row washes, tip-colored card fills, competing hue-heavy chrome
- Inter / Roboto / purple glow / multi-shadow stacks
- Competing design skills (brutalist, gpt-taste, brandkit) unless user explicitly asks
- Separate AttentionStrip + ProductionScoreboard stacks (use BoardInsightPanel)
- Green money pills or tip-colored category card fills in the top block
- Permanent PRO/Аренда/АРТ prefix chip row in the toolbar

## When polishing

1. Change tokens first, then surfaces.
2. Keep table density usable for dispatch (whitespace ≠ empty dashboard).
3. Sync with `yarn twenty apply` and hard-refresh.
