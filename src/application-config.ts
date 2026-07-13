import { defineApplication } from 'twenty-sdk/define';

import {
  APP_DESCRIPTION,
  APP_DISPLAY_NAME,
  APPLICATION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: APP_DISPLAY_NAME,
  description: APP_DESCRIPTION,
  serverVariables: {
    CRMPARSER_API_URL: {
      description:
        'Публичный URL парсера с суффиксом /api, например https://parser.example.com/api',
      isSecret: false,
      isRequired: false,
    },
    CRMPARSER_API_INTERNAL_URL: {
      description:
        'Внутренний URL парсера в Docker-сети Twenty (например http://crmparser:3000/api). Используется первым.',
      isSecret: false,
      isRequired: false,
    },
    CRMPARSER_API_SECRET: {
      description: 'Bearer-секрет для /api/twenty/* (значение TWENTY_APP_API_SECRET на парсере)',
      isSecret: true,
      isRequired: true,
    },
  },
});
