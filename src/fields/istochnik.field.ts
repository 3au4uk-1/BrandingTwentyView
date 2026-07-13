import { defineField, FieldType } from 'twenty-sdk/define';
import { DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import { DEAL_LINE_ITEM_ISTOCHNIK_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { LINE_ITEM_ORIGIN } from 'src/constants/line-item-origin';

export default defineField({
  universalIdentifier: DEAL_LINE_ITEM_ISTOCHNIK_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'istochnik',
  type: FieldType.SELECT,
  label: 'Источник',
  icon: 'IconSourceCode',
  options: [
    { value: LINE_ITEM_ORIGIN.PARSER, label: 'Парсер', position: 0, color: 'blue' },
    { value: LINE_ITEM_ORIGIN.TWENTY_MANUAL, label: 'Twenty (ручная)', position: 1, color: 'orange' },
  ],
});
