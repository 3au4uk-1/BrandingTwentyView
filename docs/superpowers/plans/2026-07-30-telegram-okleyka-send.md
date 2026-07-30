# Telegram Okleyka Send Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** From the Okleyka dialog, «Отправить в чат» posts the approved text + photo album to Telegram via crmparserv2 hooks, with duplicate warning and CRM send log.

**Architecture:** crmparserv2 owns an event bus (`emit` / `registerHook`), Telegram Bot API outbound, SQLite audit, and Settings tab. TwentyView calls a logic-function proxy → `POST /api/twenty/telegram/events` (same `CRMPARSER_API_SECRET` pattern as list-status). Dialog replaces clipboard with that adapter.

**Tech Stack:** Node/Express + better-sqlite3 + vitest (crmparserv2); React + twenty-sdk logic functions + vitest (TwentyView); Telegram Bot HTTP API (no extra SDK required).

**Spec:** `docs/superpowers/specs/2026-07-30-telegram-okleyka-send-design.md`

## Global Constraints

- Bot lives in **crmparserv2**, not a separate repo and not as Bot-token owner inside Twenty.
- Auth: `TWENTY_APP_API_SECRET` / app setting `CRMPARSER_API_SECRET` — never expose bot token to the browser.
- UI: replace «Копировать» with «Отправить в чат» (no clipboard path in MVP).
- Duplicate: warn + confirm; resend only with `force: true`.
- Same bot for staging/prod; implement and bake on **staging** first.
- Caption ≤ 1024 on first album item; if longer, `sendMessage` then album without caption.
- Zero photos: text-only send allowed.
- All new Twenty UUIDs must be UUID v4 — use the constants listed in Task 6 (do not regenerate).
- Commits only when the user explicitly asks (skip commit steps otherwise).
- Work in both repos: paths under `crmparserv2/` vs TwentyView `src/` — keep cwd clear per task.

## File map

### crmparserv2

| Path | Role |
|------|------|
| `backend/src/telegram/hooks.js` | `registerHook` / `listHooks` / `clearHooksForTests` |
| `backend/src/telegram/dispatcher.js` | `emit(event, ctx)` |
| `backend/src/telegram/settings.js` | read token + chat map |
| `backend/src/telegram/send-log.js` | alreadySent + insert |
| `backend/src/telegram/outbound.js` | download URLs + Bot API album/text |
| `backend/src/telegram/crm-log.js` | PATCH Twenty line-item send fields |
| `backend/src/telegram/register-default-hooks.js` | wire extension hooks at boot |
| `backend/src/telegram/inbound.js` | webhook stub |
| `backend/src/telegram/handle-okleyka-send.js` | orchestration for `okleyka.send` |
| `backend/src/routes/telegram.js` | admin test + webhook |
| `backend/src/routes/twenty.js` | `POST /telegram/events` |
| `backend/src/db/migrate.js` + `schema.sql` | `telegram_send_log` + settings defaults |
| `backend/src/index.js` | mount routes + register hooks |
| `frontend/src/pages/Settings.jsx` | tab «Telegram» |
| `frontend/src/api.js` | telegram test hooks |
| `backend/tests/telegram-*.test.js` | unit tests |

### TwentyView

| Path | Role |
|------|------|
| `src/fields/okleyka-telegram-sent-at.field.ts` (+ sent-by, chat-id) | CRM log fields |
| `src/constants/universal-identifiers.ts` | field + LF UUIDs |
| `src/logic-functions/telegram-okleyka-send.ts` | proxy to crmparser |
| `src/deals-board/api/crmparser.ts` | `sendOkleykaTelegramEvent` |
| `src/deals-board/utils/send-okleyka-payload.ts` (+ test) | adapter |
| `src/deals-board/ui/OkleykaMessageDialog.tsx` | send UX |
| `src/deals-board/types.ts` | optional typed fields on `LineItemRow` |

---

### Task 1: Hook registry + dispatcher (crmparserv2)

**Files:**
- Create: `backend/src/telegram/hooks.js`
- Create: `backend/src/telegram/dispatcher.js`
- Test: `backend/tests/telegram-dispatcher.test.js`

