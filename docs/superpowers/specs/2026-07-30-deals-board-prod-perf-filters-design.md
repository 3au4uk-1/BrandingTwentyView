# Deals Board Prod Perf + Filters on Aggregate — Design

**Date:** 2026-07-30  
**Status:** Approved in chat (approach 1; sections 1–4)  
**Related:**
- [2026-07-29-deals-board-cold-load-perf-design.md](./2026-07-29-deals-board-cold-load-perf-design.md) (D1/D2 aggregate)
- [2026-07-24-deals-board-perf-wave-c-design.md](./2026-07-24-deals-board-perf-wave-c-design.md) (Wave C)

## Context

Prod «Реализация» is slow on cold open and on filter changes. Staging already returns **200** for `POST /deals-board/page`; prod returns **500** with body `{"error":"fetch failed"}` after ~11s, then the client falls back to the legacy opportunities + dealLineItems waterfall.

Evidence (prod Network, Disable cache):
- `page` → 500 (~10.9s)
- then `opportunities` / `dealLineItems` fallback
- full-tab Finish ~28s with ~525 requests (includes Twenty shell metadata storm)

Priority: **prod** first. Pain: both cold load and filter switching. Chosen approach: fix prod aggregate health, then keep stage/tip filters on the aggregate path.

## Goals

1. **P0 — Prod LF health:** `/deals-board/page` returns **200** on prod for default «Будущие»; cold path does not pay ~11s dead wait + waterfall.
2. **P1 — Fail-soft:** if aggregate fails again, client aborts quickly (~2–3s) and falls back with a clear warning (not undici’s long timeout).
3. **P2 — Filters on aggregate:** stage/tip clauses no longer force `fetchAll` / leave aggregate; paginated `deals-board-page` remains primary.

## Non-goals

- Rewriting Twenty core frontend shell (~500 metadata/graphql requests).
- Parent-row virtualization.
- Wave B unfiltered KPI universe.
- Wiring `oplata` filter end-to-end (separate ticket if still incomplete).
- Treating shell-only Finish as a BrandingTwentyView failure when board-owned path is healthy.

## Approach

**Prod loopback / network fix first (P0), then client fail-soft (P1), then line-item filters on aggregate (P2).** Staging already validates the aggregate happy path.

```
┌─ P0 prod ─────────────────────┐   ┌─ P1 client ──────────────┐   ┌─ P2 filters ─────────────┐
│ Diagnose fetch failed         │→│ AbortSignal ~2–3s        │→│ stage/tip stay on         │
│ Fix hairpin / loopback URL    │   │ Surface LF error body    │   │ deals-board-page         │
│ page → 200 on «Будущие»       │   │ Fast legacy fallback     │   │ (no fetchAll default)    │
└───────────────────────────────┘   └──────────────────────────┘   └──────────────────────────┘
```

## Architecture

### P0 — Why `fetch failed` and how we fix it

**Known facts**
- Response is JSON from the LF catch: `error.message === "fetch failed"` (Node/undici network failure), not Traefik HTML gateway timeout.
- Crmparser is unlikely the thrower: `crmparserProxyFetch` catches network errors and returns 503; list-status is optional and skipped on failure.
- Likely throw site: `CoreApiClient.query` and/or `RestApiClient.get` inside `deals-board-page` when calling Twenty API from the LOCAL logic-function runtime.
- Staging 200 / prod 500 ⇒ environment (URL reachability from container), not filter logic.

**Diagnosis order**
1. From prod `twenty-server`: curl `https://twenty.dosugmayak.ru/healthz` and `http://127.0.0.1:3000/healthz`.
2. Repeat on staging with its public URL vs localhost.
3. If public URL fails from inside the container and localhost works → hairpin / wrong base URL for SDK clients.

**Fix options (pick by diagnosis)**
- **A (preferred):** LOCAL LF SDK clients use loopback (`http://127.0.0.1:3000` or Twenty’s supported internal base), not public Traefik.
- **B:** DNS/Traefik hairpin so `SERVER_URL` host resolves and answers from inside the Docker network.
- **C (temporary):** if A needs an upstream Twenty change, apply B as ops workaround and file a follow-up for internal API base.

