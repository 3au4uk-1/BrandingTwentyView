# Reference Directories Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three left-nav Twenty objects (suppliers, field staff, restoration templates) and wire deals-board restoration maket auto-fill + picker to the CRM template catalog (with code-constants fallback).

**Architecture:** Native `defineObject` + `ViewKey.INDEX` + `NavigationMenuItemType.VIEW` for each directory. Yandex Disk stays file-only via LINKS/TEXT URL fields. Pure match helpers pick a template by keywords/priority/default; board automation and `LinkCell` consume a catalog array that comes from REST `/rest/restorationTemplates` or falls back to `STANDARD_RESTORATION_MAKETS`.

**Tech Stack:** twenty-sdk `defineObject` / `defineView` / `defineNavigationMenuItem`, React 19 deals board, `CoreApiClient` REST, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-28-reference-directories-phase1-design.md`

## Global Constraints

- Phase 1 only: suppliers + fieldStaff + restorationTemplates. No equipment unit registry / «нужна переклейка».
- No required deal↔supplier or deal↔staff relations in this plan.
- Yandex Disk = files only; CRM stores URLs, not file bytes.
- All new UUIDs must be valid UUID v4 — use the pre-allocated IDs in Task 1–3 (do not regenerate unless collision).
- Prefer scaffolding with `yarn twenty dev:add object|view|navigationMenuItem` then paste the pre-allocated UUIDs; hand-writing the files below is also OK.
- Keep wave-4 behavior: auto-fill only when tip **becomes** `RESTAVRACIYA` and maket link is empty; never overwrite an existing link.
- `passportData` is sensitive: do not show it on the deals board; full role lockdown is a follow-up (not blocking phase 1).
- Commits only when the user explicitly asks (skip commit steps otherwise).
- After entity/UI sync changes: `yarn twenty apply` (or `yarn twenty dev`) before claiming the sidebar works; hard-refresh UI.

## File map

| Path | Role |
|------|------|
| `src/constants/universal-identifiers.ts` | Object / field / view / nav UUIDs |
| `src/objects/supplier.object.ts` | Поставщики |
| `src/objects/field-staff.object.ts` | Выездной персонал |
| `src/objects/restoration-template.object.ts` | Шаблоны реставрации |
| `src/views/suppliers-index.view.ts` | Index view |
| `src/views/field-staff-index.view.ts` | Index view |
| `src/views/restoration-templates-index.view.ts` | Index view |
| `src/navigation-menu-items/suppliers.navigation-menu-item.ts` | Left nav |
| `src/navigation-menu-items/field-staff.navigation-menu-item.ts` | Left nav |
| `src/navigation-menu-items/restoration-templates.navigation-menu-item.ts` | Left nav |
| `src/constants/standard-restoration-makets.ts` | Shared `RestorationMaketCatalogEntry` + match helpers + constants fallback |
| `src/constants/standard-restoration-makets.test.ts` | Match helper tests |
| `src/deals-board/automations/restoration-maket.ts` | Auto plan uses catalog + line name |
| `src/deals-board/automations/restoration-maket.test.ts` | Updated auto tests |
| `src/deals-board/automations/run-after-line-item-update.ts` | Pass line name into auto planner if needed |
| `src/deals-board/api/restoration-templates.ts` | REST fetch active templates |
| `src/deals-board/api/restoration-templates.test.ts` | Fetch mapping tests |
| `src/deals-board/hooks/useRestorationTemplatesCatalog.ts` | Query + constants fallback |
| `src/deals-board/editors/LinkCell.tsx` | Picker from live catalog |

## Pre-allocated UUIDs (copy exactly)

### Suppliers
- object: `40f438aa-254c-4ab5-ba5d-6fa1b5eb76bc`
- description: `5fa7df36-a7ec-48c1-a886-4152a8355173`
- phone: `c0f1248d-aef4-4122-87ca-375ceacea69c`
- email: `1d4d1fb3-5275-4167-99d2-2048e8d7a979`
- address: `746ff585-9d1d-48df-9dc7-7924d52414c7`
- contactPerson: `38eba474-8896-4ab1-ba12-a4ae620c26fa`
- comment: `6c441059-87b4-4914-9160-8d4d51b99fe7`
- diskFolderUrl: `d244c36a-e187-4b5c-8df9-86c61bf6bccb`
- isActive: `67ffb18e-79b6-4899-b598-a2112b5b9b3e`
- view: `7641dd21-beb2-49d7-930e-fa0db7a1b31a`
- view field rows: `24a7271b-97ff-4f26-83b4-9754cac0a7b5`, `e97dafbd-1bc3-4d31-babc-26cf9dee233e`, `2b37ec47-8d75-4a5e-bd21-5091afffc936`, `d1959c4a-3b5b-4e8e-975a-8e62c2075f56`
- nav: `738360dc-292a-40e1-ad69-ab22fa0d289b`

### Field staff
- object: `082d292c-9633-4d7c-b751-6ea51ddca3c9`
- role: `7a7c2ae2-d1a4-4045-b684-ceb1c7bfc897`
- phones: `32fa8e1c-afc9-4ac3-a214-f3a045403243`
- passportData: `1a4e9c87-9def-474a-965d-a838e6746f0a`
- status: `06a277fb-db44-47a3-88b0-40071710dbd4`
- comment: `1dd477ac-cb41-474f-9eed-be4620b514f5`
- diskFolderUrl: `f9f91a4e-3e4e-4787-9575-da93be14d555`
- view: `8126d807-54c3-41e9-a7a7-a66b5ac48640`
- view field rows: `68af950c-dea2-42ad-af4e-60a9960ee21b`, `547d8528-497b-4028-8a4c-39c343830cae`, `6ca4f86f-e7ab-467c-b013-82d74ebe65bd`, `18a3a7fc-331e-410d-b0d9-6c0c1385553c`
- nav: `2d8cebeb-2ea6-4cf9-a128-80ce58bf6af7`

### Restoration templates
- object: `d3918778-cac7-48dc-a36e-c5700492aace`
- matchKeywords: `6349b412-143c-470d-8fbf-b12471527c6d`
- equipmentHint: `6966d8ba-2b6c-4b16-aa62-f612aa57c215`
- maketUrl: `738d268d-cede-4298-ba98-51db77dfebac`
- previewUrl: `b19b91c3-2468-4360-8321-84034f9aed6e`
- priority: `938cb668-0a26-4cb9-bf1f-443c5f7a5028`
- isActive: `edf775b3-a70e-47b8-b96f-bb17a59d5741`
- isDefault: `f19d0606-27e0-4bfd-baa1-599c1b09cd0e`
- view: `fffdf056-3844-4d13-bb60-3887cd3ae134`
- view field rows: `0170f00c-421a-4383-89a1-9e33f19784e3`, `563524c1-2836-4282-b7f0-e2f8bee6a784`, `896d0212-092d-4896-933b-926f17cb8298`, `9c2e1f0a-4b5c-4d6e-8f70-a1b2c3d4e5f6`
- nav: `5e6f7a8b-9c0d-4e1f-a2b3-c4d5e6f70819`

Do not regenerate these UUIDs unless a sync collision is reported. Tasks 1–3 repeat the same IDs inline.

---

### Task 1: Suppliers object + index view + nav

**Files:**
- Modify: `src/constants/universal-identifiers.ts`
- Create: `src/objects/supplier.object.ts`
- Create: `src/views/suppliers-index.view.ts`
- Create: `src/navigation-menu-items/suppliers.navigation-menu-item.ts`

**Interfaces:**
- Produces object `nameSingular: 'supplier'`, `namePlural: 'suppliers'`
- System `name` field is auto-created — do **not** redeclare `name`
- Custom fields: `description` TEXT, `phone` TEXT, `email` TEXT, `address` TEXT, `contactPerson` TEXT, `comment` TEXT, `diskFolderUrl` LINKS, `isActive` BOOLEAN default true

**UUIDs:**
- `SUPPLIER_OBJECT_UNIVERSAL_IDENTIFIER` = `40f438aa-254c-4ab5-ba5d-6fa1b5eb76bc`
- fields: description `5fa7df36-a7ec-48c1-a886-4152a8355173`, phone `c0f1248d-aef4-4122-87ca-375ceacea69c`, email `1d4d1fb3-5275-4167-99d2-2048e8d7a979`, address `746ff585-9d1d-48df-9dc7-7924d52414c7`, contactPerson `38eba474-8896-4ab1-ba12-a4ae620c26fa`, comment `6c441059-87b4-4914-9160-8d4d51b99fe7`, diskFolderUrl `d244c36a-e187-4b5c-8df9-86c61bf6bccb`, isActive `67ffb18e-79b6-4899-b598-a2112b5b9b3e`
- view `7641dd21-beb2-49d7-930e-fa0db7a1b31a`
- view rows: contactPerson `24a7271b-97ff-4f26-83b4-9754cac0a7b5`, phone `e97dafbd-1bc3-4d31-babc-26cf9dee233e`, isActive `2b37ec47-8d75-4a5e-bd21-5091afffc936`, diskFolderUrl `d1959c4a-3b5b-4e8e-975a-8e62c2075f56`
- nav `738360dc-292a-40e1-ad69-ab22fa0d289b`

- [ ] **Step 1: Export identifiers**

Append to `src/constants/universal-identifiers.ts`:

```ts
export const SUPPLIER_OBJECT_UNIVERSAL_IDENTIFIER =
  '40f438aa-254c-4ab5-ba5d-6fa1b5eb76bc';
