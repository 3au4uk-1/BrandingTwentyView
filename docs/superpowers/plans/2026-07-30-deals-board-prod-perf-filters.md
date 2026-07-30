# Deals Board Prod Perf + Filters on Aggregate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make prod «Реализация» cold load use a healthy `/deals-board/page` (200, no ~11s `fetch failed` tax), fail soft on aggregate errors, then keep stage/tip filters on the paginated aggregate path instead of `fetchAll`.

**Architecture:** P0 diagnoses and fixes prod LOCAL LF loopback/hairpin so `CoreApiClient`/`RestApiClient` inside `deals-board-page` can reach Twenty. P1 adds a short client `AbortSignal` on `postDealsBoardPage` so fallback is fast. P2 stops line-item clauses from forcing `fetchAll`, pre-resolves matching opportunity IDs via REST, and ANDs them into `buildOpportunityFilter` while staying on `useDealsBoardPage`.

**Tech Stack:** React 19, `@tanstack/react-query` v5, Vitest, `twenty-sdk` logic functions, `twenty-client-sdk` (`CoreApiClient`, `RestApiClient`), Dokploy compose `twenty` / `twenty-staging` on host `docker` (CT 103).

**Spec:** `docs/superpowers/specs/2026-07-30-deals-board-prod-perf-filters-design.md`  
**Related:** `docs/superpowers/specs/2026-07-29-deals-board-cold-load-perf-design.md`

## Global Constraints

- Order: Task 0–1 (P0 ops) → Task 2–3 (P1) → Task 4–7 (P2) → Task 8 manual verify → Task 9 version bump
- Priority environment: **prod** (`twenty.dosugmayak.ru`); staging must not regress
- Do **not** rewrite Twenty core shell (`index-….js` metadata/graphql storm)
- Do **not** reopen parent-row virtualization or Wave B KPI universe
- Preserve Apple ops UI; no visual redesign
- `showAll: true` remains an intentional heavy path
- TDD for pure helpers and client fetch/fallback behavior
- Use `corepack yarn` on Windows if `yarn` missing; prefer ASCII worktree if Cyrillic breaks vitest
- All new UUIDs must be valid UUID v4
- Patch-bump `package.json` only in the final task
- Never update git config; if commit identity missing, set `GIT_AUTHOR_*` / `GIT_COMMITTER_*` env for that commit only (match recent author `3au4uk-1 <forsteam.vd2@mail.ru>`)
- Every task’s requirements implicitly include this section

---

## File structure

| File | Responsibility |
|------|----------------|
| `docs/superpowers/notes/2026-07-30-prod-deals-board-page-fetch-failed.md` | P0 diagnosis evidence + chosen fix |
| Prod Twenty compose / Traefik / DNS (Dokploy `twenty`, composeId `oI7-NCBTpfyrxJBitrJrd0`) | Make LF SDK reach API (loopback or hairpin) |
| `src/deals-board/api/deals-board-page.ts` | Client AbortSignal + error surfacing for P1 |
| `src/deals-board/api/deals-board-page.test.ts` | Abort / fallback timing tests |
| `src/logic-functions/deals-board-page.ts` | Optional non-secret cause on 500 |
| `src/deals-board/api/line-items.ts` | `buildDealLineItemsAttributeFilter` + `fetchLineItemOpportunityIdsByFilters` |
| `src/deals-board/api/line-items.test.ts` | Filter string + ID fetch tests |
| `src/deals-board/utils/search.ts` | AND `{ id: { in } }` when filter-matched IDs present without search |
| `src/deals-board/utils/search.test.ts` | ID-only opportunity filter cases |
| `src/deals-board/utils/date-filters.ts` | Stop forcing `fetchAll` for line-item clauses |
| `src/deals-board/utils/date-filters.test.ts` | Expect line-item clauses → `false` for fetchAll |
| `src/deals-board/hooks/useDealsBoardPage.ts` | Pre-query IDs for stage/tip; merge with search IDs |
| `src/deals-board/hooks/useDealsBoardPage.test.ts` | Wire expectations if present / extend |
| `package.json` | Patch bump last |

---

### Task 0: P0 diagnose prod `fetch failed`

**Files:**
- Create: `docs/superpowers/notes/2026-07-30-prod-deals-board-page-fetch-failed.md`

