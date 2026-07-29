# Prevyu upload — modal + iframe (main thread)

**Date:** 2026-07-29  
**Status:** Implementing  
**Supersedes for upload path:** naive Remote DOM modal experiment; builds on `2026-07-27-prevyu-upload-window-design.md`

## Decision

Keep board `Modal` chrome. Embed `iframe` pointing at logic-function HTML `GET /prevyu-upload/:lineItemId` so Ctrl+V / file picker run on the **main thread** (outside Remote DOM worker). `POST` same path uploads via `MetadataApiClient.uploadFile` + PATCH `prevyuOkleyki`.

## Board refresh

1. `BroadcastChannel('prevyu-upload')` from iframe (same-origin when possible)  
2. `postMessage` to parent  
3. Poll invalidate `lineItems` while modal open  
4. Invalidate again on «Готово»

Side panel remains explicit footer fallback if `TWENTY_FUNCTIONS_URL` missing or iframe auth fails.

## Auth

`isAuthRequired: true` on GET/POST — session cookies in iframe when functions URL is same-site as Twenty.
