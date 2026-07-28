# Okleyka Preview Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store visualization photos on line items and replace the OKLEYKA copy toast with an editable confirm dialog that copies a Telegram-ready message (Telegram send later via the same payload adapter).

**Architecture:** Add a `FILES` field `prevyuOkleyki` on `dealLineItem`. Pure helpers build/parse the message draft. Stage → `OKLEYKA` opens `OkleykaMessageDialog` with local editable draft (text edits do not PATCH CRM). File add/remove PATCHes `prevyuOkleyki`. `sendOkleykaPayload` is clipboard-only in MVP.

**Tech Stack:** React 19, Twenty SDK `defineField` / `FieldType.FILES`, existing deals-board REST client + vitest, theme tokens.

**Spec:** `docs/superpowers/specs/2026-07-27-okleyka-preview-storage-design.md`

## Global Constraints

- Dialog text edits are ephemeral (copy payload only); do **not** PATCH `plenka`, `kommentariy`, opportunity name, etc.
- File add/remove **does** persist to `prevyuOkleyki`.
- Booking id = first `\d{5,6}` match in `opportunity.name`.
- Film default = first line of `plenka.markdown` (not tipDetail).
- MVP send = clipboard (+ surface photo URLs); no Telegram bot.
- Do not confuse with `ssylkaNaMakety` (print maket links).
- All new UUIDs must be UUID v4.
- Prefer `yarn twenty dev:add field` when scaffolding; if hand-written, use UUID `eadd9fe7-1abf-4289-9b7d-ce56959c13d3` for `prevyuOkleyki`.
- Commits only when the user explicitly asks (skip commit steps otherwise).

## File map

| Path | Role |
|------|------|
| `src/fields/prevyu-okleyki.field.ts` | FILES field definition |
| `src/constants/universal-identifiers.ts` | Field UUID export |
| `src/constants/column-definitions.ts` | Default child column |
| `src/deals-board/metadata/merge-columns.ts` | RU label fallback |
| `src/deals-board/types.ts` | `prevyuOkleyki` on `LineItemRow` |
| `src/deals-board/automations/okleyka-message.ts` | `extractBookingId`, `buildOkleykaMessage`, draft overrides |
| `src/deals-board/automations/okleyka-message.test.ts` | Unit tests |
| `src/deals-board/utils/okleyka-message-notify.ts` | Rich payload notify |
| `src/deals-board/utils/send-okleyka-payload.ts` | Clipboard adapter (TG seam) |
| `src/deals-board/ui/OkleykaMessageDialog.tsx` | Confirm dialog (replaces toast) |
| `src/deals-board/editors/PrevyuOkleykiCell.tsx` | Thumbs + upload + reopen |
| `src/deals-board/api/files-field.ts` | Upload + file URL helpers |
| `src/deals-board/cells/overrides.tsx` | Wire cell |
| `src/deals-board/automations/run-after-line-item-update.ts` | Pass rich context |
| `src/deals-board/DealsBoard.tsx` | Provider swap |
| `src/deals-board/metadata/build-opportunity-selection.ts` | FILES selection shape if needed for GQL; REST list usually returns all fields |

---

### Task 1: Message helpers (booking + film + comment)

**Files:**
- Modify: `src/deals-board/automations/okleyka-message.ts`
- Modify: `src/deals-board/automations/okleyka-message.test.ts`

**Interfaces:**
- Produces:
  - `extractBookingId(name: string | undefined): string` — first `\d{5,6}` or `''`
  - `OkleykaMessageDraft = { order: string; booking: string; film: string; equipment: string; comment: string }`
  - `buildOkleykaDraft(ctx): OkleykaMessageDraft`
  - `formatOkleykaMessage(draft: OkleykaMessageDraft): string` — omit empty comment line
  - `buildOkleykaMessage(ctx): string` — `formatOkleykaMessage(buildOkleykaDraft(ctx))` for back-compat

- [ ] **Step 1: Write failing tests**

