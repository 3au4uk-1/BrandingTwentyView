# Remote DOM Overlays and Bounded Scrolling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the line-item menu visible inside Twenty Remote DOM and keep the search/filter toolbar fixed while table rows scroll.

**Architecture:** Portal overlays into the existing React-managed app root and position them with worker-safe offset metrics. Preserve the existing grid/table scroll split, but allow host-height resolution to use global viewport metrics when Remote DOM refs do not expose `ownerDocument.defaultView`.

**Tech Stack:** React 19, Twenty Remote DOM, TypeScript, Vitest, Twenty SDK build.

---

### Task 1: Add worker-safe anchored-overlay geometry

**Files:**
- Create: `src/deals-board/utils/anchored-overlay.ts`
- Test: `src/deals-board/utils/anchored-overlay.test.ts`

- [ ] Write failing tests for offset accumulation, ancestor scroll compensation, flip-above behavior, and horizontal clamping.
- [ ] Run the focused test and verify it fails because the utility does not exist.
- [ ] Implement `resolveAnchorRectWithinRoot` and `resolveAnchoredOverlayPosition` using numeric DOM-like properties only.
- [ ] Run the focused test and verify all cases pass.

### Task 2: Make `AnchorPopover` Remote DOM compatible

**Files:**
- Modify: `src/deals-board/ui/AnchorPopover.tsx`

- [ ] Read the app root from `usePortalHost`.
- [ ] Resolve the portal container with `resolvePortalContainer('root', portalHostRef)`.
- [ ] Replace `getBoundingClientRect`/viewport-fixed positioning with the tested root-relative geometry.
- [ ] Render with `position: absolute` and retain outside-click, Escape, resize, and scroll dismissal.
- [ ] Run typecheck/build and verify the component compiles.

### Task 3: Harden the toolbar height lock

**Files:**
- Modify: `src/deals-board/utils/host-height.ts`
- Modify: `src/deals-board/utils/host-height.test.ts`
- Modify: `src/deals-board/hooks/useHostHeightLock.ts`

- [ ] Add a failing test proving an explicit viewport fallback works when the Remote DOM root has no `ownerDocument`.
- [ ] Correct the no-viewport test so it genuinely has neither owner-document nor explicit viewport metrics.
- [ ] Extend `resolveBoundedHostHeight` with an optional fallback viewport height.
- [ ] In the hook, resolve the view from `root.ownerDocument?.defaultView` or global `window`, pass its `innerHeight`, and subscribe to its resize event.
- [ ] Run host-height tests and verify they all pass.

### Task 4: Prepare release 0.2.78 without deployment

**Files:**
- Modify: `package.json`
- Modify: `src/deals-board/LineItemListMenu.tsx`

- [ ] Bump package and menu diagnostic version to `0.2.78`.
- [ ] Run all unit tests, lints, and `twenty dev:build`.
- [ ] Confirm the generated front-component checksum changes.
- [ ] Leave all changes uncommitted and unpushed until the user explicitly authorizes deployment.
