# Deals Board — Twenty App Design Spec

**Date:** 2026-06-26  
**Status:** Approved (brainstorming)  
**Audience:** Implementation team  

## Summary

Twenty App «Реализация» — кастомный экран для отдела реализации: настраиваемая таблица сделок с вложенной таблицей позиций, inline-редактированием ключевых полей и системой views по образцу Twenty. Основной пользователь — координатор, который ежедневно просматривает все заказы и «стыкует» участников процесса (макеты → печать → накатка → монтаж).

## Goals

- Видеть все сделки на одном экране без входа в карточки
- Быстро менять стадии позиций, ссылки на макеты, плёнку — в один-два клика
- Настраиваемые колонки отдельно для сделок и для позиций
- Сохранённые views (личные и общие) с фильтрами и сортировкой
- Перенос полей `stage`, `ssylkaNaMakety`, `plenka` на уровень позиции сделки

## Non-Goals (v1)

- Отдельный view «Сводка расходов»
- Автосинхронизация стадии сделки ↔ позиций
- Миграция исторических данных с уровня сделки на позиции
- Kanban / календарь
- Изменение стадий на уровне сделки (пользователь сделает это отдельно позже)

## Context

| Объект | Записей | Примечание |
|--------|---------|------------|
| opportunities | ~232 | Кастомные поля: stage, plenka, ssylkaNaMakety, loadDate, ссылки Tony/Bitrix и др. |
| dealLineItems | ~611 | Сейчас: name, kolichestvo, amount, kommentariy, warehouseItemId |

Стадии сделки (текущие, переносятся на позиции): `NOVYY`, `V_RABOTE`, `V_PECHATI`, `OKLEYKA`, `GOTOVO`, `RESTAVRACIYA`, `OTMENA`.

## Architecture

### Approach

**Рекомендованный и утверждённый подход:** полноэкранный `Front Component` (`DealsBoard`) как пункт навигации в sidebar Twenty. Альтернативы (нативный view + drawer, split-view) отклонены — не дают обзор всех сделок с позициями на одном экране.

```
Sidebar Twenty → «Реализация» (NavigationMenuItem)
        ↓
Front Component: DealsBoard
  ├── View switcher + Quick filters + Settings
  ├── Parent table: Opportunities
  └── Child table: Deal Line Items (per expanded row)
        ↓
Twenty GraphQL API (read/write)
        ↓
opportunities · dealLineItems · dealBoardViews · companies
```

### Twenty App Entities

| Entity | Purpose |
|--------|---------|
| `defineFrontComponent` | Главный экран `DealsBoard` |
| `defineNavigationMenuItem` | Пункт «Реализация» в sidebar |
| `defineField` on `dealLineItem` | `stage`, `ssylkaNaMakety`, `plenka` |
| Custom object `dealBoardView` | Сохранённые конфигурации views |
| App role | read/write: opportunity, dealLineItem, dealBoardView; read: company, product |

### New Fields on `dealLineItem`

| Field | Type | Notes |
|-------|------|-------|
| `stage` | SELECT | Те же options, что у `opportunity.stage` сегодня |
| `ssylkaNaMakety` | LINKS | Ссылка на макеты |
| `plenka` | RICH_TEXT | Плёнка |

Стадию сделки в приложении не изменяем. В дефолтном view стадия сделки скрыта; фокус на стадиях позиций.

### Custom Object `dealBoardView`

| Field | Type | Description |
|-------|------|-------------|
| `name` | TEXT | Имя view, напр. «Утренний обзор» |
| `visibility` | SELECT | `personal` \| `workspace` |
| `ownerId` | RELATION → workspaceMember | Автор (для personal views) |
| `parentColumns` | RAW_JSON | `[{field, width, order, visible}]` |
| `childColumns` | RAW_JSON | Конфигурация колонок позиций |
| `filters` | RAW_JSON | `{dateRange, stages, oplata, search}` |
| `sort` | RAW_JSON | `[{field, direction}]` |
| `isDefault` | BOOLEAN | View по умолчанию для workspace |

При установке app создаётся общий view **«Базовый обзор»** с колонками: Сделка, Дата, Компания, Сводка позиций, Стадия позиции, Макеты, Плёнка, Кол-во, Сумма.

## UI/UX

### Screen Layout

1. **View switcher** — dropdown, «+ Новый view», как в Twenty
2. **Quick filters** — над таблицей, сбрасываются независимо от view
3. **Parent table** — сделки, virtual scroll, sticky первая колонка
4. **Child table** — позиции внутри раскрытой строки

### Collapsed Deal Row

Обязательные элементы свёрнутой строки:

- Название сделки (ссылка на карточку в Twenty)
- `loadDate`
- Название компании
- **Сводка позиций** — чипы: `3 поз.: 1 печать · 2 оклейка` (цвета стадий)
- Опционально: сумма, иконки Tony/Bitrix

### Expand Mode (user setting)

Переключатель в настройках приложения, сохраняется per-user (localStorage в v1):

| Mode | Behavior |
|------|----------|
| **Свёрнуто** | Все сделки свёрнуты, только сводка |
| **Умное раскрытие** | Авто-раскрытие сделок с позициями не в `GOTOVO` / `OTMENA` |

Ручное ▶/▼ работает в обоих режимах. Состояние expand запоминается в сессии.

### Editing (hybrid)

| Field | Interaction |
|-------|-------------|
| Стадия позиции | Inline select, save on change |
| Ссылка на макеты | Inline URL; иконка 🔗 если заполнено |
| Количество | Inline number |
| Плёнка | Popover rich-text editor |
| Комментарий | Popover rich-text editor |
| Сумма | Read-only |

