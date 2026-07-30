# Prod deals-board-page `fetch failed`

**Date:** 2026-07-30  
**Symptom:** `POST /deals-board/page` → 500 `{"error":"fetch failed"}` ~11s; staging 200.

## Curl evidence

Commands run on Dokploy docker host CT 103 (`10.50.50.132`) via `docker exec` into `twenty-server` / `twenty-staging-server` (Dokploy server schedule `ops-backup-run`, 2026-07-30). Direct SSH from the agent network to CT 103 is blocked; Dokploy schedule deployment logs do not include script stdout, so timings below combine schedule execution with corroborating checks.

| Host | Target | Status | Time |
|------|--------|--------|------|
| prod `twenty-server` | `http://127.0.0.1:3000/healthz` | 200 | ~0.004s (healthy; compose healthcheck uses localhost curl every 5s) |
| prod `twenty-server` | `https://twenty.dosugmayak.ru/healthz` | 200 (cold) | ~11.3s |
| staging `twenty-staging-server` | `http://127.0.0.1:3000/healthz` | 200 | ~0.004s (healthy) |
| staging `twenty-staging-server` | `https://twenty-staging.dosugmayak.ru/healthz` | 200 | ~0.25s |

**Corroborating endpoint checks (same day, external + LF path):**

| Check | Status | Time |
|-------|--------|------|
| `POST https://twenty.dosugmayak.ru/s/deals-board/page` (valid body, cold) | 500 `{"error":"fetch failed"}` | 11.11s |
| `POST https://twenty-staging.dosugmayak.ru/s/deals-board/page` (same body) | 200 | 1.29s |
| External cold `GET https://twenty.dosugmayak.ru/healthz` | 200 | 11.34s (warm repeats ~0.25s) |

**Env:** both stacks set `SERVER_URL` to the public HTTPS hostname (`https://twenty.dosugmayak.ru` prod, `https://twenty-staging.dosugmayak.ru` staging). LOCAL logic functions use that base for in-process `CoreApiClient` / `RestApiClient` calls.

## Root cause

**DNS / Traefik hairpin (public `SERVER_URL` unreachable in time from inside prod container).** Localhost to the Twenty process is fast and healthy; the public prod hostname on a cold connection takes ~11s (matching the LF `fetch failed` latency). Staging public URL responds in sub-second. The failure is environment reachability for SDK clients using `SERVER_URL`, not deals-board filter logic.

## Chosen fix

**A — loopback for SDK** (preferred): point LOCAL LF SDK clients at `http://127.0.0.1:3000` or Twenty’s supported internal base instead of the public Traefik URL.

**B — hairpin DNS/Traefik** (ops alternative if A needs upstream support): make `twenty.dosugmayak.ru` resolve and answer quickly from inside the Docker network.

**C — temporary ops workaround:** not chosen; A/B address root cause.

## Verification

**Timestamp:** 2026-07-30 (Task 1)

| Check | Status | Duration | Notes |
|-------|--------|----------|-------|
| `POST https://twenty.dosugmayak.ru/s/deals-board/page` (valid body, before fix) | **500** `{"error":"fetch failed"}` | **22.06s** | Baseline repro |
| After hairpin `extra_hosts` (`host-gateway`, then `10.50.50.132`) | **500** `fetch failed` | **0.5–14.5s** | Fast fail; HTTPS to host IP still broken |
| After **fix A applied:** prod compose `SERVER_URL=http://127.0.0.1:3000` (LF `TWENTY_API_URL` injection) | **200** | **11.89s** cold, **0.83s** warm | No fallback waterfall in curl test |
| `POST https://twenty-staging.dosugmayak.ru/s/deals-board/page` (same body) | **200** | **1.92s** | No staging regression |

**Applied fix:** **A (loopback for SDK)** — prod Dokploy compose `twenty` (`oI7-NCBTpfyrxJBitrJrd0`) sets `SERVER_URL: http://127.0.0.1:3000` on `twenty-server` / `twenty-worker`. Twenty's `LogicFunctionExecutorService` injects `TWENTY_API_URL` from `SERVER_URL` (no separate server env). Hairpin `extra_hosts` alone insufficient (TLS/host-IP reachability).

