# Deals Board Cold-Load Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut Реализация cold-load Finish toward ≤ ~2s on staging by defaulting away from `showAll`/`fetchAll` dumps, deduping metadata, deferring secondary fetches, then serving opportunities + line items (+ optional list-status) from one `deals-board-page` logic function with multi-call fallback.

**Architecture:** D1 (diet) first — paginate default «Будущие», stop `fetchAll` for `future`, one shared metadata fetch, parallel REST enrich, defer list-status. D2 — HTTP LF `deals-board-page` uses `CoreApiClient` / REST / crmparser batch under app token; board calls it via existing `logicFunctionFetch` pattern and hydrates React Query keys; on LF failure fall back to today’s waterfall. Native Opportunities Finish is measured and noted separately (Dokploy/Twenty), not blocked on board code.

**Tech Stack:** React 19, `@tanstack/react-query` v5, Vitest, `twenty-sdk` logic functions, `twenty-client-sdk` (`CoreApiClient`, `RestApiClient`), existing crmparser list-status batch.

**Spec:** `docs/superpowers/specs/2026-07-29-deals-board-cold-load-perf-design.md`  
**Related:** `docs/superpowers/specs/2026-07-24-deals-board-perf-wave-c-design.md`

## Global Constraints

- Order: Task 0 baseline → D1 (Tasks 1–4) → D2 (Tasks 5–8) → native notes (Task 9) → version bump (Task 10)
- Do **not** rewrite Twenty core `index-….js`
- Do **not** reopen Wave C decisions except where this plan explicitly changes `future` / `showAll`
- Keep `fetchAll` for: line-item filter clauses, `custom`, `month`, raw `dateFrom`/`dateTo` without tight preset (Wave C)
- Change `future` to **paginate** (server already builds `buildOpportunityDateFilter` for `future`)
- Preserve Apple ops UI; no visual redesign
- TDD for pure helpers (`shouldFetchAll`, view mechanics, page payload hydrate/fallback)
- Use `corepack yarn` on Windows if `yarn` missing; prefer ASCII worktree if Cyrillic breaks vitest
- All new UUIDs must be valid UUID v4
- Patch-bump `package.json` only in the final task
- Every task’s requirements implicitly include this section

---

## File structure

| File | Responsibility |
|------|----------------|
| `src/constants/future-deals-view.ts` | Default `showAll: false`; mechanics no longer require `showAll: true` |
| `src/constants/future-deals-view.test.ts` | Updated mechanics / defaults |
| `src/deals-board/hooks/useDealBoardViews.ts` | One-shot migration clearing persisted `showAll: true` on future/mobile views |
| `src/deals-board/utils/date-filters.ts` | `shouldFetchAllOpportunities`: `future` → false (like tight presets) |
| `src/deals-board/utils/date-filters.test.ts` | Expect `future` → false |
| `src/deals-board/metadata/fetch-objects-fields-page.ts` | Shared `/metadata` objects page + in-memory promise cache |
| `src/deals-board/metadata/fetch-object-fields.ts` | Use shared page cache (one network hit for both opportunity + dealLineItem) |
| `src/deals-board/api/opportunity-link-fields-rest.ts` | `Promise.all` REST chunks |
| `src/deals-board/hooks/useLineItemListStatus.ts` | Optional `enabled` / defer flag for prefetch |
| `src/deals-board/DealsBoard.tsx` | Defer list-status until rows ready; later wire aggregate path |
| `src/constants/universal-identifiers.ts` | `DEALS_BOARD_PAGE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER` |
| `src/logic-functions/deals-board-page.ts` | Aggregate LF HTTP handler |
| `src/logic-functions/shared/deals-board-page-core.ts` | Pure grouping + types used by LF + client tests |
| `src/deals-board/api/deals-board-page.ts` | Client call to LF + fallback orchestrator |
| `src/deals-board/api/deals-board-page.test.ts` | Fallback / hydrate pure tests |
| `src/deals-board/hooks/useDealsBoardPage.ts` | RQ query + cache hydrate for line items / list-status |
| `docs/superpowers/notes/2026-07-29-native-twenty-shell-perf.md` | Native track measurements / infra notes |
| `package.json` | Patch version bump last |

