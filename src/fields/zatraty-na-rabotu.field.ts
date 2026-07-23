import { defineField, FieldType } from 'twenty-sdk/define';
import { DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import { DEAL_LINE_ITEM_ZATRATY_NA_RABOTU_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { LABOR_WORK } from 'src/constants/labor-work';

export default defineField({
  universalIdentifier: DEAL_LINE_ITEM_ZATRATY_NA_RABOTU_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'zatratyNaRabotu',
  type: FieldType.SELECT,
  label: 'Затраты на работу',
  icon: 'IconUserDollar',
  options: [
    { value: LABOR_WORK.OKLEYKA, label: 'Оклейка', position: 0, color: 'blue' },
    {
      value: LABOR_WORK.PODRYADNAYA_OKLEYKA,
      label: 'Подрядная оклейка',
      position: 1,
      color: 'purple',
    },
  ],
});