**Interfaces:**
- Consumes: prod container `twenty-server` (`dbb1d9233e97` or current), staging `twenty-staging-server`; Domains `https://twenty.dosugmayak.ru`, `https://twenty-staging.dosugmayak.ru`
- Produces: note with curl results + root-cause choice (loopback vs hairpin vs other)

- [ ] **Step 1: Curl from prod twenty-server**

On Dokploy host / SSH into CT 103 docker host, run:

```bash
docker exec twenty-server curl -sS -o /dev/null -w "%{http_code} %{time_total}\n" http://127.0.0.1:3000/healthz
docker exec twenty-server curl -sS -o /dev/null -w "%{http_code} %{time_total}\n" https://twenty.dosugmayak.ru/healthz
```

Record status codes and timings. If public HTTPS hangs or fails while localhost is 200 → hairpin/loopback root cause confirmed.

- [ ] **Step 2: Repeat on staging**

```bash
docker exec twenty-staging-server curl -sS -o /dev/null -w "%{http_code} %{time_total}\n" http://127.0.0.1:3000/healthz
docker exec twenty-staging-server curl -sS -o /dev/null -w "%{http_code} %{time_total}\n" https://twenty-staging.dosugmayak.ru/healthz
```

Expect both OK (staging already serves `page` 200).

- [ ] **Step 3: Write the note**

Create `docs/superpowers/notes/2026-07-30-prod-deals-board-page-fetch-failed.md` with:

```markdown
# Prod deals-board-page `fetch failed`

**Date:** 2026-07-30
**Symptom:** `POST /deals-board/page` → 500 `{"error":"fetch failed"}` ~11s; staging 200.

## Curl evidence

| Host | Target | Status | Time |
|------|--------|--------|------|
| prod twenty-server | `http://127.0.0.1:3000/healthz` | … | … |
| prod twenty-server | `https://twenty.dosugmayak.ru/healthz` | … | … |
| staging … | … | … | … |

## Root cause

(loopback unreachable public URL / DNS hairpin / other — fill from evidence)

## Chosen fix

A loopback for SDK | B hairpin DNS/Traefik | C temporary ops workaround
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/notes/2026-07-30-prod-deals-board-page-fetch-failed.md
git commit -m "docs: note prod deals-board-page fetch failed diagnosis"
```

---

### Task 1: P0 apply fix + verify `page` 200 on prod

**Files:**
- Modify: Dokploy/ops only as chosen in Task 0 note (compose env, Traefik, or DNS) — **not** BrandingTwentyView app code unless diagnosis proves an app setting is wrong
- Modify: `docs/superpowers/notes/2026-07-30-prod-deals-board-page-fetch-failed.md` (append verification)

**Interfaces:**
- Consumes: Task 0 root-cause choice
- Produces: prod Network evidence — `POST …/deals-board/page` status 200

- [ ] **Step 1: Apply the chosen fix**

If **A (loopback preferred)** and Twenty LOCAL LF / SDK supports an internal API base: set that so in-LF `RestApiClient`/`CoreApiClient` use `http://127.0.0.1:3000` (or documented Twenty internal URL). Prefer Twenty’s supported env over inventing a BrandingTwentyView workaround.

If **B (hairpin):** make `twenty.dosugmayak.ru` resolve and answer from inside the Docker network (host DNS / Traefik entrypoint / extra_hosts). Re-run Task 0 curls until public HTTPS from container returns 200 quickly.

If neither is achievable without upstream Twenty: document blocker in the note, still proceed to P1 (fail-soft) so cold load degrades in ~2–3s instead of ~11s; do not pretend P0 is done.

- [ ] **Step 2: Verify in browser (prod)**

Hard refresh «Реализация» default «Будущие» with Disable cache. Confirm:

1. `page` (`/deals-board/page` or `/s/.../deals-board/page`) → **200**
2. Duration ≪ 11s
3. No immediate fallback waterfall of many `opportunities` + `dealLineItems` triggered by aggregate failure

- [ ] **Step 3: Append verification to the note**

Add a “Verification” section with timestamp, status code, approximate duration, and whether fallback still fired.

- [ ] **Step 4: Commit note update (if any ops-only change has no app commit)**

```bash
git add docs/superpowers/notes/2026-07-30-prod-deals-board-page-fetch-failed.md
git commit -m "docs: verify prod deals-board-page after hairpin/loopback fix"
```

