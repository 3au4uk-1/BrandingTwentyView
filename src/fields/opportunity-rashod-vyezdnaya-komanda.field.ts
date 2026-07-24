import { defineField, FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';
import { OPPORTUNITY_RASHOD_VYEZDNAYA_KOMANDA_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: OPPORTUNITY_RASHOD_VYEZDNAYA_KOMANDA_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  name: 'rashodVyezdnayaKomanda',
  type: FieldType.CURRENCY,
  label: 'Расход: выездная команда',
  icon: 'IconCash',
  defaultValue: { amountMicros: null, currencyCode: "'RUB'" },
});
