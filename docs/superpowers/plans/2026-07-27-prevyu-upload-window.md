# Prevyu Upload Window Implementation Plan

> **Status: Deferred — not shipping.** Remote DOM cannot open windows / reliably read file bytes. Kept for later research. Board uses side-panel FILES for now.

> **For agentic workers:** Do not execute unless status is re-opened. REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open a separate browser window (logic-function HTML outside Remote DOM) where Ctrl+V uploads images into `dealLineItem.prevyuOkleyki`, then refresh the board chip.

**Architecture:** Two HTTP logic functions on `/prevyu-upload/:lineItemId` — GET returns a self-contained HTML paste page; POST accepts base64 JSON, uploads via `CoreApiClient.uploadFile`, merges into `prevyuOkleyki`, PATCHes the record. Board chip/dialog call `openPrevyuUploadWindow`; on popup failure fall back to `openRecordSidePanel`. Opener listens on `BroadcastChannel('prevyu-upload')`.

**Tech Stack:** Twenty SDK `defineLogicFunction` + `Response`, `twenty-client-sdk/core` `CoreApiClient`, existing `mergePrevyuFiles` / field UUID, Vitest, deals-board React.

**Spec:** `docs/superpowers/specs/2026-07-27-prevyu-upload-window-design.md`

## Global Constraints

- Ctrl+V in the popup is required; do not claim done without a live localhost paste test.
- Do not put `TWENTY_APP_ACCESS_TOKEN` in the window URL.
- Persist only to `prevyuOkleyki` (cap 6); image types only.
- Keep side-panel fallback when popup/functions URL unavailable.
- All new UUIDs must be UUID v4 (use the constants below).
- Commits only when the user explicitly asks (skip commit steps otherwise).
- After LF/front changes: `yarn twenty apply`, then hard-refresh UI.

## File map

| Path | Role |
|------|------|
| `src/constants/universal-identifiers.ts` | LF UUIDs |
| `src/logic-functions/shared/prevyu-upload-html.ts` | HTML document string builder |
| `src/logic-functions/shared/prevyu-upload-service.ts` | Parse body, upload+merge+patch helpers (unit-tested) |
| `src/logic-functions/prevyu-upload-page.ts` | GET handler → HTML |
| `src/logic-functions/prevyu-upload.ts` | POST handler → JSON |
| `src/deals-board/utils/open-prevyu-upload-window.ts` | `window.open` / `<a target=_blank>` + BroadcastChannel + fallback |
| `src/deals-board/utils/open-prevyu-upload-window.test.ts` | Pure URL/fallback unit tests |
| `src/deals-board/editors/PrevyuOkleykiCell.tsx` | Chip opens upload window |
| `src/deals-board/ui/OkleykaMessageDialog.tsx` | «Добавить фото» opens upload window |

## Constants (use exactly)

```ts
export const PREVYU_UPLOAD_PAGE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER =
  'e7b3c1a4-5d6e-4f8a-9b0c-1d2e3f4a5b6c';
export const PREVYU_UPLOAD_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER =
  'f8c4d2b5-6e7f-4a9b-8c1d-2e3f4a5b6c7d';
```

HTTP path (both methods): `/prevyu-upload/:lineItemId`  
Public URL from board: `${TWENTY_FUNCTIONS_URL}/prevyu-upload/${lineItemId}` (same base as crmparser).

---

### Task 1: Upload service helpers (pure + mockable client)

**Files:**
- Create: `src/logic-functions/shared/prevyu-upload-service.ts`
- Create: `src/logic-functions/shared/prevyu-upload-service.test.ts`

**Interfaces:**
- Consumes: `mergePrevyuFiles`, `PREVYU_UPLOAD_MAX_FILES`, `DEAL_LINE_ITEM_PREVYU_OKLEYKI_FIELD_UNIVERSAL_IDENTIFIER` from deals-board/api/files-field + universal-identifiers (import from `src/...` like other LF files).
- Produces:
  - `PrevyuUploadPostBody = { filename?: string; contentType?: string; dataBase64: string }`
  - `parsePrevyuUploadBody(body: unknown): PrevyuUploadPostBody | { error: string }`
  - `decodePrevyuUploadBytes(body: PrevyuUploadPostBody): { buffer: Buffer; filename: string; contentType: string } | { error: string }`
  - `buildNextPrevyuFiles(current: { fileId: string; label?: string }[] | null | undefined, uploaded: { id: string; url?: string }, filename: string)`
  - `isAllowedPrevyuContentType(contentType: string, filename: string): boolean`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest';