Replace/extend `okleyka-message.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
  buildOkleykaDraft,
  buildOkleykaMessage,
  extractBookingId,
  formatOkleykaMessage,
} from './okleyka-message';

describe('extractBookingId', () => {
  it('takes first 5–6 digit run from deal name', () => {
    expect(
      extractBookingId('АРЕНДА/28-30.07/рулетка Алина тг/180288/Полякова'),
    ).toBe('180288');
    expect(extractBookingId('АРЕНДА/26.07/Екатерина/Ретро-игры/179512Фест./Фидж.')).toBe(
      '179512',
    );
  });

  it('returns empty when missing', () => {
    expect(extractBookingId('АРЕНДА/28-30.07/без брони')).toBe('');
    expect(extractBookingId(undefined)).toBe('');
  });
});

describe('buildOkleykaDraft / formatOkleykaMessage', () => {
  it('uses plenka first line and booking from name, not loadDate/tipDetail', () => {
    const draft = buildOkleykaDraft({
      opportunity: {
        name: 'АРЕНДА/28-30.07/x/180288/y',
        loadDate: '2026-08-01T10:00:00.000Z',
      },
      lineItem: {
        name: 'Фотобудка квадратная',
        kolichestvo: 1,
        tipDetail: 'NASHI',
        plenka: { markdown: '324\nOracal detail' },
        kommentariy: 'угол слева',
      },
    });
    expect(draft).toEqual({
      order: 'АРЕНДА/28-30.07/x/180288/y',
      booking: '180288',
      film: '324',
      equipment: 'Фотобудка квадратная × 1',
      comment: 'угол слева',
    });
    expect(formatOkleykaMessage(draft)).toBe(
      [
        'Заказ: АРЕНДА/28-30.07/x/180288/y',
        'Бронь: 180288',
        'Плёнка: 324',
        'Оборудование: Фотобудка квадратная × 1',
        'Комментарий: угол слева',
      ].join('\n'),
    );
  });

  it('omits comment line when empty', () => {
    const text = buildOkleykaMessage({
      opportunity: { name: 'ПРО/01.08/тест/12345' },
      lineItem: { name: 'Автомат', kolichestvo: 2, plenka: { markdown: '312' } },
    });
    expect(text).not.toContain('Комментарий:');
    expect(text).toContain('Плёнка: 312');
    expect(text).toContain('Бронь: 12345');
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `yarn vitest run src/deals-board/automations/okleyka-message.test.ts`  
Expected: FAIL (missing exports / old film/booking behavior)

- [ ] **Step 3: Implement**

```ts
import type { LineItemRow, OpportunityRow } from '../types';

export type OkleykaMessageContext = {
  opportunity: Pick<OpportunityRow, 'name' | 'loadDate'>;
  lineItem: Pick<
    LineItemRow,
    'name' | 'kolichestvo' | 'tipDetail' | 'plenka' | 'kommentariy'
  >;
};

export type OkleykaMessageDraft = {
  order: string;
  booking: string;
  film: string;
  equipment: string;
  comment: string;
};

export const extractBookingId = (name: string | undefined): string => {
  if (!name) return '';
  const match = name.match(/\d{5,6}/);
  return match?.[0] ?? '';
};

const firstPlenkaLine = (plenka: { markdown?: string } | null | undefined): string => {
  const first = plenka?.markdown?.trim().split(/\r?\n/)[0]?.trim() ?? '';
  return first.slice(0, 80);
};

export const buildOkleykaDraft = ({
  opportunity,
  lineItem,
}: OkleykaMessageContext): OkleykaMessageDraft => {
  const qty =
    typeof lineItem.kolichestvo === 'number' && Number.isFinite(lineItem.kolichestvo)
      ? lineItem.kolichestvo
      : 1;
  const film = firstPlenkaLine(lineItem.plenka) || '—';

  return {
    order: opportunity.name || '—',
    booking: extractBookingId(opportunity.name) || '—',
    film,
    equipment: `${lineItem.name || '—'} × ${qty}`,
    comment: lineItem.kommentariy?.trim() ?? '',
  };
};

export const formatOkleykaMessage = (draft: OkleykaMessageDraft): string => {
  const lines = [
    `Заказ: ${draft.order || '—'}`,
    `Бронь: ${draft.booking || '—'}`,
    `Плёнка: ${draft.film || '—'}`,
    `Оборудование: ${draft.equipment || '—'}`,
  ];
  const comment = draft.comment.trim();
  if (comment) lines.push(`Комментарий: ${comment}`);
  return lines.join('\n');
};

export const buildOkleykaMessage = (ctx: OkleykaMessageContext): string =>
  formatOkleykaMessage(buildOkleykaDraft(ctx));
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `yarn vitest run src/deals-board/automations/okleyka-message.test.ts`  
Expected: PASS

---

### Task 2: CRM field + board types/columns

**Files:**
- Create: `src/fields/prevyu-okleyki.field.ts`
- Modify: `src/constants/universal-identifiers.ts`
- Modify: `src/deals-board/types.ts`
- Modify: `src/constants/column-definitions.ts`
- Modify: `src/deals-board/metadata/merge-columns.ts`

