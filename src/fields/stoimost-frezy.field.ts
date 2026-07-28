import { defineField, FieldType } from 'twenty-sdk/define';
import { DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import { DEAL_LINE_ITEM_STOIMOST_FREZY_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

/** Nullable until freza-sheet cost sync (specialist). */
export default defineField({
  universalIdentifier: DEAL_LINE_ITEM_STOIMOST_FREZY_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'stoimostFrezy',
  type: FieldType.CURRENCY,
  label: 'Стоимость фрезы',
  icon: 'IconCurrencyRubel',
  description: 'Расход фрезы на позицию (из Sheets, когда подключено)',
});