**P0 verification**
- Network: one primary `POST …/deals-board/page` → 200, duration ≪ 11s.
- No immediate legacy waterfall from aggregate fallback.
- Staging unchanged (still 200).

### P1 — Fail-soft

- `postDealsBoardPage`: `AbortSignal` (~2–3s) so fallback starts before a long undici timeout.
- Preserve/propagate LF JSON `error` in `console.warn` on fallback.
- Optionally enrich LF 500 JSON with a short non-secret cause (host/URL class) when catching `fetch failed`.
- UX unchanged: still falls back to multi-call; only degradation speed and observability improve.

### P2 — Stage/tip on aggregate

**Today:** line-item filter clauses → `shouldFetchAllOpportunities` → leave aggregate → dump opportunities → client `filterDealsAndLineItems`.

**Target**
1. With `showAll: false`, stage/tip keep `useDealsBoardPage` enabled (`fetchAll` false for those clauses).
2. Resolve matching opportunity IDs (REST line-item filter and/or narrow pre-query), intersect with existing date/company/search opportunity filter.
3. Aggregate returns a **page** of those parents + their line items; client still hides non-matching line items in-row for UX.
4. `totalCount` = matching parent count (not the unfiltered future universe).

If ID pre-query is expensive on a large universe: chunk IDs and page with `id in […]`; do **not** reintroduce `fetchAll` as the default for stage/tip.

**Unchanged in P2:** date presets already on aggregate; search debounce 280ms; explicit `showAll: true` remains a heavy path.

## Error handling

| Case | Behavior |
|------|----------|
| Aggregate 5xx / timeout / abort | Legacy multi-call fallback (faster after P1) |
| list-status / crmparser down | Omit chips; never fail the page payload |
| Hairpin unfixable without Twenty patch | Ops hairpin (B); P1 limits pain; escalate internal base |
| P2 pre-query too slow | Measure; chunk; last resort narrow fallback only for that filter mode |

## Testing & verification

| Layer | Coverage |
|-------|----------|
| Unit | Abort/fallback helpers; line-item clauses do not force `fetchAll`; ID pre-query → opportunity filter mapper |
| Manual prod | F5 «Будущие» (`page` 200); stage/tip; today/week; showAll; expand 5; analytics rashod |
| Staging smoke | After P1/P2 code: no regression on aggregate |

### Success criteria

1. Prod default cold open: primary `page` **200**; no ~11s `fetch failed` tax.
2. Board-owned cold path Finish trends toward staging (shell floor documented separately).
3. Stage/tip filter change: stays on aggregate/paginated path; no full opportunities dump.
4. Filter semantics (visible rows + parent counts) match today’s client filter behavior on fixtures.
5. `yarn test:unit` green for touched tests.

## Rollout

1. P0 diagnosis/fix on prod (may be ops-only, no app release).
2. Measure Network after P0.
3. Ship P1 + P2 in BrandingTwentyView → `yarn twenty apply` staging → prod.
4. Do not treat Traefik cache as deploy proof: hard refresh / confirm app version after apply.

## Expected files (indicative)

| Path | Role |
|------|------|
| Prod Docker / Traefik / Twenty env | P0 hairpin or loopback |
| `src/deals-board/api/deals-board-page.ts` | P1 AbortSignal + error surfacing |
| `src/logic-functions/deals-board-page.ts` (+ shared) | P1 cause logging; P2 ID/filter support if server-side |
| `src/deals-board/utils/date-filters.ts` / `useOpportunities.ts` / `DealsBoard.tsx` | Stop forcing `fetchAll` for line-item clauses when aggregate handles them |
| `src/deals-board/hooks/useDealsBoardPage.ts` | Wire ID pre-query + filters into page request |
| Unit tests next to touched modules | P1/P2 |

## Open decisions (resolved in chat)

- Environment priority: **prod**.
- Approach: **1** (fix LF on prod, then filters on aggregate).
- Order: diagnose 500 → then P0/P1/P2 as above.
