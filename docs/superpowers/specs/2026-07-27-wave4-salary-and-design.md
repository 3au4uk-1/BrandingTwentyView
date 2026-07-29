# Wave 4 — Okleyka salary page + board visual polish

Date: 2026-07-27  
Status: approved (conversation)  
Scope: left-nav «Оклейщики» salary table; top insight + row visual polish per references

## Salary (left menu)

- New page layout + nav item «Оклейщики» (under Реализация app).
- Rows: `tip=PLENKA`, `tipDetail=NASHI`, `stage ∈ {OKLEYKA, GOTOVO}`.
- Columns: Bitrix link · deal name · line name · qty · sale · print cost · freza cost · profit · margin %.
- New nullable CURRENCY: `stoimostPechati`, `stoimostFrezy` (null → 0 until sheet sync).
- CSV export button on the page.

## Design polish

### Top block
- Attention: warning + badge count + tip chips with color dots (show all tips with counts, including 0 muted).
- Summary cards: icon/dot · label · large total · печать/работа/готово with stage-colored dots.
- Prefix row: bordered chips (ПРО / Аренда / АРТ / Биржа / БС).
- One surface, calm accents only.

### Rows
- Softer canvas / nested backgrounds; left stage rail kept.
- Line-item table flush-left under deal (less inset).
- Order control: miniature ▲▼ (no drag square) — already present, tighten chrome.
- Collapsed deal: stage summary chips (existing DealSummaryChips, visual polish).
- Filled stage selects stay.

## Out of scope
- Sheet AC/cost sync (specialist).
- Parser tip_rules.
