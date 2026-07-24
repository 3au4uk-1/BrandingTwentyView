---
name: twentyview-apple-ops-ui
description: Apple-like minimal visual system for the TwentyView deals board (Реализация). Use when changing deals-board UI, theme tokens, scoreboard, margin chip, toolbar, table chrome, chips, or when the user asks for visual polish / minimalism / Apple style.
---

# TwentyView Apple Ops UI

## Goal

Quiet, readable ops UI — SF/system fonts, iOS HIG colors, low chrome. Not agency bento, not brutalist, not purple SaaS.

## Source of truth

- Tokens: `src/deals-board/theme/tokens.ts`
- Global CSS: `src/deals-board/theme/GlobalThemeStyles.tsx`
- Chips: `src/deals-board/Chip.tsx`

## Locked choices

- Font: `-apple-system, BlinkMacSystemFont, "SF Pro Text", …` + SF Mono only for dense numbers when needed
- Accent: system blue (`#007AFF` light / `#0A84FF` dark)
- Dark surfaces: `#000` → `#1c1c1e` → `#2c2c2e` → `#3a3a3c` (real elevation)
- Radius: 6 / 10 / 14 / pill
- Motion: `cubic-bezier(0.25, 0.1, 0.25, 1)`; active `scale(0.98)`
- Labels: sentence case — **no** mono + SCREAMING uppercase chrome
- Stage rows: solid row bg + **left accent bar only** (no loud row fills; sticky columns stay opaque)
- Scoreboard: no card border/gradient; types-first
- Margin control: compact toolbar chip (month + margin + ›); details in `title`

## Anti-patterns (do not reintroduce)

- Backdrop-blur on non-sticky toolbar
- Heavy gradients on scoreboard / finance
- Colored full-row stage washes
- Inter / Roboto / purple glow / multi-shadow stacks
- Competing design skills (brutalist, gpt-taste, brandkit) unless user explicitly asks

## When polishing

1. Change tokens first, then surfaces.
2. Keep table density usable for dispatch (whitespace ≠ empty dashboard).
3. Sync with `yarn twenty apply` and hard-refresh.
