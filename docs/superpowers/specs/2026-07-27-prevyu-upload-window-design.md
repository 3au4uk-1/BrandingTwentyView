# Превью оклейки — upload window (outside Remote DOM)

**Date:** 2026-07-27  
**Status:** Deferred — not in build (Remote DOM blocks separate window / in-widget paste). Interim: chip → native card «Превью оклейки».  
**Depends on:** `prevyuOkleyki` FILES field + board chip (okleyka preview storage)  
**Out of scope:** Telegram send; DnD inside the deals-board widget; changing okleyka message text; redesign of native side-panel FILES UX

## Problem

Managers need to attach visualization screenshots to line items. The native card field «Превью оклейки» works with Ctrl+V, but hunting for that field is slow.

A modal **inside** the deals-board front-component cannot reliably receive clipboard image bytes: Twenty front components run in Remote DOM (Web Worker). Paste events only forward text; file inputs often expose metadata without bytes. Empirically, «Вставить из буфера» in a widget modal failed while the same paste worked in the native FILES field.

## Decision

Open a **separate browser window** (logic-function HTML page on the main thread) for upload. Ctrl+V works there like a normal web page. Persist files to existing `dealLineItem.prevyuOkleyki`. Keep the side-panel path as fallback.

## Goals / non-goals

| In | Out |
|----|-----|
| Ctrl+V in the popup uploads to `prevyuOkleyki` | Fixing Remote DOM clipboard for all widgets |
| Optional file-picker button in the same window | Drag-and-drop into the board widget |
| Chip / dialog entry points open the window | New CRM field |
| Board chip refreshes after successful upload | Telegram / installer flows |
| Fallback: open record side panel if popup blocked | Reworking Okleyka message copy UX |

## User flow

```
[Превью] chip  or  «Добавить фото» in Okleyka dialog
        │
        ├─ window.open(functionsUrl + /prevyu-upload/:lineItemId?…)
        │         │
        │         ▼
        │   Mini HTML window (autofocus paste zone)
        │         ├─ Ctrl+V / paste → POST image → append prevyuOkleyki
        │         ├─ optional «Выбрать файл»
        │         ├─ show current thumbs (GET state or after upload)
        │         └─ «Готово» → close; notify opener
        │
        └─ if popup blocked / no functions URL
                  → openRecordSidePanel('dealLineItem', id)
                    (current working path)
```

After upload, opener listens for `BroadcastChannel('prevyu-upload')` (and `postMessage` fallback) with `{ type: 'uploaded', lineItemId }`, then invalidates/refetches line-item queries so the chip turns green (`Превью · N`).

## Architecture

| Piece | Responsibility |
|-------|----------------|
| Logic function `prevyu-upload` | `GET` → self-contained HTML; `POST` → accept image, upload file, PATCH `prevyuOkleyki` |
| Short-lived upload token (optional hardening) | Minted by authenticated board call or derived from session; avoids putting long-lived app token in the URL |
| `PrevyuOkleykiCell` / Okleyka dialog | `window.open` helper + fallback to side panel; listen for upload events |
| Existing `prevyuOkleyki` field | Storage unchanged (`maxNumberOfValues: 6`) |

### HTTP surface (sketch)

- **GET** `/prevyu-upload/:lineItemId`  
  - Auth: workspace session and/or one-time token query param  
  - Response: `text/html` page (inline CSS/JS, no Remote DOM)  
  - Page loads current file list (embedded JSON or secondary fetch)

- **POST** `/prevyu-upload/:lineItemId`  
  - Body: multipart file **or** JSON `{ filename, contentType, dataBase64 }` (prefer whatever Twenty LF handlers decode reliably)  
  - Server: upload via app API client into FILES for `prevyuOkleyki`, merge into existing array (cap 6), update record  
  - Response: `{ ok: true, files: [...] }`

Exact public base URL follows existing app pattern (`TWENTY_FUNCTIONS_URL` + path), same family as `/crmparser/...` routes.

### HTML page UX (minimal)

- Title: «Превью оклейки» + line item name if available  
- Dominant paste zone: «Вставьте скриншот (Ctrl+V)»  
- Secondary: file input button  
- Thumbs of attached images; optional remove later (MVP: upload + list; remove can stay in card)  
- Status line: idle / uploading / error / success  
- Footer: «Готово» closes window  

### Board integration

```ts
openPrevyuUploadWindow(lineItemId: string): 'opened' | 'fallback-side-panel'
```

1. Resolve `TWENTY_FUNCTIONS_URL` (already used by crmparser helpers).  
2. Attempt `window.open` with a named window features string (`width≈480,height≈560`).  
3. On failure → `openRecordSidePanel('dealLineItem', lineItemId)`.  
4. Subscribe to BroadcastChannel until window closes or timeout.

Wire from:

- `PrevyuOkleykiCell` primary chip click  
- Okleyka dialog «Добавить фото» / «Фото в карточке» → prefer window; keep side-panel as secondary link if needed

## Auth & security

- Prefer **user session** on same-origin function routes (`isAuthRequired: true`) when opening in a real browser tab/window.  
- If cookie auth on function GET is unreliable, mint a **short-lived upload token** (TTL minutes, bound to `lineItemId` + user/workspace) via an authenticated POST from the board, pass as query param; validate on GET/POST.  
- Never put `TWENTY_APP_ACCESS_TOKEN` in the window URL.  
- Validate `lineItemId` exists; only append to `prevyuOkleyki`; enforce image content types and max count.

## Errors

| Case | Behavior |
|------|----------|
| Popup blocked | Fallback side panel + short toast/hint |
| Functions URL missing | Fallback side panel |
| Paste with no image | Inline «В буфере нет картинки» |
| Upload / PATCH failure | Inline error; window stays open |
| Max files (6) | Reject with clear message |
| Opener gone | Window still saves; user closes manually |

## Verification gate (required before «готово»)

1. `yarn twenty apply`  
2. On localhost Реализация: click «Превью» → window opens  
3. Copy a screenshot → Ctrl+V in the window → file appears in thumbs  
4. Close → chip shows `Превью · N` without manual card hunting  
5. With popups blocked: side-panel fallback still works  

## Success criteria

1. Ctrl+V in the popup attaches an image to `prevyuOkleyki` without opening the record card.  
2. Chip/dialog entry points use the popup; fallback remains when popup cannot open.  
3. No regression to native card FILES upload.  
4. Live browser test on local Twenty passed (not assumed).

## Open implementation notes

- Confirm whether LF `Response` may return HTML with `Content-Type: text/html` on this Twenty version; if not, serve HTML via public asset + tokenized POST only.  
- Confirm multipart vs base64 body support in LF `RoutePayload`.  
- Confirm `window.open` availability from Remote DOM host bindings; if blocked, use `<a target="_blank" rel="noopener">` click fallback.
