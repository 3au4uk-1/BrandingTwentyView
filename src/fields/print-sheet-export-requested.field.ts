import { defineField, FieldType } from 'twenty-sdk/define';
import { DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import { DEAL_LINE_ITEM_PRINT_SHEET_EXPORT_REQUESTED_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

/** Operator requested Google print-sheet export; cleared on claim by crmparser. */
export default defineField({
  universalIdentifier: DEAL_LINE_ITEM_PRINT_SHEET_EXPORT_REQUESTED_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'printSheetExportRequested',
  type: FieldType.BOOLEAN,
  label: 'Запрос в таблицу печати',
  icon: 'IconSend',
  description: 'Internal: set by «Отправить в печать»; crmparser claim clears it',
});
