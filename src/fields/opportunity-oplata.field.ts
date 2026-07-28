import { defineField, FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';
import { OPPORTUNITY_OPLATA_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: OPPORTUNITY_OPLATA_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  name: 'oplata',
  type: FieldType.SELECT,
  label: 'Оплата',
  icon: 'IconCurrencyRubel',
  options: [{ value: 'OPLACHENO', label: 'Оплачено', position: 0, color: 'green' }],
});
