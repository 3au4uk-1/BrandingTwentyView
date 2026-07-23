# Production Scoreboard — Design

**Date:** 2026-07-23  
**Status:** Approved (approach 1, count mode C)  
**Scope:** Top metrics strip on Реализация board only.

## Goal

Always-visible tip + stage pulse for the current date filter, matching the «День менеджера» chip language.

## Placement

Between `QuickFiltersBar` and the table title row (`Реализация / view · N`).

## Metrics

- Scope: `visibleLineItems` (+ parent deals in view) under active date/search/company filters.
- Types (always shown): BANNERA, PLENKA, PODRYAD  
- Stages (pipeline order): NOVYY, V_RABOTE, V_PECHATI, OKLEYKA, GOTOVO (+ OTMENA muted)
- Each chip: **N поз** (line items) · **M сд** (distinct opportunityId)
- Left summary: total positions · total deals in scope

## Interaction

- Click tip chip → toggle that value in `quickFilters.types`
- Click stage chip → toggle that value in `quickFilters.stages`
- Active chip uses accent border (same language as reference)

## Non-goals

- Payment / maket chips (later)
- Shop conveyor hub
- Mobile redesign of this strip (wrap ok)
