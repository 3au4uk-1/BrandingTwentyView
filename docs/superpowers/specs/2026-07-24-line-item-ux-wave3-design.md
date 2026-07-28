# Wave 3 — Line-item UX (Drag + Print Panel) — Design

**Date:** 2026-07-24  
**Status:** Approved in chat (approach 1; plenka snippet = B; comment presets = A; order field = A)  
**Scope:** Drag reorder of line items within a deal; adaptive Print chip + popover  
**Out of scope:** Restoration maket library (wave 4), margin dashboard (wave 5)

## Decisions locked

1. **Approach 1** — Print chip shows status without opening; click opens one popover. Replace expanding the print group strip for print fields.
2. **«Номер плёнки» on chip** = short snippet from `plenka` markdown.
3. **Comment presets** → multi-toggle → join with `; ` into `kommentariyDlyaPechati`; «другое» = free text.
4. **Order** → new NUMBER field `poryadok` on `dealLineItem`.

## Data

### `poryadok` (NUMBER)

- New field, UUID v4.
- Sort within deal: `poryadok ASC`, then stable id.
- On create: `max(siblings.poryadok)+1` (or `siblings.length` if all null).
- Drag: recompute contiguous integers `0..n-1` for the deal’s visible list; PATCH changed rows only.

### Print fields (existing)

| Field | Role |
|-------|------|
| `dataGotovnostiPechati` | Date in popover |
| `vremyaGotovnostiPechati` | Time in popover |
| `kommentariyDlyaPechati` | Preset join + other |
| `plenka` | Editor in popover; snippet on chip |
| `vzatoVRabotu` / `gotovo` | Toggles on chip + in popover |

### Presets (UI constants)

- баннер бб с люверсами  
- баннер бб без люверсов  
- пленка бб лам  
- плоттер  
- другое (opens free input; stored as part of joined string or leftover text)

## UI

### Print chip (always visible in group zone)

Label pattern: `Печать · Взято? · Готово? · {plenkaSnippet}`  
- Inactive steps muted; active colored (same language as `PrintProgressCell`).  
- Plenka snippet: first line of markdown, max ~24 chars, ellipsis.  
- Click → open `PrintPanelPopover` anchored to chip (portal).

### Print popover

- Date + time (reuse existing editors / inputs)  
- Preset chips (multi) + «другое» text  
- Plenka rich/text  
- Взято / Готово toggles  
- Close on outside click / Escape  

### Group strip

- Print group no longer expands a horizontal strip of those fields (chip opens popover instead).  
- Other future groups keep chip→strip behavior.

### Drag

- Handle column (⠿) leftmost on each line-item row.  
- HTML5 drag-and-drop within one deal’s tbody (no extra DnD lib for v1).  
- Optimistic reorder in cache + PATCH `poryadok`.

## Files

| Path | Role |
|------|------|
| `fields/poryadok.field.ts` | NUMBER field |
| `constants/print-presets.ts` | Preset strings + join/parse |
| `editors/PrintPanelChip.tsx` | Chip + popover |
| `utils/line-item-order.ts` | sort + recompute patches |
| `DealsTable/LineItemsTable.tsx` | Drag + Print chip wire |
| `hooks/useLineItems.ts` | create with next poryadok; optional reorder mutation |

## Testing

- Unit: preset join/parse; sort + reorder patches; plenka snippet  
- Manual: drag two rows; open Print chip; set date/presets; see chip update

## Success criteria

1. User can reorder positions inside a deal and order survives refresh.  
2. Print statuses + plenka visible on chip without opening.  
3. One popover edits all print fields with preset comments.
