import { defineView, ViewKey } from 'twenty-sdk/define';
import {
  SUPPLIER_CATEGORY_FIELD_UNIVERSAL_IDENTIFIER,
  SUPPLIER_CONTACT_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
  SUPPLIER_DISK_FOLDER_URL_FIELD_UNIVERSAL_IDENTIFIER,
  SUPPLIER_IS_ACTIVE_FIELD_UNIVERSAL_IDENTIFIER,
  SUPPLIER_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  SUPPLIER_OBJECT_UNIVERSAL_IDENTIFIER,
  SUPPLIER_PHONE_FIELD_UNIVERSAL_IDENTIFIER,
  SUPPLIERS_INDEX_CATEGORY_VIEW_FIELD_UNIVERSAL_IDENTIFIER,
  SUPPLIERS_INDEX_NAME_VIEW_FIELD_UNIVERSAL_IDENTIFIER,
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
      universalIdentifier: SUPPLIERS_INDEX_NAME_VIEW_FIELD_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier: SUPPLIER_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      position: -1,
      isVisible: true,
      size: 200,
    },
    {
      universalIdentifier: SUPPLIERS_INDEX_CATEGORY_VIEW_FIELD_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier: SUPPLIER_CATEGORY_FIELD_UNIVERSAL_IDENTIFIER,
      position: 10,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: '24a7271b-97ff-4f26-83b4-9754cac0a7b5',
      fieldMetadataUniversalIdentifier: SUPPLIER_CONTACT_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
      position: 11,
      isVisible: true,
      size: 160,
    },
    {
      universalIdentifier: 'e97dafbd-1bc3-4d31-babc-26cf9dee233e',
      fieldMetadataUniversalIdentifier: SUPPLIER_PHONE_FIELD_UNIVERSAL_IDENTIFIER,
      position: 12,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: '2b37ec47-8d75-4a5e-bd21-5091afffc936',
      fieldMetadataUniversalIdentifier: SUPPLIER_IS_ACTIVE_FIELD_UNIVERSAL_IDENTIFIER,
      position: 13,
      isVisible: true,
      size: 100,
    },
    {
      universalIdentifier: 'd1959c4a-3b5b-4e8e-975a-8e62c2075f56',
      fieldMetadataUniversalIdentifier: SUPPLIER_DISK_FOLDER_URL_FIELD_UNIVERSAL_IDENTIFIER,
      position: 14,
      isVisible: true,
      size: 200,
    },
  ],
});
