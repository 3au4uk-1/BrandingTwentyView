# Decor & MK Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add «МК и Декор» board (same opportunities, stream-filtered positions) and parser infra for decor/MK keywords + blacklists that set `productStream` on sync.

**Architecture:** Shared `opportunity`/`dealLineItem` with SELECT `productStream` (`BRANDING`|`DECOR`|`MK`). Second page-layout mounts a thin front-component wrapper around `DealsBoard` with `boardStream="decor_mk"`. crmparserv2 adds four list stores + classifier that writes `productStream` in `buildLineItemFields`. Empty keyword lists are OK.

**Tech Stack:** twenty-sdk fields/layouts, React DealsBoard, crmparserv2 Express + SQLite + Vitest (both repos).

**Spec:** `docs/superpowers/specs/2026-07-28-decor-mk-board-design.md`

## Global Constraints

- Approach A only: one board component family, two nav entries; no separate opportunity objects.
- Empty/`null` `productStream` ≡ `BRANDING` for Реализация filters.
- Conflict: MK keywords beat DECOR; DECOR/MK beat branding on the same line item.
- Keywords content not required now (empty lists OK).
- Equipment phase 2 out of scope.
- Commits only when the user explicitly asks (skip commit steps otherwise).
- Apply Twenty metadata (`yarn twenty apply`) before claiming parser can write `productStream`.
- Rebuild crmparser public UI when touching frontend (`npm run build:public` from backend or equivalent).
- Prefer fast models for mechanical tasks; verify with focused vitest.

## File map

### TwentyView
| Path | Role |
|------|------|
| `src/constants/universal-identifiers.ts` | New UUIDs |
| `src/constants/product-stream.ts` | Stream + boardStream constants/helpers |
| `src/constants/product-stream.test.ts` | Filter helper tests |
| `src/fields/product-stream.field.ts` | SELECT on dealLineItem |
| `src/fields/deal-board-view-board-kind.field.ts` or inline in object | SELECT boardKind |
| `src/objects/deal-board-view.object.ts` | Add boardKind field |
| `src/front-components/decor-mk-board.tsx` | Wrapper `<DealsBoard boardStream="decor_mk" />` |
| `src/page-layouts/decor-mk.page-layout.ts` | STANDALONE_PAGE |
| `src/navigation-menu-items/decor-mk.navigation-menu-item.ts` | «МК и Декор» |
| `src/deals-board/DealsBoard.tsx` | Accept `boardStream`, filter children, scope views |
| `src/deals-board/types.ts` | `productStream`, `boardKind` |
| `src/deals-board/api/views.ts` | Persist boardKind |
| `src/deals-board/hooks/useDealBoardViews.ts` | Filter by boardKind |
| `src/deals-board/line-item-list-actions.ts` | Decor/MK blacklist actions |
| `src/deals-board/api/crmparser.ts` | Extend ListName + status |
| `src/logic-functions/line-item-add-to-list.ts` / `line-item-list-status.ts` | Pass-through list names |

### crmparserv2
| Path | Role |
|------|------|
| `backend/src/db/schema.sql` + migrate | Tables + settings keys |
| `backend/src/services/product-stream.js` | Pure classifyProductStream |
| `backend/tests/product-stream.test.js` | TDD |
| `backend/src/services/decor-keywords.js` / `mk-keywords.js` OR settings keys | Keyword lists |
| `backend/src/services/decor-blacklist.js` / `mk-blacklist.js` | Mirror blacklist.js |
| `backend/src/routes/decor-*.js` / `mk-*.js` | CRUD |
| `backend/src/index.js` | Mount routes |
| `backend/src/services/twenty-items.js` | Eligibility + enrich flags |
| `backend/src/services/twenty-line-item.js` | `productStream` in buildLineItemFields |
| `backend/src/services/twenty-line-item-api.js` | LIST_CREATORS + list-status |
| `frontend/src/pages/Settings.jsx` + `api.js` | UI tabs for 4 lists |

## Pre-allocated UUIDs (TwentyView)

