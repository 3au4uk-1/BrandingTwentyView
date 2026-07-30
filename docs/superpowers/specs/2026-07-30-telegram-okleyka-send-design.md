# Telegram okleyka send — Design

**Date:** 2026-07-30  
**Status:** Approved in chat (approach 1 — event bus + hooks in crmparserv2)  
**Repos:** TwentyView (dialog + fields + logic function) and sibling repo crmparserv2 (bot, hooks, Settings tab)  
**Scope:** One-way send from Okleyka dialog → Telegram group (text + photo album); CRM send log; hook skeleton for later features  
**Out of scope (MVP):** Inbound Telegram buttons/replies, installer mobile cards, photo reports after install, multi-chat picker in dialog, other stage→chat mappings (structure only)

**Supersedes / continues:** [2026-07-27 okleyka preview storage](./2026-07-27-okleyka-preview-storage-design.md) — replaces clipboard MVP of `sendOkleykaPayload` with real Telegram send.

## Problem

Managers already open `OkleykaMessageDialog` on stage → Оклейка, edit a Telegram-ready draft, and copy text + photo URLs. Installers still need a manual paste into a group. We need a one-click **«Отправить в чат»** that posts the approved text and visualization album into a fixed Telegram group via `@Brand_Photo_Send_bot`, with a warning on duplicate sends and a durable send log in CRM.

## Decisions

1. **Hosting:** Bot and event bus live in **crmparserv2** (not a separate repo, not a Twenty logic function as the Bot API owner).
2. **Architecture:** Event dispatcher + `registerHook(event, handler)` so later features plug in without changing the Twenty→crmparser contract.
3. **Auth:** Reuse `TWENTY_APP_API_SECRET` / `CRMPARSER_API_SECRET` via existing `crmparser-proxy` (secret never in the browser).
4. **UI:** Replace «Копировать» with «Отправить в чат» (no clipboard path in MVP).
5. **Payload:** Dialog preview text + `prevyuOkleyki` URLs as a Telegram media group (album).
6. **Idempotency:** Warn if already sent; resend only after confirm (`force: true`).
7. **CRM log:** PATCH line-item fields after successful Bot API; also SQLite audit table.
8. **Environments:** Same bot for staging and prod; develop/test on staging first; prod ships via main developer after bake.
9. **Bot:** `@Brand_Photo_Send_bot`; test group invite is known; numeric `chat_id` stored in Settings (invite link alone is insufficient).

## Architecture

```
[Реализация] OkleykaMessageDialog
    → sendOkleykaPayload({ text, fileUrls, lineItemId, opportunityId, force? })
    → Twenty logic function (crmparser-proxy)
    → POST /api/twenty/telegram/events
         Authorization: Bearer TWENTY_APP_API_SECRET
    → dispatcher.emit("okleyka.send", ctx)
         ├─ hook: telegram.outbound  → Bot API sendMediaGroup (+ optional sendMessage)
         └─ hook: twenty.log         → SQLite + PATCH dealLineItem
    → { ok, alreadySent?, lastSentAt?, messageIds?, warning? }
```

| Layer | Owner | Responsibility |
|-------|--------|----------------|
| Dialog + adapter | TwentyView | UX, draft, confirm resend, call proxy |
| Logic function | TwentyView | Server-side proxy; no Bot token |
| Dispatcher + hooks | crmparserv2 | Extensible event bus |
| Outbound Telegram | crmparserv2 | Download files, Bot API |
| Settings tab «Telegram» | crmparserv2 UI | Token, chat map, test send |
| Send log | crmparserv2 SQLite + Twenty fields | Audit + alreadySent + CRM visibility |

## crmparserv2 modules

```
backend/src/telegram/
  hooks.js          # registerHook(event, handler), listHooks
  dispatcher.js     # emit(event, ctx) → handlers in order
  outbound.js       # sendAlbum(chatId, text, fileUrls)
  inbound.js        # webhook stub (501 / no-op until later)
  settings.js       # token + chat_map from settings table
  send-log.js       # alreadySent + insert log
routes: extend twenty.js (+ telegram admin routes for Settings)
```

Hooks registered at process start for MVP:

- `okleyka.send` → outbound album
- `okleyka.send` → SQLite log + Twenty PATCH

Future events (`stage.*`, `installer.report`, inbound callbacks) use the same `registerHook` without changing `/telegram/events` shape.

### Settings keys

| key | meaning |
|-----|---------|
| `telegram_bot_token` | BotFather token (masked in UI) |
| `telegram_chat_map` | JSON map `event → chat_id`, e.g. `{ "okleyka.send": "-100…" }` |
| `telegram_webhook_secret` | Reserved for inbound |

### Settings UI tab «Telegram»

- Token field + save
- Event → chat_id row(s); MVP shows `okleyka.send`
- «Проверить бота» (`getMe`)
- «Тест в чат» (short message)
- Hint for resolving numeric `chat_id` after bot joins the group