**Interfaces:**
- Produces:
  - `registerHook(event: string, handler: (ctx) => Promise<void> | void): void`
  - `listHooks(event: string): Function[]`
  - `clearHooksForTests(): void`
  - `emit(event: string, ctx: object): Promise<object>` — runs handlers in order; returns `ctx` (handlers may mutate `ctx.result`)

- [ ] **Step 1: Write the failing test**

```js
import { beforeEach, describe, expect, it } from 'vitest';
import { clearHooksForTests, listHooks, registerHook } from '../src/telegram/hooks.js';
import { emit } from '../src/telegram/dispatcher.js';

describe('telegram dispatcher', () => {
  beforeEach(() => clearHooksForTests());

  it('runs hooks in registration order and shares ctx', async () => {
    const order = [];
    registerHook('okleyka.send', async (ctx) => {
      order.push('a');
      ctx.mark = 'from-a';
    });
    registerHook('okleyka.send', async (ctx) => {
      order.push('b');
      ctx.result = { ok: true, from: ctx.mark };
    });
    const ctx = await emit('okleyka.send', { lineItemId: 'li-1' });
    expect(order).toEqual(['a', 'b']);
    expect(listHooks('okleyka.send')).toHaveLength(2);
    expect(ctx.result).toEqual({ ok: true, from: 'from-a' });
  });

  it('no-ops when no hooks registered', async () => {
    const ctx = await emit('unknown', { x: 1 });
    expect(ctx).toEqual({ x: 1 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (cwd `crmparserv2/backend`): `npm test -- telegram-dispatcher.test.js`  
Expected: FAIL — module not found

- [ ] **Step 3: Implement hooks + dispatcher**

`hooks.js`:

```js
const hooksByEvent = new Map();

export function registerHook(event, handler) {
  if (typeof event !== 'string' || !event.trim()) {
    throw new Error('registerHook: event required');
  }
  if (typeof handler !== 'function') {
    throw new Error('registerHook: handler must be a function');
  }
  const list = hooksByEvent.get(event) ?? [];
  list.push(handler);
  hooksByEvent.set(event, list);
}

export function listHooks(event) {
  return [...(hooksByEvent.get(event) ?? [])];
}

export function clearHooksForTests() {
  hooksByEvent.clear();
}
```

`dispatcher.js`:

```js
import { listHooks } from './hooks.js';

