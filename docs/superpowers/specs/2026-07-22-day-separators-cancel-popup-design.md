# Day Separators + Cancel Popup Design

**Date:** 2026-07-22  
**Status:** Approved (brainstorming)  
**Scope:** Desktop DealsTable day dividers; opportunity stage `OTMENA` celebration popup

## Summary

1. В сплошной десктопной таблице — полоска с датой между днями (только при сортировке по дате).
2. Небольшая всплывашка с приложенным фото, когда сделка переходит в стадию «Отмена» (вручную и автоматически).

## Goals

- Легко визуально отличать блоки дней в таблице
- Юмористический feedback при отмене сделки
- Не ломать мобильный UI и существующие мутации стадий

## Decisions (from brainstorming)

| Topic | Choice |
|-------|--------|
| Cancel popup trigger | Manual + auto (`syncDealStage`) when stage becomes `OTMENA` |
| Day separator style | Labeled strip (e.g. «14 июля»), not bare line |
| Separator visibility | Only when list is sorted by date (`loadDate` / `closeDate`) |
| Mobile separators | Out of scope |
| Popup copy | Short label «Сделка отменена» above/below image |

## Feature 1: Day separators

### Behavior

- Apply only in desktop `DealsTable`.
- Apply only when primary view sort field is `loadDate` or `closeDate` (same gate as `sortOpportunitiesWithCancelledLast`).
- Day key = local calendar day of effective opportunity date (`getOpportunityEffectiveDate` → `toLocalInputDate`).
- When consecutive records change day key, insert a full-width separator row **before** the first row of the new day (including before the first row if desired: show separator for each day group including the first — recommended for scanability).

### Visual

- Single `<tr>` with `colSpan` = column count
- Background: `colors.bgSecondary`
- Border top/bottom: `colors.borderSubtle`
- Text: Russian long date without year if same year as today, else with year — e.g. `14 июля` / `14 июля 2025`
- Compact padding (~6–8px), `font.sizeXs`, `textMuted` / medium weight
- Non-interactive, no sticky requirement in v1

### Implementation sketch

- Helper: `formatDaySeparatorLabel(dayKey: string): string` + `getRecordDayKey(row)`
- Helper or util: `shouldShowDaySeparators(sort): boolean`
- In `DealsTable` tbody: map records to fragments `[separator?, DealRow]`
- Unit tests for day-key grouping / label formatting

### Non-goals

- Separators in mobile cards
- Separators when sorted by name/stage/etc.
- Collapsing day groups

## Feature 2: Cancel (`OTMENA`) popup

### Trigger

Show when opportunity stage **transitions into** `OTMENA` from any other value (including null/NOVYY):

1. **Manual:** `DealStageSelect.handleChange` after successful update when `nextValue === 'OTMENA'` and previous ≠ `OTMENA`
2. **Auto:** `syncDealStage` after successful `patchOpportunity` when `nextStage === 'OTMENA'` and previous ≠ `OTMENA`

Do **not** show if already `OTMENA` and user re-selects the same stage.

### UI

- Centered overlay (reuse `Modal` portal patterns or slim dedicated `CancelOtmenaPopup`)
- Image from public asset via `getPublicAssetUrl('cancel-otmena.png')` (or `.jpg` matching source)
- Caption: «Сделка отменена»
- Dismiss: backdrop click, Escape, explicit close; auto-dismiss after ~3.5s
- z-index: modal layer
- Max image width ~280–320px so it stays «небольшая всплывашка»

### Wiring

- Small React context or event callback `notifyDealCancelled()` mounted near board root (`DealsBoard` / `ThemeProvider` sibling)
- `syncDealStage` should invoke the notifier when transition detected (pass optional `onStageChanged?: (prev, next) => void` **or** import a module-level listener registered by the provider — prefer injectable callback / context to avoid hard coupling)
- Recommended: `CancelOtmenaProvider` with `showCancelPopup()`, call from `DealStageSelect` and from a thin wrapper around `syncDealStage` used by hooks (or return `{ changed, previous, next }` from `syncDealStage` and let callers notify)

### Asset

- Copy user-provided meme into `public/cancel-otmena.png` (or preserve original extension)
- Document in plan that asset must be committed

### Non-goals

- Sound
- Popup when line-item stage alone is cancelled without deal becoming `OTMENA`
- Persisting «already shown» across reloads (show every transition is fine)

## Risks

- Remote DOM: use existing `Modal`/`portalTarget` patterns that already work
- Auto-sync from realtime may fire for other users' updates — acceptable; popup is local to the open board session
- Day separators must use same effective-date logic as sort to avoid mismatch

## Success criteria

- [ ] With date sort: labeled day strips between day groups in desktop table
- [ ] Without date sort: no strips
- [ ] Manual set deal stage → Отмена shows popup with photo
- [ ] Auto sync to Отмена shows popup
- [ ] Re-selecting Отмена when already Отмена does not show popup
- [ ] Unit tests for day-key / separator gating and OTMENA transition detection
- [ ] Asset in `public/` and loads via `getPublicAssetUrl`
