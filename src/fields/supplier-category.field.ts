import { defineField, FieldType } from 'twenty-sdk/define';
import { SUPPLIER_CATEGORY_OPTIONS } from 'src/constants/supplier-category';
import { SUPPLIER_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { SUPPLIER_CATEGORY_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: SUPPLIER_CATEGORY_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: SUPPLIER_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'category',
  type: FieldType.SELECT,
  label: 'Категория',
  icon: 'IconTag',
  options: SUPPLIER_CATEGORY_OPTIONS.map((option, position) => ({
    value: option.value,
    label: option.label,
    position,
    color: option.color,
  })),
});
