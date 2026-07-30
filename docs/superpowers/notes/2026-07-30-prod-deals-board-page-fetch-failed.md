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
