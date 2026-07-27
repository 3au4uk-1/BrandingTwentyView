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
- Dark surfaces: `#1c1c1e` → `#2c2c2e` → `#3a3a3c` → `#48484a` (quiet gray canvas, not OLED black)
- Density: parent row ~46px, child ~40px; soft borders; attention strip > green “all clear”
- Radius: 6 / 10 / 14 / pill
- Motion: `cubic-bezier(0.25, 0.1, 0.25, 1)`; active `scale(0.98)`
- Labels: sentence case — **no** mono + SCREAMING uppercase chrome
- Deal (parent) rows: saturated stage wash (TwentyServer-like) + left accent; Новый = neutral
- Line-item rows: same stage wash on full row
- Category/tip selects: ghost — colored text, no fill; tip colors: Баннера green, Плёнка blue, Подряд purple, Производство orange, Рест. pink
- Stage colors: Новый none · В печати yellow · Оклейка blue · В работе purple · Готово green · Отмена red
- Scoreboard: collapsible (flag toggle), compact cards, unicode tip icons
- Typography: base weight 500+, slightly larger sm/md
- Margin control: compact toolbar chip (month + margin + ›); details in `title`
- Deal stage: visible parent column by default; chip-like `ColoredStageSelect`

## Anti-patterns (do not reintroduce)

- Backdrop-blur on non-sticky toolbar
- Heavy gradients on scoreboard / finance
- Loud saturated full-row paints (prefer soft `rgba` chip washes)
- Inter / Roboto / purple glow / multi-shadow stacks
- Competing design skills (brutalist, gpt-taste, brandkit) unless user explicitly asks

## When polishing

1. Change tokens first, then surfaces.
2. Keep table density usable for dispatch (whitespace ≠ empty dashboard).
3. Sync with `yarn twenty apply` and hard-refresh.
