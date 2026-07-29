# Wave 5 — Monthly Turnover & Margin Dashboard — Design

**Date:** 2026-07-24  
**Status:** Approved in chat (placement C; month by loadDate; formula A; approach 1)  
**Scope:** Compact finance strip + Analytics panel; opportunity `rashod*` fields; compute from CRM data  
**Out of scope:** Syncing expenses from external tables (server-side pipeline), native Twenty Dashboard MCP build

## Decisions

1. **Placement C** — strip under/near scoreboard + full «Аналитика» panel.  
2. Month bucket = opportunity `loadDate` (local calendar month).  
3. **Оборот** = Σ line-item `amount` (exclude `OTMENA`) for deals in month.  
4. **Расход** = Σ opportunity `rashodItogo` for deals in month.  
5. **Маржа** = оборот − расход; **%** = маржа / оборот when оборот > 0.  
6. Breakdown uses `rashodPechat`, `rashodFrezerovka`, `rashodLogistika`, `rashodVyezdnayaKomanda`, `rashodBeznal`.  
7. Field **names** match twentyserver (`rashod*`); local UUIDs are app-owned (warehouse UUIDs conflicted on create).

## UI

### Strip (always on Реализация)
`Июль 2026 · Оборот X ₽ · Расход Y ₽ · Маржа Z ₽ (p%)` + button «Аналитика»

### Analytics panel
- Month prev/next  
- Same KPIs large  
- Expense breakdown rows  
- Counts: deals / positions in month  
- Note when all expenses are 0 (no synced rashod yet)

## Data

Always REST-enrich opportunities with rashod* fields (not only when columns visible).

## Files

| Path | Role |
|------|------|
| `fields/opportunity-rashod-*.field.ts` | CURRENCY / DATE_TIME stubs |
| `analytics/compute.ts` | Pure finance math |
| `analytics/MarginStrip.tsx` | Compact strip |
| `analytics/AnalyticsPanel.tsx` | Detail panel |
| `DealsBoard.tsx` | Wire mode + rest fields |

## Success criteria

1. Strip shows month turnover from line amounts.  
2. Margin updates when rashodItogo present.  
3. Analytics panel shows expense breakdown.
