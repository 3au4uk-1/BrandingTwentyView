# Prevyu Reference Cell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `prevyuOkleyki` the first child-column reference thumbnail (add/change from the cell, floating hover preview), and remove the Groups «Макет» chip without touching other makety plumbing.

**Architecture:** Pure helpers pin the column and reorder FILES refs; a small media-actions hook wraps existing `uploadPrevyuImageFile` / merge / remove; `PrevyuOkleykiCell` becomes a thumbnail shell with portal hover preview + files popover. Remote DOM may truncate file bytes — on known upload errors fall back to `openRecordSidePanel`.

**Tech Stack:** React 19, Vitest, existing `files-field` upload helpers, `useUpdateLineItem`, portal via `PortalHostContext`, Twenty deals-board front component.

**Spec:** `docs/superpowers/specs/2026-07-29-prevyu-reference-cell-design.md`

## Global Constraints

- Data field is only `prevyuOkleyki` (FILES, max 6) — no new CRM field.
- Show first image only; multi-file via popover (make-first / add / remove).
- Hover = floating portal preview near cursor (~240–320px), not in-cell scale.
- Remove only `RestorationMaketChip` from `GroupChipsCell`; keep `LinkCell`, auto-fill, catalog, `RestorationMaketChip.tsx` file.
- Keep «В оклейку…» when `stage === 'OKLEYKA'`.
- On truncated/empty Remote DOM file errors, fall back to `openRecordSidePanel('dealLineItem', id)` — do not claim in-widget paste works without a live host check.
- UX backlog in the spec is **out of scope** for this plan.
- Commits only when the user explicitly asks (skip commit steps otherwise).
- After front-component changes: `yarn twenty apply`, then hard-refresh (`Ctrl+F5`) before claiming UI updated.
- Prefer `yarn test:unit` for focused runs.

## File map

| Path | Role |
|------|------|
| `src/deals-board/api/files-field.ts` | Add `movePrevyuFileToFront` |
| `src/deals-board/api/files-field.test.ts` | Tests for make-first |
| `src/deals-board/utils/pin-child-column.ts` | `pinChildColumnFirst(columns, field)` |
| `src/deals-board/utils/pin-child-column.test.ts` | Pin tests |
| `src/constants/column-definitions.ts` | Default: `prevyuOkleyki` order 0 |
| `src/deals-board/DealsBoard.tsx` | Apply pin after `mergeColumns` for children |
| `src/deals-board/cells/GroupChipsCell.tsx` | Stop rendering `RestorationMaketChip` |
| `src/deals-board/cells/GroupChipsCell.test.ts` | Assert no restoration chip in output contract / helper |
| `src/deals-board/editors/prevyu/movePrevyuFileToFront` usage via hook | — |
| `src/deals-board/editors/prevyu/usePrevyuMediaActions.ts` | Upload / paste / DnD / make-first / remove |
| `src/deals-board/editors/prevyu/usePrevyuMediaActions.test.ts` | Pure orchestration tests where extractable |
| `src/deals-board/editors/prevyu/PrevyuHoverPreview.tsx` | Floating preview portal |
| `src/deals-board/editors/prevyu/PrevyuFilesPopover.tsx` | Compact file list UI |
| `src/deals-board/editors/PrevyuOkleykiCell.tsx` | Rewrite to media cell |

Keep `RestorationMaketChip.tsx` on disk (unused from Groups) for a later return.

---

### Task 1: `movePrevyuFileToFront` helper

**Files:**
- Modify: `src/deals-board/api/files-field.ts`
- Modify: `src/deals-board/api/files-field.test.ts`

**Interfaces:**
- Consumes: `LineItemFileRef` from `src/deals-board/types.ts`
- Produces: `movePrevyuFileToFront(current: LineItemFileRef[] | null | undefined, fileId: string): LineItemFileRef[]`

- [ ] **Step 1: Write the failing test**

Append to `files-field.test.ts`:

```ts
import { movePrevyuFileToFront } from './files-field';

describe('movePrevyuFileToFront', () => {
  it('moves matching file to index 0 and keeps others', () => {
    expect(
      movePrevyuFileToFront(
        [{ fileId: 'a' }, { fileId: 'b' }, { fileId: 'c' }],
        'b',
      ),
    ).toEqual([{ fileId: 'b' }, { fileId: 'a' }, { fileId: 'c' }]);
  });

  it('returns same order when fileId missing or already first', () => {
    const files = [{ fileId: 'a' }, { fileId: 'b' }];
    expect(movePrevyuFileToFront(files, 'a')).toEqual(files);
    expect(movePrevyuFileToFront(files, 'z')).toEqual(files);
    expect(movePrevyuFileToFront(null, 'a')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit src/deals-board/api/files-field.test.ts`