**Interfaces:**
- Produces: field name `prevyuOkleyki`, UUID `eadd9fe7-1abf-4289-9b7d-ce56959c13d3`
- Produces: `export type LineItemFileRef = { fileId: string; label?: string }`
- Produces: `LineItemRow.prevyuOkleyki?: LineItemFileRef[] | null`

- [ ] **Step 1: Add UUID constant**

In `universal-identifiers.ts`:

```ts
export const DEAL_LINE_ITEM_PREVYU_OKLEYKI_FIELD_UNIVERSAL_IDENTIFIER =
  'eadd9fe7-1abf-4289-9b7d-ce56959c13d3';
```

- [ ] **Step 2: Create field file**

```ts
import { defineField, FieldType } from 'twenty-sdk/define';
import { DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import { DEAL_LINE_ITEM_PREVYU_OKLEYKI_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: DEAL_LINE_ITEM_PREVYU_OKLEYKI_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'prevyuOkleyki',
  type: FieldType.FILES,
  label: 'Превью оклейки',
  icon: 'IconPhoto',
  description: 'Фото визуализации для оклейщиков (1–3 ракурса)',
});
```

- [ ] **Step 3: Types + default column + label**

`types.ts` — add near `plenka`:

```ts
export type LineItemFileRef = { fileId: string; label?: string };

// on LineItemRow:
prevyuOkleyki?: LineItemFileRef[] | null;
```

`column-definitions.ts` — add after makets (order ~4.5 → bump later orders or insert at order 5 and shift). Prefer insert visible column:

```ts
{
  field: 'prevyuOkleyki',
  label: 'Превью',
  order: 5,
  visible: true,
  width: 100,
},
```

Shift subsequent `order` values by +1 for clarity, or leave gaps — either is fine if `mergeColumns` sorts by order.

`merge-columns.ts` labels map:

```ts
prevyuOkleyki: 'Превью',
```

- [ ] **Step 4: Sync field to local CRM**

Run: `yarn twenty apply`  
Expected: field appears on `dealLineItem` without UUID conflict. If conflict, stop and report — do not invent a second UUID silently.

---

### Task 3: Notify payload + clipboard send adapter

**Files:**
- Modify: `src/deals-board/utils/okleyka-message-notify.ts`
- Create: `src/deals-board/utils/send-okleyka-payload.ts`
- Create: `src/deals-board/utils/send-okleyka-payload.test.ts`

**Interfaces:**
- Produces:
```ts
export type OkleykaNotifyPayload = {
  opportunityId: string;
  lineItemId: string;
  opportunity: Pick<OpportunityRow, 'id' | 'name' | 'loadDate'>;
  lineItem: LineItemRow;
};

type OkleykaMessageHandler = (payload: OkleykaNotifyPayload) => void;
export const registerOkleykaMessageHandler = (next: OkleykaMessageHandler | null): void;
export const notifyOkleykaMessage = (payload: OkleykaNotifyPayload): void;

export type OkleykaSendPayload = {
  text: string;
  fileUrls: string[];
};

export const sendOkleykaPayload = async (
  payload: OkleykaSendPayload,
): Promise<{ copiedText: boolean; copiedUrls: boolean }>
```
MVP: `navigator.clipboard.writeText(text)`; if `fileUrls.length`, also copy URLs joined by `\n` after text block or as second write attempt — prefer single clipboard string:

```
{text}

Фото:
{url1}
{url2}
```

when urls present. Future Telegram implementation replaces body of `sendOkleykaPayload` only.

- [ ] **Step 1: Failing test for clipboard formatting helper**

Export a pure helper used by the adapter:

```ts
export const buildClipboardText = (payload: OkleykaSendPayload): string => {
  if (!payload.fileUrls.length) return payload.text;
  return `${payload.text}\n\nФото:\n${payload.fileUrls.join('\n')}`;
};
```

Test in `send-okleyka-payload.test.ts`.

- [ ] **Step 2: Implement notify + adapter**

Update all call sites of `notifyOkleykaMessage` / handler to the new payload shape (Task 4–5 will finish UI).

- [ ] **Step 3: Run** `yarn vitest run src/deals-board/utils/send-okleyka-payload.test.ts`  
Expected: PASS

---

### Task 4: OkleykaMessageDialog (replace toast)

**Files:**
- Create: `src/deals-board/ui/OkleykaMessageDialog.tsx`
- Delete or stop using: `src/deals-board/ui/OkleykaMessageToast.tsx` (remove after swap)
- Modify: `src/deals-board/DealsBoard.tsx` — provider import

