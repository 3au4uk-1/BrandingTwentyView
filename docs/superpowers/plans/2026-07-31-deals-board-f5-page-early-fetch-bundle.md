# Deals Board F5 — Page LF + Early Fetch + Metadata SDK Diet — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut F5 time-to-board-data by making warm `/s/deals-board/page` &lt; ~200 ms, starting the aggregate fetch before fields/view-seed finish, and removing the client `MetadataApiClient` (~181 KB metadata sdk-client).

**Architecture:** Parallelize REST enrich ∥ line-items inside the LF and never call list-status on that path (client prefetch badges). Loosen aggregate `enabled` gate with provisional future-view defaults. Route prevyu cell uploads through existing `prevyu-upload` LF so the front-component build no longer links `twenty-client-sdk/metadata`.

**Tech Stack:** React 19, Vitest, `twenty-sdk` logic functions, `twenty-client-sdk` core/rest (LF only for metadata upload), TanStack Query v5.

**Spec:** `docs/superpowers/specs/2026-07-31-deals-board-f5-page-early-fetch-bundle-design.md`

## Global Constraints

- List-status badges may appear ~100–300 ms after rows (accepted).
- Do **not** add short-TTL LF cache in this plan.
- Do **not** attempt to shrink host `/assets/FrontComponentRenderer*.js`.
- Do **not** add `React.lazy` for size (`splitting: false` in twenty-sdk).
- Legacy `useOpportunities` (showAll) keeps today’s stricter gate.
- Commits only if the user explicitly asks; otherwise leave working tree dirty and continue.
- Prefer `yarn test:unit` for verification; `yarn twenty apply` before claiming UI updated.
- Every task’s requirements implicitly include this section.

---

## File structure

| File | Responsibility |
|------|----------------|
| `src/logic-functions/shared/deals-board-page-pipeline.ts` | Pure-ish pipeline: GQL → parallel enrich∥LIs → response (+ optional timings); **no** list-status |
| `src/logic-functions/shared/deals-board-page-pipeline.test.ts` | Assert parallel start + no list-status call |
| `src/logic-functions/deals-board-page.ts` | Thin HTTP wrapper calling pipeline |
| `src/logic-functions/shared/deals-board-page-types.ts` | Optional `debug?: boolean`; response optional `_timings` |
| `src/deals-board/utils/aggregate-cold-load-gate.ts` | `shouldEnableAggregateColdLoad` |
| `src/deals-board/utils/aggregate-cold-load-gate.test.ts` | Gate unit tests |
| `src/deals-board/DealsBoard.tsx` | Use gate; provisional viewId; always prefetch list-status |
| `src/deals-board/hooks/useDealsBoardPage.ts` | `includeListStatus: false` on request (or leave true but LF ignores) |
| `src/deals-board/api/deals-board-page.ts` | Legacy fallback: skip list-status assemble (deferred prefetch) |
| `src/deals-board/api/files-field.ts` | Remove `MetadataApiClient`; LF-based upload helper |
| `src/deals-board/api/files-field.test.ts` | Mock fetch to prevyu-upload |
| `src/deals-board/editors/prevyu/usePrevyuMediaActions.ts` | Upload via LF; avoid double REST patch |

---

### Task 1: LF pipeline — parallel stages, no list-status

**Files:**
- Create: `src/logic-functions/shared/deals-board-page-pipeline.ts`
- Create: `src/logic-functions/shared/deals-board-page-pipeline.test.ts`
- Modify: `src/logic-functions/deals-board-page.ts`
- Modify: `src/logic-functions/shared/deals-board-page-types.ts` (optional `debug`, `_timings`)
- Modify: `src/deals-board/api/deals-board-page.ts` (legacy fallback omit list-status)
- Modify: `src/deals-board/DealsBoard.tsx` (list-status prefetch always when ids ready)
- Modify: `src/deals-board/hooks/useDealsBoardPage.ts` (set `includeListStatus: false` on request)

**Interfaces:**
- Consumes: `enrichOpportunityRowsWithRestFields`, `fetchLineItemsByOpportunityIds`, `groupLineItemsByOpportunityId`, `buildOpportunityNodeSelection`, `resolveFieldTypesByName`
- Produces: `runDealsBoardPagePipeline(deps, body) → DealsBoardPageResponse` with no `listStatusByLineItemId`

- [ ] **Step 1: Write failing pipeline test**

