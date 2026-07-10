# Line-item list menu portal

**Date:** 2026-07-10  
**Status:** Approved

## Problem

The line-item settings menu is rendered inside table containers that use
`overflow: hidden` and `overflow: auto`. These containers clip the menu, so
raising its `z-index` cannot make it visible above the rest of the interface.

## Design

Render the menu into `document.body` with a React portal. Keep the settings
button in the table cell and use its `getBoundingClientRect()` as the anchor.
The menu uses `position: fixed` and the modal z-index so it is independent of
table stacking and clipping contexts.

Position the menu below and right-aligned with the button by default. If there
is insufficient viewport space below, place it above the button. Clamp the
horizontal coordinate to a small viewport margin.

## Interaction

- Toggle the menu from the existing settings button.
- Close it on outside pointer interaction, `Escape`, window resize, or scroll.
- Preserve the existing list actions, loading state, active state, and error
  message.
- Prevent menu interactions from triggering table-row interactions.

## Scope

Only `LineItemListMenu` is changed by reusing the existing, already shared
`AnchorPopover`. Table overflow, sticky columns, and scrolling behavior remain
intact.

## Verification

- The shared popover provides placement below, placement above, and viewport
  clamping.
- Unit tests and the Twenty application build run successfully.
- Manual verification confirms the menu appears above table and sticky UI.
