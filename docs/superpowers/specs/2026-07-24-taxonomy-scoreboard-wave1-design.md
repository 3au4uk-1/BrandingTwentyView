# Wave 1 — Taxonomy + Scoreboard Detail — Design

**Date:** 2026-07-24  
**Status:** Approved in chat (approach A)  
**Scope:** Line-item type/stage clarity, tip-detail SELECT, scoreboard tip→stage breakdown  
**Out of scope:** Print panel, drag reorder, branding automations, restoration maket library, margin dashboard (waves 2–5)

## Goal

Make tip/stage choices unambiguous for floor users, and extend «Сводка смены» so each type (especially Подряд) shows how many positions sit in each pipeline stage under the current filters.

## Decisions locked

1. **Approach A** — extend SELECT metadata + board UI (no separate directory objects yet).
2. Keep existing CRM enum **values** where possible; change **labels** and add one new tip + one new field.
3. Stage **display order** (not rename of values):  
   `NOVYY` → `V_PECHATI` → `OKLEYKA` → `V_RABOTE` → `GOTOVO` → `OTMENA` (muted).
4. Type **values / labels**:

| Value | Label (UI) | Notes |
|-------|------------|--------|
| `BANNERA` | Баннера | unchanged value |
| `PLENKA` | Оклейка | label change (was «Плёнка») |
| `PODRYAD` | Подряд | unchanged |
| `PROIZVODSTVO` | Производство | **new** enum option |
| `RESTAVRACIYA` | Рест. оклейка | label change |
| `NE_NASHE` | Не наше | **deprecated in pickers**; still readable; migrate UX to `PLENKA` + tipDetail |

5. Stage vs type «Оклейка»: stage `OKLEYKA` = pipeline step; tip `PLENKA` labeled «Оклейка» = work kind. Both stay; UI copy must not merge them into one control.

## Data model

### New field `tipDetail` on `dealLineItem`

- Type: `SELECT`, nullable  
- Universal identifier: `31e5a968-3de6-4fa0-a2e8-d09c820ac862`  
- Name: `tipDetail` · Label: `Уточнение`  
- Options (single flat enum; **UI filters by tip**):

| Value | Label | Shown when tip = |
|-------|-------|------------------|
| `NASHI` | Наши | `PLENKA` |
| `NE_NASHI` | Не наши | `PLENKA` |
| `YURA` | Юра | `BANNERA` |
| `MAGA` | Мага | `BANNERA` |
| `TOPILSKIY` | Топильский | `BANNERA` |
| `GLAV_PRINT` | Глав принт | `PODRYAD` |
| `PASHA_VINDER` | Паша виндер | `PODRYAD` |
| `ZARYA` | Заря | `PODRYAD` |
| `LIZA_SUKNO` | Лиза сукно | `PODRYAD` |
| `KUVALDIN_KLISHE` | Кувалдин клише | `PODRYAD` |
| `SVOE` | Своё | `PODRYAD` |
| `ROLL_UP` | Ролл-ап | `PROIZVODSTVO` |
| `POP_UP` | Поп-ап | `PROIZVODSTVO` |
| `PROMO_STOYKA` | Промо-стойка | `PROIZVODSTVO` |
| `PROIZVODSTVO_DRUGOE` | Другое | `PROIZVODSTVO` |

- Default when tip becomes `PLENKA` and `tipDetail` empty: set `NASHI` (client-side on tip change; optional local stub defaultValue if SDK allows).
- Changing tip clears `tipDetail` if the previous value is not valid for the new tip.
- `RESTAVRACIYA`: no tipDetail options in this wave (field hidden / empty).

### Tip enum update

Add `PROIZVODSTVO` to tip options in app metadata (local stub object + any `defineField` tip overrides) and in `src/constants/line-item-types.ts`.

### Compatibility

- Existing rows with `tip = NE_NASHE` keep working in filters/scoreboard.
- Tip select in board: hide `NE_NASHE` from new choices; if row already has it, show as selected until user changes tip.
- Optional one-click suggest: when editing `NE_NASHE`, offer «Оклейка + Не наши» (nice-to-have; not blocking).

## Board UI

1. Tip cell / select: updated labels + `PROIZVODSTVO`; hide deprecated `NE_NASHE` for new picks.
2. Adjacent **Уточнение** cell (or compact select under tip in expand row): options filtered by `TIP_DETAIL_BY_TIP[tip]`.
3. Column visibility: include `tipDetail` in default child columns for floor views (or show inline next to tip without a full column if width is tight — prefer dedicated narrow column).
4. Stage select: same values; reorder options to match display order above.

## Scoreboard

### Tip row

Always show chips in order:  
`BANNERA`, `PLENKA`, `PODRYAD`, `PROIZVODSTVO`, `RESTAVRACIYA`  
(`NE_NASHE` only if count > 0, muted label «Не наше»).

### Stage row

Order: `NOVYY`, `V_PECHATI`, `OKLEYKA`, `V_RABOTE`, `GOTOVO`, `OTMENA`.

### Tip → stage breakdown (new)

- Clicking a **tip** chip still toggles FilterAST `tip` filter (existing behavior).
- Additionally sets `expandedTip` local UI state to that tip (or clears if toggled off / clicked again while only that tip selected).
- When `expandedTip` is set, render a third strip under stages: stage chips counting **only** line items with `tip === expandedTip` (same N поз · M сд language).
- Clicking a stage chip in the breakdown toggles stage filter as today (global stages filter).
- Empty stages in the breakdown stay visible but quiet (same as main stage row).

### Compute helpers

Extend `computeProductionScoreboard` (or add `computeTipStageBreakdown(lineItems, tip)`) with unit tests for:

- totals by tip including `PROIZVODSTVO`
- breakdown positions/deals for a given tip
- `NE_NASHE` optional chip when present

## Testing (local)

- `yarn test:unit` for scoreboard + tipDetail option filter helpers
- Manual on http://localhost:2020: change tip → see tipDetail options change; PLENKA defaults to Наши; expand Подряд on scoreboard and confirm stage subcounts match table after tip filter
- Sync: `yarn twenty dev` with local `dealLineItem` stub including new tip option + `tipDetail` field

## Non-goals (reminders)

- Print adaptive window  
- Drag reorder of positions  
- «Хватайка» / branding automations  
- Restoration standard maket links  
- Month turnover / margin dashboard  

## Success criteria

1. Floor user can pick type + уточнение without seeing duplicate «оклейка» concepts in one control.  
2. Scoreboard shows all production tips and, for an expanded tip, stage pulse for that tip only.  
3. Existing seeded deals still load; new field nullable so old rows need no migration.