---

### Task 0: Baseline timings (manual, no code)

**Files:** none (paste numbers into Task 9 notes or PR later)

**Interfaces:**
- Consumes: staging `twenty-staging.dosugmayak.ru` (or local if staging unavailable)
- Produces: baseline Finish + request count for Opportunities F5 and Реализация F5

- [ ] **Step 1: Measure Opportunities F5**

Hard refresh Opportunities tab. In Network: note Finish (s) and request count. Prefer “Disable cache”.

- [ ] **Step 2: Measure Реализация F5**

Hard refresh Реализация. Note Finish, request count, and whether default view triggers multi-page `opportunities` / `dealLineItems` storm.

- [ ] **Step 3: Commit nothing**

Proceed to Task 1.

---

### Task 1: Default `showAll: false` + mechanics + migrate persisted views

**Files:**
- Modify: `src/constants/future-deals-view.ts`
- Modify: `src/constants/future-deals-view.test.ts`
- Modify: `src/deals-board/hooks/useDealBoardViews.ts`

**Interfaces:**
- Consumes: `DealBoardViewRecord`, `updateDealBoardView`, `FUTURE_DEALS_VIEW_NAME`, `MOBILE_VIEW_NAME`
- Produces: `FUTURE_DEALS_VIEW_FILTERS.showAll === false`; `hasFutureDealsViewMechanics` true for future+sort without requiring `showAll: true`; one-shot CRM update clearing `showAll: true` on matching views

- [ ] **Step 1: Write failing tests for defaults / mechanics**

In `src/constants/future-deals-view.test.ts`, replace/extend:

```ts
import { describe, expect, it } from 'vitest';

import {
  FUTURE_DEALS_VIEW_FILTERS,
  FUTURE_DEALS_VIEW_SORT,
  hasFutureDealsViewMechanics,
} from 'src/constants/future-deals-view';

describe('FUTURE_DEALS_VIEW_FILTERS', () => {
  it('defaults to future without showAll dump', () => {
    expect(FUTURE_DEALS_VIEW_FILTERS).toEqual({
      datePreset: 'future',
      showAll: false,
    });
  });
});

describe('hasFutureDealsViewMechanics', () => {
  it('matches future deals filters and sort when showAll is false', () => {
    expect(
      hasFutureDealsViewMechanics({
        filters: FUTURE_DEALS_VIEW_FILTERS,
        sort: FUTURE_DEALS_VIEW_SORT,
      }),
    ).toBe(true);
  });

  it('matches when showAll is omitted', () => {
    expect(
      hasFutureDealsViewMechanics({
        filters: { datePreset: 'future' },
        sort: FUTURE_DEALS_VIEW_SORT,
      }),
    ).toBe(true);
  });

  it('still matches legacy showAll true (migration will clear it)', () => {
    expect(
      hasFutureDealsViewMechanics({
        filters: { datePreset: 'future', showAll: true },
        sort: FUTURE_DEALS_VIEW_SORT,
      }),
    ).toBe(true);
  });

  it('rejects empty view mechanics', () => {
    expect(hasFutureDealsViewMechanics({ filters: {}, sort: [] })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack yarn test:unit src/constants/future-deals-view.test.ts`

Expected: FAIL (`showAll: true` vs `false`, and/or mechanics requiring `showAll === true`)

- [ ] **Step 3: Implement constants**

In `src/constants/future-deals-view.ts`:

```ts
export const FUTURE_DEALS_VIEW_FILTERS: DealBoardFilters = {
  datePreset: 'future',
  showAll: false,
};

export const hasFutureDealsViewMechanics = (view: {
  filters: DealBoardFilters;
  sort: DealBoardSort[];
}): boolean =>
  view.filters.datePreset === 'future' &&
  view.sort.length === 1 &&
  view.sort[0]?.field === OPPORTUNITY_DATE_FILTER_FIELD &&
  view.sort[0]?.direction === 'AscNullsLast';
```