Optimistic update + toast при ошибке. Стадия — retry 1 раз при сетевой ошибке.

### Views

- Формат как Twenty Views: именованные конфигурации
- При создании: **личный** или **общий для workspace**
- Отдельные наборы колонок для parent и child table
- Column picker — два независимых («Колонки сделки» / «Колонки позиций»)
- Сохраняются: колонки, порядок, ширина, фильтры view, сортировка

### Quick Filters (above table)

| Filter | Field | Logic |
|--------|-------|-------|
| Дата | `opportunity.loadDate` | Диапазон / пресеты (сегодня, неделя, месяц) |
| Стадия позиции | `dealLineItem.stage` | Мультиселект; сделка видна если ≥1 позиция совпадает |
| Оплата | `opportunity.oplata` | Select |
| Поиск | name сделки / позиции | Text |

Quick filters не привязаны жёстко к view; кнопка «Сбросить фильтры».

### Visual Style

- `twenty-sdk/ui` components (Button, Tag, Status, Chip)
- `useColorScheme()` для light/dark
- Compact row density
- Stage colors consistent with CRM

## Data Flow

```
DealsBoard
  ├─ loadViews()         → dealBoardView
  ├─ loadOpportunities() → GraphQL + filters/sort/pagination (50–100/page)
  ├─ loadLineItems()     → batch by opportunityId for visible rows
  ├─ updateLineItem()    → GraphQL mutation
  └─ saveView()          → create/update dealBoardView
```

**Load strategy:**

1. Opportunities paginated / virtual scroll
2. Line items batch-loaded for visible opportunity IDs
3. On expand: load from cache or fetch if missing
4. Company names batch-loaded by `companyId`

**Cache:** React Query with invalidation on mutation.

## Component Structure

```
DealsBoard/
├── DealsBoard.tsx
├── ViewSwitcher.tsx
├── QuickFiltersBar.tsx
├── DealsTable/
│   ├── DealsTable.tsx
│   ├── DealRow.tsx
│   ├── DealSummaryChips.tsx
│   └── LineItemsTable.tsx
├── editors/
│   ├── StageSelect.tsx
│   ├── LinkCell.tsx
│   ├── RichTextPopover.tsx
│   └── NumberCell.tsx
├── ColumnPicker.tsx
├── ViewSettingsModal.tsx
├── AppSettingsModal.tsx
├── hooks/
│   ├── useOpportunities.ts
│   ├── useLineItems.ts
│   ├── useDealBoardViews.ts
│   └── useExpandMode.ts
└── api/
    ├── opportunities.ts
    ├── lineItems.ts
    └── views.ts
```

## Error Handling

| Situation | Response |
|-----------|----------|
| Save failure | Rollback optimistic update + error toast |
| Network offline | Toast; retry on next action |
| Empty filter result | Empty state + «Сбросить фильтры» |
| Deal with 0 line items | No expand arrow; «0 позиций» |
| Large dataset | Virtual scroll + loading indicator |

## Testing (v1)

| Level | Scope |
|-------|-------|
| Manual | 50+ deals, expand, stage change, view save |
| Unit | `DealSummaryChips` aggregation; column JSON parsing |
| Integration | GraphQL mutations on staging workspace |

E2E in Twenty browser — after first deploy to staging.

## Repository & Deployment

### GitHub

| Setting | Value |
|---------|-------|
| Owner | `3au4uk-1` |
| Visibility | Private |
| Default branch | `main` |
| Commit author | `3au4uk-1` / `forsteam.vd2@mail.ru` |

Проект — Twenty App (`deals-board`), scaffold через `create-twenty-app@2.16.0`.

### GitHub Actions

**CI** (`.github/workflows/ci.yml`):
- Триггер: push/PR в `main`
- Поднимает изолированный Twenty (`spawn-twenty-app-dev-test`)
- `yarn install --immutable` → `yarn test`
- Секреты не требуются

**CD** (`.github/workflows/cd.yml`):
- Триггер: push в `main`; PR с меткой `deploy` — preview-деплой
- `deploy-twenty-app` → `install-twenty-app` (actions из `twentyhq/twenty@main`)
- **Variable:** `TWENTY_DEPLOY_URL` — URL production Twenty-сервера
- **Secret:** `TWENTY_DEPLOY_API_KEY` — API-ключ с правом deploy

До настройки variable/secret CD завершится ошибкой — это ожидаемо.

## Implementation Order

1. Scaffold Twenty App + `dealLineItem` fields + `dealBoardView` object
2. Load opportunities + flat parent table
3. Nested `LineItemsTable` + summary chips
4. Inline/popover editors
5. Views: switcher, column picker, persistence
6. Quick filters + expand mode setting
7. Virtual scroll + polish

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | Full Front Component | Единственный вариант с nested table и one-click edit |
| Default screen | Full list + quick filters | Пользователь настраивает под задачу |
| Expand default | Toggle A ↔ C in settings | Пользователь не мог выбрать одно; даём переключатель |
| Views | Twenty format, each configurable | Личные + workspace, как в Twenty |
| Deal vs line stage | Independent; deal stage TBD by user | Стадии переносятся на позиции |
| Expense view | Out of scope v1 | Явно исключено |
| Editing | Hybrid inline + popover | Стадия/ссылка быстро; плёнка — rich text |
| View visibility | Personal or workspace (like Twenty) | Общий базовый + личные |
| Expand preference storage | localStorage v1 | Простота без extension workspaceMember |
