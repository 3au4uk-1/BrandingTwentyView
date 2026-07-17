# Tip / Stage Options Split Design

**Date:** 2026-07-17  
**Status:** Approved (brainstorming)  
**Scope:** Deal line item `tip` (Тип) and `stage` (Стадия) options in Twenty CRM + Deals Board app

## Summary

Перенести «Реставрация» из стадии позиции в тип, добавить тип «Не наше», и мигрировать существующие записи со стадией `RESTAVRACIYA`.

## Goals

- Поле **Тип** содержит: Баннера, Плёнка, Подряд, Реставрация, Не наше
- Поле **Стадия** не содержит значений, пересекающихся с типом (убрать «Реставрация»)
- Существующие позиции со стадией «Реставрация» получают тип «Реставрация» и стадию «Новый»
- UI Deals Board и metadata Twenty остаются синхронными

## Non-goals

- Не менять стадии сделки (`opportunity.stage`)
- Не трогать списки crmparser (restoration / banner / podryad) — это отдельный механизм беклистов
- Не мигрировать исторические записи, у которых уже другой тип/стадия, кроме `stage = RESTAVRACIYA`

## Current state

### Тип (`dealLineItem.tip`)

| Value | Label |
|-------|-------|
| `BANNERA` | Баннера |
| `PLENKA` | Плёнка |
| `PODRYAD` | Подряд |

### Стадия (`dealLineItem.stage`)

| Value | Label |
|-------|-------|
| `NOVYY` | Новый |
| `V_RABOTE` | В работе |
| `V_PECHATI` | В печати |
| `OKLEYKA` | Оклейка |
| `GOTOVO` | Готово |
| `RESTAVRACIYA` | Реставрация |
| `OTMENA` | Отмена |

### Data to migrate

7 позиций с `stage = RESTAVRACIYA` (на момент дизайна): 6 с `tip = PLENKA`, 1 с пустым `tip`.  
Решение: у всех принудительно `tip = RESTAVRACIYA`, `stage = NOVYY`.

## Target state

### Тип

| Value | Label | Color |
|-------|-------|-------|
| `BANNERA` | Баннера | blue |
| `PLENKA` | Плёнка | green |
| `PODRYAD` | Подряд | purple |
| `RESTAVRACIYA` | Реставрация | pink |
| `NE_NASHE` | Не наше | gray |

### Стадия

| Value | Label |
|-------|-------|
| `NOVYY` | Новый |
| `V_RABOTE` | В работе |
| `V_PECHATI` | В печати |
| `OKLEYKA` | Оклейка |
| `GOTOVO` | Готово |
| `OTMENA` | Отмена |

## Implementation plan (ordered)

1. **Metadata `tip`** — добавить опции `RESTAVRACIYA` и `NE_NASHE` через `update_field_metadata` (сохранить существующие option id для BANNERA/PLENKA/PODRYAD).
2. **Data migration** — `upsert_many_deal_line_items` для 7 записей: `tip: RESTAVRACIYA`, `stage: NOVYY`.
3. **Metadata `stage`** — убрать опцию `RESTAVRACIYA` из списка options.
4. **App constants** — обновить:
   - `src/constants/line-item-types.ts` (+ tests)
   - `src/constants/stages.ts` (+ tests)
   - `src/deals-board/utils/summary.ts` — убрать short label для `RESTAVRACIYA` как стадии (опционально оставить fallback через `getStageLabel` для старых кэшей)
5. **Bump version** в `package.json`, unit tests, build.

## Risks / notes

- Порядок критичен: сначала добавить опцию в `tip`, потом писать данные, потом удалять из `stage`. Иначе SELECT update упадёт.
- После удаления опции из `stage` значения `RESTAVRACIYA` в БД больше не должны остаться (миграция обязательна до шага 3).
- Фильтры Deals Board читают константы приложения — обновление констант достаточно для UI; metadata нужна для REST/GraphQL writes.

## Success criteria

- [ ] В Twenty у `tip` 5 опций, у `stage` 6 опций без «Реставрация»
- [ ] Нет позиций со `stage = RESTAVRACIYA`
- [ ] У мигрированных позиций `tip = RESTAVRACIYA` и `stage = NOVYY`
- [ ] В Deals Board селекты Тип/Стадия и quick filters показывают новые списки
- [ ] Unit tests зелёные
