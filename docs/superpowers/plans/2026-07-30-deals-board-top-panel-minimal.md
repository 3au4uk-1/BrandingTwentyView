# Deals Board Top Panel Minimal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quiet, denser dark-ops top block — compact `BoardToolbar` + quieter `BoardInsightPanel` — so operators can scan filters and production status without chrome competing for attention.

**Architecture:** Pure presentational refactor of two components. Extract a small pure helper for prefix-count `title` text (unit-tested). No filter/attention/scoreboard compute changes. Keep one shared insight surface; demote prefix chips and green money pill from the toolbar.

**Tech Stack:** React, inline theme tokens via `useTheme()`, vitest (`yarn test:unit` / path-scoped `vitest run`).

**Spec:** `docs/superpowers/specs/2026-07-30-deals-board-top-panel-minimal-design.md`

## Global Constraints

- Dark Apple ops theme only — no light editorial / warm-bone skin.
- Attention + category summary stay always visible when scoreboard expanded (collapse toggle unchanged).
- Tip/category/search/analytics/expand/settings behavior unchanged.
- No emoji / decorative unicode icons (no ⚠ ▣▭◇⬡↻).
- Tip color = 6px dots only; active = inset accent outline; no tip-colored card fills.
- Turnover control: tabular text, not success-green pill.
- Prefix counts: title-only on `{N} сд` (no permanent chip row).
- Do not re-wire `AttentionStrip.tsx`.

## File map

| File | Responsibility |
|------|----------------|
| `src/deals-board/utils/deal-prefix.ts` | Add `formatPrefixCountsTitle` |
| `src/deals-board/utils/deal-prefix.test.ts` | Unit tests for title helper |
| `src/deals-board/BoardToolbar.tsx` | Single-band control layout; demote prefixes + turnover chrome; shorter search placeholder |
| `src/deals-board/BoardInsightPanel.tsx` | Quiet attention header; flat category rows; remove `TIP_ICON` |
| `.cursor/skills/twentyview-apple-ops-ui/SKILL.md` | Sync locked top-block notes |

---

### Task 1: Prefix title helper + tests

**Files:**
- Modify: `src/deals-board/utils/deal-prefix.ts`
- Modify: `src/deals-board/utils/deal-prefix.test.ts`

**Interfaces:**
- Consumes: existing `DealPrefix`, `DEAL_PREFIX_ORDER`, `DEAL_PREFIX_LABELS`, `countDealsByPrefix`
- Produces: `formatPrefixCountsTitle(counts: Record<DealPrefix, number>): string` — space-joined `Label N` for prefixes in `DEAL_PREFIX_ORDER` with `count > 0`; empty string if none

- [ ] **Step 1: Write the failing tests**

Append to `src/deals-board/utils/deal-prefix.test.ts`:

```ts
import { formatPrefixCountsTitle, type DealPrefix } from './deal-prefix';

const emptyCounts = (): Record<DealPrefix, number> => ({
  PRO: 0,
  ARENDA: 0,
  ART: 0,
  BIRZHA: 0,
  BS: 0,
  OTHER: 0,
});

describe('formatPrefixCountsTitle', () => {
  it('returns empty string when all prefix counts are zero', () => {
    expect(formatPrefixCountsTitle(emptyCounts())).toBe('');
  });

  it('joins only positive counts in DEAL_PREFIX_ORDER with labels', () => {
    const counts = emptyCounts();
    counts.PRO = 15;
    counts.ARENDA = 15;
    counts.ART = 12;
    counts.BIRZHA = 5;
    expect(formatPrefixCountsTitle(counts)).toBe(
      'ПРО 15 Аренда 15 АРТ 12 Биржа лидов 5',
    );
  });

  it('skips zero counts and ignores OTHER', () => {
    const counts = emptyCounts();
    counts.ART = 2;
    counts.OTHER = 99;
    expect(formatPrefixCountsTitle(counts)).toBe('АРТ 2');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn vitest run src/deals-board/utils/deal-prefix.test.ts`

Expected: FAIL — `formatPrefixCountsTitle` is not exported / not a function.

- [ ] **Step 3: Implement helper**

Add to `src/deals-board/utils/deal-prefix.ts`:

```ts
export const formatPrefixCountsTitle = (
  counts: Record<DealPrefix, number>,
): string =>
  DEAL_PREFIX_ORDER.filter((prefix) => counts[prefix] > 0)
    .map((prefix) => `${DEAL_PREFIX_LABELS[prefix]} ${counts[prefix]}`)
    .join(' ');
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn vitest run src/deals-board/utils/deal-prefix.test.ts`