Create `src/logic-functions/shared/deals-board-page-pipeline.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { runDealsBoardPagePipeline } from './deals-board-page-pipeline';

describe('runDealsBoardPagePipeline', () => {
  it('runs enrich and line-items in parallel after GQL and never fetches list-status', async () => {
    const order: string[] = [];
    let enrichStarted = false;
    let lineItemsStarted = false;
    let bothStartedBeforeEitherFinished = false;

    const deps = {
      queryOpportunities: vi.fn(async () => {
        order.push('gql');
        return {
          opportunities: {
            edges: [{ node: { id: 'o1', name: 'Deal' } }],
            totalCount: 1,
          },
        };
      }),
      enrichWithRest: vi.fn(async (rows: Array<Record<string, unknown>>) => {
        enrichStarted = true;
        if (lineItemsStarted) bothStartedBeforeEitherFinished = true;
        await new Promise((r) => setTimeout(r, 30));
        order.push('enrich');
        return rows;
      }),
      fetchLineItems: vi.fn(async () => {
        lineItemsStarted = true;
        if (enrichStarted) bothStartedBeforeEitherFinished = true;
        await new Promise((r) => setTimeout(r, 30));
        order.push('lineItems');
        return [{ id: 'li1', opportunityId: 'o1' }];
      }),
      fetchListStatus: vi.fn(async () => ({ li1: { blacklisted: true } })),
    };

    const result = await runDealsBoardPagePipeline(deps, {
      limit: 50,
      offset: 0,
      orderBy: [{ loadDate: 'AscNullsLast' }],
      visibleCrmFieldNames: ['name'],
      includeCompanyRelation: false,
      restFieldNames: ['someLink'],
      includeListStatus: true,
    });

    expect(order[0]).toBe('gql');
    expect(bothStartedBeforeEitherFinished).toBe(true);
    expect(deps.fetchListStatus).not.toHaveBeenCalled();
    expect(result.listStatusByLineItemId).toBeUndefined();
    expect(result.opportunities).toHaveLength(1);
    expect(result.lineItemsByOppId.o1).toHaveLength(1);
  });

  it('skips enrich when restFieldNames empty', async () => {
    const enrichWithRest = vi.fn(async (rows: Array<Record<string, unknown>>) => rows);
    const result = await runDealsBoardPagePipeline(
      {
        queryOpportunities: async () => ({
          opportunities: { edges: [{ node: { id: 'o1' } }], totalCount: 1 },
        }),
        enrichWithRest,
        fetchLineItems: async () => [],
        fetchListStatus: vi.fn(),
      },
      {
        limit: 10,
        offset: 0,
        orderBy: [],
        visibleCrmFieldNames: ['name'],
        includeCompanyRelation: false,
        restFieldNames: [],
        includeListStatus: false,
      },
    );
    expect(enrichWithRest).not.toHaveBeenCalled();
    expect(result.totalCount).toBe(1);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL (module missing)**

Run: `yarn vitest run src/logic-functions/shared/deals-board-page-pipeline.test.ts`  
Expected: FAIL cannot find module / `runDealsBoardPagePipeline` undefined

- [ ] **Step 3: Implement pipeline + wire handler**

`deals-board-page-pipeline.ts` sketch:

```ts
export type DealsBoardPagePipelineDeps = {
  queryOpportunities: (args: unknown) => Promise<{
    opportunities?: { edges?: Array<{ node: Record<string, unknown> }>; totalCount?: number };
  }>;
  enrichWithRest: (
    rows: Array<Record<string, unknown>>,
    restFieldNames: string[],
  ) => Promise<Array<Record<string, unknown>>>;
  fetchLineItems: (opportunityIds: string[]) => Promise<Array<{ id: string; opportunityId: string }>>;
  fetchListStatus?: (ids: string[]) => Promise<Record<string, unknown> | undefined>;
};

