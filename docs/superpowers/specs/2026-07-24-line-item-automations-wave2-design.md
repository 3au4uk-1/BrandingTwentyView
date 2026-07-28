# Wave 2 — Line-item Automations — Design

**Date:** 2026-07-24  
**Status:** Approved in chat  
**Scope:** Hvatayka→GOTOVO, branding free-text rename once, OKLEYKA message template  
**Out of scope:** Drag reorder, print panel, restoration makets, margin dashboard, writing to server `branding_messages` (local shows copyable toast)

## Approach

Pure helpers under `src/deals-board/automations/` + hooks in `useUpdateLineItem` (and name updates routed through the same mutation path where needed). Unit-tested matchers; no CRM workflow engine.

## 1. Hvatayka → Готово + «будет Брендинг»

### Detect equipment row
Name matches (case-insensitive, Cyrillic-aware):
- contains `хватайк` AND (contains `автомат` OR does not contain `брендинг` / `оклейк`)
- Prefer rows that look like the machine itself, not branding of it.

### Detect branding sibling in same deal
Another line item on same `opportunityId` whose name matches:
- `брендинг` + `хватайк`, OR
- `оклейк` + (`хватайк` | `корпус`)

### Action
For each matching equipment row that is not already `GOTOVO`/`OTMENA`:
- set `stage` → `GOTOVO`
- append comment `будет Брендинг` if not already present (preserve existing comment text)

### Trigger
After successful line-item patch when `name`, `tip`, `stage`, or `tipDetail` changed — scan siblings via cache / refetch for that opportunity.

## 2. «БРЕНДИНГ свободная запись» → name from comment (once)

### Template name
Normalized match: name equals or starts with  
`БРЕНДИНГ свободная запись` (ignore trailing `( КОМЕНТАРИЙ ОБЯЗАТЕЛЕН )` and whitespace).

### Action
When `kommentariy` is saved non-empty and name still matches template:
- set `name` to trimmed comment text (first line if multiline)
- do **not** rename again once name no longer matches template

### Trigger
`useUpdateLineItem` when patch includes `kommentariy`.

## 3. Stage → OKLEYKA message template

### Trigger
Transition to `stage === 'OKLEYKA'` (previous stage ≠ OKLEYKA).

### Template body (plain text)
```
Заказ: {opportunity.name}
Бронь: {loadDate or «—»}
Плёнка: {tipDetail label or plenka markdown snippet or «—»}
Оборудование: {lineItem.name} × {kolichestvo or 1}
```

### Delivery (local)
Show existing toast / small popup with **Копировать** (clipboard). Do not require `branding_messages` on local.

## Files

| Path | Role |
|------|------|
| `automations/hvatayka.ts` | match + plan patches |
| `automations/branding-free-name.ts` | template detect + rename |
| `automations/okleyka-message.ts` | build template string |
| `automations/run-after-line-item-update.ts` | orchestration |
| `hooks/useLineItems.ts` | call orchestration in `onSettled` |
| `ui/*` | clipboard toast for OKLEYKA |

## Testing

- Unit tests for matchers and template builders
- Manual: seed deal with Хватайка + Брендинг Хватайка; set comment on free branding row; set stage OKLEYKA

## Success criteria

1. Branding sibling auto-completes machine without manual stage click.  
2. Free branding row gets a human name from first comment only.  
3. OKLEYKA yields a ready-to-send text block users can paste to chat.
