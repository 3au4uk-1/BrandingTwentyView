# Поле сделки «Взял»

**Дата:** 2026-09-15  
**Статус:** Утверждён, план в `docs/superpowers/plans/2026-09-15-deal-vzyal-field.md`  
**Репозиторий:** `BrandingTwentyView`  
**Подход:** SELECT на `opportunity` + видимая колонка на доске «Реализация»

## Проблема

Когда человек берёт проект в работу, на сделке негде это отметить. Сейчас есть только чекбокс «Взято в работу» у позиции печати — это другой смысл.

## Цель

На сделке появляется поле **«Взял»**. Человек сам выбирает своё имя. Поле видно в карточке сделки в Twenty и колонкой на доске (десктоп и мобилка). Пока никто не взял — пусто (прочерк). Выбор можно снять.

## Не в scope

- Связь с `workspaceMember` / аккаунтами Twenty.
- Несколько человек на одну сделку.
- Фильтры, сортировка, отчёты, scoreboard.
- Автоподстановка текущего пользователя.
- Парсер (`crmparserv2`) и BrandingTeamApp.
- Позиции (`dealLineItem`) — поле только у сделки.

## Решения

| Тема | Выбор |
|------|--------|
| Тип | SELECT, одно значение |
| Объект | `opportunity` |
| Подпись | «Взял» |
| Имя поля | `vzyal` |
| Пусто | да, можно очистить |
| Доска | колонка сразу видна, в т.ч. на существующих view |
| Карточка Twenty | стандартное поле объекта после `yarn twenty apply` |
| Загрузка на доске | REST, как другие кастомные поля сделки (не Core GraphQL) |

---

## 1. Модель

Константы в `src/constants/vzyal.ts`, поле через `yarn twenty dev:add field` (UUID v4 в `universal-identifiers`).

| value | label | color |
|-------|-------|-------|
| `ILYA` | Илья | blue |
| `KIRILL` | Кирилл | green |
| `ANDREY` | Андрей | orange |
| `VASYA` | Вася | purple |
| `DANYA` | Даня | yellow |

`defineField`: `objectUniversalIdentifier` = opportunity, `type` = SELECT, `label` = «Взял», `icon` = `IconUser`.

В `OPPORTUNITY_KNOWN_GRAPHQL_FIELDS` **не** добавлять: после появления в metadata поле само пойдёт в REST-обогащение видимых колонок.

## 2. Доска «Реализация»

Редактор уже есть: `DynamicFieldCell` → `SelectCell` для opportunity SELECT (опция «—» = `null`).

Новые CRM-поля сделки сейчас дописываются **скрытыми**. Для `vzyal` — исключение, как у `stage`:

- в `mergeColumns`: если поля ещё нет в сохранённом view — `visible: true`, вставка сразу после колонки «Сделка» (`name`);
- в `DEFAULT_PARENT_COLUMNS`: колонка `vzyal`, label «Взял», `visible: true`, ширина ~110.

Мобилка берёт те же `parentColumns` — отдельный UI не нужен.

Человек может потом спрятать колонку в настройках view; сохранённый `visible: false` не перезаписывать.

## 3. Карточка сделки

После `yarn twenty apply` поле появляется на объекте Opportunity в Twenty. Отдельный page layout не делаем.

## 4. Тесты

Юнит, без живого CRM:

- опции: пять значений, русские подписи;
- `isOpportunityRestOnlyField('vzyal', [descriptor])` → `true`;
- `mergeColumns`: отсутствующий в saved `vzyal` вставляется видимым после `name`;
- сохранённый `vzyal` с `visible: false` остаётся скрытым.

## 5. Выкат

1. `yarn twenty apply` на local.
2. Hard refresh доски: колонка «Взял», выбор имени, очистка, значение в карточке сделки.
3. Тот же apply на staging, затем prod.