export const SUPPLIER_DESCRIPTION_FIELD_UNIVERSAL_IDENTIFIER =
  '5fa7df36-a7ec-48c1-a886-4152a8355173';
export const SUPPLIER_PHONE_FIELD_UNIVERSAL_IDENTIFIER =
  'c0f1248d-aef4-4122-87ca-375ceacea69c';
export const SUPPLIER_EMAIL_FIELD_UNIVERSAL_IDENTIFIER =
  '1d4d1fb3-5275-4167-99d2-2048e8d7a979';
export const SUPPLIER_ADDRESS_FIELD_UNIVERSAL_IDENTIFIER =
  '746ff585-9d1d-48df-9dc7-7924d52414c7';
export const SUPPLIER_CONTACT_PERSON_FIELD_UNIVERSAL_IDENTIFIER =
  '38eba474-8896-4ab1-ba12-a4ae620c26fa';
export const SUPPLIER_COMMENT_FIELD_UNIVERSAL_IDENTIFIER =
  '6c441059-87b4-4914-9160-8d4d51b99fe7';
export const SUPPLIER_DISK_FOLDER_URL_FIELD_UNIVERSAL_IDENTIFIER =
  'd244c36a-e187-4b5c-8df9-86c61bf6bccb';
export const SUPPLIER_IS_ACTIVE_FIELD_UNIVERSAL_IDENTIFIER =
  '67ffb18e-79b6-4899-b598-a2112b5b9b3e';
