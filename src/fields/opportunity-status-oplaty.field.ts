import { defineField, FieldType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';
import { OPPORTUNITY_STATUS_OPLATY_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: OPPORTUNITY_STATUS_OPLATY_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  name: 'statusOplaty',
  type: FieldType.SELECT,
  label: 'Статус оплаты',
  icon: 'IconCash',
  options: [
    { value: 'NE_OPLACHENO', label: 'Не оплачено', position: 0, color: 'red' },
    { value: 'PREDOPLATA', label: 'Предоплата', position: 1, color: 'orange' },
    {
      value: 'OPLACHENO_POLNOSTYU',
      label: 'Оплачено полностью',
      position: 2,
      color: 'green',
    },
    { value: 'VOZVRAT', label: 'Возврат', position: 3, color: 'gray' },
  ],
});
