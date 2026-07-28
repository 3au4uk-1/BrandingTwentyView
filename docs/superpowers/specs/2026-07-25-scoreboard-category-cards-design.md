# Scoreboard category cards

Date: 2026-07-25  
Status: approved (conversation)

## Problem

The production scoreboard shows tip chips and a second expandable row of stage filters. Operators want one glance per category: how many positions exist, and how many are in print / in work / ready — without drilling into stage chips.

## Goals

- One compact card per tip category.
- Each card shows: **total positions**, **В печати**, **В работе**, **Готово**.
- Clicking a card toggles the existing tip filter on the board (same as today’s tip chip).
- Stage numbers on the card are display-only (not filters).
- No expandable second row of stage filter chips.

## Non-goals

- Clickable stage metrics / stage filters from the scoreboard.
- Changing date-preset or REST auth behavior (tracked separately; board empty state from 401 is unrelated).
- Showing Новый / Оклейка / Отмена as separate card metrics (they still count toward **total**).

## UI

- Left: optional compact summary `Сводка N поз · M сд` (keep).
- Row of category cards for: Баннеры, Оклейка, Подряд, Производство, Рест. оклейка; `NE_NASHE` only when count > 0.
- Card layout (compact):
  - Title (tip label)
  - Large total position count
  - Three muted metrics in one line: `печать N · работа N · готово N` (short labels OK)
- Active tip filter: inset outline / emphasis (reuse current chip active language).
- Empty (0 total): card remains, lowered opacity.

## Data

- Input: same `lineItems` the scoreboard already receives (`visibleLineItems` from `DealsBoard`).
- Reuse `computeProductionScoreboard` for totals / tip totals.
- Per tip, reuse or thin-wrap `computeTipStageBreakdown` for `V_PECHATI`, `V_RABOTE`, `GOTOVO`.
- Counts are **positions** (not deals) for the three stage metrics; total matches tip position count.

## Interaction

- Card click → `onToggleType(tip)` (existing session clause toggle).
- Remove `onToggleStage` usage from the scoreboard UI (prop can stay unused or be dropped if nothing else needs it).
- Remove expanded-tip state and the stage chip row.

## Testing

- Unit: given mixed tips/stages, card metrics match expected totals for each tip’s print/work/ready/total.
- Existing scoreboard compute tests updated if API surface changes.

## Out of scope follow-ups

- Hard refresh / re-auth if `/rest/dealLineItems` returns 401.
- Date preset empty-board investigation after auth is healthy.
