import { defineField, FieldType } from 'twenty-sdk/define';
import { DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import { DEAL_LINE_ITEM_OKLEYKA_TELEGRAM_CHAT_ID_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: DEAL_LINE_ITEM_OKLEYKA_TELEGRAM_CHAT_ID_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'okleykaTelegramChatId',
  type: FieldType.TEXT,
  label: 'Chat ID',
  icon: 'IconBrandTelegram',
  description: 'Telegram chat ID, куда было отправлено сообщение',
});
