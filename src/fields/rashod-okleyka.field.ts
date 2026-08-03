import { defineField, FieldType } from 'twenty-sdk/define';
import { OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import { OPPORTUNITY_RASHOD_OKLEYKA_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

/** Deal-level okleyka budget from the «Оклейщики» page; not part of rashodItogo. */
export default defineField({
  universalIdentifier: OPPORTUNITY_RASHOD_OKLEYKA_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'rashodOkleyka',
  type: FieldType.CURRENCY,
  label: 'Расход: оклейка (план)',
  icon: 'IconCurrencyRubel',
  description:
    'Бюджет оклейки сделки со страницы «Оклейщики»; пока не входит в rashodItogo',
});
