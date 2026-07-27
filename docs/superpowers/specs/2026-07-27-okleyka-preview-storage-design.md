# Okleyka visualization preview — Design

**Date:** 2026-07-27  
**Status:** Approved in chat (approach 1; MVP B→C send adapter; photos B; upload UI C; booking C)  
**Scope:** Store visualization photos on line items + editable confirm dialog that copies a Telegram-ready message  
**Out of scope:** Real Telegram bot send; installer mobile task cards; photo reports; warehouse/time tracking; writing dialog text edits back to CRM (except FILES)

## Problem

After print, managers send oracal installers a Telegram message: order name, booking id, film number, equipment, plus a visualization photo. Today the photo lives only in chat history. The board already builds a copyable text toast on stage → `OKLEYKA`, but:

- «Бронь» uses load date instead of the booking number from the deal name  
- «Плёнка» often shows tipDetail («Наши») instead of the printer film number  
- There is no place to attach visualization image(s)

## Decisions

1. **Approach:** `FILES` field on `dealLineItem` + replace the toast with an editable confirm dialog.  
2. **MVP send:** clipboard copy (+ surface photo URLs / open previews). Same payload adapter later → Telegram API.  
3. **Who attaches:** person moving stage to Оклейка; can also attach earlier via cell.  
4. **Photos:** usually 1, allow 2–3; field supports N files.  
5. **Upload UI:** both — cell/chip on the row and upload inside the dialog.  
6. **Film number:** default from first line of `plenka.markdown`; editable in dialog only for the copied message.  
7. **Booking:** first `\d{5,6}` match in `opportunity.name` (covers `/180288/` and `179512Фест.`); editable in dialog.  
8. **Dialog text edits:** ephemeral for copy payload — do **not** PATCH CRM fields. File add/remove **does** update `prevyuOkleyki`.

## Data

| Piece | Storage |
|-------|---------|
| Visualization images | New `FILES` field `prevyuOkleyki` (label «Превью оклейки») on `dealLineItem` |
| Print maket links | Existing `ssylkaNaMakety` — unchanged, separate concern |
| Film number source | Existing `plenka` RICH_TEXT |
| Line comment source | Existing `kommentariy` |

### Message draft (dialog local state)

| Line | Default | Editable in dialog |
|------|---------|--------------------|
| Заказ | `opportunity.name` | yes |
| Бронь | `extractBookingId(opportunity.name)` | yes |
| Плёнка | first line of `plenka.markdown` | yes |
| Оборудование | `name` + qty | yes |
| Комментарий | `kommentariy` if present | yes |
| Photos | files from `prevyuOkleyki` | add/remove (persisted) |

Target copy format (matches current Telegram practice):

```
Заказ: АРЕНДА/28-30.07/.../180288/...
Бронь: 180288
Плёнка: 324
Оборудование: Фотобудка квадратная × 1
Комментарий: …   # omit line if empty
```

## UI flow

```
[optional] Cell «Превью» → upload / thumbnails / remove
        │
stage → OKLEYKA (or manual «В оклейку…»)
        └─ OkleykaMessageDialog
              ├─ thumbs + add photo
              ├─ editable fields + live text preview
              ├─ Отмена
              └─ Копировать → clipboard (+ photo URLs / open)
                    └─ later: Отправить в Telegram (same draft)
```

**Table cell:** up to 3 thumbnails; empty = «+ превью».  
**Re-open:** while stage is already `OKLEYKA`, chip/cell action «В оклейку…» rebuilds the dialog without requiring a stage change.

## Architecture

| Unit | Responsibility |
|------|----------------|
| `prevyuOkleyki` field + UUID | CRM FILES storage |
| Preview cell/chip | Browse/upload/delete files on the line item |
| `extractBookingId` | Pure parse from deal name |
| `buildOkleykaMessage` | Pure text from opportunity + line item (+ optional draft overrides) |
| `OkleykaMessageDialog` | Replace `OkleykaMessageToast`; local draft state |
| `sendOkleykaPayload` | MVP: clipboard; future: Telegram bot |

`run-after-line-item-update` keeps the stage→`OKLEYKA` trigger but opens the dialog with full context (opportunity, line item, files), not a bare string.

### Upload caveat

Prefer Twenty FILES upload from the front component. If upload API is unavailable in the iframe, document a temporary URL-paste fallback in the implementation plan — do not block the dialog/text path.

## Errors

| Case | Behavior |
|------|----------|
| No photos | Allow copy; warn «без фото» |
| Booking parse miss | Empty Бронь; user fills in dialog |
| Clipboard failure | Existing `prompt` fallback |
| Upload failure | Inline error; do not revert stage |

## Tests

- `extractBookingId`: first `\d{5,6}` in name; empty when none; dates like `28-30.07` must not win  
- `buildOkleykaMessage`: film from `plenka.markdown` first line; qty; optional comment line  
- Dialog draft edits do not mutate cached line item text fields; file mutations go through normal PATCH

## Success criteria

1. Line item can store 1–3 visualization images visible as thumbnails.  
2. Stage → Оклейка opens editable confirm dialog with correct defaults (booking from name, film from plenka).  
3. «Копировать» puts the approved text on the clipboard; photos are reachable for manual Telegram attach.  
4. Re-open dialog without changing stage again.  
5. No Telegram bot required for MVP; adapter seam exists for later send.

## Future (not this wave)

- Telegram bot: same draft + file URLs → installer group  
- Installer task cards app (phone): film, warehouse, photos, live status  
- Installer photo report → reporting chat  
- Persist dialog text edits to CRM if product asks for it