Expected: PASS (all `formatPrefixCountsTitle` + existing tests).

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/utils/deal-prefix.ts src/deals-board/utils/deal-prefix.test.ts
git commit -m "$(cat <<'EOF'
feat(deals-board): add prefix counts title helper

EOF
)"
```

---

### Task 2: Compact quiet `BoardToolbar`

**Files:**
- Modify: `src/deals-board/BoardToolbar.tsx`

**Interfaces:**
- Consumes: `formatPrefixCountsTitle` from `./utils/deal-prefix`
- Produces: unchanged public props of `BoardToolbar`; visual-only layout change

- [ ] **Step 1: Import helper; stop rendering prefix chip row**

In `BoardToolbar.tsx`:
1. Import `formatPrefixCountsTitle` alongside existing deal-prefix imports.
2. Remove the `DEAL_PREFIX_ORDER.map(...)` chip loop from the right meta cluster.
3. On the `{dealCount} сд` span, set:

```ts
title={formatPrefixCountsTitle(prefixCounts) || undefined}
```

Keep `prefixCounts` `useMemo` (still needed for the title).

Remove unused imports after chip removal: `getChipPalette`, `ChipColor`, and `PREFIX_COLOR` constant if nothing else uses them. Keep `colorScheme` destructure only if still needed — after this change it likely is not; drop it from `useTheme()` destructure if unused.

- [ ] **Step 2: Restyle turnover control (no green pill)**

Replace the turnover `<button>` styles so it is quiet text:

```tsx
<button
  type="button"
  onClick={onOpenAnalytics}
  title="Оборот по текущему фильтру · открыть аналитику"
  style={{
    border: 'none',
    cursor: 'pointer',
    padding: '4px 6px',
    borderRadius: radius.sm,
    backgroundColor: 'transparent',
    color: colors.text,
    fontFamily: font.family,
    fontSize: font.sizeSm,
    fontWeight: font.weightSemibold,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
    letterSpacing: '-0.02em',
  }}
>
  {formatRub(turnoverRub)}
</button>
```

Do not use `colors.success` / `colors.successMuted` / `radius.pill` on this control.

- [ ] **Step 3: Tighten layout + search placeholder**

1. Change empty search placeholder from the long multi-sentence string to `Поиск…`. Keep the non-empty terms placeholder `Ещё слово + Enter…`.
2. Collapse the header toward a single band:
   - Outer `header`: keep `data-deals-board-toolbar`; use `alignItems: 'center'`; `padding: `${spacing.sm} ${spacing.md}``; `gap: spacing.sm`.
   - Prefer one wrapping row: left column (view + filters) and search on the same horizontal flow when width allows; meta + settings stay `flex: 0 0 auto` on the right.
   - Concrete structure:

```tsx
<header data-deals-board-toolbar style={{ /* borderBottom, transparent bg, padding, flex, alignItems center, gap sm, minWidth 0 */ }}>
  <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
    <ViewSwitcher ... />
    <FilterBar ... layout="compact-top" />
    <div /* search shell — existing border/elevated styles, flex 1, minWidth ~180 */>
      {/* term chips + Input unchanged behavior */}
    </div>
    {showReset ? <Button ...>Сбросить</Button> : null}
  </div>
  <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
    {/* dealCount span with title, turnover button, ExpandModeToggle, ToolbarSettingsCluster */}
  </div>
</header>
```

3. Preserve all handlers: search debounce, Enter term commit, Backspace remove term, reset, analytics click, expand, settings.

- [ ] **Step 4: Typecheck / unit smoke**

Run: `yarn vitest run src/deals-board/utils/deal-prefix.test.ts`

Expected: PASS.

If the project has a typecheck script commonly used (`yarn tsc --noEmit` or package script), run it and fix any unused-import errors in `BoardToolbar.tsx`.

- [ ] **Step 5: Commit**

```bash
git add src/deals-board/BoardToolbar.tsx
git commit -m "$(cat <<'EOF'
feat(deals-board): quiet compact board toolbar