export const runDealsBoardPagePipeline = async (
  deps: DealsBoardPagePipelineDeps,
  body: DealsBoardPageRequest,
): Promise<DealsBoardPageResponse> => {
  const t0 = Date.now();
  // 1) call deps.queryOpportunities with selection built outside or inside
  // 2) normalize nodes (companyName / loadDate) — copy from deals-board-page.ts
  // 3) ids = ...
  // 4) const enrichPromise = restFieldNames.length
  //      ? deps.enrichWithRest(rows, restFieldNames)
  //      : Promise.resolve(rows);
  //    const lineItemsPromise = deps.fetchLineItems(ids);
  //    const [opportunities, lineItems] = await Promise.all([enrichPromise, lineItemsPromise]);
  // 5) NEVER call deps.fetchListStatus
  // 6) if body.debug, attach _timings
};
```

In `deals-board-page.ts`, handler constructs deps from `CoreApiClient` / `RestApiClient` and calls `runDealsBoardPagePipeline`. Delete in-handler sequential enrich → LIs → list-status. Keep `fetchListStatusByLineItemId` unused or delete.

Types: add optional `debug?: boolean` on request; optional `_timings?: { gqlMs: number; enrichMs: number; lineItemsMs: number; totalMs: number }` on response (allowed extra field).

Client: in `useDealsBoardPage` request builder set `includeListStatus: false`. In `fetchDealsBoardPage` legacy path, do not call `fetchLineItemsListStatusBatch`. In `DealsBoard.tsx`, change list-status prefetch to:

```ts
usePrefetchLineItemListStatuses(
  listStatusLineItemIds,
  listStatusLineItemIds.length > 0 && !activeColdLoadLoading,
);
```

(remove `!listStatusHydratedFromAggregate` skip, or keep skip only when statuses actually present).

- [ ] **Step 4: Run pipeline tests — expect PASS**

Run: `yarn vitest run src/logic-functions/shared/deals-board-page-pipeline.test.ts src/deals-board/api/deals-board-page.test.ts src/deals-board/hooks/useDealsBoardPage.test.ts`  
Expected: PASS (update any tests that assert aggregate `listStatusByLineItemId` hydration from page response)

- [ ] **Step 5: Commit only if user asked**

Otherwise continue.

---

### Task 2: Early aggregate cold-load gate

**Files:**
- Create: `src/deals-board/utils/aggregate-cold-load-gate.ts`
- Create: `src/deals-board/utils/aggregate-cold-load-gate.test.ts`
- Modify: `src/deals-board/DealsBoard.tsx`

**Interfaces:**
- Consumes: `FUTURE_DEALS_VIEW_FILTERS`, `FUTURE_DEALS_VIEW_SORT`, `DEFAULT_PARENT_COLUMNS` (already used in DealsBoard)
- Produces:
  - `shouldEnableAggregateColdLoad({ useAggregateColdPath, viewsIsError }: { useAggregateColdPath: boolean; viewsIsError: boolean }): boolean`
  - `provisionalAggregateViewId(activeViewId: string | undefined): string` → `activeViewId ?? 'provisional-future'`

- [ ] **Step 1: Write failing gate tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  provisionalAggregateViewId,
  shouldEnableAggregateColdLoad,
} from './aggregate-cold-load-gate';

describe('shouldEnableAggregateColdLoad', () => {
  it('is true when aggregate path and views not in error', () => {
    expect(
      shouldEnableAggregateColdLoad({ useAggregateColdPath: true, viewsIsError: false }),
    ).toBe(true);
  });

  it('is false when not aggregate path', () => {
    expect(
      shouldEnableAggregateColdLoad({ useAggregateColdPath: false, viewsIsError: false }),
    ).toBe(false);
  });

  it('is false when views errored', () => {
    expect(
      shouldEnableAggregateColdLoad({ useAggregateColdPath: true, viewsIsError: true }),
    ).toBe(false);
  });
});

describe('provisionalAggregateViewId', () => {
  it('uses real id when present', () => {
    expect(provisionalAggregateViewId('abc')).toBe('abc');
  });
  it('uses provisional-future when missing', () => {
    expect(provisionalAggregateViewId(undefined)).toBe('provisional-future');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `yarn vitest run src/deals-board/utils/aggregate-cold-load-gate.test.ts`  
Expected: FAIL module missing

- [ ] **Step 3: Implement gate helpers + wire DealsBoard**

```ts
export const shouldEnableAggregateColdLoad = (params: {
  useAggregateColdPath: boolean;
  viewsIsError: boolean;
}): boolean => params.useAggregateColdPath && !params.viewsIsError;

export const provisionalAggregateViewId = (activeViewId: string | undefined): string =>
  activeViewId ?? 'provisional-future';
```

In `DealsBoard.tsx`:

1. Keep `baseColdLoadEnabled` for **legacy** `useOpportunities` only.
2. For aggregate:

```ts
const aggregateColdLoadEnabled = shouldEnableAggregateColdLoad({
  useAggregateColdPath,
  viewsIsError: Boolean(viewsQuery.isError),
});
```

3. Pass `enabled: aggregateColdLoadEnabled` to `useDealsBoardPage`.
4. Pass `viewId: provisionalAggregateViewId(activeView?.id)` into `useDealsBoardPage`.
5. Ensure filters/sort already fall back via session + `activeView?.filters` — when `activeView` is null, board filters should still resolve using future defaults. If today `mergedFilters` becomes empty without `activeView`, seed filter inputs from `FUTURE_DEALS_VIEW_FILTERS` / `FUTURE_DEALS_VIEW_SORT` when `!activeView && useAggregateColdPath` (minimal change in the existing `useMemo` for `mergedFilters` / `effectiveSort`).

Verify `restFieldNames` naturally `[]` while `parentFieldsQuery.data` is undefined — no code change required if `resolveOpportunityRestFieldNames(..., [])` returns `[]`.

- [ ] **Step 4: Run gate + related tests — expect PASS**

Run: `yarn vitest run src/deals-board/utils/aggregate-cold-load-gate.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit only if user asked**

---

### Task 3: Remove client MetadataApiClient (prevyu via LF)

