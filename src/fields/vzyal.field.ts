import { defineField, FieldType } from 'twenty-sdk/define';
import { OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import { VZYAL_OPTIONS } from 'src/constants/vzyal';
import { OPPORTUNITY_VZYAL_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: OPPORTUNITY_VZYAL_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'vzyal',
  type: FieldType.SELECT,
  label: 'Взял',
  icon: 'IconUser',
  options: VZYAL_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
    position: option.position,
    color: option.color,
  })),
});