import {
  buildNextPrevyuFiles,
  decodePrevyuUploadBytes,
  isAllowedPrevyuContentType,
  parsePrevyuUploadBody,
} from './prevyu-upload-service';

describe('parsePrevyuUploadBody', () => {
  it('accepts dataBase64', () => {
    expect(parsePrevyuUploadBody({ dataBase64: 'YWJj', filename: 'a.png' })).toEqual({
      dataBase64: 'YWJj',
      filename: 'a.png',
      contentType: undefined,
    });
  });

  it('rejects missing data', () => {
    expect(parsePrevyuUploadBody({})).toEqual({ error: 'Missing dataBase64' });
  });
});

describe('decodePrevyuUploadBytes', () => {
  it('decodes base64 to buffer', () => {
    const result = decodePrevyuUploadBytes({
      dataBase64: Buffer.from([1, 2, 3]).toString('base64'),
      filename: 'x.png',
      contentType: 'image/png',
    });
    expect('buffer' in result && result.buffer.equals(Buffer.from([1, 2, 3]))).toBe(true);
  });
});

describe('isAllowedPrevyuContentType', () => {
  it('allows images', () => {
    expect(isAllowedPrevyuContentType('image/png', 'a.png')).toBe(true);
    expect(isAllowedPrevyuContentType('text/plain', 'a.txt')).toBe(false);
  });
});