(Remove `showAll === true` from the predicate.)

- [ ] **Step 4: Migrate persisted views in `useDealBoardViews`**

Add helper (same file, near other align helpers):

```ts
const viewNeedsShowAllCleared = (view: DealBoardViewRecord): boolean =>
  view.filters.showAll === true &&
  (view.name === FUTURE_DEALS_VIEW_NAME ||
    view.name === MOBILE_VIEW_NAME ||
    view.filters.datePreset === 'future');

const clearShowAllOnHeavyViews = async (views: DealBoardViewRecord[]): Promise<void> => {
  await Promise.all(
    views.filter(viewNeedsShowAllCleared).map((view) =>
      updateDealBoardView(view.id, {
        filters: { ...view.filters, showAll: false },
      }),
    ),
  );
};
```

Wire a `useMutation` + `useEffect` (same pattern as `alignMobileViewMutation`): run once when `query.isSuccess` and any view needs clearing; `onSuccess` invalidate `dealBoardViewsQueryKey()`.

- [ ] **Step 5: Run tests**

Run: `corepack yarn test:unit src/constants/future-deals-view.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/constants/future-deals-view.ts src/constants/future-deals-view.test.ts src/deals-board/hooks/useDealBoardViews.ts
git commit -m "fix(deals-board): default future view without showAll dump"
```

---

### Task 2: Paginate `future` (narrow `shouldFetchAllOpportunities`)

**Files:**
- Modify: `src/deals-board/utils/date-filters.ts`
- Modify: `src/deals-board/utils/date-filters.test.ts`

**Interfaces:**
- Consumes: `TIGHT_DATE_PRESETS`, `buildOpportunityDateFilter`, `hasLineItemFilterClauses`
- Produces: `shouldFetchAllOpportunities({ datePreset: 'future' }) === false` unless line-item clauses force true

- [ ] **Step 1: Write failing expectation**

In `date-filters.test.ts`, change the wide-filters example:

```ts
  it('loads all records for wide date filters except future (server-filtered page)', () => {
    expect(shouldFetchAllOpportunities({ datePreset: 'month' })).toBe(true);
    expect(shouldFetchAllOpportunities({ datePreset: 'future' })).toBe(false);
    expect(shouldFetchAllOpportunities({ datePreset: 'custom' })).toBe(true);
    expect(
      shouldFetchAllOpportunities({
        dateFrom: '2026-06-27',
        dateTo: '2026-06-27',
      }),
    ).toBe(true);
  });

  it('still fetchAll for future when line-item clauses exist', () => {
    expect(
      shouldFetchAllOpportunities(
        { datePreset: 'future' },
        undefined,
        [{ id: '1', level: 'lineItem', field: 'stage', operator: 'in', value: ['NOVYY'] }],
      ),
    ).toBe(true);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack yarn test:unit src/deals-board/utils/date-filters.test.ts`

Expected: FAIL on `future` → false

- [ ] **Step 3: Implement**

In `shouldFetchAllOpportunities`, treat `future` like tight presets (paginate; server filter already exists in `buildOpportunityDateFilter`):

```ts
export const shouldFetchAllOpportunities = (
  filters: DealBoardFilters,
  _sort?: DealBoardSort[],
  clauses?: FilterClause[],
): boolean => {
  if (clauses?.length && hasLineItemFilterClauses(clauses)) {
    return true;
  }

  const preset = filters.datePreset;
  if (preset && TIGHT_DATE_PRESETS.has(preset)) {
    return false;
  }

  if (preset === 'future') {
    return false;
  }

  if (preset === 'custom') {
    return true;
  }

  return Boolean(buildOpportunityDateFilter(filters));
};
```

