import { defineObject, FieldType, NumberDataType } from 'twenty-sdk/define';
import {
  OKLEYKA_DEAL_SHARE_AMOUNT_RUB_FIELD_UNIVERSAL_IDENTIFIER,
  OKLEYKA_DEAL_SHARE_OBJECT_UNIVERSAL_IDENTIFIER,
  OKLEYKA_DEAL_SHARE_OPPORTUNITY_ID_FIELD_UNIVERSAL_IDENTIFIER,
  OKLEYKA_DEAL_SHARE_SALARY_ENTRY_ID_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

/** Per-person share of okleyka cost on a deal (persisted for the Оклейщики page). */
export default defineObject({
  universalIdentifier: OKLEYKA_DEAL_SHARE_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'okleykaDealShare',
  namePlural: 'okleykaDealShares',
  labelSingular: 'Доля оклейки',
  labelPlural: 'Доли оклейки',
  icon: 'IconCoin',
  description: 'Доля ЗП оклейщика на сделке (страница «Оклейщики»)',
  fields: [
    {
      universalIdentifier: OKLEYKA_DEAL_SHARE_OPPORTUNITY_ID_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'opportunityId',
      type: FieldType.TEXT,
      label: 'ID сделки',
      icon: 'IconBriefcase',
    },
    {
      universalIdentifier: OKLEYKA_DEAL_SHARE_SALARY_ENTRY_ID_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'salaryEntryId',
      type: FieldType.TEXT,
      label: 'ID записи ЗП',
      icon: 'IconUser',
    },
    {
      universalIdentifier: OKLEYKA_DEAL_SHARE_AMOUNT_RUB_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'amountRub',
      type: FieldType.NUMBER,
      label: 'Доля ₽',
      icon: 'IconCurrencyRubel',
      settings: { dataType: NumberDataType.FLOAT, decimals: 2 },
    },
  ],
});