**Interfaces:**
- Consumes: `OkleykaNotifyPayload`, `buildOkleykaDraft`, `formatOkleykaMessage`, `sendOkleykaPayload`, `resolvePrevyuFileUrls` (stub returning `[]` until Task 6)
- Produces: `OkleykaMessageDialogProvider` wrapping board (same place as toast)

- [ ] **Step 1: Implement dialog UI**

Behavior:
1. On `notifyOkleykaMessage(payload)` → open dialog, seed local `OkleykaMessageDraft` via `buildOkleykaDraft`.
2. Inputs: Заказ, Бронь, Плёнка, Оборудование, Комментарий — controlled local state.
3. Live `<pre>` of `formatOkleykaMessage(draft)`.
4. Photo strip: show up to 3 thumbs from `payload.lineItem.prevyuOkleyki` (URLs from helper; empty ok).
5. Warning banner if no files: «Сообщение без фото».
6. Buttons: Отмена · Копировать.
7. Копировать → `sendOkleykaPayload({ text, fileUrls })` → show «Скопировано» → dismiss after short delay optional.
8. Escape / Отмена closes without CRM text writes.
9. Reuse theme tokens / Button / portal patterns from the old toast (`resolvePortalContainer`, `usePortalHost`).

Skeleton (structure only — match existing toast styling):

```tsx
export const OkleykaMessageDialogProvider = ({ children }: { children: ReactNode }) => {
  const [payload, setPayload] = useState<OkleykaNotifyPayload | null>(null);
  const [draft, setDraft] = useState<OkleykaMessageDraft | null>(null);
  // register handler → setPayload + setDraft(buildOkleykaDraft(...))
  // render modal when draft
};
```

- [ ] **Step 2: Swap provider in `DealsBoard.tsx`**

Replace `OkleykaMessageToastProvider` with `OkleykaMessageDialogProvider`.

- [ ] **Step 3: Smoke** — board still mounts; unit tests for helpers still pass.

---

### Task 5: Wire stage trigger + reopen

**Files:**
- Modify: `src/deals-board/automations/run-after-line-item-update.ts`
- Modify: `src/deals-board/editors/PrevyuOkleykiCell.tsx` (created in Task 6 — reopen button can land here; if cell not ready, temporary button in `StageSelect` is OK, then move)

**Interfaces:**
- Consumes: `notifyOkleykaMessage(OkleykaNotifyPayload)`
- `findOpportunityInCache` already used

- [ ] **Step 1: Update OKLEYKA branch**

```ts
if (patch.stage === 'OKLEYKA' && previousItem?.stage !== 'OKLEYKA') {
  const opportunity = findOpportunityInCache(queryClient, opportunityId);
  if (opportunity) {
    notifyOkleykaMessage({
      opportunityId,
      lineItemId: id,
      opportunity: {
        id: opportunity.id,
        name: opportunity.name,
        loadDate: opportunity.loadDate,
      },
      lineItem: current,
    });
  }
}
```

- [ ] **Step 2: Reopen entry**

On preview cell (Task 6): if `item.stage === 'OKLEYKA'`, show text button «В оклейку…» that calls the same `notifyOkleykaMessage` with current opportunity + item from props/cache.

Export a small helper used by cell:

```ts
// src/deals-board/utils/open-okleyka-dialog.ts
export const openOkleykaDialogForLineItem = (
  opportunity: OpportunityRow,
  lineItem: LineItemRow,
): void => {
  notifyOkleykaMessage({
    opportunityId: opportunity.id,
    lineItemId: lineItem.id,
    opportunity: {
      id: opportunity.id,
      name: opportunity.name,
      loadDate: opportunity.loadDate,
    },
    lineItem,
  });
};
```

- [ ] **Step 3: Manually verify** stage change opens dialog with correct defaults (film from plenka, booking from name).

---

### Task 6: FILES cell + upload + URL resolve

**Files:**
- Create: `src/deals-board/api/files-field.ts`
- Create: `src/deals-board/api/files-field.test.ts` (pure URL builders / merge helpers)
- Create: `src/deals-board/editors/PrevyuOkleykiCell.tsx`
- Modify: `src/deals-board/cells/overrides.tsx`
- Modify: `src/deals-board/ui/OkleykaMessageDialog.tsx` — upload + real URLs
- Modify: `src/deals-board/metadata/build-opportunity-selection.ts` only if FILES needs a nested selection shape for any GQL path (REST board fetch likely already returns the field once applied)