Note: `showAll` still forces `fetchAll` in `useOpportunities` (`showAll || shouldFetchAll…`) — intentional for power users.

- [ ] **Step 4: Run tests**

Run: `corepack yarn test:unit src/deals-board/utils/date-filters.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/utils/date-filters.ts src/deals-board/utils/date-filters.test.ts
git commit -m "perf(deals-board): paginate future date preset instead of fetchAll"
```

---

### Task 3: Dedupe metadata `/metadata` objects page

**Files:**
- Create: `src/deals-board/metadata/fetch-objects-fields-page.ts`
- Create: `src/deals-board/metadata/fetch-objects-fields-page.test.ts`
- Modify: `src/deals-board/metadata/fetch-object-fields.ts`

**Interfaces:**
- Consumes: `queryMetadataGraphql`, `FETCH_OBJECTS_FIELDS_QUERY` (move query into the new module)
- Produces: `fetchObjectsFieldsPage(): Promise<ObjectsFieldsEdge[]>` with module-level in-flight + resolved cache so concurrent `opportunity` + `dealLineItem` share one HTTP call

- [ ] **Step 1: Write failing test for cache singleton**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./metadata-graphql-fetch', () => ({
  queryMetadataGraphql: vi.fn(),
}));

import { queryMetadataGraphql } from './metadata-graphql-fetch';
import {
  fetchObjectsFieldsPage,
  resetObjectsFieldsPageCacheForTests,
} from './fetch-objects-fields-page';

