---
name: twenty-crm-app
description: Develop and sync Twenty CRM Apps (twenty-sdk) for TwentyView / BrandingTwentyView. Use when editing Twenty app entities, running yarn twenty apply/dev/docker, seeding local CRM, dealing with fields/objects/UUIDs, or using Twenty MCP (twentylocal / twentyserver).
---

# Twenty CRM App (TwentyView)

## Stack

- App path: repo root (`TwentyView`)
- Local CRM: Docker `twenty-app-dev` → `http://localhost:2020` (pin **2.19.0**, match SDK)
- Sync: `yarn twenty apply` or `yarn twenty dev`
- Demo login (local): `tim@apple.dev` / `tim@apple.dev`

## Do / Don't

- Prefer `yarn twenty dev:add <entity>` for new objects/fields/views/components (auto UUIDs).
- All hand-made IDs must be **UUID v4**.
- After front-component / logic changes → sync (`yarn twenty apply`) before claiming UI is updated.
- Do **not** invent warehouse field UUIDs from production if create conflicts — use app-owned local UUIDs with matching **names**.
- Technical objects without index view + nav item only when intentionally hidden.

## Project map (deals board)

| Area | Path |
|------|------|
| Board shell | `src/deals-board/DealsBoard.tsx` |
| Theme | `src/deals-board/theme/` |
| Automations | `src/deals-board/automations/` |
| Scoreboard | `src/deals-board/scoreboard/` |
| Finance | `src/deals-board/analytics/` |
| Fields | `src/fields/*.field.ts` |
| Objects | `src/objects/` |

## Data / seed

- Scripts: `scripts/seed-50-deals.js`, `scripts/reseed-50-with-comments.js`, `scripts/apply-tip-from-name-local.js`
- Tokens: read from `~/.cursor/mcp.json` at runtime (never commit secrets).
- Prefer MCP `user-twentylocal` / `user-twentyserver` when ready; else GraphQL scripts.

## MCP

1. Call `GetMcpTools` / `learn_tools` before CRUD.
2. Load Twenty skill (`metadata-building`, `data-manipulation`, …) before complex metadata/workflows.
3. If server status is `needsAuth` / `error` → `mcp_auth` for that server.

## Verify

```bash
yarn twenty apply
yarn test:unit
```

Hard-refresh UI (`Ctrl+F5`) after sync.