**Files:**
- Modify: `src/deals-board/api/files-field.ts`
- Modify: `src/deals-board/api/files-field.test.ts`
- Modify: `src/deals-board/editors/prevyu/usePrevyuMediaActions.ts`
- Optionally add: `src/deals-board/api/prevyu-upload-client.ts` if files-field would otherwise import too much env/token logic — prefer reusing patterns from `deals-board-page.ts` / `crmparser.ts` (`getTwentyFunctionsBaseUrl` + `TWENTY_APP_ACCESS_TOKEN`)

**Interfaces:**
- Consumes: existing LF `POST {base}/prevyu-upload/:lineItemId` body `{ dataBase64, filename?, contentType? }` → `{ ok: true, files: [...] }`
- Produces: `uploadPrevyuFilesViaLogicFunction(lineItemId: string, file: File): Promise<LineItemFileRef[]>` (full files list after LF patch)

- [ ] **Step 1: Write failing test for LF upload helper**

In `files-field.test.ts` (or new `prevyu-upload-client.test.ts`):

```ts
it('POSTs base64 to prevyu-upload LF and returns files', async () => {
  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify({ ok: true, files: [{ fileId: 'f1', label: 'a.png' }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
  // stub env token + base URL the same way other api tests do
  const files = await uploadPrevyuFilesViaLogicFunction('li-1', new File([new Uint8Array([1,2,3])], 'a.png', { type: 'image/png' }));
  expect(files).toEqual([{ fileId: 'f1', label: 'a.png' }]);
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringMatching(/\/prevyu-upload\/li-1$/),
    expect.objectContaining({ method: 'POST' }),
  );
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `yarn vitest run src/deals-board/api/files-field.test.ts`  
Expected: FAIL missing export / function

- [ ] **Step 3: Implement LF upload; strip MetadataApiClient; wire media actions**

1. Remove all `MetadataApiClient` / `getMetadataApiClient` / `DEAL_LINE_ITEM_PREVYU_OKLEYKI_FIELD_UNIVERSAL_IDENTIFIER` imports from `files-field.ts`.
2. Delete or repurpose `uploadPrevyuImageFile` — replace with LF helper that:
   - reads buffer (keep existing empty/truncated Remote DOM checks)
   - base64-encodes
   - `POST` to `${getTwentyFunctionsBaseUrl()}/prevyu-upload/${id}` with Bearer token
   - returns `sanitizePrevyuFileRefs(body.files)`
3. In `usePrevyuMediaActions.addFiles`:
   - For each file (or sequentially as today), call LF helper with `itemId`
   - Set `next` from returned `files` (LF already patched)
   - **Do not** call `updateMutation.mutateAsync` for the upload path (avoids double PATCH). Instead update React Query line-item cache the same way `useUpdateLineItem` onSuccess would — inspect `useUpdateLineItem` and either call a small `setQueryData` helper or invoke mutate with a no-op skip. Prefer: read `useLineItems` query key pattern and `queryClient.setQueryData` for that line item’s `prevyuOkleyki`.
   - Keep `updateMutation` for remove / reorder paths that only PATCH.

4. Grep repo for `MetadataApiClient` under `src/deals-board` — must be zero.
5. Grep for `uploadPrevyuImageFile` — update all call sites.

- [ ] **Step 4: Run unit tests — expect PASS**

Run: `yarn vitest run src/deals-board/api/files-field.test.ts src/deals-board/editors/prevyu`  
Then: `yarn test:unit`  
Expected: PASS

- [ ] **Step 5: Apply to staging/local and smoke**

Run: `yarn twenty apply` (or project’s usual sync)  
Manual: F5 Реализация — no `/rest/sdk-client/metadata/...`; page TTFB; list-status chips appear; upload one prevyu from cell.

- [ ] **Step 6: Commit only if user asked**

---

## Spec coverage self-review

| Spec requirement | Task |
|------------------|------|
| Parallel enrich ∥ line-items | Task 1 |
| No list-status on LF hot path | Task 1 |
| Optional timings via debug | Task 1 |
| Client deferred list-status prefetch | Task 1 |
| Early aggregate gate (no fields/seed wait) | Task 2 |
| Provisional view id / future defaults | Task 2 |
| Empty restFieldNames until metadata | Task 2 (natural) |
| Remove client MetadataApiClient | Task 3 |
| Reuse prevyu-upload LF | Task 3 |
| No React.lazy / no host FrontComponentRenderer | constrained out |
| Warm &lt;200 ms target | verified manually after Task 1+apply |

## Placeholder scan

No TBD/TODO steps; commands and code sketches included.

---

**Plan complete and saved to** `docs/superpowers/plans/2026-07-31-deals-board-f5-page-early-fetch-bundle.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute in this session with checkpoints  

Which approach?
