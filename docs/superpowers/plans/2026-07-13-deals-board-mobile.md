# Deals Board Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить полнофункциональный мобильный UI (телефон, карточки + bottom sheets) в существующий `DealsBoard` без дублирования бизнес-логики.

**Architecture:** `useLayoutMode` переключает presentation layer при ширине контейнера < 768px. Данные, hooks, API, editors и realtime остаются общими; новый каталог `src/deals-board/mobile/` содержит карточки и sheets. Overlays рендерятся через `PortalHost` + `BottomSheet`.

**Tech Stack:** React 19, TypeScript, twenty-sdk 2.19, @tanstack/react-query, Vitest (`vitest.unit.config.ts`), существующие editors/cells.

**Spec:** [docs/superpowers/specs/2026-07-13-deals-board-mobile-design.md](../specs/2026-07-13-deals-board-mobile-design.md)

---

## File Map

| Path | Responsibility |
|------|----------------|
| `src/deals-board/hooks/useLayoutMode.ts` | Breakpoint detection (`desktop` / `mobile`) |
| `src/deals-board/utils/layout-mode.ts` | Pure `resolveLayoutMode` for unit tests |
| `src/deals-board/utils/count-active-quick-filters.ts` | Count active quick filters for chip badge |
| `src/deals-board/ui/BottomSheet.tsx` | Shared bottom sheet primitive (portal + overlay) |
| `src/deals-board/mobile/MobileDealsBoard.tsx` | Mobile list orchestrator, pagination «Показать ещё» |
| `src/deals-board/mobile/MobileToolbar.tsx` | Sticky toolbar: view, search, menu |
| `src/deals-board/mobile/MobileViewSwitcherSheet.tsx` | View list + create view |
| `src/deals-board/mobile/MobileFiltersSheet.tsx` | Full `QuickFiltersBar` in sheet |
| `src/deals-board/mobile/MobileSettingsSheet.tsx` | Expand mode, column pickers, edit view, showAll |
| `src/deals-board/mobile/MobileDealCard.tsx` | Single deal card with expand |
| `src/deals-board/mobile/MobileLineItemList.tsx` | Line items list inside expanded card |
| `src/deals-board/mobile/MobileLineItemRow.tsx` | Editable line item row |
| `src/deals-board/mobile/types.ts` | `MobileDealsBoardProps` shared type |
| `src/deals-board/DealsBoard.tsx` | Layout branch + mobile shell |
| `src/deals-board/LineItemListMenu.tsx` | Add `presentation="sheet"` variant |

---

### Task 1: Layout mode utility and hook

**Files:**
- Create: `src/deals-board/utils/layout-mode.ts`
- Create: `src/deals-board/hooks/useLayoutMode.ts`
- Test: `src/deals-board/utils/layout-mode.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/deals-board/utils/layout-mode.test.ts
import { describe, expect, it } from 'vitest';

import { MOBILE_BREAKPOINT, resolveLayoutMode } from './layout-mode';

describe('resolveLayoutMode', () => {
  it('returns mobile below breakpoint', () => {
    expect(resolveLayoutMode(MOBILE_BREAKPOINT - 1)).toBe('mobile');
    expect(resolveLayoutMode(375)).toBe('mobile');
  });

  it('returns desktop at or above breakpoint', () => {
    expect(resolveLayoutMode(MOBILE_BREAKPOINT)).toBe('desktop');
    expect(resolveLayoutMode(1024)).toBe('desktop');
  });

  it('returns desktop when width is 0 (not yet measured)', () => {
    expect(resolveLayoutMode(0)).toBe('desktop');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit src/deals-board/utils/layout-mode.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement utility and hook**

```typescript
// src/deals-board/utils/layout-mode.ts
export const MOBILE_BREAKPOINT = 768;

export type LayoutMode = 'desktop' | 'mobile';

export const resolveLayoutMode = (containerWidth: number): LayoutMode => {
  if (containerWidth <= 0) return 'desktop';
  return containerWidth < MOBILE_BREAKPOINT ? 'mobile' : 'desktop';
};
```

```typescript
// src/deals-board/hooks/useLayoutMode.ts
import { useMemo, type RefObject } from 'react';

import { resolveLayoutMode, type LayoutMode } from '../utils/layout-mode';
import { useContainerWidth } from './useContainerWidth';

