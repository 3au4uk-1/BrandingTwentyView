# Sheet Queue Modal UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Limit print/freza modal hours to 08–22, match time-select chrome to other inputs, and show Взято/Готово as non-clickable sheet-status badges at the top (Реставрация stays clickable on print).

**Architecture:** Pure hour clamp + hour list live in `normalize-print-time.ts` (unit-tested). `SheetQueuePanel` consumes them for `<select>` options and draft init; status strip replaces footer Взято/Готово buttons. Print/freza keep sharing one panel via `SheetQueueFieldMap`.

**Tech Stack:** React 19, Vitest, existing deals-board theme tokens (`bgElevated`, `successMuted`, `warningMuted`), `Modal` / `Button` / `Input`.

**Spec:** `docs/superpowers/specs/2026-07-29-sheet-queue-modal-ux-design.md`

## Global Constraints

- Hours allowed in UI: **08–22** only; minutes stay `00/10/20/30/40/50`.
- Out-of-range stored hour → **clamp** to `08` or `22` (do not change minutes beyond existing `snapMinuteToTen`).
- Time `<select>` background: `colors.bgElevated` (same as `Input`), not `colors.bg`.
- Взято / Готово: read-only badges; **no** `patch` on click.
- Реставрация: remains footer toggle when `fields.restoration` is set (print only).
- Do **not** change `PrintPanelChip` / `FrezaPanelChip` field maps unless required for compile.
- Do **not** implement freza sheet cycle / crmparser changes.
- Commits only when the user explicitly asks (skip commit steps otherwise).
- After front-component changes: `yarn twenty apply`, then hard-refresh (`Ctrl+F5`) before claiming UI updated.
- Prefer `yarn test:unit` for focused runs.

## File map

| Path | Role |
|------|------|
| `src/deals-board/utils/normalize-print-time.ts` | Export `PRINT_WORK_HOURS`, `clampHourToWorkWindow` |
| `src/deals-board/utils/normalize-print-time.test.ts` | Unit tests for clamp + hours list |
| `src/deals-board/editors/SheetQueuePanel.tsx` | Use hours/clamp; select chrome; status strip; footer cleanup |

No changes expected to `PrintPanelChip.tsx` / `FrezaPanelChip.tsx`.

---

### Task 1: Work-hour clamp helper

**Files:**
- Modify: `src/deals-board/utils/normalize-print-time.ts`
- Modify: `src/deals-board/utils/normalize-print-time.test.ts`

**Interfaces:**
- Consumes: existing `normalizePrintTime`, `snapMinuteToTen`
- Produces:
  - `PRINT_WORK_HOURS: readonly string[]` — `['08','09',…,'22']`
  - `clampHourToWorkWindow(hour: string): string` — pads numeric hour; clamps to `08`..`22`; non-numeric → `'09'` (same default spirit as current `splitTime`)

- [ ] **Step 1: Write the failing tests**

Append to `normalize-print-time.test.ts`:

```ts
import {
  clampHourToWorkWindow,
  normalizePrintTime,
  PRINT_WORK_HOURS,
  snapMinuteToTen,
} from './normalize-print-time';

describe('PRINT_WORK_HOURS', () => {
  it('is 08 through 22 inclusive', () => {
    expect(PRINT_WORK_HOURS[0]).toBe('08');
    expect(PRINT_WORK_HOURS[PRINT_WORK_HOURS.length - 1]).toBe('22');
    expect(PRINT_WORK_HOURS).toHaveLength(15);
    expect(PRINT_WORK_HOURS).not.toContain('07');
    expect(PRINT_WORK_HOURS).not.toContain('23');
  });
});

describe('clampHourToWorkWindow', () => {
  it('keeps in-range hours padded', () => {
    expect(clampHourToWorkWindow('9')).toBe('09');
    expect(clampHourToWorkWindow('08')).toBe('08');
    expect(clampHourToWorkWindow('22')).toBe('22');
    expect(clampHourToWorkWindow('14')).toBe('14');
  });

  it('clamps below 08 and above 22', () => {
    expect(clampHourToWorkWindow('00')).toBe('08');
    expect(clampHourToWorkWindow('07')).toBe('08');
    expect(clampHourToWorkWindow('23')).toBe('22');
    expect(clampHourToWorkWindow('24')).toBe('22');
  });

  it('falls back for non-numeric', () => {
    expect(clampHourToWorkWindow('')).toBe('09');
    expect(clampHourToWorkWindow('xx')).toBe('09');
  });
});
```

