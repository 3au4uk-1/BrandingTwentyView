# Deals Board SSE diagnosis

**Date:** 2026-08-07  
**Last updated:** HAR follow-up (user-token SSE auth)

## Task 0 symptom (product owner)

- Any remote board edit (stage, line-item stage, comment/text field) is **invisible on other clients until F5**
- After F5 data is correct → persistence OK, **live delivery broken** (total live blackout)
- Initial diagnosis code: **D (unclear for Network specifics) with strong A/B lean** — total blackout for all watched fields is characteristic of subscription/register failure, not apply-only

## HAR follow-up (`twenty.dosugmayak.ru.har`)

- Board `OnEventSubscription` opens; both `addQueryToEventStream` calls return **`true`**
- So “register failed” is no longer the blocker after stream-ready timing fix
- Twenty `ObjectRecordEventPublisher` skips publishing when stream auth has no usable `userWorkspaceId` (app/API token streams) — register can still be `true`
- Root cause: `resolveAccessToken` preferred env app token over host `requestAccessTokenRefresh`
- Fix: prefer host **user** token for SSE + event-stream register/unregister

## Code hardening completed (Tasks 1–4, commits through HEAD)

| Task | Commit | Summary |
|------|--------|---------|
| 1 | `394ca39` | `resolveEventPatch` — patches from `after` or `diff` |
| 2 | `02abd36` | Wire patch helper into `applyObjectRecordEvent`; patch `deals-board-page` without invalidate on success |
| 3 | `5aa83ac` | `mergeAccumulatedRecords` — mobile accumulated rows refresh by id |
| 4 | `5ea13d2` | Register SSE listeners on `connected` + fallback; reconnect with new `eventStreamId`, backoff, failure cap |
| 4 fix | `6ac14b2` | Guard in-flight register; ignore dispose `complete` |

**Design spec:** `docs/superpowers/specs/2026-08-07-deals-board-realtime-sse-hardening-design.md`  
**Implementation plan:** `docs/superpowers/plans/2026-08-07-deals-board-realtime-sse-hardening.md`

Unit tests pass for helpers (`resolveEventPatch`, `applyObjectRecordEvent`, `mergeAccumulatedRecords`, `computeReconnectDelayMs`). Hook lifecycle verified by code review only.

## `yarn twenty apply` (Task 5 Step 1)

**SKIPPED** — agent environment: `yarn` not on PATH; `corepack yarn twenty apply` fails with `MODULE_NOT_FOUND` for `twenty-sdk` (dependencies not installed). No Twenty credentials/tokens available in this session. **Human must sync** before QA on a host that loads published app assets.

## Manual two-browser QA — PENDING human verification

Do **not** treat as pass until a human runs this on staging/production (or local docker app-dev) **after** `yarn twenty apply` + hard refresh.

On **observer** board (DevTools Network open), **without F5**:

- [ ] Colleague changes **opportunity stage** → observer updates in ≤2s
- [ ] Colleague changes **line-item stage** → observer updates in ≤2s
- [ ] Colleague edits a **text/comment field** on opportunity or line item → observer updates in ≤2s
- [ ] Network: `OnEventSubscription` stays open; `addQueryToEventStream` succeeds after connect for `deals-board-opportunities` and `deals-board-line-items`; subscription `next` payloads arrive on edit

**Outcome:** _not yet recorded_

## Escalation rule

If after deploy + sync, manual QA still requires F5 **and** Network diagnosis shows:

1. No open metadata EventStream / `OnEventSubscription`, **or**
2. Subscription open but `addQueryToEventStream` missing or failing, **or**
3. No subscription `next` events on remote edit

→ **Stop.** Open a follow-up for **hybrid poll** transport (out of scope for this hardening plan). Do **not** implement poll in the current workstream.

If QA passes all checklist items → record **"SSE restored"** here and in PR description.

## Structured logs (for QA debugging)

Console errors use prefix `Deals Board SSE:` with stage `subscribe` | `register` | `apply`. After 5 consecutive failures the hook pauses reconnect until remount/refresh.
