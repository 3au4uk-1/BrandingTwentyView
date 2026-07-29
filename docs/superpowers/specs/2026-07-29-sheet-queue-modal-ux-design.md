# Sheet queue modal UX — time window, status readback, select chrome

**Date:** 2026-07-29  
**Status:** Approved  
**Scope:** TwentyView deals board (`SheetQueuePanel` → print + freza chips)  
**Out of scope:** Freza sheet cycle in crmparser; cost columns; changing sheet column letters

## Context

Operators fill date/time/comment in chip modals («Печать пленки», «Фреза»). Sheet push/readback lives in crmparser. Status booleans on the line item are **readback from Google Sheets**, not operator fill fields — except print **Реставрация**, which stays editable (Excel col F on print sheet).

### Sheets (from wave3 groundwork + print export design)

| Queue | Spreadsheet | Status (month tab) | Notes |
|-------|-------------|--------------------|--------|
| Печать | `12rGgW0vucmm4eXy4yrtQLRLNcqNpPVznpNdA-c1HuP0` (gid `700957125` = month tab) | **W / X** → `vzatoVRabotu` / `gotovo` | A = plenka readback; F = реставрация (CRM editable) |
| Фреза | `13w2SYQEgY2BUFKDdR3-vPCZGyeAZgBYlTFpm-EO8waw` | **U / V** → `vzatoVRabotuFrezy` / `gotovoFrezy` | No twin of print plenka/F in CRM panel |

**Live header scrape:** public CSV/`gviz` for both sheets returned 500 (not world-readable). Column letters above are from approved specs + `print-sheet-readback.js` / wave3 groundwork — treat as source of truth unless a month-tab audit contradicts them.

### Why one `SheetQueuePanel` is still correct

Sheets are **not** letter-identical (W/X vs U/V; print-only A/F). The shared panel does **not** talk to sheet columns — it patches Twenty fields via `SheetQueueFieldMap`. Print vs freza already differ only by that map (+ optional `plenka` / `restoration`). This UX work keeps that pattern; freza cycle wiring remains a separate crmparser task.

## Goals

1. Limit hour select to **08–22** (minutes stay `00/10/…/50`).
2. Style time `<select>` like other modal inputs (`bgElevated`, same chrome as `Input`).
3. Show **Взято** / **Готово** as non-clickable status indicators at the **top** of the modal body (readback).
4. Keep **Реставрация** clickable (print only).
5. Same UX for freza (shared component; freza has no restoration control).

## Non-goals

- Writing Взято/Готово from the board into the sheet.
- Implementing `runFrezaSheetCycle` / freza append/readback.
- Changing print export column map (B–P / W–X).
- Changing minute grid or date field behavior beyond clamp of invalid hours.

## UX design

### Time

- `HOURS = ['08'..'22']` (15 options).
- On open / when syncing from item: if stored hour is outside range, **clamp** to `08` or `22` (not invent a new minute).
- Persist still via `normalizePrintTime` + existing patch path; after clamp, saving writes the clamped hour.

### Select chrome

- `selectStyle` background: `colors.bgElevated` (match `Input`), not `colors.bg`.
- Keep height 36, border, radius, weight as today.

### Status strip (Approach A)

Place **above** the form fields, under modal title/description:

- Small muted label: «Статус с листа»
- Two **non-interactive** badges: «Взято», «Готово»
  - `true`: success (or warning for взято) muted fill + semibold text
  - `false`: ghost border + muted text
  - `cursor: default`, no `onClick`, not focusable as buttons

### Footer

- Print: **Реставрация** toggle (unchanged semantics) + **Закрыть**
- Freza: **Закрыть** only  
- Remove footer **Взято** / **Готово** action buttons

### Chip label / tone

Unchanged: chip still reflects gotovo / vzato / idle from CRM booleans.

## Implementation surface

| File | Change |
|------|--------|
| `src/deals-board/editors/SheetQueuePanel.tsx` | Hours clamp; select bg; status strip; footer cleanup |
| Optional: `normalize-print-time.ts` (+ unit test) | Shared clamp helper if splitTime grows messy |
| `PrintPanelChip.tsx` / `FrezaPanelChip.tsx` | No API change expected |

## Acceptance

1. Hour dropdown shows only 08–22; out-of-range CRM value opens clamped.
2. Time selects visually match date `Input` elevation.
3. Взято/Готово visible at top, not clickable; toggling them does nothing in UI.
4. Реставрация still toggles `restavraciyaPechati` on print.
5. Freza modal gets the same status strip + time UX without restoration.

## Follow-ups (not this slice)

- crmparser: freza export/readback with U/V (and confirm month-tab headers against live sheet when service account can read it).
- Optional: audit print tab headers vs `COL_W`/`COL_X` after template drift.