Keep existing `normalizePrintTime` / `snapMinuteToTen` describes; only extend the import list.

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn test:unit src/deals-board/utils/normalize-print-time.test.ts`

Expected: FAIL — `PRINT_WORK_HOURS` / `clampHourToWorkWindow` not exported.

- [ ] **Step 3: Implement helpers**

Add to `normalize-print-time.ts`:

```ts
export const PRINT_WORK_HOUR_MIN = 8;
export const PRINT_WORK_HOUR_MAX = 22;

export const PRINT_WORK_HOURS: readonly string[] = Array.from(
  { length: PRINT_WORK_HOUR_MAX - PRINT_WORK_HOUR_MIN + 1 },
  (_, i) => String(PRINT_WORK_HOUR_MIN + i).padStart(2, '0'),
);

export const clampHourToWorkWindow = (hour: string): string => {
  const parsed = Number.parseInt(hour, 10);
  if (Number.isNaN(parsed)) return '09';
  const clamped = Math.min(
    PRINT_WORK_HOUR_MAX,
    Math.max(PRINT_WORK_HOUR_MIN, parsed),
  );
  return String(clamped).padStart(2, '0');
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn test:unit src/deals-board/utils/normalize-print-time.test.ts`

Expected: PASS (all describes).

- [ ] **Step 5: Commit** (only if user asked)

```bash
git add src/deals-board/utils/normalize-print-time.ts src/deals-board/utils/normalize-print-time.test.ts
git commit -m "feat(deals-board): clamp print/freza hours to 08-22"
```

---

### Task 2: Wire hours + select chrome in `SheetQueuePanel`

**Files:**
- Modify: `src/deals-board/editors/SheetQueuePanel.tsx`

**Interfaces:**
- Consumes: `PRINT_WORK_HOURS`, `clampHourToWorkWindow` from Task 1
- Produces: hour `<select>` options from `PRINT_WORK_HOURS`; draft hour always clamped; selects use `bgElevated`

- [ ] **Step 1: Update imports and replace local `HOURS`**

Remove:

```ts
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
```

Change import from `../utils/normalize-print-time` to:

```ts
import {
  clampHourToWorkWindow,
  formatPrintTimeDisplay,
  normalizePrintTime,
  PRINT_WORK_HOURS,
  snapMinuteToTen,
} from '../utils/normalize-print-time';
```

Update `splitTime`:

```ts
const splitTime = (value?: string | null) => {
  const normalized = normalizePrintTime(value);
  const [hour = '09', minute = '00'] = normalized.split(':');
  return {
    hour: clampHourToWorkWindow(hour),
    minute: snapMinuteToTen(minute),
  };
};
```

In the hour `<select>`, map `PRINT_WORK_HOURS` instead of `HOURS`.

- [ ] **Step 2: Match select background to Input**

Change `selectStyle` parameter type and body so background uses elevated surface:

```ts
const selectStyle = (
  colors: { border: string; bgElevated: string; text: string },
  radius: { md: number },
  spacing: { sm: string },
  extra?: CSSProperties,
): CSSProperties => ({
  height: 36,
  minWidth: 64,
  borderRadius: radius.md,
  border: `1px solid ${colors.border}`,
  background: colors.bgElevated,
  color: colors.text,
  padding: `0 ${spacing.sm}`,
  font: 'inherit',
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: '-0.02em',
  ...extra,
});
```

Call sites stay `selectStyle(colors, radius, spacing)` — `colors` already has `bgElevated`.

- [ ] **Step 3: Unit regression on helpers still green**

Run: `yarn test:unit src/deals-board/utils/normalize-print-time.test.ts`

Expected: PASS.

- [ ] **Step 4: Commit** (only if user asked)

```bash
git add src/deals-board/editors/SheetQueuePanel.tsx
git commit -m "feat(deals-board): work-hour selects use elevated chrome"
```

---

### Task 3: Status strip + footer cleanup

**Files:**
- Modify: `src/deals-board/editors/SheetQueuePanel.tsx`

**Interfaces:**
- Consumes: `vzato`, `gotovo`, `fields.restoration`, theme colors
- Produces: top-of-body read-only badges; footer without Взято/Готово buttons

- [ ] **Step 1: Add status badge helper inside the file (above component or inline)**

```ts
const statusBadgeStyle = (
  active: boolean,
  tone: 'vzato' | 'gotovo',
  colors: {
    success: string;
    successMuted: string;
    warning: string;
    warningMuted: string;
    borderSubtle: string;
    textMuted: string;
    bgElevated: string;
  },
  radius: { pill: number },
  font: { sizeXs: string; weightSemibold: number; weightMedium: number },
): CSSProperties => {
  if (!active) {
    return {
      padding: '4px 10px',
      borderRadius: radius.pill,
      border: `1px solid ${colors.borderSubtle}`,
      background: colors.bgElevated,
      color: colors.textMuted,
      font: 'inherit',
      fontSize: font.sizeXs,
      fontWeight: font.weightMedium,
      cursor: 'default',
      pointerEvents: 'none' as const,
      userSelect: 'none' as const,
    };
  }
  const on =
    tone === 'gotovo'
      ? { background: colors.successMuted, color: colors.success, border: colors.success }
      : { background: colors.warningMuted, color: colors.warning, border: colors.warning };
  return {
    padding: '4px 10px',
    borderRadius: radius.pill,
    border: `1px solid ${on.border}`,
    background: on.background,
    color: on.color,
    font: 'inherit',
    fontSize: font.sizeXs,
    fontWeight: font.weightSemibold,
    cursor: 'default',
    pointerEvents: 'none' as const,
    userSelect: 'none' as const,
  };
};
```

Use `span` (not `button`) for badges.

- [ ] **Step 2: Insert status strip at top of modal body**

As the **first** child inside the modal body column (before `readyHint`):

```tsx
<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
  <div
    style={{
      fontSize: font.sizeXs,
      color: colors.textMuted,
      fontWeight: font.weightMedium,
    }}
  >
    Статус с листа
  </div>
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
    <span
      aria-label={vzato ? 'Взято: да' : 'Взято: нет'}
      style={statusBadgeStyle(vzato, 'vzato', colors, radius, font)}
    >
      Взято
    </span>
    <span
      aria-label={gotovo ? 'Готово: да' : 'Готово: нет'}
      style={statusBadgeStyle(gotovo, 'gotovo', colors, radius, font)}
    >
      Готово
    </span>
  </div>
</div>
```

- [ ] **Step 3: Remove footer Взято / Готово buttons**

Footer should be only:

```tsx
footer={
  <div
    style={{
      display: 'flex',
      gap: spacing.xs,
      alignItems: 'center',
      width: '100%',
      flexWrap: 'wrap',
    }}
  >
    {fields.restoration ? (
      <Button
        theme={theme}
        size="sm"
        variant={restoration ? 'primary' : 'ghost'}
        onClick={() => void patch({ [fields.restoration!]: !restoration })}
      >
        Реставрация
      </Button>
    ) : null}
    <div style={{ flex: 1 }} />
    <Button theme={theme} size="sm" variant="ghost" onClick={() => setOpen(false)}>
      Закрыть
    </Button>
  </div>
}
```

Confirm no remaining `patch({ [fields.vzato]` / `fields.gotovo` call sites in this file.

- [ ] **Step 4: Apply + smoke checklist**

Run: `yarn twenty apply` (from BrandingTwentyView root).

Hard-refresh board (`Ctrl+F5`). Open **Печать пленки** and **Фреза** chips on a line item:

1. Hour options are 08–22 only.
2. Time selects match date input elevation (not darker).
3. Top shows «Статус с листа» + two non-clickable badges; clicking them does not flip CRM.
4. Print footer still has Реставрация + Закрыть; freza has Закрыть only.
5. Chip tone still reflects vzato/gotovo from CRM.

- [ ] **Step 5: Commit** (only if user asked)

```bash
git add src/deals-board/editors/SheetQueuePanel.tsx
git commit -m "feat(deals-board): sheet status badges; drop editable vzato/gotovo"
```

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| Hours 08–22 | 1, 2 |
| Clamp out-of-range on open | 1 → `splitTime` in 2 |
| Select `bgElevated` | 2 |
| Status strip top, non-clickable | 3 |
| Реставрация clickable (print) | 3 |
| Freza same UX via shared panel | 2–3 (no chip file changes) |
| No freza sheet cycle | Global constraint |

## Placeholder / consistency check

- No TBD steps; helpers named `PRINT_WORK_HOURS` / `clampHourToWorkWindow` consistently across tasks.
- Footer and strip copy match spec («Статус с листа», «Взято», «Готово», «Реставрация»).