export const useLayoutMode = (containerRef: RefObject<HTMLElement | null>): LayoutMode => {
  const containerWidth = useContainerWidth(containerRef);
  return useMemo(() => resolveLayoutMode(containerWidth), [containerWidth]);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit src/deals-board/utils/layout-mode.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/utils/layout-mode.ts src/deals-board/utils/layout-mode.test.ts src/deals-board/hooks/useLayoutMode.ts
git commit -m "feat: add layout mode hook for mobile breakpoint"
```

---

### Task 2: Active quick filters counter

**Files:**
- Create: `src/deals-board/utils/count-active-quick-filters.ts`
- Test: `src/deals-board/utils/count-active-quick-filters.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/deals-board/utils/count-active-quick-filters.test.ts
import { describe, expect, it } from 'vitest';

import type { QuickFiltersValue } from '../QuickFiltersBar';
import { countActiveQuickFilters } from './count-active-quick-filters';

const EMPTY: QuickFiltersValue = {
  datePreset: null,
  stages: [],
  types: [],
  companyIds: [],
  oplata: 'all',
  search: '',
};

describe('countActiveQuickFilters', () => {
  it('returns 0 for defaults', () => {
    expect(countActiveQuickFilters(EMPTY)).toBe(0);
  });

  it('counts date preset, stages, types, companies, oplata, search', () => {
    expect(
      countActiveQuickFilters({
        ...EMPTY,
        datePreset: 'today',
        stages: ['V_PECHATI'],
        types: ['BANNER'],
        companyIds: ['c1'],
        oplata: 'filled',
        search: 'test',
      }),
    ).toBe(6);
  });

  it('ignores whitespace-only search', () => {
    expect(countActiveQuickFilters({ ...EMPTY, search: '   ' })).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit src/deals-board/utils/count-active-quick-filters.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```typescript
// src/deals-board/utils/count-active-quick-filters.ts
import type { QuickFiltersValue } from '../QuickFiltersBar';

export const countActiveQuickFilters = (value: QuickFiltersValue): number => {
  let count = 0;
  if (value.datePreset) count += 1;
  if ((value.stages ?? []).length > 0) count += 1;
  if ((value.types ?? []).length > 0) count += 1;
  if ((value.companyIds ?? []).length > 0) count += 1;
  if (value.oplata && value.oplata !== 'all') count += 1;
  if (value.search.trim().length > 0) count += 1;
  return count;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit src/deals-board/utils/count-active-quick-filters.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/utils/count-active-quick-filters.ts src/deals-board/utils/count-active-quick-filters.test.ts
git commit -m "feat: add active quick filters counter for mobile chip"
```

---

### Task 3: BottomSheet primitive

**Files:**
- Create: `src/deals-board/ui/BottomSheet.tsx`

- [ ] **Step 1: Create BottomSheet**

```tsx
// src/deals-board/ui/BottomSheet.tsx
import { useEffect, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import type { ThemeTokens } from '../theme/tokens';
import { Button } from './Button';
import { resolvePortalContainer, usePortalHost } from './PortalHostContext';

type BottomSheetProps = {
  theme: ThemeTokens;
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Fraction of viewport height for sheet panel. Default 0.85 */
  heightFraction?: number;
};

export const BottomSheet = ({
  theme,
  isOpen,
  title,
  onClose,
  children,
  heightFraction = 0.85,
}: BottomSheetProps) => {
  const portalHostRef = usePortalHost();
  const { colors, radius, font, spacing, zIndex } = theme;
  const overlayBg =
    theme.colorScheme === 'dark' ? 'rgba(0, 0, 0, 0.72)' : 'rgba(24, 24, 27, 0.32)';

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const view = typeof window !== 'undefined' ? window : undefined;
    view?.addEventListener('keydown', handleKeyDown);
    return () => view?.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    onClose();
  };

  const sheet = (
    <div
      role="presentation"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: zIndex.modal,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        pointerEvents: 'none',
      }}
    >
      <div
        aria-hidden="true"
        onMouseDown={handleBackdropMouseDown}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: overlayBg,
          pointerEvents: 'auto',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: `${Math.round(heightFraction * 100)}%`,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          border: `1px solid ${colors.border}`,
          borderBottom: 'none',
          backgroundColor: colors.bgElevated,
          color: colors.text,
          boxShadow: colors.shadowLg,
          pointerEvents: 'auto',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${spacing.md} ${spacing.md} ${spacing.sm}`,
            borderBottom: `1px solid ${colors.borderSubtle}`,
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: font.sizeMd, fontWeight: font.weightSemibold }}>{title}</div>
          <Button theme={theme} variant="ghost" size="sm" onClick={onClose}>
            Готово
          </Button>
        </div>
        <div style={{ overflow: 'auto', padding: spacing.md, flex: 1, minHeight: 0 }}>{children}</div>
      </div>
    </div>
  );

  const container = resolvePortalContainer('root', portalHostRef);
  if (container) return createPortal(sheet, container);
  return sheet;
};
```

- [ ] **Step 2: Typecheck**

Run: `yarn lint`
Expected: no errors in `BottomSheet.tsx`

- [ ] **Step 3: Commit**

```bash
git add src/deals-board/ui/BottomSheet.tsx
git commit -m "feat: add BottomSheet primitive for mobile overlays"
```

---

### Task 4: Mobile shared props type

**Files:**
- Create: `src/deals-board/mobile/types.ts`

- [ ] **Step 1: Define MobileDealsBoardProps**

```typescript
// src/deals-board/mobile/types.ts
import type { LineItemQueryFilters } from '../api/line-items';
import type { QuickFiltersValue } from '../QuickFiltersBar';
import type { FieldDescriptor } from '../metadata/types';
import type { ColumnConfig, DealBoardViewRecord, LineItemRow, OpportunityRow } from '../types';

export type MobileDealsBoardProps = {
  activeView?: DealBoardViewRecord;
  views: DealBoardViewRecord[];
  parentColumns: ColumnConfig[];
  childColumns: ColumnConfig[];
  parentDescriptorByField: Map<string, FieldDescriptor>;
  childDescriptorByField: Map<string, FieldDescriptor>;
  opportunityLinkFields: FieldDescriptor[];
  records: OpportunityRow[];
  lineItems: LineItemRow[];
  lineItemFilters?: LineItemQueryFilters;
  totalCount: number;
  page: number;
  totalPages: number;
  showAll: boolean;
  quickFilters: QuickFiltersValue;
  onQuickFiltersChange: (next: QuickFiltersValue) => void;
  onQuickFiltersReset: () => void;
  onPageChange: (nextPage: number) => void;
  onSelectView: (id: string) => void;
  onCreateView: () => void;
  onEditView: () => void;
  onParentColumnsSave?: (columns: ColumnConfig[]) => void;
  onChildColumnsSave?: (columns: ColumnConfig[]) => void;
  onShowAllChange?: (showAll: boolean) => void;
  onResetFilters?: () => void;
  isLoading?: boolean;
  isViewLoading?: boolean;
  errorMessage?: string;
};
```

- [ ] **Step 2: Commit**

```bash
git add src/deals-board/mobile/types.ts
git commit -m "feat: add MobileDealsBoard shared props type"
```

---

### Task 5: MobileViewSwitcherSheet

**Files:**
- Create: `src/deals-board/mobile/MobileViewSwitcherSheet.tsx`

- [ ] **Step 1: Implement view switcher sheet**

Reuse sorting logic from `ViewSwitcher.tsx` (`sortViews`, personal/workspace sections). Render inside `BottomSheet`.

```tsx
// src/deals-board/mobile/MobileViewSwitcherSheet.tsx
import { useMemo } from 'react';

import { VIEW_VISIBILITY } from 'src/constants/view-visibility';

import { useTheme } from '../theme/ThemeContext';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import type { DealBoardViewRecord } from '../types';

type MobileViewSwitcherSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  views: DealBoardViewRecord[];
  activeViewId?: string;
  onSelectView: (id: string) => void;
  onCreateView: () => void;
};