**Interfaces:**
```ts
export const mergePrevyuFiles = (
  current: LineItemFileRef[] | null | undefined,
  next: LineItemFileRef,
): LineItemFileRef[] => [...(current ?? []), next].slice(0, 6);

export const removePrevyuFile = (
  current: LineItemFileRef[] | null | undefined,
  fileId: string,
): LineItemFileRef[] => (current ?? []).filter((f) => f.fileId !== fileId);

/** Resolve display/copy URLs for stored file refs (workspace file download path). */
export const resolvePrevyuFileUrls = (files: LineItemFileRef[] | null | undefined): string[];

export const uploadFilesFieldFile = async (args: {
  file: File;
  fieldMetadataId: string;
}): Promise<{ fileId: string; path?: string }>;
```

- [ ] **Step 1: Discover upload + download on local CRM**

Probe (document findings in a short comment atop `files-field.ts`):
1. GraphQL `uploadFilesFieldFile` (or current 2.19 equivalent) with `fieldMetadataId` of `prevyuOkleyki`.
2. How to obtain `fieldMetadataId` once (metadata REST/`fetchObjectFields` by name `prevyuOkleyki`).
3. Download/preview URL pattern for a `fileId` (signed path / `/files/...`).

If GraphQL multipart upload is unavailable from the front-component iframe:
- Implement **URL paste fallback** in the cell/dialog: prompt for image URL, store as `{ fileId: 'url:' + encodeURIComponent(url), label: 'link' }` **only if** CRM rejects non-UUID fileIds — otherwise do **not** fake FILES. Preferred fallback if upload blocked: keep text dialog working and show instruction «добавьте файлы в карточке позиции в Twenty» + still allow reopen. Do not invent a second CRM field.

- [ ] **Step 2: Pure helpers + tests**

Test `mergePrevyuFiles` / `removePrevyuFile`.

- [ ] **Step 3: Cell UI**

`PrevyuOkleykiCell`:
- Empty: «+ превью» opens file input (`accept="image/*"` multiple max 3).
- Filled: up to 3 thumbnails; click opens preview; × removes (PATCH without that fileId).
- «В оклейку…» when stage is OKLEYKA.
- PATCH via existing `useUpdateLineItem` / `updateLineItem(id, { prevyuOkleyki: next })`.
- Optimistic cache update consistent with other editors.

Wire in `overrides.tsx`:

```tsx
case 'prevyuOkleyki':
  return (
    <PrevyuOkleykiCell
      item={/* need full row — pass from overrides props.row as LineItemRow */}
      value={value as LineItemFileRef[] | null | undefined}
    />
  );
```

Inspect `overrides.tsx` props — if only `recordId` + `value`, load item from query cache by id (same pattern as other cells) or extend props. Prefer existing patterns in `LinkCell` (itemId only + value).

- [ ] **Step 4: Dialog upload**

Same upload helper; on success PATCH line item and refresh local payload thumbs. Text draft unchanged.

- [ ] **Step 5: Run unit tests**

`yarn vitest run src/deals-board/api/files-field.test.ts src/deals-board/automations/okleyka-message.test.ts`

---

### Task 7: End-to-end verification

**Files:** none new

- [ ] **Step 1:** `yarn twenty apply` (if not already) + hard refresh board (`Ctrl+F5`)
- [ ] **Step 2:** `yarn test:unit` — all green
- [ ] **Step 3:** Manual checklist on local `http://localhost:2020`:
  1. Column «Превью» visible (or enable in column picker).
  2. Upload 1–2 images on a PLENKA line item → thumbs show.
  3. Set stage → Оклейка → dialog opens with Заказ / Бронь from name / Плёнка from field / equipment.
  4. Edit Плёнка in dialog → live preview updates; CRM plenka unchanged after copy.
  5. Копировать → clipboard has text (+ фото URLs if resolved).
  6. «В оклейку…» reopens without stage change.
  7. Dialog without photos still copies with warning.

- [ ] **Step 4:** If user asks to commit, one commit covering the feature; otherwise leave unstaged.

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| FILES `prevyuOkleyki` | 2, 6 |
| Separate from `ssylkaNaMakety` | 2 |
| Booking parse `\d{5,6}` | 1 |
| Film from plenka first line | 1 |
| Editable dialog, ephemeral text | 4 |
| Persist file mutations only | 6 |
| Stage → OKLEYKA opens dialog | 5 |
| Reopen «В оклейку…» | 5–6 |
| Clipboard MVP + send seam | 3 |
| Warn if no photos | 4 |
| Upload in cell + dialog | 6 |
| Future Telegram out of scope | 3 adapter only |

## Self-review notes

- No Telegram bot implementation in any task.
- Upload discovery is explicit in Task 6 (environment-dependent); text path ships in Tasks 1–5 even if upload is blocked.
- `buildOkleykaMessage` signature stays callable; draft/format split supports the dialog.