describe('buildNextPrevyuFiles', () => {
  it('appends uploaded file ref with url label', () => {
    expect(
      buildNextPrevyuFiles([], { id: 'f1', url: 'https://cdn/x.png' }, 'shot.png'),
    ).toEqual([{ fileId: 'f1', label: 'https://cdn/x.png' }]);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `yarn vitest run src/logic-functions/shared/prevyu-upload-service.test.ts`  
Expected: module not found / FAIL

- [ ] **Step 3: Implement service**

```ts
import { Buffer } from 'node:buffer';

import {
  mergePrevyuFiles,
  PREVYU_UPLOAD_MAX_FILES,
} from 'src/deals-board/api/files-field';

export type PrevyuUploadPostBody = {
  filename?: string;
  contentType?: string;
  dataBase64: string;
};

export const parsePrevyuUploadBody = (
  body: unknown,
): PrevyuUploadPostBody | { error: string } => {
  if (!body || typeof body !== 'object') return { error: 'Missing dataBase64' };
  const record = body as Record<string, unknown>;
  if (typeof record.dataBase64 !== 'string' || !record.dataBase64) {
    return { error: 'Missing dataBase64' };
  }
  return {
    dataBase64: record.dataBase64,
    filename: typeof record.filename === 'string' ? record.filename : undefined,
    contentType: typeof record.contentType === 'string' ? record.contentType : undefined,
  };
};

export const isAllowedPrevyuContentType = (contentType: string, filename: string): boolean => {
  if (contentType.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(filename);
};

export const decodePrevyuUploadBytes = (
  body: PrevyuUploadPostBody,
): { buffer: Buffer; filename: string; contentType: string } | { error: string } => {
  let buffer: Buffer;
  try {
    buffer = Buffer.from(body.dataBase64, 'base64');
  } catch {
    return { error: 'Invalid dataBase64' };
  }
  if (!buffer.byteLength) return { error: 'Empty file' };
  const filename = body.filename?.trim() || `prevyu-${Date.now()}.png`;
  const contentType = body.contentType?.trim() || 'image/png';
  if (!isAllowedPrevyuContentType(contentType, filename)) {
    return { error: 'Only images are allowed' };
  }
  return { buffer, filename, contentType };
};

export const buildNextPrevyuFiles = (
  current: { fileId: string; label?: string }[] | null | undefined,
  uploaded: { id: string; url?: string },
  filename: string,
) => {
  const next = mergePrevyuFiles(current, {
    fileId: uploaded.id,
    label: uploaded.url || filename,
  });
  if ((current?.length ?? 0) >= PREVYU_UPLOAD_MAX_FILES) {
    return current ?? [];
  }
  return next;
};
```

Note: `mergePrevyuFiles` already caps at 6 by slicing; for “at max reject upload” in POST handler, check `(current?.length ?? 0) >= PREVYU_UPLOAD_MAX_FILES` **before** upload and return 400.

- [ ] **Step 4: Run tests — expect PASS**

Run: `yarn vitest run src/logic-functions/shared/prevyu-upload-service.test.ts`  
Expected: PASS

---

### Task 2: HTML page builder

**Files:**
- Create: `src/logic-functions/shared/prevyu-upload-html.ts`
- Create: `src/logic-functions/shared/prevyu-upload-html.test.ts`

**Interfaces:**
- Produces: `buildPrevyuUploadHtml(opts: { lineItemId: string; lineItemName: string; files: { fileId: string; label?: string }[] }): string`

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from 'vitest';

import { buildPrevyuUploadHtml } from './prevyu-upload-html';

describe('buildPrevyuUploadHtml', () => {
  it('embeds line item id and paste instructions', () => {
    const html = buildPrevyuUploadHtml({
      lineItemId: 'li-1',
      lineItemName: 'Фотобудка',
      files: [],
    });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('li-1');
    expect(html).toContain('Ctrl+V');
    expect(html).toContain('Фотобудка');
    expect(html).toContain('prevyu-upload');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement HTML**

Self-contained page (inline CSS + JS). Requirements inside the string:

1. Title «Превью оклейки» + name  
2. Large paste zone focused on load (`tabIndex=0`, autofocus)  
3. `paste` listener: read `clipboardData.files` / items → FileReader → `readAsDataURL` → strip `data:*;base64,` → `POST` same path as `location.pathname` (or `/s/prevyu-upload/${id}` if pathname is odd) with JSON `{ filename, contentType, dataBase64 }` and `credentials: 'include'`  
4. Also `keydown` for Ctrl+V reminder; optional `<input type=file accept="image/*">`  
5. On success: update thumbs; `new BroadcastChannel('prevyu-upload').postMessage({ type: 'uploaded', lineItemId })`; try `window.opener?.postMessage(...)`  
6. Button «Готово» → `window.close()`  
7. Status element for errors  

Keep CSS minimal dark panel consistent with board (bg `#1a1a1a`, accent blue). No external assets.

- [ ] **Step 4: Run — expect PASS**

---

### Task 3: GET + POST logic functions

**Files:**
- Create: `src/logic-functions/prevyu-upload-page.ts`
- Create: `src/logic-functions/prevyu-upload.ts`
- Modify: `src/constants/universal-identifiers.ts` (add the two UUIDs)

**Interfaces:**
- Consumes: `buildPrevyuUploadHtml`, parse/decode/buildNext helpers, `CoreApiClient`, `Response` from `twenty-sdk/logic-function`
- Produces: HTTP routes GET/POST `/prevyu-upload/:lineItemId`, `isAuthRequired: true`

- [ ] **Step 1: Add UUID exports**

- [ ] **Step 2: Implement GET page**

```ts
import { defineLogicFunction } from 'twenty-sdk/define';
import { Response, type RoutePayload } from 'twenty-sdk/logic-function';
import { CoreApiClient } from 'twenty-client-sdk/core';

import { PREVYU_UPLOAD_PAGE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { buildPrevyuUploadHtml } from './shared/prevyu-upload-html';

const handler = async (event: RoutePayload) => {
  const lineItemId = event.pathParameters?.lineItemId?.trim();
  if (!lineItemId) {
    return new Response('Missing lineItemId', { status: 400, headers: { 'Content-Type': 'text/plain' } });
  }

  const client = new CoreApiClient();
  let lineItemName = '';
  let files: { fileId: string; label?: string }[] = [];
  try {
    const row = await client.get<Record<string, unknown>>(`/rest/dealLineItems/${lineItemId}`);
    const data =
      (row?.data as Record<string, unknown> | undefined)?.dealLineItem ??
      row?.dealLineItem ??
      row;
    const record = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    lineItemName = typeof record.name === 'string' ? record.name : '';
    const raw = record.prevyuOkleyki;
    if (Array.isArray(raw)) {
      files = raw.filter((f) => f && typeof f === 'object') as { fileId: string; label?: string }[];
    }
  } catch {
    // still render page; upload may fail later if id invalid
  }

  const html = buildPrevyuUploadHtml({ lineItemId, lineItemName, files });
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};

export default defineLogicFunction({
  universalIdentifier: PREVYU_UPLOAD_PAGE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'prevyu-upload-page',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: '/prevyu-upload/:lineItemId',
    httpMethod: 'GET',
    isAuthRequired: true,
  },
});
```

If `CoreApiClient` in this repo has no `.get`, use the same pattern as front `getApiClient()` / GraphQL `findOne` — match whatever the generated client exposes (inspect `.twenty` generated client or existing LF usage). Prefer REST if available like the board.

- [ ] **Step 3: Implement POST upload**

```ts
// prevyu-upload.ts — sketch
// 1. parse path lineItemId
// 2. parsePrevyuUploadBody(event.body)
// 3. decodePrevyuUploadBytes
// 4. load current prevyuOkleyki; if length >= 6 → 400
// 5. client.uploadFile(buffer, filename, contentType, DEAL_LINE_ITEM_PREVYU_OKLEYKI_FIELD_UNIVERSAL_IDENTIFIER)
// 6. next = buildNextPrevyuFiles(current, uploaded, filename)
// 7. client.patch(`/rest/dealLineItems/${id}`, { prevyuOkleyki: next })
// 8. return new Response({ ok: true, files: next }, { status: 200, headers: { 'Content-Type': 'application/json' } })
```

Use `uploadFile` on the same client class the board uses (`CoreApiClient` from `twenty-client-sdk/core` already has `uploadFile` in this repo).

- [ ] **Step 4: `yarn twenty apply`**

Expected: both logic functions registered; no typecheck errors.

- [ ] **Step 5: Manual smoke (browser)**

Open while logged in:  
`http://localhost:2020` → resolve functions base from board env or try `/s/prevyu-upload/<realLineItemId>`  
Expected: HTML page renders (adjust path if apply output shows the real prefix).

---

### Task 4: Board `openPrevyuUploadWindow`

**Files:**
- Create: `src/deals-board/utils/open-prevyu-upload-window.ts`
- Create: `src/deals-board/utils/open-prevyu-upload-window.test.ts`
- Modify: `src/deals-board/api/crmparser.ts` **or** duplicate tiny `getFunctionsBaseUrl` helper into the new util (prefer extracting shared `getTwentyFunctionsBaseUrl()` used by both to avoid drift)

**Interfaces:**
- Produces:
  - `buildPrevyuUploadWindowUrl(baseUrl: string, lineItemId: string): string`
  - `openPrevyuUploadWindow(lineItemId: string): 'opened' | 'fallback-side-panel'`
  - `subscribePrevyuUpload(lineItemId: string, onUploaded: () => void): () => void`

- [ ] **Step 1: Tests**

```ts
import { describe, expect, it } from 'vitest';

import { buildPrevyuUploadWindowUrl } from './open-prevyu-upload-window';

describe('buildPrevyuUploadWindowUrl', () => {
  it('joins base and path', () => {
    expect(buildPrevyuUploadWindowUrl('https://t.test/functions', 'abc')).toBe(
      'https://t.test/functions/prevyu-upload/abc',
    );
    expect(buildPrevyuUploadWindowUrl('https://t.test/functions/', 'abc')).toBe(
      'https://t.test/functions/prevyu-upload/abc',
    );
  });
});
```

- [ ] **Step 2: Implement**

```ts
import { openRecordSidePanel } from './open-record-side-panel';

const CHANNEL = 'prevyu-upload';

export const buildPrevyuUploadWindowUrl = (baseUrl: string, lineItemId: string): string =>
  `${baseUrl.replace(/\/$/, '')}/prevyu-upload/${encodeURIComponent(lineItemId)}`;

const readFunctionsBaseUrl = (): string | null => {
  const base = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env?.TWENTY_FUNCTIONS_URL?.trim()
    .replace(/\/$/, '');
  return base || null;
};

export const openPrevyuUploadWindow = (
  lineItemId: string,
): 'opened' | 'fallback-side-panel' => {
  const base = readFunctionsBaseUrl();
  if (!base) {
    openRecordSidePanel('dealLineItem', lineItemId);
    return 'fallback-side-panel';
  }

  const url = buildPrevyuUploadWindowUrl(base, lineItemId);
  const features = 'popup=yes,width=480,height=560,noopener=no';

  let opened: Window | null = null;
  try {
    const w = globalThis as { open?: (url?: string, target?: string, features?: string) => Window | null };
    opened = typeof w.open === 'function' ? w.open(url, `prevyu-${lineItemId}`, features) : null;
  } catch {
    opened = null;
  }

  if (!opened || opened.closed) {
    // <a target=_blank> fallback
    try {
      const doc = (globalThis as { document?: Document }).document;
      if (doc?.createElement) {
        const a = doc.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener';
        doc.body?.appendChild(a);
        a.click();
        a.remove();
        return 'opened';
      }
    } catch {
      // fall through
    }
    openRecordSidePanel('dealLineItem', lineItemId);
    return 'fallback-side-panel';
  }

  return 'opened';
};

export const subscribePrevyuUpload = (
  lineItemId: string,
  onUploaded: () => void,
): (() => void) => {
  const BroadcastChannelCtor = (
    globalThis as { BroadcastChannel?: typeof BroadcastChannel }
  ).BroadcastChannel;
  if (!BroadcastChannelCtor) return () => undefined;

  const channel = new BroadcastChannelCtor(CHANNEL);
  const onMessage = (event: MessageEvent) => {
    const data = event.data as { type?: string; lineItemId?: string } | null;
    if (data?.type === 'uploaded' && data.lineItemId === lineItemId) onUploaded();
  };
  channel.addEventListener('message', onMessage);

  const onWindowMessage = (event: MessageEvent) => {
    const data = event.data as { type?: string; lineItemId?: string; channel?: string } | null;
    if (data?.channel === CHANNEL && data.type === 'uploaded' && data.lineItemId === lineItemId) {
      onUploaded();
    }
  };
  globalThis.addEventListener?.('message', onWindowMessage);

  return () => {
    channel.removeEventListener('message', onMessage);
    channel.close();
    globalThis.removeEventListener?.('message', onWindowMessage);
  };
};
```

- [ ] **Step 3: Run unit tests — PASS**

---

### Task 5: Wire cell + Okleyka dialog

**Files:**
- Modify: `src/deals-board/editors/PrevyuOkleykiCell.tsx`
- Modify: `src/deals-board/ui/OkleykaMessageDialog.tsx`

**Interfaces:**
- Consumes: `openPrevyuUploadWindow`, `subscribePrevyuUpload`
- On upload event: `queryClient.invalidateQueries({ queryKey: ['lineItems'] })` (match existing keys in `useLineItems`)

- [ ] **Step 1: Cell**

Replace `openCard` primary action:

```ts
const openUpload = () => {
  openPrevyuUploadWindow(itemId);
};

// in useEffect when mounted / when chip clicked — subscribe:
useEffect(() => {
  return subscribePrevyuUpload(itemId, () => {
    void queryClient.invalidateQueries({ queryKey: ['lineItems'] });
  });
}, [itemId, queryClient]);
```

Chip `onClick={openUpload}`. Keep title text: «Ctrl+V в окне превью». Optional small secondary control «карточка» calling `openRecordSidePanel` if you want escape hatch — not required by spec.

- [ ] **Step 2: Dialog**

«Добавить фото» / «Фото в карточке» → `openPrevyuUploadWindow(payload.lineItemId)` and subscribe to refresh `payload.lineItem.prevyuOkleyki` via invalidate + optional refetch of that line item into dialog state.

- [ ] **Step 3: `yarn twenty apply`**

---

### Task 6: Live verification gate (required)

**Files:** none (manual + Playwright if useful)

- [ ] **Step 1: Apply + hard refresh** `http://localhost:2020` login `tim@apple.dev` / `tim@apple.dev`, open Реализация

- [ ] **Step 2: Click empty «Превью»**

Expected: popup/tab with paste zone (not side panel, unless popup blocked)

- [ ] **Step 3: Copy any screenshot → Ctrl+V in the window**

Expected: thumb appears; no error

- [ ] **Step 4: Close window / Готово**

Expected: board chip becomes `Превью · N` (green) after refresh/invalidate

- [ ] **Step 5: Confirm native card still works** (side panel field) — no regression

- [ ] **Step 6: If Ctrl+V fails**

Debug before declaring done:
1. Network tab on POST — status/body  
2. Auth (401) → may need `credentials: 'include'` + same-site cookie, or temporary Bearer from a mint endpoint (only if session auth fails; do not put long-lived app token in URL)  
3. If HTML `Content-Type` stripped — fix Response headers  
4. If `window.open` always falls back — fix Remote DOM open via `<a target=_blank>`

Do **not** tell the user it works until Step 3–4 pass on localhost.

---

## Spec coverage check

| Spec item | Task |
|-----------|------|
| Separate window outside Remote DOM | 2–3 |
| Ctrl+V upload to `prevyuOkleyki` | 1–3, 6 |
| Chip / dialog entry | 5 |
| BroadcastChannel refresh | 4–5 |
| Side-panel fallback | 4 |
| No app token in URL | 4 (session auth) |
| Live test gate | 6 |
| Cap 6 / images only | 1, 3 |

## Placeholder / consistency scan

- UUIDs fixed above  
- Path `/prevyu-upload/:lineItemId` consistent  
- Channel name `prevyu-upload` consistent  
- Client: `CoreApiClient` + `uploadFile` + REST patch (same as board)