export async function emit(event, ctx = {}) {
  const hooks = listHooks(event);
  for (const hook of hooks) {
    await hook(ctx);
  }
  return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- telegram-dispatcher.test.js`  
Expected: PASS

- [ ] **Step 5: Commit** (only if user asked)

```bash
git add backend/src/telegram/hooks.js backend/src/telegram/dispatcher.js backend/tests/telegram-dispatcher.test.js
git commit -m "feat(telegram): add event hook registry and dispatcher"
```

---

### Task 2: Settings helpers + send log schema (crmparserv2)

**Files:**
- Create: `backend/src/telegram/settings.js`
- Create: `backend/src/telegram/send-log.js`
- Modify: `backend/src/db/migrate.js` (end of `migrate()`, before return)
- Modify: `backend/src/db/schema.sql` (table + INSERT OR IGNORE defaults)
- Test: `backend/tests/telegram-send-log.test.js`

**Interfaces:**
- Produces:
  - `getTelegramBotToken(db): string`
  - `getTelegramChatId(db, event): string` — from `telegram_chat_map` JSON
  - `findLastSend(db, event, lineItemId): row | undefined`
  - `insertSendLog(db, row): number` — lastInsertRowid
  - `hashOkleykaPayload(text, fileUrls): string`
  - Settings keys: `telegram_bot_token`, `telegram_chat_map` (default `'{"okleyka.send":""}'`), `telegram_webhook_secret` (`''`)

- [ ] **Step 1: Write failing tests**

```js
import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { getTelegramBotToken, getTelegramChatId } from '../src/telegram/settings.js';
import { findLastSend, insertSendLog } from '../src/telegram/send-log.js';

function memoryDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE telegram_send_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event TEXT NOT NULL,
      line_item_id TEXT NOT NULL,
      opportunity_id TEXT,
      chat_id TEXT,
      sent_by TEXT,
      payload_hash TEXT,
      telegram_message_ids TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX idx_telegram_send_log_event_line
      ON telegram_send_log(event, line_item_id);
  `);
  return db;
}

describe('telegram settings + send-log', () => {
  let db;
  beforeEach(() => {
    db = memoryDb();
    db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)`).run(
      'telegram_bot_token',
      'tok-1',
    );
    db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)`).run(
      'telegram_chat_map',
      JSON.stringify({ 'okleyka.send': '-100123' }),
    );
  });

  it('reads token and chat id', () => {
    expect(getTelegramBotToken(db)).toBe('tok-1');
    expect(getTelegramChatId(db, 'okleyka.send')).toBe('-100123');
    expect(getTelegramChatId(db, 'other')).toBe('');
  });

  it('tracks last send per event+lineItem', () => {
    expect(findLastSend(db, 'okleyka.send', 'li-1')).toBeUndefined();
    insertSendLog(db, {
      event: 'okleyka.send',
      lineItemId: 'li-1',
      opportunityId: 'opp-1',
      chatId: '-100123',
      sentBy: 'Ann',
      payloadHash: 'abc',
      telegramMessageIds: [1, 2],
    });
    const last = findLastSend(db, 'okleyka.send', 'li-1');
    expect(last.line_item_id).toBe('li-1');
    expect(JSON.parse(last.telegram_message_ids)).toEqual([1, 2]);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

`npm test -- telegram-send-log.test.js`

- [ ] **Step 3: Implement settings + send-log + migrate**

`settings.js`:

```js
export function getTelegramBotToken(db) {
  const row = db.prepare(`SELECT value FROM settings WHERE key = 'telegram_bot_token'`).get();
  return (row?.value ?? '').trim();
}

export function getTelegramChatId(db, event) {
  const row = db.prepare(`SELECT value FROM settings WHERE key = 'telegram_chat_map'`).get();
  if (!row?.value) return '';
  try {
    const map = JSON.parse(row.value);
    return String(map?.[event] ?? '').trim();
  } catch {
    return '';
  }
}
```

`send-log.js`:

```js
import crypto from 'crypto';

export function hashOkleykaPayload(text, fileUrls) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({ text: text ?? '', fileUrls: fileUrls ?? [] }))
    .digest('hex');
}

export function findLastSend(db, event, lineItemId) {
  return db
    .prepare(
      `SELECT * FROM telegram_send_log
       WHERE event = ? AND line_item_id = ?
       ORDER BY id DESC LIMIT 1`,
    )
    .get(event, lineItemId);
}

