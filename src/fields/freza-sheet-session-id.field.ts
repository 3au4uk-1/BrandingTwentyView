import { defineField, FieldType } from 'twenty-sdk/define';
import { DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import { DEAL_LINE_ITEM_FREZA_SHEET_SESSION_ID_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

/** Technical — set by freza sheet cycle on twentyserver. */
export default defineField({
  universalIdentifier: DEAL_LINE_ITEM_FREZA_SHEET_SESSION_ID_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'frezaSheetSessionId',
  type: FieldType.TEXT,
  label: 'Freza sheet session',
  icon: 'IconKey',
});