export const SUPPLIERS_INDEX_VIEW_UNIVERSAL_IDENTIFIER =
  '7641dd21-beb2-49d7-930e-fa0db7a1b31a';
export const SUPPLIERS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER =
  '738360dc-292a-40e1-ad69-ab22fa0d289b';
```

Also export the four view-field-row UUIDs used in the view file (or inline them only in the view — either is fine if unique).

- [ ] **Step 2: Create object**

`src/objects/supplier.object.ts`:

```ts
import { defineObject, FieldType } from 'twenty-sdk/define';
import {
  SUPPLIER_ADDRESS_FIELD_UNIVERSAL_IDENTIFIER,
  SUPPLIER_COMMENT_FIELD_UNIVERSAL_IDENTIFIER,
  SUPPLIER_CONTACT_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
  SUPPLIER_DESCRIPTION_FIELD_UNIVERSAL_IDENTIFIER,
  SUPPLIER_DISK_FOLDER_URL_FIELD_UNIVERSAL_IDENTIFIER,
  SUPPLIER_EMAIL_FIELD_UNIVERSAL_IDENTIFIER,
  SUPPLIER_IS_ACTIVE_FIELD_UNIVERSAL_IDENTIFIER,
  SUPPLIER_OBJECT_UNIVERSAL_IDENTIFIER,
  SUPPLIER_PHONE_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineObject({
  universalIdentifier: SUPPLIER_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'supplier',
  namePlural: 'suppliers',
  labelSingular: 'Поставщик',
  labelPlural: 'Поставщики',
  icon: 'IconTruck',
  description: 'База поставщиков',
  fields: [
    {
      universalIdentifier: SUPPLIER_DESCRIPTION_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'description',
      type: FieldType.TEXT,
      label: 'Описание',
      icon: 'IconNotes',
    },
    {
      universalIdentifier: SUPPLIER_PHONE_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'phone',
      type: FieldType.TEXT,
      label: 'Телефон',
      icon: 'IconPhone',
    },
    {
      universalIdentifier: SUPPLIER_EMAIL_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'email',
      type: FieldType.TEXT,
      label: 'Email',
      icon: 'IconMail',
    },
    {
      universalIdentifier: SUPPLIER_ADDRESS_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'address',
      type: FieldType.TEXT,
      label: 'Адрес',
      icon: 'IconMapPin',
    },
    {
      universalIdentifier: SUPPLIER_CONTACT_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'contactPerson',
      type: FieldType.TEXT,
      label: 'Контактное лицо',
      icon: 'IconUser',
    },
    {
      universalIdentifier: SUPPLIER_COMMENT_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'comment',
      type: FieldType.TEXT,
      label: 'Комментарий',
      icon: 'IconMessage',
    },
    {
      universalIdentifier: SUPPLIER_DISK_FOLDER_URL_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'diskFolderUrl',
      type: FieldType.LINKS,
      label: 'Яндекс.Диск',
      icon: 'IconLink',
    },
    {
      universalIdentifier: SUPPLIER_IS_ACTIVE_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'isActive',
      type: FieldType.BOOLEAN,
      label: 'Активен',
      icon: 'IconCheck',
      defaultValue: true,
    },
  ],
});
```

- [ ] **Step 3: Create index view + nav**

`src/views/suppliers-index.view.ts`:

```ts
import { defineView, ViewKey } from 'twenty-sdk/define';
import {
  SUPPLIER_CONTACT_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
  SUPPLIER_DISK_FOLDER_URL_FIELD_UNIVERSAL_IDENTIFIER,
  SUPPLIER_IS_ACTIVE_FIELD_UNIVERSAL_IDENTIFIER,
  SUPPLIER_OBJECT_UNIVERSAL_IDENTIFIER,
  SUPPLIER_PHONE_FIELD_UNIVERSAL_IDENTIFIER,
  SUPPLIERS_INDEX_VIEW_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: SUPPLIERS_INDEX_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'Все поставщики',
  objectUniversalIdentifier: SUPPLIER_OBJECT_UNIVERSAL_IDENTIFIER,
  icon: 'IconList',
  key: ViewKey.INDEX,
  position: 0,
  fields: [
    {
      universalIdentifier: '24a7271b-97ff-4f26-83b4-9754cac0a7b5',
      fieldMetadataUniversalIdentifier: SUPPLIER_CONTACT_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
      position: 0,
      isVisible: true,
      size: 160,
    },
    {
      universalIdentifier: 'e97dafbd-1bc3-4d31-babc-26cf9dee233e',
      fieldMetadataUniversalIdentifier: SUPPLIER_PHONE_FIELD_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: '2b37ec47-8d75-4a5e-bd21-5091afffc936',
      fieldMetadataUniversalIdentifier: SUPPLIER_IS_ACTIVE_FIELD_UNIVERSAL_IDENTIFIER,
      position: 2,
      isVisible: true,
      size: 100,
    },
    {
      universalIdentifier: 'd1959c4a-3b5b-4e8e-975a-8e62c2075f56',
      fieldMetadataUniversalIdentifier: SUPPLIER_DISK_FOLDER_URL_FIELD_UNIVERSAL_IDENTIFIER,
      position: 3,
      isVisible: true,
      size: 200,
    },
  ],
});
```

`src/navigation-menu-items/suppliers.navigation-menu-item.ts`:

```ts
import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import {
  SUPPLIERS_INDEX_VIEW_UNIVERSAL_IDENTIFIER,
  SUPPLIERS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: SUPPLIERS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Поставщики',
  icon: 'IconTruck',
  position: 10,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: SUPPLIERS_INDEX_VIEW_UNIVERSAL_IDENTIFIER,
});
```

- [ ] **Step 4: Sync and smoke**

Run: `yarn twenty apply`  
Expected: sync succeeds; left sidebar shows **Поставщики**; can create a record with name + phone.

If `IconTruck` is rejected by sync, switch to `IconBuildingStore` or `IconBox` and re-apply.

---

### Task 2: Field staff object + index view + nav

**Files:**
- Modify: `src/constants/universal-identifiers.ts`
- Create: `src/objects/field-staff.object.ts`
- Create: `src/views/field-staff-index.view.ts`
- Create: `src/navigation-menu-items/field-staff.navigation-menu-item.ts`

**Interfaces:**
- `nameSingular: 'fieldStaff'`, `namePlural: 'fieldStaffs'` (or `fieldStaffMembers` if pluralizer rejects — prefer `fieldStaff` / `fieldStaffs`)
- Fields: `role` SELECT, `phones` TEXT, `passportData` TEXT, `status` SELECT, `comment` TEXT, `diskFolderUrl` LINKS

**UUIDs:**
- object `082d292c-9633-4d7c-b751-6ea51ddca3c9`
- role `7a7c2ae2-d1a4-4045-b684-ceb1c7bfc897`
- phones `32fa8e1c-afc9-4ac3-a214-f3a045403243`
- passportData `1a4e9c87-9def-474a-965d-a838e6746f0a`
- status `06a277fb-db44-47a3-88b0-40071710dbd4`
- comment `1dd477ac-cb41-474f-9eed-be4620b514f5`
- diskFolderUrl `f9f91a4e-3e4e-4787-9575-da93be14d555`
- view `8126d807-54c3-41e9-a7a7-a66b5ac48640`
- view rows: role `68af950c-dea2-42ad-af4e-60a9960ee21b`, phones `547d8528-497b-4028-8a4c-39c343830cae`, status `6ca4f86f-e7ab-467c-b013-82d74ebe65bd`, diskFolderUrl `18a3a7fc-331e-410d-b0d9-6c0c1385553c`
- nav `2d8cebeb-2ea6-4cf9-a128-80ce58bf6af7`

- [ ] **Step 1: Export identifiers** (same pattern as Task 1)

- [ ] **Step 2: Create object**

```ts
import { defineObject, FieldType } from 'twenty-sdk/define';
// import FIELD_STAFF_* identifiers

