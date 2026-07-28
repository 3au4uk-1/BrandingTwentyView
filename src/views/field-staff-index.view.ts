import { defineView, ViewKey } from 'twenty-sdk/define';
import {
  FIELD_STAFF_DISK_FOLDER_URL_FIELD_UNIVERSAL_IDENTIFIER,
  FIELD_STAFF_INDEX_VIEW_UNIVERSAL_IDENTIFIER,
  FIELD_STAFF_OBJECT_UNIVERSAL_IDENTIFIER,
  FIELD_STAFF_PHONES_FIELD_UNIVERSAL_IDENTIFIER,
  FIELD_STAFF_ROLE_FIELD_UNIVERSAL_IDENTIFIER,
  FIELD_STAFF_STATUS_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: FIELD_STAFF_INDEX_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'Весь выездной персонал',
  objectUniversalIdentifier: FIELD_STAFF_OBJECT_UNIVERSAL_IDENTIFIER,
  icon: 'IconList',
  key: ViewKey.INDEX,
  position: 0,
  fields: [
    {
      universalIdentifier: '68af950c-dea2-42ad-af4e-60a9960ee21b',
      fieldMetadataUniversalIdentifier: FIELD_STAFF_ROLE_FIELD_UNIVERSAL_IDENTIFIER,
      position: 0,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: '547d8528-497b-4028-8a4c-39c343830cae',
      fieldMetadataUniversalIdentifier: FIELD_STAFF_PHONES_FIELD_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
      size: 160,
    },
    {
      universalIdentifier: '6ca4f86f-e7ab-467c-b013-82d74ebe65bd',
      fieldMetadataUniversalIdentifier: FIELD_STAFF_STATUS_FIELD_UNIVERSAL_IDENTIFIER,
      position: 2,
      isVisible: true,
      size: 120,
    },
    {
      universalIdentifier: '18a3a7fc-331e-410d-b0d9-6c0c1385553c',
      fieldMetadataUniversalIdentifier: FIELD_STAFF_DISK_FOLDER_URL_FIELD_UNIVERSAL_IDENTIFIER,
      position: 3,
      isVisible: true,
      size: 200,
    },
  ],
});
