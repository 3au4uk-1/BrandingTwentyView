# Wave 4 — Restoration Standard Makets — Design

**Date:** 2026-07-24  
**Status:** Approved in chat (approach 1; storage A; trigger C; catalog A demo)  
**Scope:** Code constants catalog + auto-fill on RESTAVRACIYA + manual picker into `ssylkaNaMakety`  
**Out of scope:** CRM object catalog (later), margin dashboard (wave 5), editing catalog in UI

## Decisions

1. Catalog lives in `src/constants/standard-restoration-makets.ts` (demo URLs, replace later).  
2. Auto: when `tip` becomes `RESTAVRACIYA` and maket link is empty → set default maket.  
3. Manual: from maket cell — «Станд. макет» → pick any catalog entry (overwrite ok).  
4. Write shape: `{ primaryLinkUrl, primaryLinkLabel }` on `ssylkaNaMakety`.

## Catalog v1 (demo)

| Label | Role |
|-------|------|
| Стандарт реставрации | Default for auto |
| Рест. корпус | Manual pick |
| Рест. фасад | Manual pick |

## Flow

```
tip → RESTAVRACIYA + empty link
        └─ runAfter → PATCH ssylkaNaMakety (default)

LinkCell «Станд. макет»
        └─ Modal list → PATCH chosen maket
```

## Files

| Path | Role |
|------|------|
| `constants/standard-restoration-makets.ts` | Catalog + helpers |
| `automations/restoration-maket.ts` | Auto plan |
| `automations/run-after-line-item-update.ts` | Call auto on tip change |
| `editors/LinkCell.tsx` | Manual picker |

## Success criteria

1. Switching tip to «Рест. оклейка» fills empty maket with default.  
2. Existing link is not overwritten by auto.  
3. Manual picker can set/replace any standard maket.
