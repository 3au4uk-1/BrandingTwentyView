# Line-item List Menu Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display the line-item settings menu above table clipping and stacking contexts.

**Architecture:** Reuse the existing `AnchorPopover`, which already renders through a portal, positions itself against an anchor, flips above when needed, clamps to the viewport, and handles dismissal. `LineItemListMenu` retains action state and markup while delegating floating-layer behavior to this shared component.

**Tech Stack:** React 19, React portals, TypeScript, Vitest, Twenty SDK build.

---

### Task 1: Render the list menu through `AnchorPopover`

**Files:**
- Modify: `src/deals-board/LineItemListMenu.tsx`

- [ ] **Step 1: Replace the container ref with a button anchor ref**

Import `AnchorPopover`, keep a `buttonRef`, and replace the local outside-click
effect with a resize-close effect. `AnchorPopover` already handles outside
clicks, Escape, and scroll.

```tsx
import { useEffect, useRef, useState } from 'react';
import { AnchorPopover } from './ui/AnchorPopover';

const buttonRef = useRef<HTMLButtonElement | null>(null);

useEffect(() => {
  if (!isOpen) return;
  const close = () => setIsOpen(false);
  window.addEventListener('resize', close);
  return () => window.removeEventListener('resize', close);
}, [isOpen]);
```

- [ ] **Step 2: Attach the anchor and preserve row click isolation**

```tsx
<button
  ref={buttonRef}
  type="button"
  data-list-menu-btn="0.2.77"
  onClick={(event) => {
    event.stopPropagation();
    setIsOpen((open) => !open);
  }}
>
```

- [ ] **Step 3: Move the existing menu contents into the portal**

Use the existing width and compact padding while letting the shared popover own fixed positioning, viewport flipping, z-index, and portal rendering.

```tsx
<AnchorPopover
  theme={theme}
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  anchorRef={buttonRef}
  width={180}
>
  <div role="menu" onClick={(event) => event.stopPropagation()}>
    {/* existing action buttons and error state */}
  </div>
</AnchorPopover>
```

- [ ] **Step 4: Run typecheck/build**

Run:

```powershell
B:\node_modules\.bin\twenty.cmd dev:build
```

Expected: `Build succeeded`.

### Task 2: Release and verify

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Bump the app version**

Change `package.json` from `0.2.76` to `0.2.77`. The `data-list-menu-btn` value changes with it so the front-component bundle receives a new checksum.

- [ ] **Step 2: Run focused verification**

Run:

```powershell
B:\node_modules\.bin\vitest.cmd run --config vitest.unit.config.ts
B:\node_modules\.bin\twenty.cmd dev:build
```

Expected: the build passes. Record any unrelated pre-existing test failure rather than masking it.

- [ ] **Step 3: Check diagnostics and diff**

Confirm no new diagnostics in `LineItemListMenu.tsx`, and verify the generated `builtComponentChecksum` differs from the previous local checksum.

- [ ] **Step 4: Deploy when authorized**

Commit and push the two implementation files only when the user requests deployment. Watch the CD workflow through both Deploy and Install, then manually verify that the menu appears above the table.