EOF
)"
```

---

### Task 3: Quiet flat `BoardInsightPanel`

**Files:**
- Modify: `src/deals-board/BoardInsightPanel.tsx`

**Interfaces:**
- Consumes: existing props (`lineItems`, `selectedTypes`, `onToggleType`, `attentionStats`, `attentionTip`, `onToggleAttentionTip`, `summaryTitle`)
- Produces: same prop API; visual-only change

- [ ] **Step 1: Remove decorative icons from attention + categories**

1. Delete `TIP_ICON` constant entirely.
2. In the attention label, remove the ⚠ `<span>`; keep text «Требует внимания» + count badge (`warningMuted` / `warning` colors OK — semantic, not emoji).
3. In category cards, remove the glyph `<span>{TIP_ICON[tip] ?? '·'}</span>`. Keep a **6px tip-color dot** before the label (same pattern as attention tip chips):

```tsx
<span
  aria-hidden
  style={{
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: palette.text,
    flexShrink: 0,
  }}
/>
```

- [ ] **Step 2: Flatten category card chrome**

On each category `<button>`:
- Keep click → `onToggleType(tip)`.
- `backgroundColor: colors.bgElevated` (or transparent if elevated equals secondary — prefer elevated for slight separation).
- Inactive: `boxShadow: inset 0 0 0 1px ${colors.borderSubtle}` (not tip-colored).
- Active: `boxShadow: inset 0 0 0 1.5px ${colors.accent}` only.
- `borderRadius: radius.md` (do not increase).
- Padding `8px 10px`; grid stays `repeat(auto-fill, minmax(148px, 1fr))` with `gap: 6`.
- Empty (`metrics.total === 0` && !active): `opacity: 0.45`.
- Stage line: keep `StageCount` with existing `STAGE_DOT` colors; labels «Печать» / «Работа» / «Готово».

Header row / collapse / `localStorage` key `tv.dealsBoard.scoreboardCollapsed` — unchanged behavior.

- [ ] **Step 3: Manual visual checklist (browser or host apply)**

After `yarn twenty apply` (or local board preview) hard-refresh Реализация:

1. Toolbar reads as one control band; no ПРО/Аренда chip row; hover `{N} сд` shows prefix title.
2. Sum is not a green pill; click still opens analytics.
3. Insight: no ⚠ / category glyphs; tip color only as dots.
4. Attention tips + category clicks still filter; collapse still hides category grid.
5. Table starts higher / less vertical chrome than before.

- [ ] **Step 4: Commit**

```bash
git add src/deals-board/BoardInsightPanel.tsx
git commit -m "$(cat <<'EOF'
feat(deals-board): quiet flat insight panel chrome

EOF
)"
```

---

### Task 4: Sync apple-ops skill locked notes

**Files:**
- Modify: `.cursor/skills/twentyview-apple-ops-ui/SKILL.md`

**Interfaces:**
- None (docs-only for agent guidance)

- [ ] **Step 1: Update locked top-block bullet**

Replace the current top-block locked line:

```markdown
- **Top block:** one `BoardInsightPanel` — attention strip (dot chips) + collapsible category summary + prefix counts; shared surface, not two separate bars
```

with:

```markdown
- **Top block:** compact `BoardToolbar` (view · filters · search · deal count · quiet turnover · toggles) + one `BoardInsightPanel` (attention ghost chips + collapsible flat category rows). Prefix counts live in `{N} сд` `title`, not toolbar chips. Shared insight surface, not two separate bars. No emoji / tip glyphs — dots only.
- **Turnover control:** tabular text button (opens analytics) — never success-green pill
```

Also under Anti-patterns, ensure this line exists (add if missing):

```markdown
- Green money pills or tip-colored category card fills in the top block
- Permanent PRO/Аренда/АРТ prefix chip row in the toolbar
```

- [ ] **Step 2: Commit**

```bash
git add .cursor/skills/twentyview-apple-ops-ui/SKILL.md
git commit -m "$(cat <<'EOF'
docs(skills): sync apple-ops top panel locked notes

EOF
)"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Single-band Control / demote prefixes to title | Task 1 + 2 |
| Quiet turnover (no green pill) | Task 2 |
| Shorter search placeholder | Task 2 |
| Insight: no emoji, tip dots only | Task 3 |
| Flat category rows, accent inset active | Task 3 |
| Behavior preserved | Tasks 2–3 (no logic changes) |
| Skill sync | Task 4 |
| Dark ops only / no AttentionStrip rewire | Global + Task 3 |

No placeholders remaining. Helper name `formatPrefixCountsTitle` consistent across Task 1–2.