- `productStream` field: `2cb62f85-6835-4f40-a0bf-05d27023eaa0`
- `boardKind` field: `f6ee203f-fb3b-47ad-989c-2ca0c11090a3`
- decor-mk front component: `95133b73-72a4-465a-8988-c342847d4917`
- decor-mk page layout: `8e864efd-2485-4ad2-b47d-641dfdcfa1fc`
- decor-mk page layout tab: `8acd8903-0b4b-455d-a29f-9277b80c98d8`
- decor-mk widget: `e4cd50eb-59bd-45b4-b301-cc138bb3ac91`
- decor-mk nav: `9a3605ae-d93f-4caf-af4c-e98272c049f0`

---

### Task 1: Twenty — `productStream` + `boardKind` metadata

**Repo:** TwentyView  
**Files:**
- Create: `src/fields/product-stream.field.ts`
- Modify: `src/objects/deal-board-view.object.ts` (add boardKind SELECT)
- Modify: `src/constants/universal-identifiers.ts`
- Create: `src/constants/product-stream.ts` (enums + `normalizeProductStream` + `lineItemMatchesBoardStream`)

**Interfaces:**
- Produces:
  - `PRODUCT_STREAM = { BRANDING: 'BRANDING', DECOR: 'DECOR', MK: 'MK' } as const`
  - `BOARD_STREAM = { BRANDING: 'branding', DECOR_MK: 'decor_mk' } as const`
  - `BOARD_KIND = { REALIZACIYA: 'REALIZACIYA', DECOR_MK: 'DECOR_MK' } as const`
  - `normalizeProductStream(raw: unknown): 'BRANDING'|'DECOR'|'MK'` — empty/null → BRANDING
  - `lineItemMatchesBoardStream(stream, boardStream): boolean` — branding board ↔ BRANDING; decor_mk ↔ DECOR|MK

- [ ] **Step 1: Failing tests for helpers**

