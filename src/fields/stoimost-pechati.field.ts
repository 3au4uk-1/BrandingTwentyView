import { defineField, FieldType } from 'twenty-sdk/define';
import { DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import { DEAL_LINE_ITEM_STOIMOST_PECHATI_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

/** Nullable until print-sheet cost sync (specialist). */
export default defineField({
  universalIdentifier: DEAL_LINE_ITEM_STOIMOST_PECHATI_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'stoimostPechati',
  type: FieldType.CURRENCY,
  label: 'Стоимость печати',
  icon: 'IconCurrencyRubel',
  description: 'Расход печати на позицию (из Sheets, когда подключено)',
});
