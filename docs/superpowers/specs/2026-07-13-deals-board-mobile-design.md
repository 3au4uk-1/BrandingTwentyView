# Deals Board — Mobile Design Spec

**Date:** 2026-07-13  
**Status:** Approved (brainstorming)  
**Audience:** Implementation team  
**Parent spec:** [2026-06-26-deals-board-twenty-app-design.md](./2026-06-26-deals-board-twenty-app-design.md)

## Summary

Добавить мобильную версию экрана «Реализация» для использования на производстве с телефона (~5–6"). Полный функциональный паритет с десктопом (views, фильтры, настройки колонок, inline-редактирование), но с адаптированной вёрсткой: карточки сделок вместо таблицы, фильтры и настройки в bottom sheets. Офлайн-режим не требуется — стабильный интернет на производстве.

## Goals

- Открывать тот же экран «Реализация» в Twenty с телефона и выполнять все те же задачи, что за компьютером
- Быстро просматривать статусы сделок и позиций на производстве
- Редактировать стадии, макеты, плёнку и другие поля позиций с телефона
- Переключать views, применять фильтры, настраивать колонки
- Сохранить единую кодовую базу и один Front Component — без дублирования бизнес-логики

## Non-Goals

- Офлайн-режим, PWA, push-уведомления
- Отдельный Front Component или пункт в sidebar Twenty
- Горизонтально скроллируемая «та же таблица» на телефоне
- Swipe-actions, kanban, жесты
- Оптимизация под планшет (отдельный tablet layout)
- Изменение навигации Twenty host (sidebar на мобиле)

## User Requirements (brainstorming)

| Параметр | Решение |
|----------|---------|
| Функционал | Полный паритет с десктопом |
| Устройство | Только телефон (~5–6") |
| Вёрстка | Тот же функционал, мобильный UI (карточки, bottom sheets) |
| Сеть | Стабильная, данные всегда с сервера |

## Architecture

### Approach

**Утверждённый подход:** адаптивный layout внутри существующего `DealsBoard` Front Component. При ширине контейнера < 768px рендерится мобильный presentation layer; при ≥ 768px — текущая таблица без изменений.

**Отклонённые альтернативы:**

| Подход | Причина отклонения |
|--------|-------------------|
| Отдельный Front Component «Mobile» | Дублирование ~70% оркестрации, два места для багфиксов, путаница в навигации |
| CSS-only адаптация таблицы | Неудобно на 360px, пользователь явно выбрал карточный UI |

```
DealsBoard (точка входа без изменений)
├── [shared] hooks, API, views, filters, realtime, theme, editors
├── useLayoutMode() → 'desktop' | 'mobile'  (breakpoint 768px)
│
├── desktop (width ≥ 768): DealsTable → DealRow → LineItemsTable
│
└── mobile (width < 768): MobileDealsBoard
    ├── MobileToolbar
    ├── MobileFiltersSheet
    ├── MobileSettingsSheet
    ├── MobileViewSwitcherSheet
    ├── MobileDealCardList (virtual scroll)
    │   └── MobileDealCard
    │       └── MobileLineItemList
    │           └── MobileLineItemRow
    └── [reuse] ViewSettingsModal, DynamicFieldCell, all cell editors
```

### Layout Mode Detection

```typescript
// src/deals-board/hooks/useLayoutMode.ts
const MOBILE_BREAKPOINT = 768;

// Uses useContainerWidth(rootRef) — already supports Remote DOM viewport
// via ownerDocument.defaultView.innerWidth fallback
// Returns 'mobile' | 'desktop'
// Subscribes to resize; state (filters, expand, active view) preserved on switch
```

### Remote DOM

Front components run in Twenty Remote DOM (Web Worker + sandboxed iframe). Overlays and sheets must:

- Render through existing `PortalHostProvider` / `resolvePortalContainer`
- Use root-relative positioning (not `position: fixed` + `getBoundingClientRect` alone)
- Fall back to `window.innerHeight` / `innerWidth` when ownerDocument is unavailable (existing pattern in `useContainerWidth`, host-height utilities)

## Mobile UI

### Screen Structure

```
┌─────────────────────────────┐
│ [View ▾]  🔍          [≡]  │  ← sticky toolbar
├─────────────────────────────┤
│ [Фильтры · N]               │  ← chip, opens filters sheet (if filters active)
├─────────────────────────────┤
│ ┌─ Deal card ─────────────┐ │
│ │ Title · Date            │ │
│ │ Company                 │ │
│ │ Summary chips           │ │
│ │              [▼ expand] │ │
│ └─────────────────────────┘ │
│         [Показать ещё]      │
└─────────────────────────────┘
```

### Toolbar

| Zone | Content |
|------|---------|
| Left | View switcher — active view name; tap opens `MobileViewSwitcherSheet` (list + «+ Новый view») |
| Center | Search — icon expands inline search or opens search in toolbar |
| Right | Menu ≡ — opens `MobileSettingsSheet` |

Record count badge next to view name (same as desktop).

Desktop-only toolbar actions (Edit view, ColumnPicker ×2) move into Settings sheet on mobile.

### MobileFiltersSheet

Full `QuickFiltersBar` functionality in a bottom sheet (~85% viewport height):

- Date presets (Сегодня, Завтра, Послезавтра, Неделя, Месяц, custom range)
- Stage, type, company multi-select
- Oplata filter (all / filled / empty)
- Search field (if not in toolbar)
- «Сбросить» and «Применить» buttons

Chip under toolbar: `Фильтры · N` when N quick filters are active (excluding default oplata=all and empty search).

### MobileSettingsSheet

| Item | Component reused |
|------|------------------|
| Expand mode | `ExpandModeToggle` (Умное / Свёрнуто) |
| Parent columns | `ColumnPicker` target="parent" |
| Child columns | `ColumnPicker` target="child" |
| Edit view | Opens `ViewSettingsModal` |
| Show all deals | Toggle `filters.showAll` on active view |

### MobileDealCard

Renders visible parent columns from active view (`ColumnPicker` respected):

| Field | Display |
|-------|---------|
| `name` | Title; tap opens opportunity in Twenty side panel |
| `loadDate` | Subtitle, formatted date |
| `companyName` | Text line |
| `summary` | Stage summary chips (existing logic) |
| `links` | Tony / Bitrix icons |
| Other visible columns | «Label: value» row |

Left accent bar from `getStageRowStyles` (parent stage).

Expand: chevron on right; tap card body toggles expand (links and editable fields use `stopPropagation`). State: `useDealExpandState` + `useExpandMode` (unchanged).

### MobileLineItemRow

Visible child columns from active view:

- `name` — position title
- `stage` — inline `SelectCell` / `DealStageSelect`
- `ssylkaNaMakety` — `LinkCell`
- `plenka` — `RichTextPopover`
- `kolichestvo`, `amount` — formatted inline
- `tip`, `kommentariy`, other visible fields — label/value rows
- `LineItemListMenu` — actions in bottom sheet (not anchor popover)

All editing via existing `DynamicFieldCell` and editor components.

### Pagination

Same server pagination (`PAGE_SIZE = 50`). Bottom of list: **«Показать ещё»** button (append next page) instead of page number controls.

### Empty and Loading States

Reuse `EmptyState`, `Spinner` with mobile-appropriate padding.

## Touch and Interaction

| Pattern | Rule |
|---------|------|
| Tap target | Minimum 44×44px for buttons, chevrons, menu icons |
| Scroll | Card list scrolls within widget; toolbar sticky at top |
| Hover | Disable hover-dependent UI on mobile (`isHovered` unused in mobile cards) |
| Long press / swipe | Not in v1 |
| Keyboard | Toolbar remains visible when search/editors focused |

### BottomSheet (new shared primitive)

- Overlay + panel from bottom
- Close: tap overlay, «Готово» button, Escape key
- Portal via `PortalHost`; root-relative positioning for Remote DOM
- Used by: filters sheet, settings sheet, view switcher sheet, line item list menu

### Editor Modals on Mobile

Existing modals (`DatePickerModal`, `TimePickerModal`, `RichTextPopover`, select dropdowns):

- Full-width where applicable
- Touch-friendly padding and 44px targets
- No change to save/API logic

## Error Handling

Same logic as desktop; mobile-appropriate layout:

| Case | Behavior |
|------|----------|
| Opportunities load failure | Banner under toolbar + retry |
| Metadata warning | Yellow banner (unchanged message) |
| Line items load failure | Banner; deal cards still visible |
| Cell save failure | Inline error in line item row (via `useUpdateRecord`) |
| LineItemListMenu failure | Error text inside sheet |
| View / showAll save failure | `window.alert` (unchanged for v1) |

Realtime sync (`useDealsBoardRealtimeSync`) — no mobile-specific branch.

## File Structure (new)

```
src/deals-board/
├── hooks/useLayoutMode.ts
├── mobile/
│   ├── MobileDealsBoard.tsx
│   ├── MobileDealCard.tsx
│   ├── MobileLineItemList.tsx
│   ├── MobileLineItemRow.tsx
│   ├── MobileToolbar.tsx
│   ├── MobileFiltersSheet.tsx
│   ├── MobileSettingsSheet.tsx
│   └── MobileViewSwitcherSheet.tsx
└── ui/BottomSheet.tsx
```

**Modified:** `DealsBoard.tsx` — branch on `useLayoutMode`; pass shared props to `DealsTable` or `MobileDealsBoard`.

## Testing

| Level | Scope |
|-------|--------|
| Unit | `useLayoutMode` breakpoint; `BottomSheet` open/close; column-to-card field mapping |
| Unit (regression) | Existing hooks, API, editors — must pass unchanged |
| Manual QA | iOS Safari + Android Chrome: views, filters, expand, edit stage/links/plenka, list menu, create view, pagination, realtime update from second device |
| Desktop regression | Width ≥ 768px — no visual or behavioral change |

Vitest: mock container width 375 (mobile) and 1024 (desktop) for layout branch tests.

## Implementation Phases

Phases are development order only; ship complete mobile parity in one release.

1. **Foundation:** `useLayoutMode`, `BottomSheet`, `MobileToolbar`, `MobileViewSwitcherSheet`, read-only `MobileDealCard` + expand
2. **Editing:** `MobileLineItemRow` + `DynamicFieldCell`, `LineItemListMenu` in sheet, touch-sized editors
3. **Full parity:** `MobileFiltersSheet`, `MobileSettingsSheet`, «Показать ещё» pagination, device QA

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Remote DOM clips sheets | Portal + root-relative positioning (proven in line-item menu work) |
| Editors awkward on touch | Full-width modals, 44px targets |
| Large scope | Phased dev internally; reuse shared hooks/API/editors |
| Narrow Twenty host on phone | Adapt to available container width; host nav out of scope |
