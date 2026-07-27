# Wave 1 — Quiet UI, summary, attention strip

Date: 2026-07-27  
Status: approved (conversation)  
Scope: deals board (Реализация) visual + header + summary + attention only.  
Out of scope: taxonomy rename, print/freza Sheets, parser tip_rules, salary view.

## Goals

1. Quieter contrast: dark-gray canvas (not near-black), slightly lighter rows/cards, soft borders, fewer strong fills.
2. More breathing room: taller rows, more cell padding, less heavy chrome around toolbar/summary.
3. Slimmer header: one filter/tools row → attention (if any) → summary → table.
4. Richer summary: category cards (total + печать/работа/готово) plus deal counts by name prefix (ПРО / Аренда / АРТ / Биржа / БС).
5. Attention strip: surface positions that are “too close” to event date without being new/done/cancelled; click filters + highlights.

## Non-goals

- Changing tip/stage enum values or CRM field labels (wave 2).
- Google Sheets print/freza sync (wave 3).
- Parser keyword rules (wave 4).
- Salary export view (wave 5).
- Separate Friday calendar rule (covered by working-day math).

## Screen structure

```
[ View · date presets · search · reset · settings/overflow ]
[ Требует внимания — chips only when count > 0 ]
[ Сводка — category cards · prefix deal counts ]
[ Table ]
```

Toolbar collapses to a single primary row. Brand/secondary chrome moves into overflow/settings where needed. Margin/finance chip stays reachable but must not dominate.

## Visual system

### Tokens (`theme/tokens.ts` + GlobalThemeStyles + apple-ops skill)

| Role | Direction |
|------|-----------|
| Page background | Dark gray (~`#1c1c1e`), not `#000` |
| Elevated rows/cards | One step lighter (~`#2c2c2e` / `#3a3a3c`) |
| Borders | Thin, low-contrast (`borderSubtle`) |
| Fills | Reduce strong scoreboard/active washes; keep soft stage wash on deal rows only |
| Row height | Parent ~46–48px, child ~40–42px |
| Cell padding | ~10–12px vertical, ~14px horizontal |

Update `.cursor/skills/twentyview-apple-ops-ui/SKILL.md` locked token notes to match.

### Density

Prefer professional density over dashboard whitespace. Do not add large empty hero regions.

## Summary

### Category cards (existing + keep)

- Per tip: total positions + `V_PECHATI` / `V_RABOTE` / `GOTOVO` counts.
- Click toggles tip filter (unchanged).
- Labels still follow current constants in this wave (Плёнка rename = wave 2).

### Prefix strip (new)

- Parse **opportunity name** prefix (same family as seed scripts): `ПРО`, `Аренда`/`АРЕНДА`, `АРТ`, `Биржа`, `БС`.
- Count **distinct deals** in the current filtered board set (after date/search/session filters; same universe as visible deals).
- Display compact muted counts. **v1: display-only** (no prefix filter). Clickable prefix filter can follow if needed.

Extract shared `parseDealPrefix(name)` used by summary (and later filters).

## Attention strip

### Clock and event date

- **Today** = calendar date in **Europe/Moscow** (MSK).
- **Event date** = opportunity `loadDate` (дата загрузки), local calendar day (same day-key approach as board date filters).

### Working days

- Count only Mon–Fri between today and event day (exclusive of today or inclusive of event — implement as: number of remaining working days until event date, where Sat/Sun never increment the budget).
- If event date is today or in the past and stage still “active” (below), treat as attention (overdue / due).

Exact helper: `workingDaysUntil(todayMsk, eventDay) → number` (0 if same day or past).

### Eligibility

Line item is in attention if **all** hold:

1. Parent deal has resolvable `loadDate`.
2. `workingDaysUntil(today, loadDate) ≤ N(tip)`.
3. Line-item `stage` ∉ `{ NOVYY, GOTOVO, OTMENA }`.
4. Tip is one of the mapped categories below.

| Tip | N (working days) |
|-----|------------------|
| `PROIZVODSTVO` | 4 |
| `BANNERA` | 4 |
| `PODRYAD` | 4 |
| `PLENKA` | 3 |
| `RESTAVRACIYA` | 3 |

Unmapped / missing tip → not in attention.

### UI

- Strip under filters: chips grouped by tip (or single “Требует внимания · N”) — prefer per-tip chips with counts when > 0.
- No green “all clear” hero; hide strip when total = 0.
- **Click chip (C):** apply session filter so table shows only matching deals/positions **and** visually highlight matching rows (distinct from stage wash — e.g. amber left bar or outline).
- Second click / reset clears attention filter + highlight.

## Data flow

```
filtered opportunities + visible line items
  → computeAttentionItems(todayMsk, oppsById, lineItems)
  → AttentionStrip
  → onActivate → session clauses / highlight set
```

Reuse `visibleLineItems` / filtered deals already feeding the scoreboard. Do not fetch a separate universe.

## Testing

- Unit: `workingDaysUntil` across weekends, same-day, past, Fri→Mon/Tue spans.
- Unit: attention eligibility matrix per tip × stage × N.
- Unit: `parseDealPrefix` for ПРО/АРЕНДА/АРТ/Биржа/БС/OTHER.
- Unit: summary prefix counts on a small fixture.
- Manual: MSK day boundary, filter+highlight toggle, density on desktop dark theme.

## Phased delivery inside wave 1

| Step | Deliverable |
|------|-------------|
| 1.1 | Token lift + row/padding density + skill note |
| 1.2 | Single-row toolbar chrome |
| 1.3 | Prefix strip + `parseDealPrefix` |
| 1.4 | Attention compute + strip + filter/highlight |

## Open items deferred

- Banner/film secondary status labels («Люди стоят», …) — later wave / status overlay.
- Print group rename & Sheets — wave 3.
- Category label «Плёнка» / editable enums — wave 2.
