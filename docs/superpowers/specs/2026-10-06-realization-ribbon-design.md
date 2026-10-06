# Реализация — лента вкладок вместо сводки

Date: 2026-10-06  
Status: approved in conversation, pending spec review  
Repo: BrandingTwentyView  
Scope: desktop chrome of the Реализация board (`BoardToolbar` + removal of `BoardInsightPanel`).  
Replaces the top-block layout in `2026-07-30-deals-board-top-panel-minimal-design.md`. Turnover stays a text button. Prefix counts stay as the deal-count tooltip only.  
Related: skill `twentyview-apple-ops-ui`.

## Problem

The desktop top of Реализация is two stacked bands. The toolbar shows view, dates, filters, search, deal count, turnover, parser labels, expand mode, type grouping, link-deals, and a settings menu at once. Under it, `BoardInsightPanel` shows attention chips, category cards (Баннера, Плёнка, Подряд, Производство, Рест. плёнка), and prefix counts (ПРО, Аренда, АРТ, and the rest). The cards and prefixes take a tall row. Controls in the toolbar wrap and collide on width.

## Goals

1. Remove the entire insight panel: «Требует внимания», the summary line, category cards, and the visible prefix-count column.
2. Keep daily controls on one line: view, dates, filters, search, deal count, turnover.
3. Hide occasional controls behind three tabs. A second row appears only while a tab is open.
4. Keep that second row and the first row on a single line each, with no overlapping controls.

## Non-goals

- Mobile sheets (`MobileToolbar`, `MobileSettingsSheet`, view switcher sheet). They stay as they are.
- Changing what expand mode, type sections, group chips, parser labels, column pickers, view edit, or link-deals do.
- A new way to filter by line-item type. That stays in «+ Фильтр».
- Persisting which ribbon tab is open.
- Deleting `scoreboard/compute.ts`, `attention/compute.ts`, or their unit tests.

## Approach

Excel-style ribbon, closed by default. Tabs live on the right of the always-visible row. The open tab draws a second row under the toolbar and pushes the table down. The row closes only when the active tab is clicked again. Clicking another tab replaces the row. Clicks on the table, on row 1, and elsewhere leave it open. After load the row is closed. That open/closed state is React state in the toolbar, not `localStorage`.

```
┌─ Row 1 (always) ─────────────────────────────────────────────────────┐
│ View · dates · +Фильтр · chips │ Search… │ Сбросить? · N сд · ₽     │
│                                              Отображение Ярлыки Доска │
└──────────────────────────────────────────────────────────────────────┘
┌─ Row 2 (only while a tab is active, ~40px) ─────────────────────────┐
│ controls for that tab, left aligned, one line                        │
└──────────────────────────────────────────────────────────────────────┘
│ Table …                                                              │
```

## Row 1

One line. The row itself does not wrap and does not grow in height.

Left cluster, horizontally scrollable when it does not fit: `ViewSwitcher`, date presets, «Диапазон» and its two date inputs, «+ Фильтр», active filter chips. Search terms stay inside the search field; that field stays one line and scrolls its chips horizontally. Search is the flexible slot and shrinks first, down to about 120px.

Pinned on the right, never scrolled away: «Сбросить» (only when the session differs from the saved view), deal count (`N сд`), turnover button, then the tab labels.

Deal count keeps its existing `title` with prefix counts. The visible prefix card column is removed.

Tab labels are text: **Отображение**, **Ярлыки**, **Доска**. The active tab uses accent text and an underline. No gear icon. `ToolbarSettingsCluster` goes away; its actions move into the tabs.

A 6px accent dot sits on a tab when its controls differ from the default:

| Tab | Dot when |
|-----|----------|
| Отображение | expand mode is not `smart`, or «По типам» is on, or group chips are not `name+status` |
| Ярлыки | at least one parser label is hidden |
| Доска | never |

**Ярлыки** is omitted when `ParserLabelFilter` would render nothing (parser not configured, or the board stream has no labels).

## Row 2

Full width, about 40px, one line, controls aligned to the start. If they do not fit, the row scrolls horizontally. The table does not grow an extra wrapped line.

