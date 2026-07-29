# Native Twenty shell cold-load floor (2026-07-29)

**Plan:** [2026-07-29-deals-board-cold-load-perf](../plans/2026-07-29-deals-board-cold-load-perf.md)  
**Design:** [2026-07-29-deals-board-cold-load-perf-design](../specs/2026-07-29-deals-board-cold-load-perf-design.md)  
**Staging host:** `twenty-staging.dosugmayak.ru`  
**Method:** Hard refresh (F5), DevTools Network, “Disable cache”, note **Finish** (s) and total **Requests**.

Board D1 (request diet) and D2 (`deals-board-page` aggregate LF) are implemented in BrandingTwentyView. This note tracks the **Twenty core shell** floor — metadata + graphql storms from host `index-….js` — separately from board-owned work.

## Measurements

| Surface | Finish | Requests | Notes |
|---------|--------|----------|-------|
| Opportunities F5 (shell) | ~6.5s | ~512 | Task 0 baseline; native tab, no board mount. Dominated by `/metadata` + GraphQL from Twenty core. |
| Реализация F5 (pre-work) | ~7.1s | ~526 | Task 0 baseline; default «Будущие» with legacy `showAll: true` + multi-call waterfall. |
| Реализация F5 after D1 | *pending* | *pending* | Re-measure after `yarn twenty apply` + Dokploy deploy of D1 commits (Tasks 1–4). Expect fewer opps/line-items pages; shell share unchanged. |
| Реализация F5 after D2 | *pending* | *pending* | Re-measure after deploy of D2 commits (Tasks 5–8). Target: board-owned Finish ≤ ~2s; full tab Finish still bounded by shell (~6.5s) until infra improves. |

**Shell floor:** Opportunities Finish **~6.5s** >> **2s** target. Board code cannot fix this; infra / Twenty upgrade / metadata diet only.

## What the shell pays for

- Full workspace **metadata** graph (objects, fields, views) on every cold open.
- Repeated **GraphQL** queries for core CRM objects (opportunities index, workspace, favorites, etc.).
- Not attributable to BrandingTwentyView Remote DOM bundle or `deals-board-page` LF.

## Infra checklist (Dokploy / staging)

| Lever | Status | Action |
|-------|--------|--------|
| **Redis / cache** | Unknown | Confirm Redis service attached to Twenty stack on Dokploy; verify `REDIS_URL` (or Twenty-equivalent) in app env. Enable metadata / session caching per Twenty deploy docs. |
| **HTTP caching** | Unknown | Traefik / reverse-proxy: ensure static assets (`index-*.js`, fonts) get long `Cache-Control`; API routes stay uncached. |
| **Twenty version** | Unknown | Record deployed Twenty image tag on staging; compare release notes for metadata batching / cold-start fixes since current deploy. Plan upgrade window if ≥1 minor behind. |
| **Metadata bloat** | Review | Audit custom objects/fields not used in UI; archive or hide unused app objects to shrink `/metadata` payload. Prefer workspace cleanup over app code. |
| **Postgres / connection pool** | Unknown | Check DB latency and pool size under cold load; slow metadata queries amplify Finish. |
| **D1+D2 deploy** | Pending | Apply BrandingTwentyView to staging, then re-run F5 checklist (Task 10) for board-owned numbers. |

## Next infra actions (shell Finish > 2s)

1. **Baseline confirm** — Repeat Opportunities F5 on staging with cache disabled; export HAR or screenshot Finish + request count for PR evidence.
2. **Redis** — If missing, add Redis to Dokploy compose for Twenty; redeploy; re-measure Opportunities F5.
3. **Version audit** — Document current Twenty version on staging; schedule upgrade if release notes mention metadata or GraphQL performance.
4. **Metadata diet** — List custom objects/fields count via workspace settings or MCP; remove or deactivate unused definitions; re-measure.
5. **Board remeasure** — After staging deploy of D1+D2: F5 Реализация default «Будущие»; confirm ≤1 primary `/deals-board/page` call and board-owned Finish trend toward ≤ ~2s (Task 10 checklist).

## Success criteria (native track)

- Shell-only Finish documented with evidence (this note + Task 10 checklist).
- Infra levers triaged even if shell stays > 2s — **not** a BrandingTwentyView code failure.
- Full-tab Finish ≤ ~2s only achievable when shell + board both meet target; until then optimize board-owned path independently.
