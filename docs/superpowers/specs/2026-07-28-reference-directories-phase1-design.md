# Reference directories (phase 1) — Design

**Date:** 2026-07-28  
**Status:** Approved in chat (approach A; phase 1 = suppliers + field staff + restoration templates; equipment unit registry = phase 2)  
**Repo:** TwentyView (Twenty app on twentylocal)  
**Related:** `2026-07-24-restoration-makets-wave4-design.md` (code constants catalog — this phase replaces that as source of truth for templates)

## Problem

Нужны отдельные хранилища в левом меню Twenty:

1. База поставщиков  
2. База выездного персонала (баннерщики, оракальщики)  
3. База готовых макетов реставрации с автоподстановкой в позиции, если в сделке нет брендинга на оборудование  
4. (позже) Учёт состояния единиц оборудования и подсветка «нужна переклейка»

Вопрос хранения файлов (Яндекс.Диск 1 ТБ) решён так: **диск = файлы**, **Twenty = карточки, статусы, связи, ссылки**.

## Decisions

1. **Approach A:** нативные объекты Twenty + index views + navigation menu items.  
2. **Phase 1 scope:** объекты `Поставщики`, `Выездной персонал`, `Шаблоны реставрации` + автоподстановка макетов.  
3. **Phase 2 (out of this delivery):** поштучный реестр единиц оборудования + статус внешнего вида + подсветка переклейки.  
4. **Yandex Disk:** только файловое хранилище; в CRM — URL (папка/файл), без синхронизации содержимого диска.  
5. **Suppliers / staff in phase 1:** справочники без обязательной привязки к сделкам (связи «сделка → поставщик / бригада» — later).  
6. **Restoration templates:** CRM object становится источником правды; hardcoded `STANDARD_RESTORATION_MAKETS` заменяется чтением из объекта (с безопасным fallback на константы, пока каталог пуст).

## Architecture

```
Left nav
  ├─ Поставщики          → suppliers object + index view
  ├─ Выездной персонал   → fieldStaff object + index view
  └─ Шаблоны реставрации → restorationTemplates object + index view

Yandex Disk (files only)
  /CRM/Поставщики/{name}/
  /CRM/Персонал/{fio}/
  /CRM/Макеты-реставрация/{equipment-type}/

Deals board (existing)
  line item tip / branding sibling detection
        └─ if needs restoration + empty maket link
              └─ match restorationTemplates → write ssylkaNaMakety
```

## Data model (phase 1)

### Object: Поставщики (`suppliers`)

| Field | Purpose |
|-------|---------|
| name | Название |
| description | Описание / специализация |
| phone | Телефон |
| email | Email |
| address | Адрес |
| contactPerson | Контактное лицо |
| comment | Комментарий |
| diskFolderUrl | Ссылка на папку/файлы на Яндекс.Диске |
| isActive | Активен |

### Object: Выездной персонал (`fieldStaff`)

| Field | Purpose |
|-------|---------|
| name | ФИО |
| role | SELECT: баннерщик / оракальщик / другое |
| phones | Телефоны |
| passportData | Паспортные данные (текст; скан — на диске) |
| status | SELECT: активен / чёрный список / архив |
| comment | Комментарий |
| diskFolderUrl | Ссылка на документы на Яндекс.Диске |

Паспортные данные ограничить доступом ролью на этапе реализации (не светить всем workspace members без нужды).

### Object: Шаблоны реставрации (`restorationTemplates`)

| Field | Purpose |
|-------|---------|
| name | Название шаблона |
| matchKeywords | Ключевые слова / фрагменты названия позиции для матча |
| equipmentHint | Тип/вариант оборудования (свободный текст или SELECT позже) |
| maketUrl | Ссылка на макет (Яндекс.Диск) |
| previewUrl | Превью (опционально) |
| priority | Число: выше = предпочтительнее при нескольких матчах |
| isActive | Активен |
| isDefault | Fallback, если матч не найден, но реставрация нужна |

Каждый объект: **index view** + **navigationMenuItem** в левом меню.

## Auto-substitution rules (templates → line items)

Reuse existing board concepts (branding sibling / tip → RESTAVRACIYA / empty `ssylkaNaMakety`).

**Подставлять, когда все условия истинны:**

1. Позиция считается оборудованием (не строка «Брендинг …»).  
2. В той же сделке **нет** парного брендинга на эту позицию.  
3. У позиции пуста ссылка на макет (`ssylkaNaMakety`).  
4. Есть активный шаблон (матч по `matchKeywords` / тип; иначе `isDefault`).

**Поведение:**

- При нескольких матчах — максимальный `priority`, затем `isDefault`.  
- Запись в позицию: `{ primaryLinkUrl, primaryLinkLabel }` на `ssylkaNaMakety` (как wave 4).  
- Ручная правка менеджера **не** перезаписывается автоматом (пустое звено только).  
- Ручной picker в UI: список из CRM-шаблонов (вместо/вместе с константами).

## Storage split

| Что | Где |
|-----|-----|
| Карточки, поля, статусы, views, поиск | Twenty DB |
| Макеты, сканы паспортов, PDF, фото | Яндекс.Диск |
| Ссылка на файл/папку | Поля `diskFolderUrl` / `maketUrl` в Twenty |

Рекомендуемая структура папок на диске — см. Architecture. Именование папок вручную; CRM не монтирует диск.

## Phase 2 preview (not in this delivery)

Object **Единицы оборудования** (per-unit):

- inventory number, model/type  
- appearance status: штатный / в брендинге / на реставрации / требует переклейки  
- last / current opportunity link  
- history of outings  

Rule sketch: единица уехала в брендинге → следующая продажа без брендинга → UI подсветка «нужна переклейка / штатный вид по сайту».

## Out of scope (phase 1)

- Реестр единиц и подсветка переклейки  
- Обязательная привязка поставщика/персонала к сделке  
- Автозагрузка/синхронизация содержимого Яндекс.Диска в Twenty  
- Миграция исторических Excel как единственного источника правды  

## Success criteria

1. В левом меню три пункта; у каждого рабочий index view и карточка.  
2. Можно завести поставщика, сотрудника и шаблон макета со ссылкой на Яндекс.Диск.  
3. При позиции без брендинга-пары и пустом макете авто подставляет URL из шаблона.  
4. Существующая непустая ссылка на макет автоматом не затирается.  
5. Hardcoded demo-каталог больше не обязателен как единственный source of truth (fallback допустим).  

## Implementation notes (for later plan)

- Создавать сущности через `yarn twenty dev:add` (UUID v4).  
- Не ломать текущий deals board; менять `restoration-maket` automation на чтение CRM catalog.  
- twentylocal MCP при реализации; сейчас design-only.  
