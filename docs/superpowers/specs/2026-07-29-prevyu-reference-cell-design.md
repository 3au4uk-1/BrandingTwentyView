# Превью как референс + убрать чип «Макеты» + UX backlog

**Date:** 2026-07-29  
**Status:** Approved for planning  
**Scope:** TwentyView deals board (`BrandingTwentyView`)  
**Related:** `2026-07-27-prevyu-upload-window-design.md` (deferred), `2026-07-27-okleyka-preview-storage-design.md`

## Problem

1. Колонка «Превью» сейчас — текстовый чип, который ведёт в карточку записи. Нужен **первый столбец строки** с визуальным **референсом** (`prevyuOkleyki`), который можно добавить/сменить из view, с hover-просмотром.
2. В колонке «Группы» чип «Макет · …» (`RestorationMaketChip`) открывает модалку стандартных макетов — сейчас лишний шум; функционал временно убираем, вернём позже в другом месте.
3. Нужен список будущих UI/UX улучшений доски — без реализации в этом цикле.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Data | Существующее FILES-поле `prevyuOkleyki` (не новое поле) |
| Edit from view | File picker + drag-and-drop + Ctrl+V на ячейке |
| Multi-file display | Только **первое** изображение; остальные через компактный popover по клику |
| Hover | Floating preview рядом с курсором (portal), не scale в ячейке |
| Makety removal | Только `RestorationMaketChip` из `GroupChipsCell`; LinkCell / автоподстановка / каталог **не трогаем** |
| Approach | In-cell media cell |

## Goals / non-goals

| In | Out (this cycle) |
|----|------------------|
| Pin `prevyuOkleyki` as first child column | Redesign of group chips / deal header polish |
| Thumbnail + empty placeholder + `+N` badge | New CRM field for «референс» |
| In-cell upload (picker / DnD / paste) with fallback if Remote DOM blocks paste | Removing `ssylkaNaMakety` / LinkCell / restoration auto-fill |
| Floating hover preview | Returning makety UX in a new placement |
| Compact popover: list / make-first / add / remove | Full UX backlog implementation |
| Remove `RestorationMaketChip` from Groups | Changing Okleyka message / Telegram flows |
| Keep «В оклейку…» under cell when stage is OKLEYKA | Mobile long-press preview (backlog) |

## Design

### 1. Reference cell (`PrevyuOkleykiCell`)

**Column order**

- `prevyuOkleyki` is always the first visible child column (before «Позиция»).
- Enforce via pin/seed in child layout merge so saved views cannot bury it behind other fields.

**Empty state**

- Placeholder (icon / «+»).
- Click → native file picker (images only).
- Drop image onto cell → upload append (cap 6).
- Focused cell + Ctrl+V with image clipboard → upload append.

**Filled state**

- Show thumbnail of the **first** file URL from `resolvePrevyuFileUrls`.
- If `files.length > 1`, show small `+N` badge (`N = length - 1`).
- Hover thumbnail → `PrevyuHoverPreview` portal (~240–320px) near cursor; dismiss on leave / scroll / blur.
- Click → `PrevyuFilesPopover`: ordered list, make-first, add file, remove; no required trip to side panel for the basic path.
- Broken image URL → placeholder «нет превью».

**OKLEYKA**

- Keep existing «В оклейку…» control under the media cell when `stage === 'OKLEYKA'`.

### 2. Remove makety chip from Groups

**Remove now**

- Render of `RestorationMaketChip` from `GroupChipsCell`.
- `showRestorationChip` branch and any Groups-only tests that expect the chip.

**Keep for later**

- Field `ssylkaNaMakety`, `LinkCell`, restoration template catalog, auto-fill on RESTAVRACIYA, SheetQueuePanel maket URL editing.
- Future placement idea (backlog): near reference cell or in position popover — not in Groups chips.

### 3. Components / data flow

| Piece | Responsibility |
|-------|----------------|
| `PrevyuOkleykiCell` | Shell: empty/filled UI, focus target, wires actions |
| `usePrevyuMediaActions` | Upload, paste, DnD, make-first, delete; uses existing merge/remove/upload helpers + `useUpdateLineItem` |
| `PrevyuHoverPreview` | Portal floating preview |
| `PrevyuFilesPopover` | Multi-file management |
| Child column pin | `prevyuOkleyki` first in layout/merge/defaults |

**Errors**

- Non-image paste/DnD → ignore or short message.
- Cap 6 → reject extras with clear feedback.
- Mutation failure → alert/toast + rollback per existing cell patterns.

### 4. Remote DOM risk (explicit)

Prior deferred spec (`2026-07-27-prevyu-upload-window-design.md`) found that **in-widget Ctrl+V may not receive image bytes** under Twenty Remote DOM.

**Plan for this cycle**

1. Implement in-cell picker + DnD + paste attempt.
2. If paste (or file bytes) fail in widget: fallback path — reopen deferred upload-window approach **or** side-panel FILES — without abandoning thumbnail / hover / column pin.
3. Prefer picker + DnD as primary reliable path; paste is best-effort with documented fallback.

Implementation plan must include a verification step on real Twenty host before claiming paste works.

## UX backlog (not in this cycle)

Prioritized ideas only:

**Row scan**

- Tighter vertical rhythm aligned to reference thumb height.
- Softer stage wash / left accent; less filled row backgrounds.
- Position name: truncate + tooltip; fewer competing icons in the attention zone.

**Groups / chips**

- Unified chip language (Print / Freza / custom): one size, calmer colors, shorter status text.
- Reduce pill clusters; push secondary into expand strip.

**Deal header**

- One calm strip for path / date / status / amount / payment.
- Status + amount readable before a long path.

**Table chrome**

- Quieter column headers.
- Sticky first column (reference) on horizontal scroll.
- Empties (`-`) quieter; filled values stronger.

**Mobile / touch**

- Larger tap target for reference; hover preview → long-press / fullscreen sheet.

**Makety return (later)**

- Not as a Groups chip; place near reference or in position popover.

## Testing

- Unit: column pin order; merge/remove/make-first; image filter for paste/DnD.
- Component: empty → picker path; filled → popover; Groups without `RestorationMaketChip`.
- Manual on Twenty host: hover preview, DnD, file picker, Ctrl+V (or confirm fallback).

## Success criteria

1. First column of each line item shows reference thumb or empty add target.
2. Manager can add/replace reference without hunting the native card (picker/DnD; paste if host allows).
3. Hover shows a larger floating preview of the first image.
4. Groups no longer show the makety catalog chip; other makety plumbing intact.
5. UX backlog is written down for a later pass — no implementation required here.
