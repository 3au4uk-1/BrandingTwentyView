# Line-item stage wash + auto-sort on stage change — Design

**Date:** 2026-07-25  
**Status:** Approved in chat  
**Scope:** Richer stage row/chip colors; reorder line items by stage band after manual stage change

## Colors

Increase `CHIP_PALETTE` fill opacity (~0.22–0.32 light / ~0.28–0.40 dark) and text contrast. Keep soft rgba washes (comfortable, not neon).

## Auto-sort

Trigger: only after successful **manual** stage change on a line item (StageSelect), not on ▲▼ reorder.

Band order (top → bottom):

1. `NOVYY`
2. Mid: `V_PECHATI` → `OKLEYKA` → `V_RABOTE` (unknown stages with mid)
3. `GOTOVO`
4. `OTMENA`

Within a band, preserve prior relative order. Persist contiguous `poryadok` 0…n−1 via existing patch helper.
