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

## Overlay design

Twenty front components run through Remote DOM. Portals mounted into
`document.body` are outside the connected remote root and are not rendered by
the host. Render the menu through the existing `PortalHostProvider` into
`#deals-board-root`.

Use worker-safe `offsetTop`, `offsetLeft`, `scrollTop`, and `scrollLeft`
properties to calculate the anchor position relative to the app root. Do not
depend on `getBoundingClientRect`. Position the menu absolutely below and
right-aligned with the button, flip above when needed, and clamp it to the app
root.

## Scrolling design

Keep the existing structural split: the toolbar is the `auto` grid row and the
table body is the `1fr` row containing the only `overflow: auto` scrollport.
Harden `useHostHeightLock` for Remote DOM refs by falling back from
`root.ownerDocument.defaultView` to global `window`.

Once the root has a bounded pixel height, only table rows scroll and the
toolbar remains visible without `position: sticky`.

## Interaction

- Toggle the menu from the existing settings button.
- Close it on outside pointer interaction, `Escape`, window resize, or table
  scroll.
- Preserve the existing list actions, loading state, active state, and error
  message.
- Prevent menu interactions from triggering table-row interactions.

## Scope

Change `AnchorPopover`, its worker-safe positioning utility, host-height
resolution, and focused tests. Keep table overflow, sticky columns, and the
toolbar/table grid structure intact.

## Verification

- Unit tests cover root-relative offsets, scroll compensation, placement,
  flipping, and clamping.
- Host-height tests cover the global viewport fallback and no-viewport case.
- Unit tests and the Twenty application build run successfully.
- Manual verification confirms the menu appears above table and sticky UI.