Expected: FAIL — `movePrevyuFileToFront` is not exported / not defined.

- [ ] **Step 3: Write minimal implementation**

In `files-field.ts`, next to `removePrevyuFile`:

```ts
export const movePrevyuFileToFront = (
  current: LineItemFileRef[] | null | undefined,
  fileId: string,
): LineItemFileRef[] => {
  const files = [...(current ?? [])];
  const index = files.findIndex((file) => file.fileId === fileId);
  if (index <= 0) return files;
  const [picked] = files.splice(index, 1);
  return [picked, ...files];
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit src/deals-board/api/files-field.test.ts`

Expected: PASS

- [ ] **Step 5: Commit** (only if user asked)

```bash
git add src/deals-board/api/files-field.ts src/deals-board/api/files-field.test.ts
git commit -m "feat(prevyu): add movePrevyuFileToFront helper"
```

---

### Task 2: Pin `prevyuOkleyki` as first child column

**Files:**
- Create: `src/deals-board/utils/pin-child-column.ts`
- Create: `src/deals-board/utils/pin-child-column.test.ts`
- Modify: `src/constants/column-definitions.ts` (reorder defaults)
- Modify: `src/deals-board/DealsBoard.tsx` (`mergedChildColumns` useMemo)

**Interfaces:**
- Consumes: `ColumnConfig` from `src/deals-board/types.ts`
- Produces: `pinChildColumnFirst(columns: ColumnConfig[], field: string): ColumnConfig[]`
  - Ensures the field exists in the list (no-op if absent).
  - Forces `visible: true` on that field.
  - Places it at `order: 0`; reindexes remaining columns `1..n` preserving relative order.
  - Does not invent a column if the field is missing from `columns`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import type { ColumnConfig } from '../types';
import { pinChildColumnFirst } from './pin-child-column';

const cols = (fields: string[]): ColumnConfig[] =>
  fields.map((field, order) => ({
    field,
    label: field,
    order,
    visible: field !== 'prevyuOkleyki',
    width: 100,
  }));

