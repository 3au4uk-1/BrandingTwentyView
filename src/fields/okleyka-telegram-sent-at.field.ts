import { defineField, FieldType } from 'twenty-sdk/define';
import { DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import { DEAL_LINE_ITEM_OKLEYKA_TELEGRAM_SENT_AT_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: DEAL_LINE_ITEM_OKLEYKA_TELEGRAM_SENT_AT_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'okleykaTelegramSentAt',
  type: FieldType.DATE_TIME,
  label: 'Отправлено в Telegram',
  icon: 'IconSend',
  description: 'Когда сообщение для оклейки было отправлено в Telegram',
});