---

### Task 2: P1 — AbortSignal on `postDealsBoardPage`

**Files:**
- Modify: `src/deals-board/api/deals-board-page.ts`
- Modify: `src/deals-board/api/deals-board-page.test.ts`

**Interfaces:**
- Consumes: existing `fetchDealsBoardPage(request, legacy)`, `shouldUseDealsBoardPageFallback`
- Produces: `DEALS_BOARD_PAGE_FETCH_TIMEOUT_MS` (3000); `postDealsBoardPage` aborts after timeout; abort errors still trigger fallback

- [ ] **Step 1: Write the failing test**

In `src/deals-board/api/deals-board-page.test.ts`, add:

```typescript
it('falls back when aggregate fetch aborts (timeout)', async () => {
  globalThis.process = {
    env: {
      TWENTY_FUNCTIONS_URL: 'https://twenty.test/functions',
      TWENTY_APP_ACCESS_TOKEN: 'app-token',
    },
  } as NodeJS.Process;

  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) {
          reject(new Error('expected AbortSignal'));
          return;
        }
        if (signal.aborted) {
          reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
          return;
        }
        signal.addEventListener('abort', () => {
          reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
        });
      });
    }),
  );

  const legacyPayload = {
    opportunities: [{ id: 'o-legacy' }],
    totalCount: 1,
    lineItemsByOppId: {},
  };
  const legacy = vi.fn().mockResolvedValue(legacyPayload);
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

  await expect(fetchDealsBoardPage(request, legacy)).resolves.toEqual(legacyPayload);
  expect(legacy).toHaveBeenCalledOnce();
  expect(warnSpy).toHaveBeenCalled();
  expect(fetch).toHaveBeenCalledWith(
    'https://twenty.test/functions/deals-board/page',
    expect.objectContaining({
      signal: expect.any(AbortSignal),
    }),
  );
});
```

Also assert existing success test still passes and that `fetch` is called with a `signal` on success path (update success test’s `objectContaining` to include `signal: expect.any(AbortSignal)`).

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
corepack yarn test:unit src/deals-board/api/deals-board-page.test.ts
```

Expected: FAIL — `signal` not passed / abort path not falling back (or timeout never fires).

- [ ] **Step 3: Write minimal implementation**

In `src/deals-board/api/deals-board-page.ts`:

```typescript
export const DEALS_BOARD_PAGE_FETCH_TIMEOUT_MS = 3000;

