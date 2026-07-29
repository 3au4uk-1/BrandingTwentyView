# Decor & MK Board (phase: infrastructure) — Design

**Date:** 2026-07-28  
**Status:** Approved in chat (approach A; same opportunities; stream-split boards; keywords filled later)  
**Repos:** TwentyView + crmparserv2  
**Deferred:** Equipment unit registry (phase 2), real keyword content, decor-specific column UX

## Problem

Нужно отдельное view «МК и Декор» по образцу «Реализация», и в парсере — зеркальная инфра:

- keywords декор  
- keywords МК  
- blacklist декор  
- blacklist МК  

Сделки и позиции по-прежнему выгружаются parser → Twenty. Реализация показывает только branding; «МК и Декор» — только декор/МК. Keywords наполнят позже — сейчас база.

## Decisions

1. **Approach A:** один `DealsBoard` front-component, два пункта меню (`PAGE_LAYOUT`), фильтр по stream позиций.  
2. **Same CRM objects:** `opportunity` + `dealLineItem` (не отдельный контур сделок).  
3. **Split by line item:** поле `productStream` на позиции: `BRANDING` | `DECOR` | `MK`.  
4. **Empty / legacy:** `productStream` null/empty трактуется как `BRANDING` (обратная совместимость Реализации).  
5. **Conflict on one line:** если позиция матчит и branding, и декор/МК keywords → `DECOR` или `MK` (не branding). Между DECOR и MK: более специфичный / первый по правилам классификатора (зафиксировать в plan: MK если матч MK keywords, иначе DECOR).  
6. **Parser lists:** четыре хранилища CRUD (могут быть пустыми).  
7. **Saved board views:** `dealBoardView` получает `boardKind`: `REALIZACIYA` | `DECOR_MK`, чтобы layouts не смешивались.

## Architecture

```
Left nav
  ├─ Реализация        → DealsBoard(boardStream=branding)
  └─ МК и Декор        → DealsBoard(boardStream=decor_mk)

crmparserv2
  keywords decor / keywords MK
  blacklist decor / blacklist MK
        └─ classify deal_item → productStream
              └─ syncDealToTwenty writes productStream on dealLineItem

Twenty
  opportunity (shared)
  dealLineItem.productStream
  dealBoardView.boardKind
```

## Data model

### Twenty — `dealLineItem.productStream`

| Value | Board |
|-------|--------|
| `BRANDING` or empty | Реализация |
| `DECOR` | МК и Декор |
| `MK` | МК и Декор |

### Twenty — `dealBoardView.boardKind`

| Value | Used by |
|-------|---------|
| `REALIZACIYA` (default) | Реализация saved views |
| `DECOR_MK` | МК и Декор saved views |

### crmparserv2 — new / extended lists

| List | Role |
|------|------|
| Decor keywords | Mark item `DECOR` when matched (and not decor-blacklisted) |
| MK keywords | Mark item `MK` when matched (and not mk-blacklisted) |
| Decor blacklist | Exclude from decor stream / decor sync eligibility |
| MK blacklist | Exclude from MK stream / MK sync eligibility |

Existing branding `keywords` + `blacklist_items` unchanged for Реализация.

Matching style: same as current branding (word-boundary / exact|substring patterns as in existing blacklist service) — implementers reuse helpers, not invent a third matcher.

## Board behavior

**Реализация (`boardStream=branding`):**

- Shows opportunities that have ≥1 branding (or empty-stream) line item after filters.  
- Child rows: only branding/empty stream.  
- List menu: existing blacklist / restoration / podryad / banner.

**МК и Декор (`boardStream=decor_mk`):**

- Shows opportunities that have ≥1 `DECOR` or `MK` line item.  
- Child rows: only those streams.  
- List menu: add-to decor blacklist / MK blacklist (+ status chips). Hide branding-only list actions (or no-op).

Default columns/filters for MVP = copy Реализация defaults; decor-specific column polish later.

## Sync rules

1. Classify each parser deal item → `productStream`.  
2. Branding eligibility (existing keyword_match / blacklist) continues to gate **branding** sync.  
3. Decor/MK eligibility: match decor/MK keywords, minus corresponding blacklist.  
4. One opportunity may sync with a mix of branding + decor/MK line items.  
5. Board never invents stream client-side except treating empty as branding for display filter.

## Out of scope

- Equipment registry / «нужна переклейка»  
- Seeding real keyword dictionaries  
- Separate opportunity objects or separate Twenty apps  
- Full fork of DealsBoard codebase  
- Changing print-sheet / okleyka salary for decor unless already stream-agnostic

## Success criteria

1. Left nav has **МК и Декор**; opens board filtered to DECOR/MK positions.  
2. Реализация does not list DECOR/MK-only deals as if they were branding work (mixed deals show only branding children on Реализация).  
3. Parser exposes CRUD for four lists (empty OK).  
4. Board can add line item to decor/MK blacklist via existing proxy pattern.  
5. Unit tests: stream classification priority; board filter keeps correct children; empty stream ≡ branding.

## Implementation notes (for later plan)

- TwentyView: `yarn twenty dev:add` field + page layout + nav; thread `boardStream` into `DealsBoard`.  
- crmparserv2: schema + services + routes + settings UI mirrors; extend `twenty-items` / sync to write `productStream`.  
- Commits per-repo when user asks.  
