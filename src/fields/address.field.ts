import { defineField, FieldType } from 'twenty-sdk/define';
import { OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import { OPPORTUNITY_ADDRESS_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: OPPORTUNITY_ADDRESS_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'clientAddress',
  type: FieldType.TEXT,
  label: 'Адрес',
  icon: 'IconMapPin',
});