`src/constants/product-stream.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  lineItemMatchesBoardStream,
  normalizeProductStream,
  BOARD_STREAM,
} from './product-stream';

describe('normalizeProductStream', () => {
  it('maps empty to BRANDING', () => {
    expect(normalizeProductStream(null)).toBe('BRANDING');
    expect(normalizeProductStream('')).toBe('BRANDING');
  });
  it('keeps DECOR and MK', () => {
    expect(normalizeProductStream('DECOR')).toBe('DECOR');
    expect(normalizeProductStream('MK')).toBe('MK');
  });
});

describe('lineItemMatchesBoardStream', () => {
  it('branding board keeps BRANDING only', () => {
    expect(lineItemMatchesBoardStream('BRANDING', BOARD_STREAM.BRANDING)).toBe(true);
    expect(lineItemMatchesBoardStream('DECOR', BOARD_STREAM.BRANDING)).toBe(false);
  });
  it('decor_mk board keeps DECOR and MK', () => {
    expect(lineItemMatchesBoardStream('DECOR', BOARD_STREAM.DECOR_MK)).toBe(true);
    expect(lineItemMatchesBoardStream('MK', BOARD_STREAM.DECOR_MK)).toBe(true);
    expect(lineItemMatchesBoardStream('BRANDING', BOARD_STREAM.DECOR_MK)).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

`corepack yarn vitest run --config vitest.unit.config.ts src/constants/product-stream.test.ts`

- [ ] **Step 3: Implement helpers + field defs**

`product-stream.field.ts` — mirror `istochnik.field.ts`, options BRANDING/DECOR/MK, label «Поток».

`deal-board-view.object.ts` — add:

```ts
{
  universalIdentifier: 'f6ee203f-fb3b-47ad-989c-2ca0c11090a3',
  name: 'boardKind',
  type: FieldType.SELECT,
  label: 'Тип доски',
  defaultValue: `'REALIZACIYA'`,
  options: [
    { value: 'REALIZACIYA', label: 'Реализация', position: 0, color: 'blue' },
    { value: 'DECOR_MK', label: 'МК и Декор', position: 1, color: 'purple' },
  ],
}
```

Avoid reserved names (`role`, `address`, etc.).

- [ ] **Step 4: Tests PASS + apply**

`yarn twenty apply`  
Expected: sync OK; field visible on dealLineItem metadata.

---

### Task 2: Parser — pure `classifyProductStream` (TDD)

**Repo:** crmparserv2  
**Files:**
- Create: `backend/src/services/product-stream.js`
- Create: `backend/tests/product-stream.test.js`

**Interfaces:**
- Produces:
  - `classifyProductStream({ name, brandingKeywords, decorKeywords, mkKeywords, brandingBlacklist, decorBlacklist, mkBlacklist }): 'BRANDING'|'DECOR'|'MK'|null`
  - Returns `null` when item should not sync to any stream (all blacklisted / no match — define precisely):
    - If matches MK keywords and not mk-blacklisted → `MK`
    - Else if matches DECOR keywords and not decor-blacklisted → `DECOR`
    - Else if matches branding keywords and not branding-blacklisted → `BRANDING`
    - Else → `null` (not for Twenty)
  - Reuse `matchesBlacklistEntry` / branding `keywordMatchesItemName` (import from classifier/blacklist)

- [ ] **Step 1: Failing tests** covering MK > DECOR > branding; blacklist blocks; no match → null

- [ ] **Step 2: Run vitest FAIL**

`cd backend && npm test -- tests/product-stream.test.js` (or project’s vitest command)

- [ ] **Step 3: Implement `product-stream.js`**

- [ ] **Step 4: Tests PASS**

---

### Task 3: Parser — four list stores + routes

**Repo:** crmparserv2  
**Files:**
- Modify: `backend/src/db/schema.sql` + migration in `migrate.js`
- Create services: `decor-blacklist.js`, `mk-blacklist.js` (clone `blacklist.js`, tables `decor_blacklist_items`, `mk_blacklist_items`)
- Keywords: either settings keys `decor_keywords`, `mk_keywords` (JSON arrays like branding `keywords`) **or** dedicated tables — **prefer settings keys** to match branding keywords UX
- Routes: extend `settings.js` with GET/PUT decor/mk keywords; create `routes/decor-blacklist.js`, `routes/mk-blacklist.js`
- Modify: `backend/src/index.js` mounts

**Interfaces:**
- `loadDecorBlacklist(db)`, `createDecorBlacklistEntry`, `delete…` (same shape as blacklist)
- `getSetting('decor_keywords')` / `mk_keywords` JSON string arrays

- [ ] **Step 1: Migration creates empty tables + default settings `[]`**

- [ ] **Step 2: Route smoke tests** (supertest if existing pattern) or unit tests on services

- [ ] **Step 3: Mount routes `/api/decor-blacklist`, `/api/mk-blacklist`, settings endpoints**

---

### Task 4: Parser — wire classify into Twenty sync + list API

**Repo:** crmparserv2  
**Files:**
- Modify: `backend/src/services/twenty-items.js`
- Modify: `backend/src/services/twenty-line-item.js` — `buildLineItemFields` add `productStream`
- Modify: `backend/src/services/twenty-sync.js` — load decor/mk lists when classifying
- Modify: `backend/src/services/twenty-line-item-api.js` — `LIST_CREATORS` + status for `decor_blacklist`, `mk_blacklist`
- Tests: extend existing twenty-items / line-item field tests

**Interfaces:**
- Eligible items for sync = branding ∪ decor ∪ mk classified non-null streams (each item once with its stream)
- `enrichDealItems` adds `decorBlacklisted`, `mkBlacklisted` (and keep branding flags)
- `add-to-list` accepts new list names

- [ ] **Step 1: Failing test — buildLineItemFields includes productStream DECOR**

- [ ] **Step 2: Implement wiring**

- [ ] **Step 3: Tests PASS**

---

### Task 5: Parser frontend — Settings tabs for 4 lists

**Repo:** crmparserv2  
**Files:**
- Modify: `frontend/src/api.js`
- Modify: `frontend/src/pages/Settings.jsx`
- Run: `cd backend && npm run build:public` (or frontend build + sync)

- [ ] **Step 1: API hooks** for decor/mk keywords + blacklists (mirror `useKeywords` / `useBlacklist`)

- [ ] **Step 2: Settings UI tabs** «Keywords декор», «Keywords МК», «Blacklist декор», «Blacklist МК» — empty-state OK

- [ ] **Step 3: build:public** so Docker/static serve updated UI if used locally that way

---

### Task 6: Twenty — second nav + front wrapper

**Repo:** TwentyView  
**Files:**
- Create: `src/front-components/decor-mk-board.tsx`
- Create: `src/page-layouts/decor-mk.page-layout.ts`
- Create: `src/navigation-menu-items/decor-mk.navigation-menu-item.ts`
- Modify: `src/front-components/deals-board.tsx` only if needed to export shared board
- Modify: `src/deals-board/DealsBoard.tsx` — `export const DealsBoard = ({ boardStream = BOARD_STREAM.BRANDING }: { boardStream?: ... })`

**Interfaces:**
- `decor-mk-board.tsx`:

```tsx
import { defineFrontComponent } from 'twenty-sdk/define';
import { DealsBoard } from 'src/deals-board/DealsBoard';
import { BOARD_STREAM } from 'src/constants/product-stream';
import { DECOR_MK_BOARD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineFrontComponent({
  universalIdentifier: DECOR_MK_BOARD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'decor-mk-board',
  description: 'МК и Декор',
  component: () => <DealsBoard boardStream={BOARD_STREAM.DECOR_MK} />,
});
```

- Page layout mirrors `okleyka-salary.page-layout.ts` pointing at decor-mk front component.
- Nav name: `МК и Декор`, position after Реализация (e.g. `1`), icon `IconPalette` or `IconGift`.

- [ ] **Step 1: Add files with pre-allocated UUIDs**

- [ ] **Step 2: `yarn twenty apply`**

- [ ] **Step 3: Hard-refresh — sidebar shows «МК и Декор»** (board may still show all until Task 7)

---

### Task 7: Twenty — filter board by stream + scope saved views

**Repo:** TwentyView  
**Files:**
- Modify: `src/deals-board/DealsBoard.tsx` — after building `lineItemsByOppId`, filter items with `lineItemMatchesBoardStream(normalizeProductStream(item.productStream), boardStream)`; drop opps with zero children
- Modify: `src/deals-board/types.ts`, `api/views.ts`, `hooks/useDealBoardViews.ts`
- Map `boardStream` → `boardKind` when seeding/filtering views
- Unit test pure filter helper if extracted: `filterLineItemsByBoardStream(items, boardStream)`

- [ ] **Step 1: Failing test for filter helper** (mixed deal → branding board keeps only BRANDING rows)

- [ ] **Step 2: Implement filter + boardKind on create/fetch views**

- [ ] **Step 3: Tests PASS**

---

### Task 8: Twenty — decor/MK blacklist actions on decor board

**Repo:** TwentyView (+ tiny parser already done in Task 4)  
**Files:**
- Modify: `src/deals-board/line-item-list-actions.ts`
- Modify: `src/deals-board/api/crmparser.ts` — `ListName`, status type
- Modify: `LineItemListMenu.tsx` / `cells/overrides.tsx` — gate actions by `boardStream`
- Logic-function bodies: ensure they forward `list` string without allowlist dropping new names (read and fix if allowlisted)

**Interfaces:**
- Lists: `decor_blacklist`, `mk_blacklist`
- On `boardStream=decor_mk` show those two (+ maybe hide branding restoration/banner/podryad)
- On branding board keep existing four

- [ ] **Step 1: Extend types + actions config**

- [ ] **Step 2: Unit test actions filter by boardStream** (pure helper)

- [ ] **Step 3: Wire menu + apply**

---

### Task 9: End-to-end smoke (both repos)

- [ ] **Step 1:** TwentyView `yarn twenty apply`; unit subset green  
  `vitest ... product-stream.test.ts` + board filter tests + crmparser ListName tests if any

- [ ] **Step 2:** crmparserv2 backend tests for product-stream + blacklist services green; restart parser container/process if needed

- [ ] **Step 3: Manual checklist**
  1. Sidebar: Реализация + МК и Декор  
  2. Parser Settings: 4 new empty lists editable  
  3. Add temporary decor keyword → parse/resync test deal → position `productStream=DECOR`  
  4. Visible on МК и Декор, not as child on Реализация  
  5. Add to decor blacklist from board → list-status chip / excluded on next sync  

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| productStream field | 1 |
| classify priority MK>DECOR>branding | 2, 4 |
| 4 parser lists | 3, 5 |
| sync writes productStream | 4 |
| Second nav + shared board | 6 |
| Board filter + boardKind views | 7 |
| Decor/MK blacklist from board | 8 |
| Empty keywords OK | 3, 5, 9 |
| Equipment out of scope | — |

## Self-review notes

- No TBD left; reserved-name lesson applied (`boardKind`, `productStream`, not `role`/`address`).  
- Order: Twenty fields → parser classify/sync → parser UI → Twenty board UI → actions.  
- Dual-repo: each task states repo explicitly.
