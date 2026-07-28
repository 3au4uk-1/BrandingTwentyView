import { defineObject, FieldType } from 'twenty-sdk/define';
import {
  FIELD_STAFF_COMMENT_FIELD_UNIVERSAL_IDENTIFIER,
  FIELD_STAFF_DISK_FOLDER_URL_FIELD_UNIVERSAL_IDENTIFIER,
  FIELD_STAFF_OBJECT_UNIVERSAL_IDENTIFIER,
  FIELD_STAFF_PASSPORT_DATA_FIELD_UNIVERSAL_IDENTIFIER,
  FIELD_STAFF_PHONES_FIELD_UNIVERSAL_IDENTIFIER,
  FIELD_STAFF_ROLE_FIELD_UNIVERSAL_IDENTIFIER,
  FIELD_STAFF_STATUS_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineObject({
  universalIdentifier: FIELD_STAFF_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'fieldStaff',
  namePlural: 'fieldStaffs',
  labelSingular: 'Выездной сотрудник',
  labelPlural: 'Выездной персонал',
  icon: 'IconUsers',
  description: 'Баннерщики, оракальщики и другой выездной персонал',
  fields: [
    {
      universalIdentifier: FIELD_STAFF_ROLE_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'staffRole',
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
      universalIdentifier: FIELD_STAFF_PHONES_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'phones',
      type: FieldType.TEXT,
      label: 'Телефоны',
      icon: 'IconPhone',
    },
    {
      universalIdentifier: FIELD_STAFF_PASSPORT_DATA_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'passportData',
      type: FieldType.TEXT,
      label: 'Паспортные данные',
      icon: 'IconId',
    },
    {
      universalIdentifier: FIELD_STAFF_STATUS_FIELD_UNIVERSAL_IDENTIFIER,
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
      universalIdentifier: FIELD_STAFF_COMMENT_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'comment',
      type: FieldType.TEXT,
      label: 'Комментарий',
      icon: 'IconMessage',
    },
    {
      universalIdentifier: FIELD_STAFF_DISK_FOLDER_URL_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'diskFolderUrl',
      type: FieldType.LINKS,
      label: 'Яндекс.Диск',
      icon: 'IconLink',
    },
  ],
});
