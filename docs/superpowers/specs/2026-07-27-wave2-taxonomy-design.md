# Wave 2 — Category / tipDetail taxonomy

Date: 2026-07-27  
Status: implementing  
Scope: rename Тип→Категория, PLENKA→Плёнка, tipDetail defaults, hybrid CRM labels  
Out of scope: print/freza Sheets, parser tip_rules, salary view

## Decisions

1. Column / filters / CRM field label: **Категория** (was Тип).
2. Tip labels: `PLENKA` → **Плёнка**, `RESTAVRACIYA` → **Рест. плёнка**. Stage `OKLEYKA` stays «Оклейка».
3. Defaults on tip change (keep compatible tipDetail if still valid):
   - `BANNERA` → `KTO_EDET` («кто едет?» — real selectable option)
   - `PLENKA` / `RESTAVRACIYA` → `NASHI`
   - `PODRYAD` / `PROIZVODSTVO` → empty
4. `RESTAVRACIYA` tipDetail options: Наши / Не наши (same as Плёнка).
5. Hybrid: app owns values + tip→detail matrix; CRM Settings can override **labels** for known values. Unknown CRM tipDetail is shown only if already set on the row.

## Files

- `src/constants/line-item-types.ts`, `tip-detail.ts`
- `src/objects/deal-line-item.object.ts`, `src/fields/tip-detail.field.ts`
- `src/deals-board/taxonomy/merge-crm-labels.ts`
- TypeSelect / TipDetailSelect + filter/column copy
