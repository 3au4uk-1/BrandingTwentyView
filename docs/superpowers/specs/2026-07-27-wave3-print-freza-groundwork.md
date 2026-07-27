# Wave 3 — Print film + Freza sheet queues (groundwork)

Date: 2026-07-27  
Status: UI + freza fields in TwentyView; sheet cycles remain on twentyserver/crmparser  
Owner handoff: specialist on twentyserver

## Sheets (confirmed)

| Queue | Spreadsheet | Status cols (Июль 2026) | Cost col |
|-------|-------------|-------------------------|----------|
| Печать Плёнки | `12rGgW0vucmm4eXy4yrtQLRLNcqNpPVznpNdA-c1HuP0` | **W / X** | TBD (not AC on all tabs) |
| Фреза | `13w2SYQEgY2BUFKDdR3-vPCZGyeAZgBYlTFpm-EO8waw` | **U / V** | TBD |

Template/first tabs may be narrower (A–R only). Always map against the **month tab**.

## Trigger (same for both)

1. Operator fills date + time (+ comment / maket) in the chip panel.
2. Stage → `V_PECHATI`.
3. Cron exports one row per session; skip occupied rows; anti-dupe on (maket link + comment + date + time).
4. Readback: statuses → CRM booleans; optional cost later.

## TwentyView (this wave)

- Chip **«Печать Плёнки»** — shared `SheetQueuePanel` (maket URL, larger time selects, presets).
- Chip **«Фреза»** to the right — parallel fields:
  - `dataGotovnostiFrezy`, `vremyaGotovnostiFrezy`, `kommentariyDlyaFrezy`
  - `vzatoVRabotuFrezy` ← sheet **U**, `gotovoFrezy` ← sheet **V**
  - Session: `frezaSheetSessionId`, `frezaSheetTabName`, `frezaSheetRowNumber`
- Shared maket field: `ssylkaNaMakety`

## Specialist TODO (crmparser / twentyserver)

1. Twin of `runPrintSheetCycle` → `runFrezaSheetCycle` with `FREZA_SHEET_ID`.
2. Readback indices: print **W=22, X=23**; freza **U=20, V=21**.
3. Anti-dupe fingerprint as above.
4. Wire cost column when known → line-item currency field (salary wave).
5. Confirm print readback still hits W/X on month tabs (not M/N on template).