const sortViews = (views: DealBoardViewRecord[]) =>
  [...views].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return a.name.localeCompare(b.name, 'ru');
  });

export const MobileViewSwitcherSheet = ({
  isOpen,
  onClose,
  views,
  activeViewId,
  onSelectView,
  onCreateView,
}: MobileViewSwitcherSheetProps) => {
  const theme = useTheme();
  const { colors, radius, font, spacing } = theme;
  const sorted = useMemo(() => sortViews(views), [views]);
  const personal = sorted.filter((v) => v.visibility === VIEW_VISIBILITY.PERSONAL);
  const workspace = sorted.filter((v) => v.visibility === VIEW_VISIBILITY.WORKSPACE);

  const renderButton = (view: DealBoardViewRecord) => {
    const isActive = view.id === activeViewId;
    return (
      <button
        key={view.id}
        type="button"
        onClick={() => {
          onSelectView(view.id);
          onClose();
        }}
        style={{
          width: '100%',
          minHeight: 44,
          border: 'none',
          backgroundColor: isActive ? colors.accentMuted : 'transparent',
          color: isActive ? colors.accentText : colors.text,
          textAlign: 'left',
          padding: `${spacing.sm} ${spacing.md}`,
          borderRadius: radius.sm,
          fontSize: font.sizeSm,
          fontWeight: isActive ? font.weightMedium : font.weightNormal,
          cursor: 'pointer',
          fontFamily: font.family,
        }}
      >
        {view.name}
      </button>
    );
  };

  return (
    <BottomSheet theme={theme} isOpen={isOpen} title="Views" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        {workspace.length > 0 ? (
          <div>
            <div style={{ fontSize: font.sizeXs, color: colors.textMuted, marginBottom: spacing.xs }}>
              Общие
            </div>
            {workspace.map(renderButton)}
          </div>
        ) : null}
        {personal.length > 0 ? (
          <div>
            <div style={{ fontSize: font.sizeXs, color: colors.textMuted, marginBottom: spacing.xs }}>
              Личные
            </div>
            {personal.map(renderButton)}
          </div>
        ) : null}
        <Button
          theme={theme}
          variant="secondary"
          size="md"
          onClick={() => {
            onCreateView();
            onClose();
          }}
          style={{ minHeight: 44, width: '100%' }}
        >
          + Новый view
        </Button>
      </div>
    </BottomSheet>
  );
};
```

Note: If `Button` does not accept `style` prop, wrap in a `div` with `width: 100%` instead.

- [ ] **Step 2: Lint**

Run: `yarn lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/deals-board/mobile/MobileViewSwitcherSheet.tsx
git commit -m "feat: add mobile view switcher bottom sheet"
```

---

### Task 6: MobileToolbar

**Files:**
- Create: `src/deals-board/mobile/MobileToolbar.tsx`

- [ ] **Step 1: Implement toolbar**

Three zones: view button (opens sheet via callback), search input, settings menu button.

```tsx
// src/deals-board/mobile/MobileToolbar.tsx
import { useState } from 'react';

import { APP_DISPLAY_NAME } from 'src/constants/universal-identifiers';

import { useTheme } from '../theme/ThemeContext';
import { Button } from '../ui/Button';
import { ChevronDownIcon } from '../ui/Icons';
import { Input } from '../ui/Input';
import type { DealBoardViewRecord } from '../types';

type MobileToolbarProps = {
  activeView?: DealBoardViewRecord;
  totalCount?: number;
  search: string;
  onSearchChange: (value: string) => void;
  onOpenViewSheet: () => void;
  onOpenSettingsSheet: () => void;
};