export default defineObject({
  universalIdentifier: '082d292c-9633-4d7c-b751-6ea51ddca3c9',
  nameSingular: 'fieldStaff',
  namePlural: 'fieldStaffs',
  labelSingular: 'Выездной сотрудник',
  labelPlural: 'Выездной персонал',
  icon: 'IconUsers',
  description: 'Баннерщики, оракальщики и другой выездной персонал',
  fields: [
    {
      universalIdentifier: '7a7c2ae2-d1a4-4045-b684-ceb1c7bfc897',
      name: 'role',
      type: FieldType.SELECT,
      label: 'Роль',
      icon: 'IconUserBolt',
      options: [
        { value: 'BANNER', label: 'Баннерщик', position: 0, color: 'blue' },
        { value: 'ORACAL', label: 'Оракальщик', position: 1, color: 'purple' },
        { value: 'OTHER', label: 'Другое', position: 2, color: 'gray' },
      ],
    },
    {
      universalIdentifier: '32fa8e1c-afc9-4ac3-a214-f3a045403243',
      name: 'phones',
      type: FieldType.TEXT,
      label: 'Телефоны',
      icon: 'IconPhone',
    },
    {
      universalIdentifier: '1a4e9c87-9def-474a-965d-a838e6746f0a',
      name: 'passportData',
      type: FieldType.TEXT,
      label: 'Паспортные данные',
      icon: 'IconId',
    },
    {
      universalIdentifier: '06a277fb-db44-47a3-88b0-40071710dbd4',
      name: 'status',
      type: FieldType.SELECT,
      label: 'Статус',
      icon: 'IconStatusChange',
      defaultValue: `'ACTIVE'`,
      options: [
        { value: 'ACTIVE', label: 'Активен', position: 0, color: 'green' },
        { value: 'BLACKLIST', label: 'Чёрный список', position: 1, color: 'red' },
        { value: 'ARCHIVE', label: 'Архив', position: 2, color: 'gray' },
      ],
    },
    {
      universalIdentifier: '1dd477ac-cb41-474f-9eed-be4620b514f5',
      name: 'comment',
      type: FieldType.TEXT,
      label: 'Комментарий',
      icon: 'IconMessage',
    },
    {
      universalIdentifier: 'f9f91a4e-3e4e-4787-9575-da93be14d555',
      name: 'diskFolderUrl',
      type: FieldType.LINKS,
      label: 'Яндекс.Диск',
      icon: 'IconLink',
    },
  ],
});
```

Do **not** put `passportData` in the index view columns (card-only). Index shows role, phones, status, disk link.

- [ ] **Step 3: View + nav** (mirror Task 1; nav name `Выездной персонал`, position `11`, icon `IconUsers`)

- [ ] **Step 4: Sync smoke**

Run: `yarn twenty apply`  
Expected: sidebar **Выездной персонал**; create record with role + phones; passport visible on record page only.

---

### Task 3: Restoration templates object + index view + nav

**Files:**
- Modify: `src/constants/universal-identifiers.ts`
- Create: `src/objects/restoration-template.object.ts`
- Create: `src/views/restoration-templates-index.view.ts`
- Create: `src/navigation-menu-items/restoration-templates.navigation-menu-item.ts`

**Interfaces:**
- `nameSingular: 'restorationTemplate'`, `namePlural: 'restorationTemplates'`
- Fields: `matchKeywords` TEXT, `equipmentHint` TEXT, `maketUrl` LINKS, `previewUrl` LINKS, `priority` NUMBER int default 0, `isActive` BOOLEAN default true, `isDefault` BOOLEAN default false

**UUIDs:**
- object `d3918778-cac7-48dc-a36e-c5700492aace`
- matchKeywords `6349b412-143c-470d-8fbf-b12471527c6d`
- equipmentHint `6966d8ba-2b6c-4b16-aa62-f612aa57c215`
- maketUrl `738d268d-cede-4298-ba98-51db77dfebac`
- previewUrl `b19b91c3-2468-4360-8321-84034f9aed6e`
- priority `938cb668-0a26-4cb9-bf1f-443c5f7a5028`
- isActive `edf775b3-a70e-47b8-b96f-bb17a59d5741`
- isDefault `f19d0606-27e0-4bfd-baa1-599c1b09cd0e`
- view `fffdf056-3844-4d13-bb60-3887cd3ae134`
- view rows: matchKeywords `0170f00c-421a-4383-89a1-9e33f19784e3`, priority `563524c1-2836-4282-b7f0-e2f8bee6a784`, isDefault `896d0212-092d-4896-933b-926f17cb8298`, maketUrl `9c2e1f0a-4b5c-4d6e-8f70-a1b2c3d4e5f6`
- nav `5e6f7a8b-9c0d-4e1f-a2b3-c4d5e6f70819`

- [ ] **Step 1–3: Identifiers, object, view, nav** (same pattern; nav name `Шаблоны реставрации`, position `12`, icon `IconPhoto`)

Object field notes:
- `priority`: `type: FieldType.NUMBER`, `label: 'Приоритет'`, `defaultValue: 0`, and if SDK requires: `universalSettings: { dataType: 'int' }`
- `maketUrl` / `previewUrl`: `FieldType.LINKS`
- `matchKeywords`: free text, e.g. `хватайка, автомат хватайка`

- [ ] **Step 4: Sync + seed one default template manually in UI**

Create record:
- name: `Стандарт реставрации`
- matchKeywords: (empty or broad)
- maketUrl: real Yandex Disk link when available; placeholder URL OK for local
- isActive: true, isDefault: true, priority: 0

Expected: sidebar entry works; record visible in index.

---

### Task 4: Catalog match helpers (pure)

**Files:**
- Modify: `src/constants/standard-restoration-makets.ts`
- Modify: `src/constants/standard-restoration-makets.test.ts`

**Interfaces:**
- Produces:
  - `export type RestorationMaketCatalogEntry = { id: string; label: string; url: string; matchKeywords?: string; priority?: number; isDefault?: boolean; isActive?: boolean }`
  - Keep `StandardRestorationMaket` as alias or migrate call sites to `RestorationMaketCatalogEntry`
  - `parseMatchKeywords(raw: string | null | undefined): string[]` — split on `,;` / whitespace trim, lowercase
  - `scoreTemplateAgainstName(entry, lineItemName: string): number` — count of keywords contained in lowercased name; 0 if none
  - `pickRestorationMaket(catalog: RestorationMaketCatalogEntry[], lineItemName?: string | null): RestorationMaketCatalogEntry | null`
    - consider only `isActive !== false`
    - among entries with score > 0, pick highest `priority` (default 0), tie-break higher score, then label
    - else pick `isDefault === true` among active
    - else `null`
  - Keep `STANDARD_RESTORATION_MAKETS`, `getDefaultRestorationMaket`, `toSsylkaNaMakety`, `isMaketLinkEmpty`

- [ ] **Step 1: Write failing tests**

Extend `standard-restoration-makets.test.ts`:

```ts
import {
  pickRestorationMaket,
  parseMatchKeywords,
  type RestorationMaketCatalogEntry,
} from './standard-restoration-makets';