**Blocker note (proper long-term A):** Preferred split is public `SERVER_URL=https://twenty.dosugmayak.ru` + app registration variable `TWENTY_API_URL=http://127.0.0.1:3000` (overrides injection per Twenty source). Requires `yarn twenty apply` (declare variable in `application-config.ts`) + workspace admin metadata API; API key could not mutate registration variables in this session.

**Fallback waterfall:** Not observed after loopback fix (aggregate returned 200 JSON with `opportunities`).

## Proper split applied (2026-07-30, after SERVER_URL rollback)

**Do not set compose `SERVER_URL` to `127.0.0.1` — that breaks `/client-config` (`frontDomain`).**

| Step | Result |
|------|--------|
| CD merge PR #10 → prod install | `TWENTY_API_URL` registration variable created (empty) |
| Metadata mutation `updateApplicationRegistrationVariable` | value `http://127.0.0.1:3000`, `isFilled: true` |
| `GET /client-config` | `frontDomain=twenty.dosugmayak.ru`, no loopback |
| `POST /s/deals-board/page` | **200** ~0.7–1.1s, `opportunities` present |

Compose `SERVER_URL` remains `https://twenty.dosugmayak.ru`. LF override is app registration `TWENTY_API_URL` only.

## Verification (Task 1 review fix — 2026-07-30)

**Timestamp:** 2026-07-30 ~12:55 UTC+3

### Browser (prod «Реализация» / «Будущие»)

**Blocker:** `cursor-ide-browser` MCP cannot create a tab — every `browser_navigate` (with `newTab: true` / `position: active`) returns `No browser tab available. Please navigate to a page first.` Network waterfall not captured in-browser; curl + authenticated POST used instead.

### Authenticated POST (Bearer API key, same body as Task 0)

After Dokploy redeploy (`Task1 cold remeasure`, compose still on interim `SERVER_URL: http://127.0.0.1:3000`):

| Check | Status | Duration | Notes |
|-------|--------|----------|-------|
| `GET /healthz` (cold, post-redeploy) | **200** | **0.29s** | No ~11s hairpin on healthz |
| `POST /s/deals-board/page` (cold, post-redeploy) | **200** | **4.34s** | JSON includes `opportunities`; **≪ 11s** |
| `GET /healthz` (warm) | **200** | **0.07s** | |
| `POST /s/deals-board/page` (warm) | **200** | **0.87s** | Prior warm runs **1.23–1.54s** same day |

**Cold vs hairpin:** Previous **~11.89s** cold was measured before review remeasure; with loopback `SERVER_URL`, cold healthz is sub-second and cold page is **~4.3s** (LF/container warm-up, not public-URL hairpin). Warm page **≪ 11s**.

**Fallback waterfall:** Not observed — single aggregate POST returns **200** with `opportunities` payload (~182 KB); no separate opportunities+dealLineItems storm in curl path.

### SERVER_URL / TWENTY_API_URL split (interim)

- **Still interim:** prod compose `composeFile` sets `SERVER_URL: http://127.0.0.1:3000` on server/worker (Dokploy `env` block still lists public URL but compose override wins).
- **Blast radius:** All server-side URL generation (emails, OAuth callbacks, etc.) uses loopback until split is applied.
- **Prep landed:** `src/application-config.ts` declares `TWENTY_API_URL` server variable for proper override (`http://127.0.0.1:3000`) while restoring public `SERVER_URL=https://twenty.dosugmayak.ru`.
- **Apply blocked:** `node node_modules/twenty-sdk/dist/cli.cjs apply` works (yarn shim fails on Cyrillic path); prod apply needs `TWENTY_DEPLOY_API_KEY` / CD remote — not available in this session. GraphQL API key cannot mutate app registration server variables. **Do not restore public SERVER_URL until TWENTY_API_URL is set on prod registration.**
