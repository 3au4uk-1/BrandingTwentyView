# Фильтр сделок по минимальной сумме

**Дата:** 2026-09-14  
**Статус:** Утверждён к написанию плана реализации  
**Репозиторий:** `BrandingTwentyView`  
**Подход:** clause в существующем конструкторе «Фильтр» + серверный GraphQL `amount.amountMicros.gte`

## Проблема

На доске «Реализация» нельзя оставить только сделки, сумма которых не ниже заданного порога. Порог нужно вводить самому. Клиентская обрезка текущей страницы не подходит: пагинация тогда пропускает крупные сделки с других страниц.

## Цель

Пользователь задаёт сумму в рублях. Доска показывает сделки, у которых колонка «Сумма» (`opportunity.amount`) **>=** порога. Фильтр живёт в том же конструкторе, что стадия и компания, сохраняется в view, работает на десктопе и мобилке.

## Не в scope

- Верхняя граница / диапазон «от–до».
- Фильтр по сумме позиций или по `summaPostupleniy`.
- Отдельное поле в тулбаре вне конструктора.
- Парсер (`crmparserv2`) и BrandingTeamApp.
- Строгий оператор `>` (только `>=`).

## Решения

| Тема | Выбор |
|------|--------|
| Какая сумма | A: `opportunity.amount` (колонка «Сумма») |
| Граница | A: включительно (`>=`) |
| Где в UI | Пункт «Сумма» в конструкторе «Фильтр» |
| Как режем данные | GraphQL на сервере, не клиент текущей страницы |
| Единицы в clause | Рубли, как вводит человек |
| Сохранение | Как остальные clauses — в session и в view |

---

## 1. Модель

Новый clause:

```ts
{
  id: string;
  level: 'deal';
  field: 'amount';
  operator: 'gte';
  value: number; // рубли
}
```

`FilterOperator` расширяется значением `'gte'`.

`DealBoardFilters` получает `amountMinRub?: number`.

`clausesToDealBoardFilters` читает clause `deal` + `amount` + `gte` с конечным `value >= 0` → `amountMinRub`.

Пустой, NaN, отрицательный ввод clause не создаёт и `amountMinRub` не ставит.

## 2. Запрос

`buildOpportunityFilter` при заданном `amountMinRub` добавляет:

```ts
{ amount: { amountMicros: { gte: Math.round(amountMinRub * 1_000_000) } } }
```

Формат как у Twenty `CurrencyFilter` (`GREATER_THAN_OR_EQUAL` × 1_000_000 micros).

Тот же `opportunityFilter` уходит в `useDealsBoardPage` / `fetchOpportunities`, поэтому aggregate cold path и пагинация остаются честными.

Сделки без суммы (null) в выборку `gte` не входят — поведение Twenty.

Клиентский matcher по `opportunity.amount` не делаем: список и так перезапрашивается с новым filter.

## 3. UI

`FILTER_BUILDER_FIELDS`: пункт `{ level: 'deal', field: 'amount', label: 'Сумма', kind: 'amount' }`.

Десктоп (`FilterBar`): Фильтр → Сумма → одно числовое поле. Применить по Enter и blur.

Мобилка (`MobileFiltersSheet`): то же поле, без отдельного экрана.

Чип: `Сумма: от 100 000` (пробелы как разделитель тысяч, ru). Крестик снимает clause.

Парсинг как в `CurrencyAmountCell`: trim, убрать пробелы, `,` → `.`. Успех только если `Number` конечный и `>= 0`. Невалид / пусто — clause нет, без `alert`.

## 4. Тесты

Юнит, без живого CRM:

- парсинг рублей → micros (`100 000` → `100000000000`, `100000,5` → округление `Math.round`)
- `buildOpportunityFilter({ amountMinRub: 100000 })` содержит `{ amount: { amountMicros: { gte: 100000000000 } } }`
- `clausesToDealBoardFilters` мапит `gte` clause в `amountMinRub`
- `formatFilterClauseLabel` → `Сумма: от 100 000`
- пустой/отрицательный ввод не оставляет clause

## 5. Вне scope реализации

Не трогать `docker-compose`, парсер, realtime (кроме косвенного refetch списка после смены фильтра). Не добавлять `lte`.
