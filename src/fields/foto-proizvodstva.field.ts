import { defineField, FieldType } from 'twenty-sdk/define';
import { DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import { DEAL_LINE_ITEM_FOTO_PROIZVODSTVA_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: DEAL_LINE_ITEM_FOTO_PROIZVODSTVA_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'fotoProizvodstva',
  type: FieldType.FILES,
  label: 'Фото для производства',
  icon: 'IconPhoto',
  description: 'Фото к задаче производства',
  universalSettings: {
    maxNumberOfValues: 6,
  },
});