describe('parseMatchKeywords', () => {
  it('splits and lowercases', () => {
    expect(parseMatchKeywords('Хватайка, корпус; фасад')).toEqual([
      'хватайка',
      'корпус',
      'фасад',
    ]);
  });
});

describe('pickRestorationMaket', () => {
  const catalog: RestorationMaketCatalogEntry[] = [
    {
      id: '1',
      label: 'Default',
      url: 'https://d',
      isDefault: true,
      priority: 0,
    },
    {
      id: '2',
      label: 'Hvatayka',
      url: 'https://h',
      matchKeywords: 'хватайка',
      priority: 10,
    },
    {
      id: '3',
      label: 'Inactive hit',
      url: 'https://x',
      matchKeywords: 'хватайка',
      priority: 99,
      isActive: false,
    },
  ];

  it('prefers keyword match with higher priority', () => {
    expect(
      pickRestorationMaket(catalog, 'Автомат Хватайка белый 80х80')?.id,
    ).toBe('2');
  });

  it('falls back to default when no keyword hit', () => {
    expect(pickRestorationMaket(catalog, 'Фотобудка квадратная')?.id).toBe('1');
  });

  it('ignores inactive templates', () => {
    expect(
      pickRestorationMaket(catalog, 'Автомат Хватайка')?.url,
    ).toBe('https://h');
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `corepack yarn vitest run src/constants/standard-restoration-makets.test.ts`  
Expected: FAIL — `pickRestorationMaket` / `parseMatchKeywords` not exported.

- [ ] **Step 3: Implement helpers**

Add implementations in `standard-restoration-makets.ts`. Map existing constants to `RestorationMaketCatalogEntry` (they already have id/label/url/isDefault).

- [ ] **Step 4: Run tests — expect PASS**

Run: `corepack yarn vitest run src/constants/standard-restoration-makets.test.ts`  
Expected: PASS

---

### Task 5: Wire auto-fill to catalog + line name

**Files:**
- Modify: `src/deals-board/automations/restoration-maket.ts`
- Modify: `src/deals-board/automations/restoration-maket.test.ts`
- Modify: `src/deals-board/automations/run-after-line-item-update.ts` (pass `name` into planner)

**Interfaces:**
- Consumes: `pickRestorationMaket`, `toSsylkaNaMakety`, `isMaketLinkEmpty`
- Produces:
  - `planRestorationMaketAuto(previousTip, nextTip, currentLink, options?: { lineItemName?: string | null; catalog?: RestorationMaketCatalogEntry[] }): RestorationMaketAutoPatch | null`
  - Default `catalog` = `STANDARD_RESTORATION_MAKETS` when omitted (keeps unit tests offline)

- [ ] **Step 1: Failing tests**

```ts
it('uses keyword catalog match when tip becomes RESTAVRACIYA', () => {
  const catalog = [
    {
      id: 'd',
      label: 'Default',
      url: 'https://d',
      isDefault: true,
    },
    {
      id: 'h',
      label: 'Hvatayka rest',
      url: 'https://hvatayka',
      matchKeywords: 'хватайка',
      priority: 5,
    },
  ];
  expect(
    planRestorationMaketAuto('PLENKA', 'RESTAVRACIYA', null, {
      lineItemName: 'Автомат Хватайка белый',
      catalog,
    }),
  ).toEqual({
    ssylkaNaMakety: {
      primaryLinkUrl: 'https://hvatayka',
      primaryLinkLabel: 'Hvatayka rest',
    },
  });
});
```

Keep existing tests passing (they omit `options` → constants default).

- [ ] **Step 2: Run — expect FAIL** on new test

Run: `corepack yarn vitest run src/deals-board/automations/restoration-maket.test.ts`

- [ ] **Step 3: Implement**

```ts
export const planRestorationMaketAuto = (
  previousTip: string | null | undefined,
  nextTip: string | null | undefined,
  currentLink: MaketLinkValue | null | undefined,
  options?: {
    lineItemName?: string | null;
    catalog?: RestorationMaketCatalogEntry[];
  },
): RestorationMaketAutoPatch | null => {
  if (nextTip !== 'RESTAVRACIYA') return null;
  if (previousTip === 'RESTAVRACIYA') return null;
  if (!isMaketLinkEmpty(currentLink)) return null;
  const catalog = options?.catalog ?? STANDARD_RESTORATION_MAKETS;
  const picked = pickRestorationMaket(catalog, options?.lineItemName);
  if (!picked) return null;
  return { ssylkaNaMakety: toSsylkaNaMakety(picked) };
};
```

Update `run-after-line-item-update.ts` call site to pass `lineItemName: next.name` (or whatever the current row field is named in that function). If catalog fetch is not available in that pure path yet, omit catalog (constants fallback) — live catalog wiring is Task 6–7 for the picker; for automation, optionally thread catalog later. **Minimum for Task 5:** pass `lineItemName` so keyword match works against constants / injected catalog in tests.

- [ ] **Step 4: Run tests — PASS**

Run: `corepack yarn vitest run src/deals-board/automations/restoration-maket.test.ts src/constants/standard-restoration-makets.test.ts`

---

### Task 6: REST catalog fetch + LinkCell picker

**Files:**
- Create: `src/deals-board/api/restoration-templates.ts`
- Create: `src/deals-board/api/restoration-templates.test.ts`
- Create: `src/deals-board/hooks/useRestorationTemplatesCatalog.ts`
- Modify: `src/deals-board/editors/LinkCell.tsx`

**Interfaces:**
- Produces:
  - `fetchRestorationTemplatesCatalog(): Promise<RestorationMaketCatalogEntry[]>`
  - REST `GET /rest/restorationTemplates` with filter `isActive` true if easy; else filter client-side
  - Map node: `id`, `name` → `label`, `maketUrl.primaryLinkUrl` → `url`, `matchKeywords`, `priority`, `isDefault`, `isActive`
  - Skip rows without `url`
  - `useRestorationTemplatesCatalog()` → `{ entries: RestorationMaketCatalogEntry[]; isLoading: boolean }`  
    On error or empty CRM list → `STANDARD_RESTORATION_MAKETS`

- [ ] **Step 1: Failing API mapping test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { fetchRestorationTemplatesCatalog } from './restoration-templates';

vi.mock('./client', () => ({
  getApiClient: () => ({
    get: vi.fn().mockResolvedValue({
      data: {
        data: {
          restorationTemplates: [
            {
              id: 't1',
              name: 'Hvatayka',
              matchKeywords: 'хватайка',
              priority: 10,
              isDefault: false,
              isActive: true,
              maketUrl: { primaryLinkUrl: 'https://disk/h' },
            },
            {
              id: 't2',
              name: 'No url',
              isActive: true,
              maketUrl: null,
            },
          ],
        },
      },
    }),
  }),
}));

describe('fetchRestorationTemplatesCatalog', () => {
  it('maps active rows with urls', async () => {
    const rows = await fetchRestorationTemplatesCatalog();
    expect(rows).toEqual([
      {
        id: 't1',
        label: 'Hvatayka',
        url: 'https://disk/h',
        matchKeywords: 'хватайка',
        priority: 10,
        isDefault: false,
        isActive: true,
      },
    ]);
  });
});
```

Adjust mock shape to match whatever `CoreApiClient.get` actually returns in this repo (inspect `line-items.ts` response unwrapping and mirror it).

- [ ] **Step 2: Run — FAIL**

Run: `corepack yarn vitest run src/deals-board/api/restoration-templates.test.ts`

- [ ] **Step 3: Implement fetch + hook**

Use `getApiClient().get('/rest/restorationTemplates', { params: { limit: 200 } })` (or project’s usual pagination). Unwrap edges/array consistently with `fetchDealBoardViews` / line-items helpers.

Hook:

```ts
export const useRestorationTemplatesCatalog = () => {
  const query = useQuery({
    queryKey: ['restorationTemplatesCatalog'],
    queryFn: fetchRestorationTemplatesCatalog,
    staleTime: 60_000,
  });
  const entries =
    query.data && query.data.length > 0
      ? query.data
      : STANDARD_RESTORATION_MAKETS;
  return { entries, isLoading: query.isLoading };
};
```

- [ ] **Step 4: Wire LinkCell**

Replace direct `STANDARD_RESTORATION_MAKETS` list in the picker modal with `entries` from the hook. `applyMaket` still uses `toSsylkaNaMakety`.

- [ ] **Step 5: Tests PASS**

Run: `corepack yarn vitest run src/deals-board/api/restoration-templates.test.ts src/constants/standard-restoration-makets.test.ts src/deals-board/automations/restoration-maket.test.ts`

---

### Task 7: Apply sync + end-to-end smoke

**Files:** none new (verification only)

- [ ] **Step 1: Apply app**

Run: `yarn twenty apply`  
Expected: no sync errors for the three objects/views/nav items.

- [ ] **Step 2: UI checklist (localhost:2020)**

1. Left nav shows: Поставщики, Выездной персонал, Шаблоны реставрации.  
2. Create one supplier with disk link.  
3. Create one field staff (passport on card, not required in table).  
4. Ensure at least one active default restoration template with maket URL.  
5. On deals board: set a line item tip → «Рест. оклейка» with empty maket → link auto-fills from default/keyword template.  
6. Open maket cell → «Станд. макет» lists CRM templates (or constants fallback if CRM empty).  
7. Existing non-empty maket link is not overwritten on tip toggle.

- [ ] **Step 3: Unit suite subset green**

Run: `corepack yarn vitest run src/constants/standard-restoration-makets.test.ts src/deals-board/automations/restoration-maket.test.ts src/deals-board/api/restoration-templates.test.ts`  
Expected: all PASS.

---

## Spec coverage self-review

| Spec requirement | Task |
|------------------|------|
| Suppliers object + view + nav | 1 |
| Field staff object + view + nav | 2 |
| Restoration templates object + view + nav | 3 |
| Disk = URL fields only | 1–3 (`diskFolderUrl` / `maketUrl`) |
| Auto-substitution rules + no overwrite | 4–5 |
| Manual picker from CRM catalog | 6 |
| Constants fallback | 4–6 |
| Equipment registry phase 2 out of scope | not scheduled |
| Deal↔supplier/staff relations later | not scheduled |
| Passport sensitivity | Task 2: omitted from index columns |

## Placeholder / consistency check

- No TBD left in tasks.  
- Catalog type name `RestorationMaketCatalogEntry` used consistently in Tasks 4–6.  
- Auto trigger remains tip → `RESTAVRACIYA` (wave 4), extended with keyword pick — matches approved design section 2 without inventing a second trigger path.  
- Branding-sibling detection stays in existing tip/automation flow; this plan does not re-implement it.
