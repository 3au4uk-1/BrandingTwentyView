import { defineField, FieldType } from 'twenty-sdk/define';
import { DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import { DEAL_LINE_ITEM_SSYLKA_NA_MAKETY_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: DEAL_LINE_ITEM_SSYLKA_NA_MAKETY_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'ssylkaNaMakety',
  type: FieldType.LINKS,
  label: 'Ссылка на макеты',
  icon: 'IconLink',
});