Existing controls are reused. They keep their current storage and side effects.

**Отображение**

- `ExpandModeToggle`: Свёрнуто / Умное / Развёрнуто
- `TypeSectionsToggle`: По типам
- `GroupChipModeToggle`: Группы, Имя / Имя+статус

**Ярлыки**

- `ParserLabelFilter` chips for the current board stream. A hidden chip stays struck through and still hides matching positions.

**Доска**

Buttons only. They open the current overlays:

- «Название view» → existing edit-view flow
- «Колонки сделок» → existing parent `ColumnPicker`
- «Колонки позиций» → existing child `ColumnPicker`
- «Связать сделки» → existing link modal, only when `onLinkDeals` is provided

Those buttons stay disabled when there is no active view (`settingsDisabled`). The gear-menu footnote about stage colors is removed.

## Insight panel removal

`BoardInsightPanel` is not rendered. Delete `BoardInsightPanel.tsx` and the unused `scoreboard/ProductionScoreboard.tsx`.

In `DealsBoard.tsx`, remove the wiring that existed only for that panel:

- `attentionTip` and `setAttentionTip`
- attention filtering of visible deals and line items
- `computeAttention` / `displayedAttentionStats` usage
- `toggleScoreboardClause` (its only caller is the category-card click)
- `setAttentionTip(null)` inside filter reset

Type and stage filters that the user sets in «+ Фильтр» stay. Prefix counts remain available only as the deal-count tooltip.

`scoreboard/compute.ts` and `attention/compute.ts` stay, with their tests. Nothing on screen calls them after this change.

## Mobile

No ribbon on the mobile board. Expand mode and parser labels stay in `MobileSettingsSheet`.

## Errors

Column save failures stay inside `ColumnPicker`. View edit and link-deals keep their current dialogs. The ribbon does not add an error surface.

## Files

| File | Change |
|------|--------|
| `src/deals-board/BoardToolbar.tsx` | One-line row; tab buttons; host the ribbon row |
| `src/deals-board/BoardRibbon.tsx` | New. Second row for the three tabs |
| `src/deals-board/ribbon-state.ts` | Pure: toggle a tab, decide dots, decide whether «Ярлыки» exists |
| `src/deals-board/ribbon-state.test.ts` | Unit tests for that module |
| `src/deals-board/ToolbarSettingsCluster.tsx` | Remove once «Доска» and «Отображение» own its actions |
| `src/deals-board/BoardInsightPanel.tsx` | Delete |
| `src/deals-board/scoreboard/ProductionScoreboard.tsx` | Delete |
| `src/deals-board/DealsBoard.tsx` | Drop insight panel and attention-tip filtering |
| `.cursor/skills/twentyview-apple-ops-ui/SKILL.md` | Locked top-block note: one toolbar row plus an optional ribbon. No `BoardInsightPanel`. |

## Testing

`ribbon-state` tests:

- Clicking a closed tab opens it. Clicking the active tab closes it. Clicking another tab switches.
- Display dot matches the three default exceptions above. Labels dot matches a non-empty hidden set. Board never dots.
- Labels tab is absent when the label list is empty.

Desktop check in the browser:

- Row 1 stays one line; search shrinks; filter chips scroll inside the left cluster; tabs stay pinned.
- Each tab opens, switches, and closes on a second click. Clicks outside the tab labels leave the row open.
- Reload starts with the ribbon closed.
- Insight panel is gone. Search, date presets, turnover, and «+ Фильтр» still work.
- Turning a parser label off still hides those positions.
- Open the mobile settings sheet and confirm expand mode and parser labels are unchanged.

## Self-review

- No placeholders. Open-state persistence is explicitly out of scope.
- Category-card type filtering is removed on purpose. «+ Фильтр» remains the type filter.
- Scope is one desktop chrome change plus the dead insight wiring. Mobile behavior is unchanged.
- Width rule is explicit: row 1 does not wrap; the left cluster scrolls; count, turnover, reset, and tabs stay pinned.