### SQLite `telegram_send_log`

| column | notes |
|--------|--------|
| id | PK |
| event | e.g. `okleyka.send` |
| line_item_id | Twenty UUID |
| opportunity_id | Twenty UUID |
| chat_id | destination |
| sent_by | member id / display name if known |
| payload_hash | hash of text + urls |
| telegram_message_ids | JSON array |
| created_at | |

`alreadySent` = exists successful row for `(event, line_item_id)`.

### API

`POST /api/twenty/telegram/events` (Bearer = `TWENTY_APP_API_SECRET`):

```json
{
  "event": "okleyka.send",
  "force": false,
  "lineItemId": "…",
  "opportunityId": "…",
  "text": "Заказ: …\nБронь: …",
  "fileUrls": ["https://…"],
  "sentBy": { "id": "…", "name": "…" }
}
```

Responses:

- `200` `{ "ok": true, "messageIds": […], "loggedAt": "…" }`
- `200` `{ "ok": false, "alreadySent": true, "lastSentAt": "…" }` when duplicate and `force` is false
- `4xx/5xx` when token/chat missing, Telegram failure, or bad body

Admin routes (app session auth): read/write telegram settings, test send — for Settings tab.

### Photo / caption rules

1. Server downloads each `fileUrl` (use Twenty credentials if URLs require auth).
2. Prefer `sendMediaGroup` album; put caption on the first media item.
3. Telegram caption limit 1024: if text is longer, `sendMessage(text)` then album without caption.
4. Zero photos: send text-only message (button not blocked; dialog keeps existing yellow warning).

### Inbound stub

`POST /api/telegram/webhook` exists but is no-op / `501` until reply-buttons / installer reports are designed.

## TwentyView changes

### Dialog

- Replace «Копировать» → **«Отправить в чат»**.
- States: idle → sending → success / error.
- On `alreadySent`: confirm «Уже отправляли {date}. Отправить ещё раз?» → retry with `force: true`.
- On success: brief success, then **close** dialog.
- Do not change line-item stage on send failure.

### Adapter

`sendOkleykaPayload` stops using clipboard; calls crmparser client + new logic function (same pattern as list-status / sheet proxies).

Input: `{ text, fileUrls, lineItemId, opportunityId, force? }`  
Output: `{ ok, alreadySent?, lastSentAt?, error?, warning? }`

### Logic function

Proxy to `/twenty/telegram/events` with `event: "okleyka.send"`.  
`sentBy`: from logic-function / app context when available; otherwise omit name (timestamp still logged).

### CRM fields on `dealLineItem`

| name | type | label |
|------|------|--------|
| `okleykaTelegramSentAt` | DATE_TIME | Отправлено в Telegram |
| `okleykaTelegramSentBy` | TEXT | Кто отправил |
| `okleykaTelegramChatId` | TEXT | Chat ID (служебное) |

Written by **crmparser** after successful Bot API (existing Twenty API token), not by the browser. SQLite remains source of truth for `alreadySent` checks; fields support CRM UI / reporting.

## Errors

| Case | Behavior |
|------|----------|
| Missing token or chat_id | 503 — «Telegram не настроен» |
| Some photo URLs fail | Prefer: send text + remaining photos; return `warning` |
| All photos fail, text ok | Send text-only; `warning` |
| Telegram API error | 502; dialog stays open; no CRM success log |
| Proxy / network | Same messaging as other crmparser failures |
| `alreadySent` without `force` | 200 + client confirm; no duplicate post |

## Tests

- **crmparser:** dispatcher invokes registered hooks; alreadySent / force; caption truncation; settings read path.
- **TwentyView:** `sendOkleykaPayload` mocked fetch; dialog button label; resend confirm path.
- **CI:** mock Bot API / fetch — no live Telegram calls.

## Success criteria (MVP)

1. Staging Settings tab configures `@Brand_Photo_Send_bot` + test group `chat_id`.
2. Stage → Оклейка → «Отправить в чат» posts text + album to the test group.
3. Second send shows warning; confirm with `force` posts again.
4. Line item has `okleykaTelegramSentAt` (and sentBy/chatId when available); SQLite log row exists.
5. Hook registry + inbound stub are in place for later events without API redesign.

## Rollout

1. crmparserv2: schema + telegram module + `/telegram/events` + Settings tab.  
2. Configure token + chat_id on staging.  
3. TwentyView: fields + dialog + logic function + adapter.  
4. Manual bake on staging with real bot/group.  
5. Prod: main developer release after bake (same bot).

## Future (same bus, not this MVP)

- Other statuses → other chats (extend `telegram_chat_map` + hooks)
- Inbound replies / buttons → CRM
- Installer mobile task cards
- Post-install photo report to a chat
- Multi-chat picker in the Okleyka dialog
