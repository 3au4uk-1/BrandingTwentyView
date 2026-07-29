import { defineField, FieldType } from 'twenty-sdk/define';
import { DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import { DEAL_LINE_ITEM_PRODUCT_STREAM_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { PRODUCT_STREAM } from 'src/constants/product-stream';

export default defineField({
  universalIdentifier: DEAL_LINE_ITEM_PRODUCT_STREAM_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'productStream',
  type: FieldType.SELECT,
  label: 'Поток',
  icon: 'IconCategory',
  options: [
    { value: PRODUCT_STREAM.BRANDING, label: 'Брендинг', position: 0, color: 'blue' },
    { value: PRODUCT_STREAM.DECOR, label: 'Декор', position: 1, color: 'purple' },
    { value: PRODUCT_STREAM.MK, label: 'МК', position: 2, color: 'orange' },
  ],
});