export const MobileToolbar = ({
  activeView,
  totalCount,
  search,
  onSearchChange,
  onOpenViewSheet,
  onOpenSettingsSheet,
}: MobileToolbarProps) => {
  const theme = useTheme();
  const { colors, font, spacing, radius, layout } = theme;
  const [searchExpanded, setSearchExpanded] = useState(Boolean(search));

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.sm,
        padding: `${spacing.sm} ${spacing.md}`,
        minHeight: layout.toolbarHeight,
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.bgSecondary,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
        <button
          type="button"
          onClick={onOpenViewSheet}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.xs,
            flex: 1,
            minWidth: 0,
            minHeight: 44,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            backgroundColor: colors.bg,
            padding: `0 ${spacing.sm}`,
            cursor: 'pointer',
            fontFamily: font.family,
            color: colors.text,
          }}
        >
          <span style={{ fontSize: font.sizeXs, color: colors.textMuted }}>{APP_DISPLAY_NAME}</span>
          <span style={{ fontSize: font.sizeSm, fontWeight: font.weightMedium, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeView?.name ?? '…'}
          </span>
          {typeof totalCount === 'number' ? (
            <span style={{ fontSize: font.sizeXs, color: colors.textMuted, flexShrink: 0 }}>{totalCount}</span>
          ) : null}
          <ChevronDownIcon size={14} color={colors.textMuted} />
        </button>
        <Button
          theme={theme}
          variant="ghost"
          size="sm"
          onClick={() => setSearchExpanded((v) => !v)}
          aria-label="Поиск"
          style={{ minWidth: 44, minHeight: 44 }}
        >
          🔍
        </Button>
        <Button
          theme={theme}
          variant="ghost"
          size="sm"
          onClick={onOpenSettingsSheet}
          aria-label="Настройки"
          style={{ minWidth: 44, minHeight: 44 }}
        >
          ≡
        </Button>
      </div>
      {searchExpanded ? (
        <Input
          theme={theme}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Поиск…"
          style={{ width: '100%', minHeight: 44 }}
        />
      ) : null}
    </div>
  );
};
```

Adjust icon imports to match existing `Icons.tsx` exports (`SearchIcon` may need to be added or use an existing icon).

- [ ] **Step 2: Lint and fix imports**

Run: `yarn lint`
Fix any missing icons by reusing existing ones from `src/deals-board/ui/Icons.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/deals-board/mobile/MobileToolbar.tsx
git commit -m "feat: add mobile toolbar with view, search, and settings"
```

---

### Task 7: MobileDealCard and MobileLineItemList (read-only)

**Files:**
- Create: `src/deals-board/mobile/MobileDealCard.tsx`
- Create: `src/deals-board/mobile/MobileLineItemList.tsx`
- Create: `src/deals-board/mobile/MobileLineItemRow.tsx` (read-only first)

- [ ] **Step 1: MobileLineItemRow (read-only)**

Render visible child columns using `DynamicFieldCell` with `variant="child"`. Reuse `visibleColumns` from `utils/columns.ts`.

Key fields use `renderFieldOverride` path automatically via `DynamicFieldCell`. Minimum row padding 12px; touch targets on interactive cells.

```tsx
// src/deals-board/mobile/MobileLineItemRow.tsx
import { DynamicFieldCell } from '../cells/DynamicFieldCell';
import type { FieldDescriptor } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import { visibleColumns } from '../utils/columns';
import { resolveFieldValue } from '../utils/resolve-field-value';
import { getStageRowStyles } from '../utils/stage-row-styles';
import type { ColumnConfig, LineItemRow } from '../types';

type MobileLineItemRowProps = {
  item: LineItemRow;
  columns: ColumnConfig[];
  descriptorByField: Map<string, FieldDescriptor>;
};