export function insertSendLog(db, {
  event,
  lineItemId,
  opportunityId,
  chatId,
  sentBy,
  payloadHash,
  telegramMessageIds,
}) {
  const info = db
    .prepare(
      `INSERT INTO telegram_send_log
        (event, line_item_id, opportunity_id, chat_id, sent_by, payload_hash, telegram_message_ids)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      event,
      lineItemId,
      opportunityId ?? null,
      chatId ?? null,
      sentBy ?? null,
      payloadHash ?? null,
      JSON.stringify(telegramMessageIds ?? []),
    );
  return Number(info.lastInsertRowid);
}
```

In `migrate()` add:

```js
  db.exec(`
    CREATE TABLE IF NOT EXISTS telegram_send_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event TEXT NOT NULL,
      line_item_id TEXT NOT NULL,
      opportunity_id TEXT,
      chat_id TEXT,
      sent_by TEXT,
      payload_hash TEXT,
      telegram_message_ids TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_telegram_send_log_event_line
     ON telegram_send_log(event, line_item_id);`,
  );

  const telegramDefaults = [
    ['telegram_bot_token', ''],
    ['telegram_chat_map', '{"okleyka.send":""}'],
    ['telegram_webhook_secret', ''],
  ];
  const upsertSetting = db.prepare(
    `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`,
  );
  for (const [key, value] of telegramDefaults) upsertSetting.run(key, value);
```

Mirror the same `CREATE TABLE` + defaults in `schema.sql`.

- [ ] **Step 4: Tests PASS** — `npm test -- telegram-send-log.test.js`

---

### Task 3: Outbound Telegram client (crmparserv2)

**Files:**
- Create: `backend/src/telegram/outbound.js`
- Test: `backend/tests/telegram-outbound.test.js`

**Interfaces:**
- Produces:
  - `splitCaption(text: string): { caption: string | null, separateMessage: string | null }` — if `text.length <= 1024` → caption=text, separateMessage=null; else separateMessage=text, caption=null
  - `sendOkleykaToTelegram({ token, chatId, text, fileUrls, fetchImpl? }): Promise<{ messageIds: number[], warning?: string }>`
  - Downloads each URL; skips failed downloads and accumulates `warning`; if no buffers left → `sendMessage`; else media group

- [ ] **Step 1: Failing tests for caption split + send paths**

```js
import { describe, expect, it, vi } from 'vitest';
import { sendOkleykaToTelegram, splitCaption } from '../src/telegram/outbound.js';

describe('splitCaption', () => {
  it('keeps short text as caption', () => {
    expect(splitCaption('hello')).toEqual({ caption: 'hello', separateMessage: null });
  });
  it('splits long text', () => {
    const long = 'x'.repeat(1025);
    expect(splitCaption(long)).toEqual({ caption: null, separateMessage: long });
  });
});

describe('sendOkleykaToTelegram', () => {
  it('sends text-only when no fileUrls', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 42 } }),
    }));
    const result = await sendOkleykaToTelegram({
      token: 't',
      chatId: '-1',
      text: 'Заказ: 1',
      fileUrls: [],
      fetchImpl,
    });
    expect(result.messageIds).toEqual([42]);
    expect(String(fetchImpl.mock.calls[0][0])).toContain('sendMessage');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `outbound.js`**

Core rules from spec:
1. `splitCaption(text)`
2. For each `fileUrl`, `fetchImpl(url)` → arrayBuffer; on failure push warning, continue
3. If no files: `POST https://api.telegram.org/bot${token}/sendMessage` JSON `{ chat_id, text }`
4. If files: if `separateMessage`, sendMessage first; then `sendMediaGroup` with `media` JSON and file attachments (`photo` type). Caption only on first item when `caption` non-null
5. Parse `result` message_id(s); throw Error with `err.status = 502` if Telegram `ok: false`

Use global `fetch` by default (`fetchImpl = globalThis.fetch`) so tests inject mocks.

Keep implementation focused (~100–150 lines). Prefer fetch FormData for multipart; axios is fine if multipart is clearer.

- [ ] **Step 4: Tests PASS**

---

### Task 4: handleOkleykaSend + CRM patch + default hooks + twenty route

**Files:**
- Create: `backend/src/telegram/crm-log.js`
- Create: `backend/src/telegram/handle-okleyka-send.js`
- Create: `backend/src/telegram/register-default-hooks.js`
- Modify: `backend/src/routes/twenty.js` — add POST `/telegram/events`
- Modify: `backend/src/index.js` — call `registerDefaultTelegramHooks()` at start
- Test: `backend/tests/telegram-okleyka-send.test.js`

**Interfaces:**
- Consumes: settings, send-log, outbound
- Produces:
  - `handleOkleykaSend(db, body, deps?): Promise<responseBody>`
  - `patchOkleykaTelegramFields({ lineItemId, sentAt, sentBy, chatId }): Promise<void>` — GraphQL `updateDealLineItem` via existing `gql` + Twenty config (mirror `updateDealLineItemPrintSheet`)
  - Route body: `event === 'okleyka.send'`, `lineItemId`, `text` (string), `fileUrls` array (default `[]`), `force` boolean, optional `opportunityId`, `sentBy`

Response contract:

```js
// success
{ ok: true, messageIds: number[], loggedAt: string, warning?: string }
// duplicate
{ ok: false, alreadySent: true, lastSentAt: string }
```

- [ ] **Step 1: Failing orchestration test**

```js
import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearHooksForTests } from '../src/telegram/hooks.js';
import { handleOkleykaSend } from '../src/telegram/handle-okleyka-send.js';

function memoryDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE telegram_send_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event TEXT NOT NULL,
      line_item_id TEXT NOT NULL,
      opportunity_id TEXT,
      chat_id TEXT,
      sent_by TEXT,
      payload_hash TEXT,
      telegram_message_ids TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.prepare(`INSERT INTO settings VALUES ('telegram_bot_token', 'tok')`).run();
  db.prepare(
    `INSERT INTO settings VALUES ('telegram_chat_map', ?)`,
  ).run(JSON.stringify({ 'okleyka.send': '-1001' }));
  return db;
}

describe('handleOkleykaSend', () => {
  beforeEach(() => clearHooksForTests());

  it('returns alreadySent without calling telegram when log exists', async () => {
    const db = memoryDb();
    db.prepare(
      `INSERT INTO telegram_send_log (event, line_item_id, chat_id, telegram_message_ids)
       VALUES ('okleyka.send', 'li-1', '-1001', '[1]')`,
    ).run();
    const send = vi.fn();
    const patch = vi.fn();
    const result = await handleOkleykaSend(
      db,
      {
        event: 'okleyka.send',
        lineItemId: 'li-1',
        text: 'x',
        fileUrls: [],
        force: false,
      },
      { sendOkleykaToTelegram: send, patchOkleykaTelegramFields: patch },
    );
    expect(result.alreadySent).toBe(true);
    expect(send).not.toHaveBeenCalled();
  });

  it('sends, logs, and patches on success', async () => {
    const db = memoryDb();
    const send = vi.fn(async () => ({ messageIds: [7] }));
    const patch = vi.fn(async () => {});
    const result = await handleOkleykaSend(
      db,
      {
        event: 'okleyka.send',
        lineItemId: 'li-2',
        opportunityId: 'opp-2',
        text: 'Заказ: t',
        fileUrls: [],
        sentBy: { name: 'Ann' },
        force: false,
      },
      { sendOkleykaToTelegram: send, patchOkleykaTelegramFields: patch },
    );
    expect(result.ok).toBe(true);
    expect(result.messageIds).toEqual([7]);
    expect(send).toHaveBeenCalledOnce();
    expect(patch).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement**

`handle-okleyka-send.js` logic:
1. Validate event/lineItemId/text
2. Load token + chatId; if missing → error with `status = 503`, message `Telegram не настроен`
3. If `findLastSend` and !force → `{ ok:false, alreadySent:true, lastSentAt: row.created_at }`
4. Call `sendOkleykaToTelegram`
5. `insertSendLog` + `patchOkleykaTelegramFields` (if patch fails: console.error, still return ok with `warning: 'crm_patch_failed'`)
6. Return success body

`crm-log.js`: GraphQL mutation updating `okleykaTelegramSentAt`, `okleykaTelegramSentBy`, `okleykaTelegramChatId` (names must match Task 6).

`twenty.js` route:

```js
import { handleOkleykaSend } from '../telegram/handle-okleyka-send.js';

router.post('/telegram/events', async (req, res, next) => {
  try {
    const db = getDb();
    const body = req.body ?? {};
    if (body.event !== 'okleyka.send') {
      return res.status(400).json({ error: `Unsupported event: ${body.event}` });
    }
    const result = await handleOkleykaSend(db, body);
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});
```

`register-default-hooks.js`:

```js
import { registerHook } from './hooks.js';

export function registerDefaultTelegramHooks() {
  // Extension points for future stage→chat / inbound handlers.
  registerHook('okleyka.send.after', async () => {});
  registerHook('telegram.inbound', async () => {});
}
```

Call from `index.js` `start()` after migrate.

- [ ] **Step 4: Tests PASS** — `npm test -- telegram-okleyka-send.test.js` then full `npm test`

---

### Task 5: Admin telegram routes + inbound stub + Settings tab (crmparserv2)

**Files:**
- Create: `backend/src/telegram/inbound.js`
- Create: `backend/src/routes/telegram.js`
- Modify: `backend/src/index.js`
- Modify: `frontend/src/api.js`
- Modify: `frontend/src/pages/Settings.jsx`

**Interfaces:**
- `GET /api/telegram/settings` → `{ tokenSet: boolean, tokenPreview: string, chatMap: object }` (never return raw token)
- `PUT /api/telegram/settings` → `{ token?: string, chatMap?: object }`
- `POST /api/telegram/test-bot` → `{ ok, username? }` via `getMe`
- `POST /api/telegram/test-send` → `{ ok }` sends «Тест из crmparser» to `okleyka.send` chat
- `POST /api/telegram/webhook` → status 501 `{ ok: false, error: 'not_implemented' }`

Mounting:
- Admin routes under `/api/telegram` **after** `appAuthMiddleware`
- Webhook: same router is fine for stub; when secret is set later, verify header/query

- [ ] **Step 1: Implement `inbound.js` + `routes/telegram.js` + mount in `index.js`**

- [ ] **Step 2: Settings UI**

Add to `TABS`: `{ id: 'telegram', label: 'Telegram' }`.

Panel:
- Bot token (password) + Save
- chat_id for `okleyka.send` + Save (merge into chatMap)
- Buttons: Проверить бота / Тест в чат
- Hint: add bot to group, obtain numeric chat_id

Wire `frontend/src/api.js` hooks with `api.get/put/post` under `/telegram/...`.

- [ ] **Step 3: Staging config** (manual, after deploy) — token + chat_id

- [ ] **Step 4: Commit** if user asked

---

### Task 6: Twenty CRM fields (TwentyView)

**Files:**
- Create: `src/fields/okleyka-telegram-sent-at.field.ts`
- Create: `src/fields/okleyka-telegram-sent-by.field.ts`
- Create: `src/fields/okleyka-telegram-chat-id.field.ts`
- Modify: `src/constants/universal-identifiers.ts`
- Modify: `src/deals-board/types.ts`

**UUIDs (fixed — do not regenerate):**
- `okleykaTelegramSentAt` → `0e67f904-f23e-42c8-901f-7fbd2259e481`
- `okleykaTelegramSentBy` → `d851e583-ac18-4c20-bed3-3e74b25be3c4`
- `okleykaTelegramChatId` → `dde8885f-949f-41d8-aa8c-5ddf6123c870`

**Interfaces:**
- Field names exactly: `okleykaTelegramSentAt` (DATE_TIME), `okleykaTelegramSentBy` (TEXT), `okleykaTelegramChatId` (TEXT)
- Prefer `yarn twenty dev:add field` then replace generated UUIDs with the fixed ones above

- [ ] **Step 1: Add identifier exports**

```ts
export const DEAL_LINE_ITEM_OKLEYKA_TELEGRAM_SENT_AT_FIELD_UNIVERSAL_IDENTIFIER =
  '0e67f904-f23e-42c8-901f-7fbd2259e481';
export const DEAL_LINE_ITEM_OKLEYKA_TELEGRAM_SENT_BY_FIELD_UNIVERSAL_IDENTIFIER =
  'd851e583-ac18-4c20-bed3-3e74b25be3c4';
export const DEAL_LINE_ITEM_OKLEYKA_TELEGRAM_CHAT_ID_FIELD_UNIVERSAL_IDENTIFIER =
  'dde8885f-949f-41d8-aa8c-5ddf6123c870';
```

- [ ] **Step 2: Field files** — mirror `prevyu-okleyki.field.ts`; labels: «Отправлено в Telegram», «Кто отправил», «Chat ID»

- [ ] **Step 3: Types** — optional `okleykaTelegramSentAt?: string | null` etc. on `LineItemRow`

- [ ] **Step 4: Confirm Task 4 `crm-log.js` uses the same GraphQL field names**

---

### Task 7: Logic function + crmparser client (TwentyView)

**Files:**
- Create: `src/logic-functions/telegram-okleyka-send.ts`
- Modify: `src/constants/universal-identifiers.ts`
- Modify: `src/deals-board/api/crmparser.ts`

**UUID:** logic function `a33a5289-569d-46e4-9598-e688b58d1c1e`

**Interfaces:**
- HTTP: `POST /crmparser/telegram/okleyka-send`, `isAuthRequired: true`
- Proxies to `/twenty/telegram/events` with body passthrough
- Client:

```ts
export type OkleykaTelegramSendBody = {
  event: 'okleyka.send';
  force?: boolean;
  lineItemId: string;
  opportunityId?: string;
  text: string;
  fileUrls: string[];
  sentBy?: { id?: string; name?: string };
};

export type OkleykaTelegramSendResult = {
  ok: boolean;
  alreadySent?: boolean;
  lastSentAt?: string;
  messageIds?: number[];
  loggedAt?: string;
  warning?: string;
  error?: string;
};

export async function sendOkleykaTelegramEvent(
  body: OkleykaTelegramSendBody,
): Promise<OkleykaTelegramSendResult> {
  return logicFunctionFetch<OkleykaTelegramSendResult>(
    `/crmparser/telegram/okleyka-send`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}
```

- [ ] **Step 1: Add LF**

```ts
import { defineLogicFunction } from 'twenty-sdk/define';
import type { RoutePayload } from 'twenty-sdk/logic-function';
import { TELEGRAM_OKLEYKA_SEND_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { crmparserProxyFetch, jsonProxyResponse } from './shared/crmparser-proxy';

const handler = async (event: RoutePayload) => {
  const raw =
    typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body ?? {});
  const { status, body } = await crmparserProxyFetch(`/twenty/telegram/events`, {
    method: 'POST',
    body: JSON.stringify(raw),
  });
  return jsonProxyResponse(status, body);
};

export default defineLogicFunction({
  universalIdentifier: TELEGRAM_OKLEYKA_SEND_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'telegram-okleyka-send',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: {
    path: '/crmparser/telegram/okleyka-send',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
```

- [ ] **Step 2: Wire `crmparser.ts` export**

- [ ] **Step 3: Existing TwentyView tests still pass**

---

### Task 8: sendOkleykaPayload adapter (TwentyView)

**Files:**
- Modify: `src/deals-board/utils/send-okleyka-payload.ts`
- Create: `src/deals-board/utils/send-okleyka-payload.test.ts`

**Interfaces:**
- Consumes: `sendOkleykaTelegramEvent`
- Produces:

```ts
export type OkleykaSendPayload = {
  text: string;
  fileUrls: string[];
  lineItemId: string;
  opportunityId?: string;
  force?: boolean;
  sentBy?: { id?: string; name?: string };
};

export type OkleykaSendResult = {
  ok: boolean;
  alreadySent?: boolean;
  lastSentAt?: string;
  warning?: string;
  error?: string;
};

export async function sendOkleykaPayload(payload: OkleykaSendPayload): Promise<OkleykaSendResult>
```

- [ ] **Step 1: Failing tests**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/crmparser', () => ({
  sendOkleykaTelegramEvent: vi.fn(),
}));

import { sendOkleykaTelegramEvent } from '../api/crmparser';
import { sendOkleykaPayload } from './send-okleyka-payload';

describe('sendOkleykaPayload', () => {
  beforeEach(() => vi.mocked(sendOkleykaTelegramEvent).mockReset());

  it('maps success', async () => {
    vi.mocked(sendOkleykaTelegramEvent).mockResolvedValue({
      ok: true,
      messageIds: [1],
      loggedAt: '2026-07-30',
    });
    const result = await sendOkleykaPayload({
      text: 't',
      fileUrls: ['https://x'],
      lineItemId: 'li',
      opportunityId: 'opp',
    });
    expect(result.ok).toBe(true);
    expect(sendOkleykaTelegramEvent).toHaveBeenCalledWith({
      event: 'okleyka.send',
      force: false,
      lineItemId: 'li',
      opportunityId: 'opp',
      text: 't',
      fileUrls: ['https://x'],
      sentBy: undefined,
    });
  });

  it('maps alreadySent', async () => {
    vi.mocked(sendOkleykaTelegramEvent).mockResolvedValue({
      ok: false,
      alreadySent: true,
      lastSentAt: '2026-07-29',
    });
    const result = await sendOkleykaPayload({
      text: 't',
      fileUrls: [],
      lineItemId: 'li',
      force: false,
    });
    expect(result.alreadySent).toBe(true);
  });

  it('maps thrown errors', async () => {
    vi.mocked(sendOkleykaTelegramEvent).mockRejectedValue(new Error('Telegram не настроен'));
    const result = await sendOkleykaPayload({
      text: 't',
      fileUrls: [],
      lineItemId: 'li',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/не настроен/);
  });
});
```

- [ ] **Step 2: Run FAIL**

- [ ] **Step 3: Replace clipboard implementation** — call `sendOkleykaTelegramEvent`. Delete `buildClipboardText` if unused; update any remaining imports.

- [ ] **Step 4: `yarn vitest run src/deals-board/utils/send-okleyka-payload.test.ts` PASS**

---

### Task 9: OkleykaMessageDialog send UX (TwentyView)

**Files:**
- Modify: `src/deals-board/ui/OkleykaMessageDialog.tsx`

**Interfaces:**
- Consumes: `sendOkleykaPayload` with ids from `payload`
- Button: «Отправить в чат» / «Отправка…» / «Отправлено»
- On `alreadySent`: `window.confirm(\`Уже отправляли ${lastSentAt}. Отправить ещё раз?\`)` → retry with `force: true`
- On success: show success briefly, then dismiss after ~800ms
- On error: inline error; keep dialog open

- [ ] **Step 1: Replace copy handler with send**

```tsx
const [sending, setSending] = useState(false);
const [sendError, setSendError] = useState<string | null>(null);
const [sent, setSent] = useState(false);

const handleSend = useCallback(async (force = false) => {
  if (!draft || !payload || sending) return;
  setSending(true);
  setSendError(null);
  const text = formatOkleykaMessage(draft);
  const fileUrls = resolvePrevyuFileUrls(payload.lineItem.prevyuOkleyki);
  const result = await sendOkleykaPayload({
    text,
    fileUrls,
    lineItemId: payload.lineItemId,
    opportunityId: payload.opportunityId,
    force,
  });
  setSending(false);
  if (result.alreadySent && !force) {
    const when = result.lastSentAt ?? '';
    const ok = window.confirm(`Уже отправляли ${when}. Отправить ещё раз?`);
    if (ok) await handleSend(true);
    return;
  }
  if (!result.ok) {
    setSendError(result.error ?? 'Не удалось отправить');
    return;
  }
  setSent(true);
  window.setTimeout(() => handleDismiss(), 800);
}, [draft, payload, sending, handleDismiss]);
```

- [ ] **Step 2: Footer button + error line** — primary «Отправить в чат»; disable while `sending`

- [ ] **Step 3: Staging bake**
  1. crmparser Settings → token + chat_id  
  2. Twenty app apply  
  3. Оклейка → send → album in test group  
  4. Second send → confirm → duplicate message  
  5. Line-item fields + SQLite log present  

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| Event bus + hooks | 1, 4 |
| Settings keys + tab | 2, 5 |
| SQLite send log | 2, 4 |
| `POST /telegram/events` | 4 |
| Album + caption rules | 3 |
| Inbound stub | 5 |
| CRM fields | 6 |
| Logic function proxy | 7 |
| Adapter replaces clipboard | 8 |
| Dialog button + alreadySent confirm | 9 |
| Staging-first bake | 5, 9 |

## Self-review notes

- No TBD placeholders.
- Field API names consistent across Tasks 4 and 6.
- LF path `/crmparser/telegram/okleyka-send` matches client path.
- Hook registry + extension hooks at boot; MVP send orchestration in `handleOkleykaSend`.