const postDealsBoardPage = async (
  request: DealsBoardPageRequest,
): Promise<DealsBoardPageResponse> => {
  const baseUrl = getTwentyFunctionsBaseUrl();
  const token = getAppAccessToken();
  if (!baseUrl || !token) {
    throw createDealsBoardPageError('Deals board page proxy not configured', undefined, 'NOT_CONFIGURED');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEALS_BOARD_PAGE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/deals-board/page`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    const body = (await response.json().catch(() => ({}))) as DealsBoardPageResponse & {
      error?: string;
      messages?: string[];
    };

    if (!response.ok) {
      const detail =
        (typeof body.error === 'string' && body.error) ||
        (Array.isArray(body.messages) ? body.messages[0] : undefined) ||
        `Deals board page error ${response.status}`;
      throw createDealsBoardPageError(detail, response.status);
    }

    return body;
  } finally {
    clearTimeout(timeoutId);
  }
};
```

Confirm `shouldUseDealsBoardPageFallback` already treats AbortError / timeout-like messages as fallback (`isTimeoutLikeError` / `isNetworkLikeError` in `deals-board-page-core.ts`). If AbortError is not covered, extend `isTimeoutLikeError` to treat `name === 'AbortError'` (already present) — verify with a unit assertion in `deals-board-page-core.test.ts` if needed:

```typescript
expect(shouldUseDealsBoardPageFallback(Object.assign(new Error('Aborted'), { name: 'AbortError' }))).toBe(true);
```

- [ ] **Step 4: Run test to verify it passes**

```bash
corepack yarn test:unit src/deals-board/api/deals-board-page.test.ts src/logic-functions/shared/deals-board-page-core.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/api/deals-board-page.ts src/deals-board/api/deals-board-page.test.ts src/logic-functions/shared/deals-board-page-core.test.ts
git commit -m "fix(deals-board): abort aggregate page fetch before long undici timeout"
```

---

### Task 3: P1 — Surface LF error body (optional cause in LF)

**Files:**
- Modify: `src/logic-functions/deals-board-page.ts` (catch block only)
- Modify: `src/deals-board/api/deals-board-page.ts` (warn already logs Error — ensure message includes server `error`)

**Interfaces:**
- Consumes: Task 2 `postDealsBoardPage`
- Produces: 500 JSON may include `error` string unchanged; optionally `cause: 'network'` when message matches `/fetch failed/i` — no secrets/URLs with tokens

- [ ] **Step 1: Write the failing test (pure mapping helper)**

Prefer extracting a tiny pure helper in `src/logic-functions/shared/deals-board-page-core.ts`:

```typescript
export const formatDealsBoardPageFailure = (
  error: unknown,
): { error: string; cause?: string } => {
  const message = error instanceof Error ? error.message : 'deals-board page failed';
  if (/fetch failed/i.test(message)) {
    return { error: message, cause: 'network' };
  }
  return { error: message };
};
```

Add test in `src/logic-functions/shared/deals-board-page-core.test.ts`:

```typescript
it('marks fetch failed as network cause', () => {
  expect(formatDealsBoardPageFailure(new Error('fetch failed'))).toEqual({
    error: 'fetch failed',
    cause: 'network',
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
corepack yarn test:unit src/logic-functions/shared/deals-board-page-core.test.ts
```

Expected: FAIL — `formatDealsBoardPageFailure` not defined

- [ ] **Step 3: Implement helper + use in LF catch**

In `deals-board-page.ts` handler catch:

```typescript
} catch (error) {
  return jsonProxyResponse(500, formatDealsBoardPageFailure(error));
}
```

- [ ] **Step 4: Run tests**

```bash
corepack yarn test:unit src/logic-functions/shared/deals-board-page-core.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/logic-functions/shared/deals-board-page-core.ts src/logic-functions/shared/deals-board-page-core.test.ts src/logic-functions/deals-board-page.ts
git commit -m "fix(deals-board): tag aggregate page network failures for ops"
```

---

### Task 4: P2 — REST helper to resolve opportunity IDs by stage/tip

**Files:**
- Modify: `src/deals-board/api/line-items.ts`
- Modify: `src/deals-board/api/line-items.test.ts`

**Interfaces:**
- Consumes: existing `LineItemQueryFilters`, `appendLineItemFilters` pattern, REST `/rest/dealLineItems`
- Produces:
  - `buildDealLineItemsAttributeFilter(filters: LineItemQueryFilters): string | null`
  - `fetchLineItemOpportunityIdsByFilters(filters?: LineItemQueryFilters): Promise<string[]>`
  - Empty/missing stages&types → `[]` without network

- [ ] **Step 1: Write the failing tests**

In `line-items.test.ts`:

```typescript
describe('buildDealLineItemsAttributeFilter', () => {
  it('returns null when no stage/tip filters', () => {
    expect(buildDealLineItemsAttributeFilter({})).toBeNull();
    expect(buildDealLineItemsAttributeFilter({ stages: [], types: [] })).toBeNull();
  });

  it('builds stage/tip REST filter without opportunityId clause', () => {
    expect(buildDealLineItemsAttributeFilter({ stages: ['V_RABOTE'] })).toBe(
      'stage[in]:["V_RABOTE"]',
    );
    expect(
      buildDealLineItemsAttributeFilter({ stages: ['NOVYY'], types: ['PLENKA'] }),
    ).toBe('and(stage[in]:["NOVYY"],tip[in]:["PLENKA"])');
  });
});

describe('fetchLineItemOpportunityIdsByFilters', () => {
  it('returns [] without calling REST when filters empty', async () => {
    const get = vi.fn();
    // if implementation uses module RestApiClient, stub via existing mock patterns in this file
    await expect(fetchLineItemOpportunityIdsByFilters(undefined)).resolves.toEqual([]);
    await expect(fetchLineItemOpportunityIdsByFilters({})).resolves.toEqual([]);
  });
});
```

Follow existing mock style in `line-items.test.ts` for the REST client when asserting a paginated ID collection (mirror `fetchLineItemOpportunityIdsBySearch` tests if present; otherwise add one page mock returning two line items with distinct `opportunityId`s and expect unique IDs).

- [ ] **Step 2: Run test to verify it fails**

```bash
corepack yarn test:unit src/deals-board/api/line-items.test.ts
```

Expected: FAIL — exports missing

- [ ] **Step 3: Write minimal implementation**

In `line-items.ts`, next to `appendLineItemFilters`:

```typescript
export const buildDealLineItemsAttributeFilter = (
  filters: LineItemQueryFilters,
): string | null => {
  const parts: string[] = [];
  if (filters.stages?.length) {
    parts.push(`stage[in]:${JSON.stringify(filters.stages)}`);
  }
  if (filters.types?.length) {
    parts.push(`tip[in]:${JSON.stringify(filters.types)}`);
  }
  if (!parts.length) return null;
  return parts.length === 1 ? parts[0] : `and(${parts.join(',')})`;
};

export const fetchLineItemOpportunityIdsByFilters = async (
  filters?: LineItemQueryFilters,
): Promise<string[]> => {
  const attributeFilter = filters ? buildDealLineItemsAttributeFilter(filters) : null;
  if (!attributeFilter) return [];

  const client = getRestClient();
  const allIds = new Set<string>();
  let after: string | undefined;

  do {
    const query: Record<string, string | number> = {
      limit: PAGE_LIMIT,
      filter: attributeFilter,
    };
    if (after) query.after = after;

    const response = await client.get<unknown>('/rest/dealLineItems', { query });
    const items = normalizeLineItemRows(
      normalizeRestListResponse<unknown>(response, 'dealLineItems'),
    );
    for (const item of items) {
      allIds.add(item.opportunityId);
    }
    const pageInfo = extractRestPageInfo(response);
    after =
      pageInfo.hasNextPage && pageInfo.endCursor ? String(pageInfo.endCursor) : undefined;
  } while (after);

  return [...allIds];
};
```

- [ ] **Step 4: Run tests**

```bash
corepack yarn test:unit src/deals-board/api/line-items.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/api/line-items.ts src/deals-board/api/line-items.test.ts
git commit -m "feat(deals-board): resolve opportunity ids from stage/tip line-item filters"
```

---

### Task 5: P2 — `buildOpportunityFilter` ANDs filter-matched IDs without search

**Files:**
- Modify: `src/deals-board/utils/search.ts`
- Modify: `src/deals-board/utils/search.test.ts`

**Interfaces:**
- Consumes: Task 4 ID lists; existing `buildOpportunityFilter(filters, lineItemMatchedOpportunityIds?)`
- Produces: when `lineItemMatchedOpportunityIds` is provided (including `[]`):
  - no search terms → AND `{ id: { in: ids } }` (use `id: { in: [] }` or equivalent empty for `[]`)
  - with search terms → keep today’s OR name/ids behavior **and** if IDs were also used as a hard stage/tip constraint, prefer intersecting in the caller (Task 6) so this function stays: **optional second arg = “also match these ids” for search OR; new behavior only when terms empty**

Exact rule to implement:

```typescript
// Inside buildOpportunityFilter, after date/company, before return:
if (lineItemMatchedOpportunityIds !== undefined && terms.length === 0) {
  and.push({ id: { in: lineItemMatchedOpportunityIds.filter(Boolean) } });
}
```

Search path unchanged (still uses `buildOpportunitySearchClause` when `terms.length > 0`).

- [ ] **Step 1: Write the failing tests**

In `search.test.ts`:

```typescript
it('restricts to line-item matched ids when there is no search', () => {
  expect(buildOpportunityFilter({ datePreset: 'future' }, ['opp-1', 'opp-2'])).toEqual({
    and: [
      expect.objectContaining({ or: expect.any(Array) }), // date future clause
      { id: { in: ['opp-1', 'opp-2'] } },
    ],
  });
});

it('allows empty id list to force no matches without search', () => {
  expect(buildOpportunityFilter({}, [])).toEqual({
    and: [{ id: { in: [] } }],
  });
});
```

Adjust the future date expectation to match whatever `buildOpportunityDateFilter` currently returns (copy structure from existing future+search test in the same file).

- [ ] **Step 2: Run test to verify it fails**

```bash
corepack yarn test:unit src/deals-board/utils/search.test.ts
```

Expected: FAIL — ids ignored when no search

- [ ] **Step 3: Implement**

Update `buildOpportunityFilter` in `search.ts` per the rule above.

- [ ] **Step 4: Run tests**

```bash
corepack yarn test:unit src/deals-board/utils/search.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/utils/search.ts src/deals-board/utils/search.test.ts
git commit -m "feat(deals-board): apply line-item opportunity id constraints without search"
```

---

### Task 6: P2 — stop `fetchAll` for line-item clauses

**Files:**
- Modify: `src/deals-board/utils/date-filters.ts`
- Modify: `src/deals-board/utils/date-filters.test.ts`

**Interfaces:**
- Consumes: Task 4–5 (aggregate can express stage/tip via ID filter)
- Produces: `shouldFetchAllOpportunities` returns `false` for line-item clauses when date preset would otherwise paginate; still `true` for `custom` / `month` / wide raw ranges as today

- [ ] **Step 1: Write the failing tests (update expectations)**

Replace the tests that currently expect `true` for line-item clauses:

```typescript
it('paginates when line-item filter clauses are active (aggregate ID pre-query)', () => {
  expect(
    shouldFetchAllOpportunities(
      { datePreset: 'future' },
      undefined,
      [{ id: '1', level: 'lineItem', field: 'stage', operator: 'in', value: ['NOVYY'] }],
    ),
  ).toBe(false);
  expect(
    shouldFetchAllOpportunities(
      { datePreset: 'today' },
      undefined,
      [{ id: '1', level: 'lineItem', field: 'stage', operator: 'in', value: ['NOVYY'] }],
    ),
  ).toBe(false);
});
```

Remove or invert:
- `'loads all records when line-item filter clauses are active'`
- `'loads all records for today when line-item filter clauses are active'`
- `'still fetchAll for future when line-item clauses exist'`

Keep `custom` / `month` / raw range → `true`.

- [ ] **Step 2: Run test to verify it fails**

```bash
corepack yarn test:unit src/deals-board/utils/date-filters.test.ts
```

Expected: FAIL — still returns `true` for line-item clauses

- [ ] **Step 3: Implement**

In `shouldFetchAllOpportunities`, **delete** the early return:

```typescript
if (clauses?.length && hasLineItemFilterClauses(clauses)) {
  return true;
}
```

Keep `hasLineItemFilterClauses` export for UI/other callers. `clauses` parameter may become unused — prefix with `_clauses` or remove from signature **only if** all call sites updated; prefer keep signature and void-lint with `_clauses` / eslint ignore to minimize churn:

```typescript
export const shouldFetchAllOpportunities = (
  filters: DealBoardFilters,
  _sort?: DealBoardSort[],
  _clauses?: FilterClause[],
): boolean => {
  const preset = filters.datePreset;
  // ... existing preset logic without line-item force
};
```

- [ ] **Step 4: Run tests**

```bash
corepack yarn test:unit src/deals-board/utils/date-filters.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/utils/date-filters.ts src/deals-board/utils/date-filters.test.ts
git commit -m "fix(deals-board): keep aggregate path when stage/tip filters are active"
```

---

### Task 7: P2 — wire ID pre-query in `useDealsBoardPage`

**Files:**
- Modify: `src/deals-board/hooks/useDealsBoardPage.ts`
- Modify: `src/deals-board/hooks/useDealsBoardPage.test.ts` (extend or add cases)

**Interfaces:**
- Consumes:
  - `fetchLineItemOpportunityIdsBySearch(terms, lineItemFilters)`
  - `fetchLineItemOpportunityIdsByFilters(lineItemFilters)`
  - `buildOpportunityFilter(filters, ids?)`
- Produces: when `lineItemFilters` present and no search terms → IDs from `fetchLineItemOpportunityIdsByFilters`; when search + filters → keep search helper (already applies filters); pass `[]` through when filters match nothing

- [ ] **Step 1: Write the failing test**

If the hook test file mocks `fetchDealsBoardPage`, add a case:

```typescript
it('prefetches opportunity ids for stage filters without search', async () => {
  // mock fetchLineItemOpportunityIdsByFilters → ['opp-stage']
  // mock fetchDealsBoardPage to capture request.opportunityFilter
  // renderHook / invoke queryFn with filters { datePreset: 'future' }, lineItemFilters: { stages: ['NOVYY'] }
  // expect opportunityFilter.and to include { id: { in: ['opp-stage'] } }
});
```

Follow existing patterns in `useDealsBoardPage.test.ts` for mocking modules.

- [ ] **Step 2: Run test to verify it fails**

```bash
corepack yarn test:unit src/deals-board/hooks/useDealsBoardPage.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement wiring**

In `useDealsBoardPage` `queryFn`:

```typescript
const searchTerms = resolveSearchTerms(params.filters);
const hasLineItemAttributeFilters = Boolean(
  lineItemFilters?.stages?.length || lineItemFilters?.types?.length,
);

let lineItemMatchedOpportunityIds: string[] | undefined;

if (searchTerms.length) {
  lineItemMatchedOpportunityIds = await fetchLineItemOpportunityIdsBySearch(
    searchTerms,
    lineItemFilters,
  );
} else if (hasLineItemAttributeFilters) {
  lineItemMatchedOpportunityIds = await fetchLineItemOpportunityIdsByFilters(
    lineItemFilters,
  );
}

const opportunityFilter = buildOpportunityFilter(
  params.filters,
  lineItemMatchedOpportunityIds,
);
```

Pass `lineItemFilters` through to `fetchLegacyDealsBoardPage` as today (legacy still filters line items on the page).

Confirm `DealsBoard.tsx` `useAggregateColdPath = !effectiveShowAll && !fetchAll` now stays true for stage/tip after Task 6 — no `DealsBoard.tsx` change required unless something else forces `fetchAll`.

- [ ] **Step 4: Run tests**

```bash
corepack yarn test:unit src/deals-board/hooks/useDealsBoardPage.test.ts src/deals-board/utils/date-filters.test.ts src/deals-board/utils/search.test.ts src/deals-board/api/line-items.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/hooks/useDealsBoardPage.ts src/deals-board/hooks/useDealsBoardPage.test.ts
git commit -m "feat(deals-board): keep stage/tip filters on aggregate page query"
```

---

### Task 8: Manual verification (staging then prod)

**Files:** none required (optional append to P0 note)

**Interfaces:**
- Consumes: Tasks 1–7 deployed via `yarn twenty apply` (staging first, then prod)
- Produces: checklist results

- [ ] **Step 1: Apply to staging**

```bash
corepack yarn twenty apply
```

(Use the project’s established staging target / env.)

- [ ] **Step 2: Staging smoke**

1. F5 «Будущие» — `page` 200  
2. Toggle stage chip — still aggregate/`page` (or `page` + one REST id pre-query), **not** full opportunities dump  
3. today/week; showAll; expand 5 deals; analytics rashod  

- [ ] **Step 3: Apply to prod + hard refresh**

Confirm Traefik/CDN is not serving a stale front component; verify app version if the UI exposes it.

- [ ] **Step 4: Prod checklist**

| # | Check | Result |
|---|-------|--------|
| 1 | F5 «Будущие» — `page` 200, no ~11s `fetch failed` | |
| 2 | Stage/tip filter — no `fetchAll` dump | |
| 3 | Abort/fallback still works if LF stopped (optional) | |
| 4 | showAll heavy path still works | |

- [ ] **Step 5: Commit nothing** (or update note if recording numbers)

---

### Task 9: Patch version bump

**Files:**
- Modify: `package.json` (`0.5.4` → `0.5.5`)

**Interfaces:**
- Consumes: Tasks 0–8 complete (P0 verified or explicitly blocked+documented)
- Produces: version `0.5.5`

- [ ] **Step 1: Bump version**

Set `"version": "0.5.5"` in `package.json`.

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "chore: bump deals-board to 0.5.5 after prod perf and filter path"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| P0 diagnose `fetch failed` / hairpin | Task 0 |
| P0 fix → prod `page` 200 | Task 1 |
| P1 AbortSignal ~2–3s | Task 2 (`3000` ms) |
| P1 surface / tag network error | Task 3 |
| P2 stage/tip stay on aggregate | Tasks 4–7 |
| P2 no default `fetchAll` for line-item clauses | Task 6 |
| P2 ID pre-query + page filter | Tasks 4, 5, 7 |
| Manual prod/staging verify | Task 8 |
| Non-goals (shell rewrite, virtualization, oplata) | omitted intentionally |
| Version bump last | Task 9 |