describe('fetchObjectsFieldsPage', () => {
  beforeEach(() => {
    resetObjectsFieldsPageCacheForTests();
    vi.mocked(queryMetadataGraphql).mockReset();
  });

  it('shares one in-flight metadata request across callers', async () => {
    let resolveQuery!: (value: unknown) => void;
    vi.mocked(queryMetadataGraphql).mockReturnValue(
      new Promise((resolve) => {
        resolveQuery = resolve;
      }),
    );

    const a = fetchObjectsFieldsPage();
    const b = fetchObjectsFieldsPage();
    expect(queryMetadataGraphql).toHaveBeenCalledTimes(1);

    resolveQuery({
      objects: {
        edges: [{ node: { nameSingular: 'opportunity', fieldsList: [] } }],
      },
    });

    await expect(a).resolves.toHaveLength(1);
    await expect(b).resolves.toHaveLength(1);
    expect(queryMetadataGraphql).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack yarn test:unit src/deals-board/metadata/fetch-objects-fields-page.test.ts`

Expected: FAIL (module missing)

- [ ] **Step 3: Implement cache module + wire `fetch-object-fields.ts`**

`fetch-objects-fields-page.ts`:

```ts
import { queryMetadataGraphql } from './metadata-graphql-fetch';

const FETCH_OBJECTS_FIELDS_QUERY = `...same query as today...`;

type ObjectsFieldsResult = {
  objects?: { edges?: Array<{ node?: { nameSingular?: string; fieldsList?: unknown[] } }> };
};

let cachedPromise: Promise<NonNullable<ObjectsFieldsResult['objects']>['edges']> | null = null;

export const resetObjectsFieldsPageCacheForTests = (): void => {
  cachedPromise = null;
};

export const fetchObjectsFieldsPage = async () => {
  if (!cachedPromise) {
    cachedPromise = queryMetadataGraphql<ObjectsFieldsResult>(FETCH_OBJECTS_FIELDS_QUERY, {
      paging: { first: 200 },
    }).then((result) => result.objects?.edges ?? []);
  }
  return cachedPromise;
};
```

Update `fetchObjectFields` to call `fetchObjectsFieldsPage()` and find `nameSingular` (keep existing error if missing).

- [ ] **Step 4: Run tests**

Run: `corepack yarn test:unit src/deals-board/metadata/fetch-objects-fields-page.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/metadata/fetch-objects-fields-page.ts src/deals-board/metadata/fetch-objects-fields-page.test.ts src/deals-board/metadata/fetch-object-fields.ts
git commit -m "perf(deals-board): share one metadata objects page for field descriptors"
```

---

### Task 4: Parallel REST enrich + defer list-status prefetch

**Files:**
- Modify: `src/deals-board/api/opportunity-link-fields-rest.ts`
- Modify: `src/deals-board/api/opportunity-link-fields-rest.test.ts` (add parallel chunk expectation if useful; keep existing tests green)
- Modify: `src/deals-board/hooks/useLineItemListStatus.ts`
- Modify: `src/deals-board/DealsBoard.tsx`

**Interfaces:**
- Consumes: `usePrefetchLineItemListStatuses(ids)`; opportunities + line items loading flags
- Produces: REST chunks fetched concurrently; list-status batch `enabled` only after parent+child first paint data is ready

- [ ] **Step 1: Parallelize REST chunks**

In `enrichOpportunityRowsWithRestFields`, replace sequential `for (const chunk of …)` with:

```ts
  const chunkResults = await Promise.all(
    chunkIds(
      records.map((record) => record.id),
      ID_CHUNK_SIZE,
    ).map(async (chunk) => {
      const response = await client.get<unknown>('/rest/opportunities', {
        query: {
          limit: chunk.length,
          filter: `id[in]:${JSON.stringify(chunk)}`,
        },
      });
      return normalizeRestListResponse<Record<string, unknown>>(response, 'opportunities');
    }),
  );

  for (const items of chunkResults) {
    for (const item of items) {
      if (typeof item.id === 'string') {
        restDataById.set(item.id, item);
      }
    }
  }
```

- [ ] **Step 2: Add `enabled` to prefetch hook**

```ts
export const usePrefetchLineItemListStatuses = (
  lineItemIds: string[],
  enabled = true,
) => {
  // ...
  return useQuery({
    // ...
    enabled: enabled && Boolean(idsKey) && isCrmparserConfigured(),
    // ...
  });
};
```

- [ ] **Step 3: Defer in `DealsBoard.tsx`**

```ts
  const listStatusReady =
    !opportunitiesQuery.isLoading &&
    !lineItemsQuery.isLoading &&
    listStatusLineItemIds.length > 0;

  usePrefetchLineItemListStatuses(listStatusLineItemIds, listStatusReady);
```

(Keep mobile path consistent: use display ids only when the active layout’s line-item query is settled.)

- [ ] **Step 4: Run unit tests for REST helper**

Run: `corepack yarn test:unit src/deals-board/api/opportunity-link-fields-rest.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/api/opportunity-link-fields-rest.ts src/deals-board/hooks/useLineItemListStatus.ts src/deals-board/DealsBoard.tsx
git commit -m "perf(deals-board): parallel REST enrich and defer list-status prefetch"
```

---

### Task 5: Aggregate payload types + pure hydrate helpers (TDD)

**Files:**
- Create: `src/logic-functions/shared/deals-board-page-types.ts`
- Create: `src/logic-functions/shared/deals-board-page-core.ts`
- Create: `src/logic-functions/shared/deals-board-page-core.test.ts`

**Interfaces:**
- Consumes: opportunity/line-item row shapes (minimal)
- Produces:
  - `DealsBoardPageRequest` / `DealsBoardPageResponse`
  - `groupLineItemsByOpportunityId(items): Record<string, LineItemRowLike[]>`
  - `shouldUseDealsBoardPageFallback(error: unknown): boolean` — true for network/5xx/timeout-like failures

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest';

import {
  groupLineItemsByOpportunityId,
  shouldUseDealsBoardPageFallback,
} from './deals-board-page-core';

describe('groupLineItemsByOpportunityId', () => {
  it('groups by opportunityId', () => {
    expect(
      groupLineItemsByOpportunityId([
        { id: 'l1', opportunityId: 'o1' },
        { id: 'l2', opportunityId: 'o1' },
        { id: 'l3', opportunityId: 'o2' },
      ]),
    ).toEqual({
      o1: [
        { id: 'l1', opportunityId: 'o1' },
        { id: 'l2', opportunityId: 'o1' },
      ],
      o2: [{ id: 'l3', opportunityId: 'o2' }],
    });
  });
});

describe('shouldUseDealsBoardPageFallback', () => {
  it('falls back on 5xx-shaped errors', () => {
    expect(shouldUseDealsBoardPageFallback({ status: 503 })).toBe(true);
  });

  it('does not fall back on 400', () => {
    expect(shouldUseDealsBoardPageFallback({ status: 400 })).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `corepack yarn test:unit src/logic-functions/shared/deals-board-page-core.test.ts`

Expected: FAIL

- [ ] **Step 3: Implement types + helpers**

`deals-board-page-types.ts`:

```ts
export type DealsBoardPageRequest = {
  limit: number;
  offset: number;
  /** Pre-built GraphQL filter object from client `buildOpportunityFilter` path */
  opportunityFilter?: Record<string, unknown>;
  orderBy: Array<Record<string, string>>;
  visibleCrmFieldNames: string[];
  includeCompanyRelation: boolean;
  restFieldNames: string[];
  includeListStatus: boolean;
};

export type DealsBoardPageResponse = {
  opportunities: Array<Record<string, unknown>>;
  totalCount: number;
  lineItemsByOppId: Record<string, Array<Record<string, unknown>>>;
  listStatusByLineItemId?: Record<string, unknown>;
};
```

Implement `groupLineItemsByOpportunityId` and `shouldUseDealsBoardPageFallback` in `deals-board-page-core.ts`.

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Commit**

```bash
git add src/logic-functions/shared/deals-board-page-types.ts src/logic-functions/shared/deals-board-page-core.ts src/logic-functions/shared/deals-board-page-core.test.ts
git commit -m "feat(deals-board): add aggregate page payload helpers"
```

---

### Task 6: Logic function `deals-board-page`

**Files:**
- Modify: `src/constants/universal-identifiers.ts` — add  
  `DEALS_BOARD_PAGE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER = '6a151f61-ebf5-45d1-8b97-aa6066cd385c'`
- Create: `src/logic-functions/deals-board-page.ts`

**Interfaces:**
- Consumes: `CoreApiClient` (opportunities page), `RestApiClient` (`/rest/dealLineItems` batched by opp ids — mirror client chunking), optional crmparser proxy for list-status (reuse `crmparserProxyFetch`), `groupLineItemsByOpportunityId`
- Produces: HTTP `POST /deals-board/page` → `DealsBoardPageResponse`; `isAuthRequired: true`

- [ ] **Step 1: Add UUID constant**

Exact value: `6a151f61-ebf5-45d1-8b97-aa6066cd385c`

- [ ] **Step 2: Scaffold LF with `yarn twenty dev:add logicFunction` if interactive; otherwise hand-write matching existing LF style**

Handler outline:

```ts
const handler = async (event: RoutePayload) => {
  const body = parseRequestBody(event.body) as DealsBoardPageRequest | null;
  if (!body?.limit || body.offset == null || !Array.isArray(body.orderBy)) {
    return jsonProxyResponse(400, { error: 'invalid deals-board page request' });
  }

  const client = new CoreApiClient();
  // Query opportunities with first/offset/orderBy/filter using a fixed safe selection
  // (id, name, companyId, company, amount, stage, loadDate + requested visible fields if schema allows).
  // Then RestApiClient get dealLineItems for those ids (reuse chunk size 50).
  // Optionally crmparserProxyFetch list-status POST with line item ids.
  // Return DealsBoardPageResponse.
};
```

Reuse patterns from `src/deals-board/api/line-items.ts` chunking **copied into** `src/logic-functions/shared/` as a small REST helper if importing client modules from LF is awkward (LF runtime may not bundle Remote DOM client code). Prefer LF-local helpers over importing `src/deals-board/api/*`.

REST enrich for `restFieldNames`: same id `[in]` opportunities REST merge as client (optional in v1 — if empty, skip).

- [ ] **Step 3: Timeout**

Set `timeoutSeconds: 60` (same as list-status batch).

- [ ] **Step 4: Smoke locally after `yarn twenty apply` / docker sync**

`POST` with auth to `/s/.../deals-board/page` (path as declared) with a tiny body; expect 200 JSON with `opportunities` array.

- [ ] **Step 5: Commit**

```bash
git add src/constants/universal-identifiers.ts src/logic-functions/deals-board-page.ts src/logic-functions/shared/
git commit -m "feat(deals-board): add deals-board-page aggregate logic function"
```

---

### Task 7: Client `fetchDealsBoardPage` + multi-call fallback

**Files:**
- Create: `src/deals-board/api/deals-board-page.ts`
- Create: `src/deals-board/api/deals-board-page.test.ts`
- Modify: `src/deals-board/api/crmparser.ts` only if extracting a shared `logicFunctionFetch` export is cleaner (optional; may duplicate thin fetch)

**Interfaces:**
- Consumes: `DealsBoardPageRequest`, `shouldUseDealsBoardPageFallback`, existing `fetchOpportunities` + `fetchLineItemsByOpportunityIds` + `fetchLineItemsListStatusBatch`
- Produces: `fetchDealsBoardPage(req): Promise<DealsBoardPageResponse>` — tries LF first; on fallbackable error logs once and runs legacy parallel path assembling the same response shape

- [ ] **Step 1: Failing test for fallback assembly**

Test a pure `assembleDealsBoardPageFromLegacy` (export from same module) that maps `{ records, totalCount }` + line items array → `DealsBoardPageResponse` using `groupLineItemsByOpportunityId`.

- [ ] **Step 2: Implement LF POST**

Path: `/deals-board/page` (must match LF `httpRouteTriggerSettings.path`). Use same base URL + Bearer pattern as `crmparser.ts` `logicFunctionFetch`.

- [ ] **Step 3: Implement fallback**

```ts
export const fetchDealsBoardPage = async (
  request: DealsBoardPageRequest,
  legacy: () => Promise<DealsBoardPageResponse>,
): Promise<DealsBoardPageResponse> => {
  try {
    return await postDealsBoardPage(request);
  } catch (error) {
    if (!shouldUseDealsBoardPageFallback(error)) throw error;
    console.warn('[deals-board-page] falling back to multi-call path', error);
    return legacy();
  }
};
```

Legacy builder calls existing opportunity + line-item APIs (and list-status if `includeListStatus`).

- [ ] **Step 4: Unit tests PASS**

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/api/deals-board-page.ts src/deals-board/api/deals-board-page.test.ts
git commit -m "feat(deals-board): client aggregate page fetch with multi-call fallback"
```

---

### Task 8: Wire board cold path to aggregate + hydrate RQ

**Files:**
- Create: `src/deals-board/hooks/useDealsBoardPage.ts`
- Modify: `src/deals-board/hooks/useOpportunities.ts` and/or `src/deals-board/DealsBoard.tsx`
- Modify: `src/deals-board/hooks/useLineItems.ts` consumers as needed

**Interfaces:**
- Consumes: `fetchDealsBoardPage`, `lineItemsQueryKey`, `lineItemListStatusQueryKey`, `opportunitiesQueryKey` fields
- Produces: One primary cold query when **not** `showAll` and **not** line-item-clause `fetchAll`; on success `queryClient.setQueryData(lineItemsQueryKey(...), flatItems)` and seed list-status keys; opportunities data exposed like `useOpportunities`

**Wiring rules (explicit):**
1. If `showAll || fetchAll` (wide month/custom/line-item search): keep today’s `useOpportunities` + `useLineItems` (no LF).
2. Else (default future paginated / tight presets): `useDealsBoardPage` is the source of opportunity records + totalCount; skip separate `useLineItems` for those ids (data already hydrated) **or** keep `useLineItems` enabled=false when hydrate succeeded.
3. Realtime invalidation: invalidate both `['opportunities']` and `['deals-board-page']` and `['lineItems']` (extend `useDealsBoardRealtimeSync` if it only targets opportunities today).

- [ ] **Step 1: Implement `useDealsBoardPage`**

Use `keepPreviousData`, same stale defaults as board QueryClient. `queryFn` builds `DealsBoardPageRequest` from current filters (reuse `buildOpportunityFilter` / sort from opportunities path).

- [ ] **Step 2: Integrate in `DealsBoard.tsx`**

Replace cold path carefully: derived `records` / `totalCount` / `lineItemsByOppId` from aggregate when active; otherwise legacy.

- [ ] **Step 3: Manual smoke**

Local/staging: open Реализация default view — Network should show one `/deals-board/page` (or `/s/...`) instead of separate opportunities then dealLineItems storm; expand 5 deals; toggle showAll and confirm legacy path still works.

- [ ] **Step 4: Run `corepack yarn test:unit`**

Expected: PASS for touched suites

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/hooks/useDealsBoardPage.ts src/deals-board/DealsBoard.tsx src/deals-board/hooks/useOpportunities.ts src/deals-board/realtime/useDealsBoardRealtimeSync.ts
git commit -m "feat(deals-board): use aggregate page for paginated cold load"
```

---

### Task 9: Native Twenty shell track (notes only)

**Files:**
- Create: `docs/superpowers/notes/2026-07-29-native-twenty-shell-perf.md`

**Interfaces:**
- Consumes: Task 0 baseline numbers; post-D1/D2 Реализация numbers
- Produces: written shell floor + infra checklist (Dokploy Redis/cache, Twenty version, metadata bloat) — no BrandingTwentyView code required to “pass”

- [ ] **Step 1: Write note with table**

| Surface | Finish | Requests | Notes |
|---------|--------|----------|-------|
| Opportunities F5 (shell) | | | |
| Реализация F5 after D1 | | | |
| Реализация F5 after D2 | | | |

List concrete next infra actions if shell Finish > 2s.

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/notes/2026-07-29-native-twenty-shell-perf.md
git commit -m "docs: note native Twenty shell cold-load floor and infra levers"
```

---

### Task 10: Version bump + verification checklist

**Files:**
- Modify: `package.json` (patch, e.g. `0.5.3` → `0.5.4`)

- [ ] **Step 1: Bump patch version**

- [ ] **Step 2: Staging checklist (manual)**

1. F5 Opportunities — record Finish (shell floor)
2. F5 Реализация default «Будущие» — board-owned Finish ≤ ~2s target; ≤1 primary aggregate call when paginated
3. Toggle showAll — heavy path OK
4. today/week presets OK
5. Expand 5 deals OK
6. Analytics rashod still loads (Wave C)
7. Simulate LF down (optional): board still loads via fallback

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: bump deals-board to 0.5.4 after cold-load perf"
```

---

## Spec coverage self-check

| Spec item | Task |
|-----------|------|
| `showAll: false` default + migrate | 1 |
| Paginate `future` / narrow fetchAll | 2 |
| Metadata dedupe | 3 |
| Gate list-status / parallel REST / rashod already lazy | 4 (+ Wave C) |
| Aggregate LF `deals-board-page` | 5–6 |
| Client + fallback | 7 |
| RQ hydrate / board wire | 8 |
| Native best-effort + document floor | 0, 9 |
| ≤2s board-owned success criteria | 10 checklist |
| Unit tests + smoke | per-task + 10 |

## Placeholder / consistency check

- UUID locked: `6a151f61-ebf5-45d1-8b97-aa6066cd385c`
- LF path locked: `/deals-board/page`
- `future` paginates; `month`/`custom`/line-item clauses still `fetchAll`
- Fallback helper name: `shouldUseDealsBoardPageFallback`