export const MobileLineItemRow = ({ item, columns, descriptorByField }: MobileLineItemRowProps) => {
  const theme = useTheme();
  const { colors, font, spacing, radius, colorScheme } = theme;
  const visible = visibleColumns(columns);
  const stageStyles = getStageRowStyles(item.stage ?? null, colorScheme, 'child');

  return (
    <div
      style={{
        border: `1px solid ${colors.borderSubtle}`,
        borderLeft: `3px solid ${stageStyles.accentColor}`,
        borderRadius: radius.md,
        padding: spacing.sm,
        marginBottom: spacing.sm,
        backgroundColor: stageStyles.backgroundColor,
      }}
    >
      {visible.map((column) => (
        <div
          key={column.field}
          style={{
            display: 'flex',
            gap: spacing.sm,
            alignItems: 'flex-start',
            minHeight: 44,
            padding: `${spacing.xs} 0`,
            fontSize: font.sizeSm,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <span style={{ color: colors.textMuted, minWidth: 72, flexShrink: 0 }}>{column.label}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <DynamicFieldCell
              objectName="dealLineItem"
              recordId={item.id}
              field={column.field}
              descriptor={descriptorByField.get(column.field)}
              value={resolveFieldValue(item, column.field)}
              variant="child"
              row={item}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
```

- [ ] **Step 2: MobileLineItemList**

```tsx
// src/deals-board/mobile/MobileLineItemList.tsx
import type { LineItemQueryFilters } from '../api/line-items';
import type { FieldDescriptor } from '../metadata/types';
import type { ColumnConfig, LineItemRow } from '../types';
import { MobileLineItemRow } from './MobileLineItemRow';

type MobileLineItemListProps = {
  opportunityId: string;
  items: LineItemRow[];
  columns: ColumnConfig[];
  descriptorByField: Map<string, FieldDescriptor>;
  filters?: LineItemQueryFilters;
};

export const MobileLineItemList = ({
  items,
  columns,
  descriptorByField,
}: MobileLineItemListProps) => {
  if (items.length === 0) return null;
  return (
    <div style={{ marginTop: 8 }}>
      {items.map((item) => (
        <MobileLineItemRow
          key={item.id}
          item={item}
          columns={columns}
          descriptorByField={descriptorByField}
        />
      ))}
    </div>
  );
};
```

- [ ] **Step 3: MobileDealCard**

Use `useDealExpandState` callbacks passed from parent. Render parent visible columns via `DynamicFieldCell` with `variant="parent"`. For `summary` field use existing override. Left accent from `getStageRowStyles`.

```tsx
// src/deals-board/mobile/MobileDealCard.tsx
import { DynamicFieldCell } from '../cells/DynamicFieldCell';
import { DealSummaryChips } from '../DealsTable/DealSummaryChips';
import type { LineItemQueryFilters } from '../api/line-items';
import type { FieldDescriptor } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import { ChevronRightIcon } from '../ui/Icons';
import { visibleColumns } from '../utils/columns';
import { resolveFieldValue } from '../utils/resolve-field-value';
import { getStageRowStyles } from '../utils/stage-row-styles';
import type { ColumnConfig, LineItemRow, OpportunityRow } from '../types';
import { MobileLineItemList } from './MobileLineItemList';

type MobileDealCardProps = {
  row: OpportunityRow;
  lineItems: LineItemRow[];
  parentColumns: ColumnConfig[];
  childColumns: ColumnConfig[];
  parentDescriptorByField: Map<string, FieldDescriptor>;
  childDescriptorByField: Map<string, FieldDescriptor>;
  opportunityLinkFields: FieldDescriptor[];
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  lineItemFilters?: LineItemQueryFilters;
};

export const MobileDealCard = ({
  row,
  lineItems,
  parentColumns,
  childColumns,
  parentDescriptorByField,
  childDescriptorByField,
  opportunityLinkFields,
  isExpanded,
  onToggleExpand,
  lineItemFilters,
}: MobileDealCardProps) => {
  const theme = useTheme();
  const { colors, font, spacing, radius, colorScheme } = theme;
  const visibleParent = visibleColumns(parentColumns);
  const stageStyles = getStageRowStyles(typeof row.stage === 'string' ? row.stage : null, colorScheme, 'parent');
  const dealLineItems = lineItems.filter((item) => item.opportunityId === row.id);

  return (
    <div
      onClick={() => onToggleExpand(row.id)}
      style={{
        border: `1px solid ${colors.borderSubtle}`,
        borderLeft: `4px solid ${stageStyles.accentColor}`,
        borderRadius: radius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
        backgroundColor: stageStyles.backgroundColor,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.sm }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {visibleParent.map((column) => {
            if (column.field === 'summary') {
              return (
                <div key={column.field} style={{ marginTop: spacing.xs }}>
                  <DealSummaryChips items={dealLineItems} />
                </div>
              );
            }
            return (
              <div
                key={column.field}
                onClick={(event) => event.stopPropagation()}
                style={{ marginBottom: spacing.xs, fontSize: font.sizeSm }}
              >
                <DynamicFieldCell
                  objectName="opportunity"
                  recordId={row.id}
                  field={column.field}
                  descriptor={parentDescriptorByField.get(column.field)}
                  value={resolveFieldValue(row, column.field)}
                  variant="parent"
                  lineItems={dealLineItems}
                  isExpanded={isExpanded}
                  companyName={row.companyName}
                  row={row}
                  opportunityLinkFields={opportunityLinkFields}
                  onToggleExpand={onToggleExpand}
                />
              </div>
            );
          })}
        </div>
        <button
          type="button"
          data-expand-btn
          onClick={(event) => {
            event.stopPropagation();
            onToggleExpand(row.id);
          }}
          aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
          style={{
            border: 'none',
            background: 'transparent',
            minWidth: 44,
            minHeight: 44,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            color: colors.textMuted,
            cursor: 'pointer',
          }}
        >
          <ChevronRightIcon size={18} color="currentColor" />
        </button>
      </div>
      {isExpanded ? (
        <div onClick={(event) => event.stopPropagation()}>
          <MobileLineItemList
            opportunityId={row.id}
            items={dealLineItems}
            columns={childColumns}
            descriptorByField={childDescriptorByField}
            filters={lineItemFilters}
          />
        </div>
      ) : null}
    </div>
  );
};
```

- [ ] **Step 4: Lint**

Run: `yarn lint`

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/mobile/MobileDealCard.tsx src/deals-board/mobile/MobileLineItemList.tsx src/deals-board/mobile/MobileLineItemRow.tsx
git commit -m "feat: add mobile deal cards with expandable line items"
```

---

### Task 8: MobileDealsBoard with pagination

**Files:**
- Create: `src/deals-board/mobile/MobileDealsBoard.tsx`

- [ ] **Step 1: Implement orchestrator**

Integrate `useDealExpandState` + `useExpandMode` exactly as in `DealsTable.tsx` (build `lineItemsByOpportunity` Map and `opportunityStageById` Map first). Manage sheet open state locally. Implement «Показать ещё» by calling `onPageChange(page + 1)` — parent `DealsBoard` must accumulate records (Task 9).

```tsx
// src/deals-board/mobile/MobileDealsBoard.tsx
import { useMemo, useState } from 'react';

import { countActiveQuickFilters } from '../utils/count-active-quick-filters';
import { useDealExpandState } from '../hooks/useDealExpandState';
import { useExpandMode } from '../hooks/useExpandMode';
import { useTheme } from '../theme/ThemeContext';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Spinner } from '../ui/Spinner';
import { MobileDealCard } from './MobileDealCard';
import { MobileToolbar } from './MobileToolbar';
import { MobileViewSwitcherSheet } from './MobileViewSwitcherSheet';
import type { MobileDealsBoardProps } from './types';

export const MobileDealsBoard = (props: MobileDealsBoardProps) => {
  const {
    activeView,
    views,
    parentColumns,
    childColumns,
    parentDescriptorByField,
    childDescriptorByField,
    opportunityLinkFields,
    records,
    lineItems,
    lineItemFilters,
    totalCount,
    page,
    totalPages,
    showAll,
    quickFilters,
    onQuickFiltersChange,
    onPageChange,
    onSelectView,
    onCreateView,
    onResetFilters,
    isLoading,
    isViewLoading,
    errorMessage,
  } = props;

  const theme = useTheme();
  const { spacing } = theme;
  const { mode } = useExpandMode();

  const lineItemsByOpportunity = useMemo(() => {
    const grouped = new Map<string, typeof lineItems>();
    for (const item of lineItems) {
      const current = grouped.get(item.opportunityId) ?? [];
      grouped.set(item.opportunityId, [...current, item]);
    }
    return grouped;
  }, [lineItems]);

  const opportunityStageById = useMemo(
    () =>
      new Map(
        records.map((record) => [
          record.id,
          typeof record.stage === 'string' ? record.stage : null,
        ]),
      ),
    [records],
  );

  const { isExpanded, toggleExpand } = useDealExpandState(
    activeView?.id,
    lineItemsByOpportunity,
    mode,
    opportunityStageById,
  );

  const [viewSheetOpen, setViewSheetOpen] = useState(false);
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);

  const activeFilterCount = countActiveQuickFilters(quickFilters);

  const hasMore = !showAll && page < totalPages - 1;

  return (
    <div data-mobile-deals-board>
      <MobileToolbar
        activeView={activeView}
        totalCount={totalCount}
        search={quickFilters.search}
        onSearchChange={(search) => onQuickFiltersChange({ ...quickFilters, search })}
        onOpenViewSheet={() => setViewSheetOpen(true)}
        onOpenSettingsSheet={() => setSettingsSheetOpen(true)}
      />

      {activeFilterCount > 0 ? (
        <div style={{ padding: `${spacing.xs} ${spacing.md}` }}>
          <Button
            theme={theme}
            variant="secondary"
            size="sm"
            onClick={() => setFiltersSheetOpen(true)}
            style={{ minHeight: 44 }}
          >
            Фильтры · {activeFilterCount}
          </Button>
        </div>
      ) : (
        <div style={{ padding: `${spacing.xs} ${spacing.md}` }}>
          <Button theme={theme} variant="ghost" size="sm" onClick={() => setFiltersSheetOpen(true)} style={{ minHeight: 44 }}>
            Фильтры
          </Button>
        </div>
      )}

      {errorMessage ? (
        <div role="alert" style={{ padding: spacing.md, color: theme.colors.danger }}>
          {errorMessage}
        </div>
      ) : null}

      {isLoading || isViewLoading ? (
        <Spinner theme={theme} label="Загрузка сделок..." />
      ) : records.length === 0 ? (
        <EmptyState
          theme={theme}
          title="Нет сделок"
          action={onResetFilters ? { label: 'Сбросить фильтры', onClick: onResetFilters } : undefined}
        />
      ) : (
        <div style={{ padding: `0 ${spacing.md} ${spacing.md}` }}>
          {records.map((row) => (
            <MobileDealCard
              key={row.id}
              row={row}
              lineItems={lineItems}
              parentColumns={parentColumns}
              childColumns={childColumns}
              parentDescriptorByField={parentDescriptorByField}
              childDescriptorByField={childDescriptorByField}
              opportunityLinkFields={opportunityLinkFields}
              isExpanded={isExpanded(row.id)}
              onToggleExpand={toggleExpand}
              lineItemFilters={lineItemFilters}
            />
          ))}
          {hasMore ? (
            <Button
              theme={theme}
              variant="secondary"
              size="md"
              onClick={() => onPageChange(page + 1)}
              style={{ width: '100%', minHeight: 44, marginTop: spacing.sm }}
            >
              Показать ещё
            </Button>
          ) : null}
        </div>
      )}

      <MobileViewSwitcherSheet
        isOpen={viewSheetOpen}
        onClose={() => setViewSheetOpen(false)}
        views={views}
        activeViewId={activeView?.id}
        onSelectView={onSelectView}
        onCreateView={onCreateView}
      />

      {/* MobileFiltersSheet and MobileSettingsSheet wired in Tasks 10–11 */}
    </div>
  );
};
```

Smart expand is handled inside `useDealExpandState` via `computeIsExpanded` — no separate `applySmartExpand` call needed.

- [ ] **Step 2: Lint**

Run: `yarn lint`

- [ ] **Step 3: Commit**

```bash
git add src/deals-board/mobile/MobileDealsBoard.tsx
git commit -m "feat: add MobileDealsBoard list orchestrator"
```

---

### Task 9: Wire layout branch in DealsBoard

**Files:**
- Modify: `src/deals-board/DealsBoard.tsx`

- [ ] **Step 1: Add layout mode and record accumulation for mobile pagination**

In `DealsBoardContent`:

1. `const layoutMode = useLayoutMode(rootRef);`
2. Add accumulated records state for mobile «Показать ещё»:

```typescript
import { useLayoutMode } from './hooks/useLayoutMode';
import { MobileDealsBoard } from './mobile/MobileDealsBoard';

const layoutMode = useLayoutMode(rootRef);
const [accumulatedRecords, setAccumulatedRecords] = useState<OpportunityRow[]>([]);

useEffect(() => {
  if (layoutMode !== 'mobile' || showAllDeals) {
    setAccumulatedRecords(records);
    return;
  }
  if (page === 0) {
    setAccumulatedRecords(records);
    return;
  }
  setAccumulatedRecords((prev) => {
    const seen = new Set(prev.map((r) => r.id));
    const merged = [...prev];
    for (const record of records) {
      if (!seen.has(record.id)) merged.push(record);
    }
    return merged;
  });
}, [layoutMode, page, records, showAllDeals]);

const mobileRecords = layoutMode === 'mobile' && !showAllDeals ? accumulatedRecords : visibleRecords;
```

3. Reset accumulation when filters/view change (already `setPage(0)` on filter change).

4. Conditionally render toolbar + table vs mobile:

```tsx
{layoutMode === 'desktop' ? (
  <>
    {/* existing toolbar: ViewSwitcher, QuickFiltersBar, header with ColumnPicker */}
    <DealsTable ... records={visibleRecords} ... />
  </>
) : (
  <MobileDealsBoard
    activeView={activeView}
    views={views}
    parentColumns={mergedParentColumns}
    childColumns={mergedChildColumns}
    parentDescriptorByField={parentDescriptorByField}
    childDescriptorByField={childDescriptorByField}
    opportunityLinkFields={opportunityLinkFields}
    records={mobileRecords}
    lineItems={visibleLineItems}
    lineItemFilters={lineItemQueryFilters}
    totalCount={visibleTotalCount}
    page={page}
    totalPages={totalPages}
    showAll={showAllDeals}
    quickFilters={quickFilters}
    onQuickFiltersChange={setQuickFilters}
    onQuickFiltersReset={() => setQuickFilters(DEFAULT_QUICK_FILTERS)}
    onPageChange={setPage}
    onSelectView={setActiveViewId}
    onCreateView={() => setIsCreateModalOpen(true)}
    onEditView={() => activeView && setEditViewDraft(activeView)}
    onParentColumnsSave={(columns) => saveActiveViewColumns('parent', columns)}
    onChildColumnsSave={(columns) => saveActiveViewColumns('child', columns)}
    onShowAllChange={(next) => void handleShowAllChange(next)}
    onResetFilters={() => setQuickFilters(DEFAULT_QUICK_FILTERS)}
    isLoading={opportunitiesQuery.isLoading}
    isViewLoading={viewsQuery.isLoading || viewsQuery.isSeedingDefault}
    errorMessage={loadError instanceof Error ? loadError.message : loadError ? String(loadError) : undefined}
  />
)}
```

5. Keep warning banners and `ViewSettingsModal` outside the branch (shared).

- [ ] **Step 2: Run unit tests**

Run: `yarn test:unit`
Expected: all existing tests PASS

- [ ] **Step 3: Lint**

Run: `yarn lint`

- [ ] **Step 4: Commit**

```bash
git add src/deals-board/DealsBoard.tsx
git commit -m "feat: branch DealsBoard to mobile layout below 768px"
```

---

### Task 10: MobileFiltersSheet

**Files:**
- Create: `src/deals-board/mobile/MobileFiltersSheet.tsx`
- Modify: `src/deals-board/mobile/MobileDealsBoard.tsx`

- [ ] **Step 1: Create filters sheet**

Wrap existing `QuickFiltersBar` inside `BottomSheet`. Add footer buttons «Сбросить» and «Применить» (apply = close sheet; filters already live-update via `onChange`).

```tsx
// src/deals-board/mobile/MobileFiltersSheet.tsx
import { QuickFiltersBar, type QuickFiltersValue } from '../QuickFiltersBar';
import { useTheme } from '../theme/ThemeContext';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';

type MobileFiltersSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  value: QuickFiltersValue;
  onChange: (next: QuickFiltersValue) => void;
  onReset: () => void;
};

export const MobileFiltersSheet = ({ isOpen, onClose, value, onChange, onReset }: MobileFiltersSheetProps) => {
  const theme = useTheme();
  const { spacing } = theme;

  return (
    <BottomSheet theme={theme} isOpen={isOpen} title="Фильтры" onClose={onClose}>
      <QuickFiltersBar value={value} onChange={onChange} onReset={onReset} />
      <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md }}>
        <Button theme={theme} variant="ghost" size="md" onClick={onReset} style={{ flex: 1, minHeight: 44 }}>
          Сбросить
        </Button>
        <Button theme={theme} variant="primary" size="md" onClick={onClose} style={{ flex: 1, minHeight: 44 }}>
          Применить
        </Button>
      </div>
    </BottomSheet>
  );
};
```

- [ ] **Step 2: Wire into MobileDealsBoard**

Import and render `MobileFiltersSheet` with `filtersSheetOpen` state.

- [ ] **Step 3: Commit**

```bash
git add src/deals-board/mobile/MobileFiltersSheet.tsx src/deals-board/mobile/MobileDealsBoard.tsx
git commit -m "feat: add mobile filters bottom sheet"
```

---

### Task 11: MobileSettingsSheet

**Files:**
- Create: `src/deals-board/mobile/MobileSettingsSheet.tsx`
- Modify: `src/deals-board/mobile/MobileDealsBoard.tsx`

- [ ] **Step 1: Create settings sheet**

```tsx
// src/deals-board/mobile/MobileSettingsSheet.tsx
import { ColumnPicker } from '../ColumnPicker';
import { ExpandModeToggle } from '../ExpandModeToggle';
import { useTheme } from '../theme/ThemeContext';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import type { ColumnConfig, DealBoardViewRecord } from '../types';

type MobileSettingsSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  activeView?: DealBoardViewRecord;
  parentColumns: ColumnConfig[];
  childColumns: ColumnConfig[];
  showAll: boolean;
  onEditView: () => void;
  onParentColumnsSave: (columns: ColumnConfig[]) => void;
  onChildColumnsSave: (columns: ColumnConfig[]) => void;
  onShowAllChange: (showAll: boolean) => void;
};

export const MobileSettingsSheet = ({
  isOpen,
  onClose,
  activeView,
  parentColumns,
  childColumns,
  showAll,
  onEditView,
  onParentColumnsSave,
  onChildColumnsSave,
  onShowAllChange,
}: MobileSettingsSheetProps) => {
  const theme = useTheme();
  const { spacing, font, colors } = theme;

  return (
    <BottomSheet theme={theme} isOpen={isOpen} title="Настройки" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
        <div>
          <div style={{ fontSize: font.sizeXs, color: colors.textMuted, marginBottom: spacing.xs }}>
            Режим раскрытия
          </div>
          <ExpandModeToggle />
        </div>
        <div>
          <div style={{ fontSize: font.sizeXs, color: colors.textMuted, marginBottom: spacing.xs }}>
            Колонки сделок
          </div>
          <ColumnPicker target="parent" columns={parentColumns} onSave={onParentColumnsSave} />
        </div>
        <div>
          <div style={{ fontSize: font.sizeXs, color: colors.textMuted, marginBottom: spacing.xs }}>
            Колонки позиций
          </div>
          <ColumnPicker target="child" columns={childColumns} onSave={onChildColumnsSave} />
        </div>
        <Button
          theme={theme}
          variant="secondary"
          size="md"
          disabled={!activeView}
          onClick={() => {
            onEditView();
            onClose();
          }}
          style={{ minHeight: 44, width: '100%' }}
        >
          Редактировать view
        </Button>
        <label style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, minHeight: 44 }}>
          <input
            type="checkbox"
            checked={showAll}
            onChange={(event) => onShowAllChange(event.target.checked)}
          />
          <span style={{ fontSize: font.sizeSm }}>Показать все сделки</span>
        </label>
      </div>
    </BottomSheet>
  );
};
```

- [ ] **Step 2: Wire into MobileDealsBoard** with props from `MobileDealsBoardProps`.

- [ ] **Step 3: Commit**

```bash
git add src/deals-board/mobile/MobileSettingsSheet.tsx src/deals-board/mobile/MobileDealsBoard.tsx
git commit -m "feat: add mobile settings bottom sheet"
```

---

### Task 12: LineItemListMenu sheet variant

**Files:**
- Modify: `src/deals-board/LineItemListMenu.tsx`
- Modify: `src/deals-board/cells/overrides.tsx` (pass presentation prop for list menu field)

- [ ] **Step 1: Add `presentation` prop**

```typescript
type LineItemListMenuProps = {
  lineItemId: string;
  listStatus: LineItemListStatus | null | undefined;
  presentation?: 'inline' | 'sheet';
};
```

When `presentation === 'sheet'`:
- Render a single ⋮ button (44px)
- On click, open `BottomSheet` with full-width action buttons using `LINE_ITEM_LIST_ACTIONS` labels (not just shortLabel)
- Keep same `handleAction` logic

Default `presentation='inline'` preserves desktop behavior.

- [ ] **Step 2: Pass sheet variant from mobile**

In `MobileLineItemRow`, detect mobile context. Simplest approach: add optional prop `listMenuPresentation?: 'inline' | 'sheet'` on `MobileLineItemRow`, default `'sheet'`, and pass to `LineItemListMenu` via field override.

Update `overrides.tsx` `LineItemListMenu` render to accept `listMenuPresentation` through `FieldOverrideProps`:

```typescript
listMenuPresentation?: 'inline' | 'sheet';
```

Pass `listMenuPresentation="sheet"` from `MobileLineItemRow` when rendering list menu field, or pass prop through `DynamicFieldCell`.

Alternative: always use sheet when `presentation` prop is set on `LineItemListMenu` from a React context `MobilePresentationContext` — only if prop drilling becomes unwieldy.

- [ ] **Step 3: Lint + unit tests**

Run: `yarn test:unit && yarn lint`

- [ ] **Step 4: Commit**

```bash
git add src/deals-board/LineItemListMenu.tsx src/deals-board/cells/overrides.tsx src/deals-board/mobile/MobileLineItemRow.tsx
git commit -m "feat: add sheet presentation for line item list menu on mobile"
```

---

### Task 13: Touch-friendly editor sizing

**Files:**
- Modify: `src/deals-board/theme/tokens.ts` (optional `touchMinTarget: 44`)
- Modify: `src/deals-board/editors/SelectCell.tsx` (minHeight on trigger button when mobile — use context or CSS data attribute)

- [ ] **Step 1: Add layout data attribute on mobile root**

In `MobileDealsBoard` root div: `data-layout="mobile"`.

- [ ] **Step 2: Add global touch rule in GlobalThemeStyles**

```tsx
// In GlobalThemeStyles.tsx
'[data-layout="mobile"] button, [data-layout="mobile"] [role="button"]': {
  minHeight: '44px',
  minWidth: '44px',
},
```

Only apply where it does not break compact chips — scope to `[data-list-menu-btn]` and editor triggers specifically if global rule is too broad.

- [ ] **Step 3: Verify editors open and are tappable on mobile layout**

Manual: stage select, link cell, rich text popover open correctly through portal.

- [ ] **Step 4: Commit**

```bash
git add src/deals-board/theme/GlobalThemeStyles.tsx src/deals-board/mobile/MobileDealsBoard.tsx
git commit -m "feat: improve touch targets on mobile layout"
```

---

### Task 14: Final verification and version bump

**Files:**
- Modify: `package.json` (version bump, e.g. `0.2.85` → `0.2.86`)

- [ ] **Step 1: Run full test suite**

Run: `yarn test:unit`
Expected: PASS

Run: `yarn lint`
Expected: PASS

- [ ] **Step 2: Build front component**

Run: `yarn twenty dev:build`
Expected: build succeeds, checksum updates

- [ ] **Step 3: Manual QA checklist**

- [ ] iOS Safari or Chrome DevTools 375px: view switcher, search, filters sheet, settings sheet
- [ ] Expand/collapse deal cards; smart expand mode works
- [ ] Edit line item stage, links, plenka
- [ ] Line item list menu actions
- [ ] Create/edit view modals
- [ ] «Показать ещё» loads and appends records
- [ ] Desktop width ≥ 768px: no regression

- [ ] **Step 4: Bump version**

```json
"version": "0.2.86"
```

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "chore: release 0.2.86 with mobile deals board"
```

---

## Spec Coverage Checklist

| Spec requirement | Task |
|------------------|------|
| Breakpoint 768px layout switch | Task 1, 9 |
| Card-based deal list | Task 7, 8 |
| Bottom sheets (filters, settings, views) | Task 3, 5, 10, 11 |
| Full quick filters | Task 10 |
| View switcher + create view | Task 5 |
| Column pickers + expand mode + edit view + showAll | Task 11 |
| Inline editing all field types | Task 7 (DynamicFieldCell reuse) |
| LineItemListMenu on mobile | Task 12 |
| Pagination «Показать ещё» | Task 8, 9 |
| Touch targets 44px | Task 13 |
| Remote DOM portals | Task 3 (root portal) |
| Desktop unchanged | Task 9 (branch) |
| Realtime sync unchanged | No task (existing hook stays) |

## Self-Review Notes

- `useDealExpandState(activeViewId, lineItemsByOpportunity, mode, opportunityStageById)` — copy grouping logic from `DealsTable.tsx`.
- `Button` accepts `style` via `ButtonHTMLAttributes`; `Input` may need wrapper `div` for width.
- `EmptyState` uses `action={{ label, onClick }}`, not `onAction`.