describe('pinChildColumnFirst', () => {
  it('moves field to order 0, visible, reindexes rest', () => {
    const result = pinChildColumnFirst(
      cols(['name', 'stage', 'prevyuOkleyki']),
      'prevyuOkleyki',
    );
    expect(result.map((c) => c.field)).toEqual(['prevyuOkleyki', 'name', 'stage']);
    expect(result[0]).toMatchObject({ visible: true, order: 0 });
    expect(result[1].order).toBe(1);
    expect(result[2].order).toBe(2);
  });

  it('no-ops when field absent', () => {
    const input = cols(['name', 'stage']);
    expect(pinChildColumnFirst(input, 'prevyuOkleyki')).toEqual(input);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit src/deals-board/utils/pin-child-column.test.ts`

Expected: FAIL — module missing.

- [ ] **Step 3: Implement helper**

```ts
import type { ColumnConfig } from '../types';

export const pinChildColumnFirst = (
  columns: ColumnConfig[],
  field: string,
): ColumnConfig[] => {
  const target = columns.find((column) => column.field === field);
  if (!target) return columns;

  const rest = columns.filter((column) => column.field !== field);
  return [
    { ...target, visible: true, order: 0 },
    ...rest.map((column, index) => ({ ...column, order: index + 1 })),
  ];
};
```

- [ ] **Step 4: Update defaults**

In `src/constants/column-definitions.ts`, put `prevyuOkleyki` first among `DEFAULT_CHILD_COLUMNS` (order 0), shift other orders up by 1. Keep groupIds on print fields unchanged. Example head of array:

```ts
export const DEFAULT_CHILD_COLUMNS: ColumnConfig[] = [
  { field: 'prevyuOkleyki', label: 'Превью', order: 0, visible: true, width: 72 },
  { field: 'name', label: 'Позиция', order: 1, visible: true, width: with existing name width },
  // ... remaining fields with order += 1 from previous values
];
```

Use width `72` (thumbnail column) for default prevyu; saved views keep their width unless missing.

- [ ] **Step 5: Wire pin in DealsBoard**

Replace child merge useMemo:

```ts
const mergedChildColumns = useMemo(
  () =>
    pinChildColumnFirst(
      mergeColumns(activeView?.childColumns ?? DEFAULT_CHILD_COLUMNS, childFieldsQuery.data ?? []),
      'prevyuOkleyki',
    ),
  [activeView?.childColumns, childFieldsQuery.data],
);
```

Import `pinChildColumnFirst` from `./utils/pin-child-column`.

- [ ] **Step 6: Run tests**

Run: `yarn test:unit src/deals-board/utils/pin-child-column.test.ts src/deals-board/metadata/merge-columns.test.ts`

Expected: PASS (merge-columns unchanged).

- [ ] **Step 7: Commit** (only if user asked)

```bash
git add src/deals-board/utils/pin-child-column.ts src/deals-board/utils/pin-child-column.test.ts src/constants/column-definitions.ts src/deals-board/DealsBoard.tsx
git commit -m "feat(deals-board): pin prevyuOkleyki as first child column"
```

---

### Task 3: Remove Groups «Макет» chip

**Files:**
- Modify: `src/deals-board/cells/GroupChipsCell.tsx`
- Create: `src/deals-board/cells/group-chips-visibility.ts`
- Create: `src/deals-board/cells/group-chips-visibility.test.ts`

**Interfaces:**
- Consumes: `LineItemRow`, group entries
- Produces: `shouldShowRestorationMaketChip(_item: LineItemRow): boolean` → always `false` for this cycle (keeps a single switch to re-enable later).

Rationale: extract the decision so tests don't need full React mount of chips; `GroupChipsCell` calls the helper and never imports `RestorationMaketChip` while it returns false.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { shouldShowRestorationMaketChip } from './group-chips-visibility';

describe('shouldShowRestorationMaketChip', () => {
  it('is disabled for this cycle', () => {
    expect(
      shouldShowRestorationMaketChip({
        id: '1',
        opportunityId: 'o',
        name: 'x',
        tip: 'RESTAVRACIYA',
        ssylkaNaMakety: { primaryLinkUrl: 'https://disk/x' },
      }),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit src/deals-board/cells/group-chips-visibility.test.ts`

Expected: FAIL — module missing.

- [ ] **Step 3: Implement helper + update GroupChipsCell**

`group-chips-visibility.ts`:

```ts
import type { LineItemRow } from '../types';

/** Temporarily off — restore makety chip placement later (not in Groups). */
export const shouldShowRestorationMaketChip = (_item: LineItemRow): boolean => false;
```

In `GroupChipsCell.tsx`:
- Remove `import { RestorationMaketChip } ...`
- Replace `showRestorationChip` computation with `shouldShowRestorationMaketChip(item)`
- Remove `{showRestorationChip ? <RestorationMaketChip item={item} /> : null}`
- Update early-return condition so it no longer depends on restoration chip (only queue chips + otherGroups)

- [ ] **Step 4: Run tests**

Run: `yarn test:unit src/deals-board/cells/group-chips-visibility.test.ts`

Expected: PASS

- [ ] **Step 5: Commit** (only if user asked)

```bash
git add src/deals-board/cells/GroupChipsCell.tsx src/deals-board/cells/group-chips-visibility.ts src/deals-board/cells/group-chips-visibility.test.ts
git commit -m "fix(deals-board): hide restoration maket chip from Groups"
```

---

### Task 4: `usePrevyuMediaActions` hook

**Files:**
- Create: `src/deals-board/editors/prevyu/usePrevyuMediaActions.ts`
- Create: `src/deals-board/editors/prevyu/prevyu-media-actions.ts` (pure helpers for capacity / side-panel fallback detection)
- Create: `src/deals-board/editors/prevyu/prevyu-media-actions.test.ts`

**Interfaces:**
- Consumes:
  - `uploadPrevyuImageFile`, `toPrevyuFileRef`, `mergePrevyuFileList`, `removePrevyuFile`, `movePrevyuFileToFront`, `collectImageFiles`, `collectImageFilesFromDataTransfer`, `readImagesFromClipboardApi`, `PREVYU_UPLOAD_MAX_FILES` from `files-field`
  - `useUpdateLineItem`
  - `openRecordSidePanel`
- Produces pure:
  - `isPrevyuRemoteDomUploadError(error: unknown): boolean` — true when message mentions песочнице / обрезал файл / пустой
  - `remainingPrevyuSlots(currentCount: number): number`
- Produces hook:
  - `usePrevyuMediaActions(args: { itemId: string; files: LineItemFileRef[] | null | undefined })`
  - Returns:
    ```ts
    {
      isPending: boolean;
      addFiles: (files: File[]) => Promise<void>;
      addFromDataTransfer: (dt: DataTransfer | null | undefined) => Promise<void>;
      addFromClipboard: () => Promise<void>;
      makeFirst: (fileId: string) => Promise<void>;
      removeFile: (fileId: string) => Promise<void>;
    }
    ```
  - `addFiles`: filter images via `collectImageFiles`, slice to remaining slots; if zero slots after filter → `window.alert('Максимум 6 файлов')` and return; upload each; on `isPrevyuRemoteDomUploadError` → `openRecordSidePanel('dealLineItem', itemId)` and return; else alert other errors; on success `updateMutation.mutateAsync({ id, data: { prevyuOkleyki: next } })`.
  - `addFromClipboard`: `readImagesFromClipboardApi()` then `addFiles`; if empty after read, no-op (optional short alert only if you want — prefer silent no-op).

- [ ] **Step 1: Write failing pure tests**

```ts
import { describe, expect, it } from 'vitest';

import {
  isPrevyuRemoteDomUploadError,
  remainingPrevyuSlots,
} from './prevyu-media-actions';

describe('remainingPrevyuSlots', () => {
  it('caps at 6', () => {
    expect(remainingPrevyuSlots(0)).toBe(6);
    expect(remainingPrevyuSlots(4)).toBe(2);
    expect(remainingPrevyuSlots(6)).toBe(0);
    expect(remainingPrevyuSlots(9)).toBe(0);
  });
});

describe('isPrevyuRemoteDomUploadError', () => {
  it('detects known Remote DOM messages', () => {
    expect(
      isPrevyuRemoteDomUploadError(
        new Error('Файл пустой — в песочнице приложения байты картинки недоступны.'),
      ),
    ).toBe(true);
    expect(
      isPrevyuRemoteDomUploadError(
        new Error('Виджет Twenty обрезал файл. Нажмите «Открыть карточку»'),
      ),
    ).toBe(true);
    expect(isPrevyuRemoteDomUploadError(new Error('network'))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit src/deals-board/editors/prevyu/prevyu-media-actions.test.ts`

Expected: FAIL

- [ ] **Step 3: Implement pure helpers + hook**

`prevyu-media-actions.ts`:

```ts
import { PREVYU_UPLOAD_MAX_FILES } from '../../api/files-field';

export const remainingPrevyuSlots = (currentCount: number): number =>
  Math.max(0, PREVYU_UPLOAD_MAX_FILES - Math.max(0, currentCount));

export const isPrevyuRemoteDomUploadError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /песочнице|обрезал файл|байты картинки/i.test(message);
};
```

`usePrevyuMediaActions.ts` — implement as described in Interfaces; keep file focused; reuse existing upload path exactly like any future Okleyka dialog code would.

- [ ] **Step 4: Run tests**

Run: `yarn test:unit src/deals-board/editors/prevyu/prevyu-media-actions.test.ts src/deals-board/api/files-field.test.ts`

Expected: PASS

- [ ] **Step 5: Commit** (only if user asked)

```bash
git add src/deals-board/editors/prevyu/
git commit -m "feat(prevyu): add media upload actions hook"
```

---

### Task 5: Hover preview + files popover UI

**Files:**
- Create: `src/deals-board/editors/prevyu/PrevyuHoverPreview.tsx`
- Create: `src/deals-board/editors/prevyu/PrevyuFilesPopover.tsx`

**Interfaces:**
- `PrevyuHoverPreviewProps = { url: string; anchor: { x: number; y: number } | null; onClose: () => void }`
  - When `anchor` null → render null.
  - Portal to `resolvePortalContainer('root', portalHostRef)` (same as Modal).
  - Image max-width 280px, max-height 280px, border radius from theme, pointer-events none, z-index above table.
  - Position: `left: min(anchor.x + 12, viewportWidth - 300)`, `top: min(anchor.y + 12, viewportHeight - 300)`.
- `PrevyuFilesPopoverProps = { files: LineItemFileRef[]; urls: string[]; open: boolean; onClose: () => void; onMakeFirst: (fileId: string) => void; onRemove: (fileId: string) => void; onAddClick: () => void; isPending: boolean }`
  - Simple absolute panel under the cell (or portal root) listing thumbs + «Сделать первым» / «Удалить» / «Добавить».
  - Do not use `RestorationMaketChip` Modal pattern for the whole catalog — keep compact.

- [ ] **Step 1: Implement `PrevyuHoverPreview`**

Follow existing portal pattern from `src/deals-board/ui/ManualSyncErrorToast.tsx` (createPortal + resolvePortalContainer). No unit test required if purely presentational; keep styles inline with `useTheme()`.

- [ ] **Step 2: Implement `PrevyuFilesPopover`**

Use theme tokens; stopPropagation on container click/mousedown. Empty list still shows «Добавить».

- [ ] **Step 3: Smoke typecheck**

Run: `yarn test:unit src/deals-board/editors/prevyu/prevyu-media-actions.test.ts`

Expected: PASS (no regressions). Lint touched files if oxlint is quick: `yarn lint` (fix only if pre-existing noise is huge — do not expand scope).

- [ ] **Step 4: Commit** (only if user asked)

```bash
git add src/deals-board/editors/prevyu/PrevyuHoverPreview.tsx src/deals-board/editors/prevyu/PrevyuFilesPopover.tsx
git commit -m "feat(prevyu): add hover preview and files popover"
```

---

### Task 6: Rewrite `PrevyuOkleykiCell` as reference media cell

**Files:**
- Modify: `src/deals-board/editors/PrevyuOkleykiCell.tsx`

**Interfaces:**
- Keep exported props: `itemId`, `opportunityId?`, `stage?`, `value?`, `row?` (overrides.tsx unchanged).
- Behavior per spec section 1.

- [ ] **Step 1: Replace cell implementation**

Skeleton (implement fully — do not leave stubs):

```tsx
export const PrevyuOkleykiCell = ({ itemId, opportunityId, stage, value, row }: PrevyuOkleykiCellProps) => {
  const theme = useTheme();
  const files = value ?? [];
  const urls = resolvePrevyuFileUrls(files);
  const primaryUrl = urls[0] ?? null;
  const extraCount = Math.max(0, files.length - 1);
  const actions = usePrevyuMediaActions({ itemId, files });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hoverAnchor, setHoverAnchor] = useState<{ x: number; y: number } | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // hidden <input type="file" accept="image/*" multiple />
  // empty: button "+" → fileInputRef.click()
  // filled: <img> 40x40 object-fit cover; onMouseEnter/Move set hoverAnchor; onMouseLeave clear
  // onClick filled → setPopoverOpen(true)
  // onDragOver preventDefault; onDrop → actions.addFromDataTransfer
  // tabIndex={0}; onPaste → void actions.addFromClipboard()
  // badge +N if extraCount > 0
  // PrevyuHoverPreview when hoverAnchor && primaryUrl
  // PrevyuFilesPopover wired to actions
  // keep OKLEYKA «В оклейку…» block from current file (openOkleykaDialogForLineItem)
};
```

Remove the old chip that only called `openRecordSidePanel` as the primary empty/filled UI. Side panel remains **fallback inside actions** on Remote DOM upload errors.

Cell geometry: ~40×40 thumb, column already ~72px wide from Task 2 defaults.

- [ ] **Step 2: Ensure overrides still compile**

`overrides.tsx` `case 'prevyuOkleyki'` stays as-is (same props).

- [ ] **Step 3: Run unit suite for touched areas**

Run:

```bash
yarn test:unit src/deals-board/api/files-field.test.ts src/deals-board/utils/pin-child-column.test.ts src/deals-board/cells/group-chips-visibility.test.ts src/deals-board/editors/prevyu/prevyu-media-actions.test.ts
```

Expected: all PASS.

- [ ] **Step 4: Sync + manual verify on Twenty host**

```bash
yarn twenty apply
```

Hard-refresh board. Checklist:

1. «Превью» is the first child column.
2. Empty cell shows add affordance; file picker can attach when host allows bytes.
3. Filled cell shows thumb; hover shows floating preview.
4. Click opens popover; make-first / remove / add work.
5. Groups no longer shows «Макет · …» / «Станд. макет».
6. Ctrl+V: if Remote DOM blocks bytes, side panel opens (or error path) — record result in PR/notes; do not claim paste works if it does not.
7. Stage OKLEYKA still shows «В оклейку…».

- [ ] **Step 5: Commit** (only if user asked)

```bash
git add src/deals-board/editors/PrevyuOkleykiCell.tsx src/deals-board/editors/prevyu/
git commit -m "feat(prevyu): render reference thumbnail cell with hover and upload"
```

---

## Spec coverage self-check

| Spec requirement | Task |
|------------------|------|
| `prevyuOkleyki` data only | 4, 6 |
| First column pin | 2 |
| Thumbnail + empty + `+N` | 6 |
| Picker / DnD / Ctrl+V | 4, 6 |
| Floating hover preview | 5, 6 |
| Popover multi-file | 5, 6 |
| Remote DOM fallback | 4, 6 |
| Remove Groups maket chip only | 3 |
| Keep OKLEYKA link | 6 |
| UX backlog out of scope | (none) |

## Placeholder / consistency check

- Helper names: `movePrevyuFileToFront`, `pinChildColumnFirst`, `shouldShowRestorationMaketChip`, `usePrevyuMediaActions`, `isPrevyuRemoteDomUploadError`, `remainingPrevyuSlots` — used consistently across tasks.
- No TBD steps; commit steps optional per Global Constraints.
