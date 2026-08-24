import { defineObject, FieldType, RelationType } from 'twenty-sdk/define';
import { DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import {
  DEAL_LINE_ITEM_SUPPLIER_FIELD_UNIVERSAL_IDENTIFIER,
  SUPPLIER_ADDRESS_FIELD_UNIVERSAL_IDENTIFIER,
  SUPPLIER_COMMENT_FIELD_UNIVERSAL_IDENTIFIER,
  SUPPLIER_CONTACT_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
  SUPPLIER_DEAL_LINE_ITEMS_FIELD_UNIVERSAL_IDENTIFIER,
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
      name: 'supplierAddress',
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
    {
      universalIdentifier: SUPPLIER_DEAL_LINE_ITEMS_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.RELATION,
      name: 'dealLineItems',
      label: 'Позиции',
      icon: 'IconList',
      relationTargetObjectMetadataUniversalIdentifier:
        DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
      relationTargetFieldMetadataUniversalIdentifier:
        DEAL_LINE_ITEM_SUPPLIER_FIELD_UNIVERSAL_IDENTIFIER,
      universalSettings: {
        relationType: RelationType.ONE_TO_MANY,
      },
    },
  ],
});
