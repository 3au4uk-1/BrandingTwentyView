# Remote DOM overlays and bounded scrolling

**Date:** 2026-07-10  
**Status:** Approved

## Problems

The line-item settings menu is rendered inside table containers that use
`overflow: hidden` and `overflow: auto`. These containers clip the menu, so
raising its `z-index` cannot make it visible above the rest of the interface.

The search/filter toolbar scrolls away when the Twenty widget root cannot
resolve a bounded height. In that state, the host page scrolls the entire app
instead of keeping scrolling inside `DealsTable`.

## Menu design

Twenty front components run through Remote DOM. Production verification showed
that worker refs do not expose reliable layout measurements (`offsetTop`,
`clientHeight`, `getBoundingClientRect`) and React portals do not provide a
stable overlay target.

Keep the settings control inside the line-item cell. Clicking the gear reveals
four compact inline buttons. This uses normal document flow, so it needs no
portal, coordinates, fixed positioning, or overflow escape.

## Scrolling design

Let the Twenty host page own vertical scrolling. The board root and body use
automatic height with visible overflow. Pin the toolbar using CSS
`position: sticky; top: 0`, which Remote DOM can serialize without runtime
measurements. The table keeps horizontal overflow for wide columns.

## Interaction

- Toggle the compact action group from the existing settings button.
- Preserve the existing list actions, loading state, active state, and error
  message.
- Prevent menu interactions from triggering table-row interactions.

## Scope

Remove the unsupported popover and host-height measurement utilities. Keep
sticky columns and horizontal table scrolling intact.

## Verification

- Unit tests cover readable UTF-8 labels and compact action identifiers.
- Unit tests and the Twenty application build run successfully.
- Manual verification confirms inline actions remain visible and the toolbar
  stays pinned during host-page scrolling.
