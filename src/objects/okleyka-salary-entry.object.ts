import { defineObject, FieldType, NumberDataType } from 'twenty-sdk/define';
import {
  OKLEYKA_SALARY_ENTRY_BONUS_RUB_FIELD_UNIVERSAL_IDENTIFIER,
  OKLEYKA_SALARY_ENTRY_HOURS_FIELD_UNIVERSAL_IDENTIFIER,
  OKLEYKA_SALARY_ENTRY_OBJECT_UNIVERSAL_IDENTIFIER,
  OKLEYKA_SALARY_ENTRY_PERIOD_END_FIELD_UNIVERSAL_IDENTIFIER,
  OKLEYKA_SALARY_ENTRY_PERIOD_START_FIELD_UNIVERSAL_IDENTIFIER,
  OKLEYKA_SALARY_ENTRY_RATE_RUB_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

/** Salary record of one installer for one reporting half-month period. */
export default defineObject({
  universalIdentifier: OKLEYKA_SALARY_ENTRY_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'okleykaSalaryEntry',
  namePlural: 'okleykaSalaryEntries',
  labelSingular: 'ЗП оклейщика',
  labelPlural: 'ЗП оклейщиков',
  icon: 'IconUsersGroup',
  description: 'Записи зарплат оклейщиков по отчётным периодам (страница «Оклейщики»)',
  fields: [
    {
      universalIdentifier: OKLEYKA_SALARY_ENTRY_HOURS_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'hours',
      type: FieldType.NUMBER,
      label: 'Часы',
      icon: 'IconClock',
      settings: { dataType: NumberDataType.FLOAT, decimals: 2 },
    },
    {
      universalIdentifier: OKLEYKA_SALARY_ENTRY_RATE_RUB_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'rateRub',
      type: FieldType.NUMBER,
      label: 'Ставка ₽/час',
      icon: 'IconCurrencyRubel',
      settings: { dataType: NumberDataType.FLOAT, decimals: 2 },
    },
    {
      universalIdentifier: OKLEYKA_SALARY_ENTRY_BONUS_RUB_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'bonusRub',
      type: FieldType.NUMBER,
      label: 'Бонус ₽',
      icon: 'IconCoin',
      settings: { dataType: NumberDataType.FLOAT, decimals: 2 },
    },
    {
      universalIdentifier: OKLEYKA_SALARY_ENTRY_PERIOD_START_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'periodStart',
      type: FieldType.DATE,
      label: 'Начало периода',
      icon: 'IconCalendar',
    },
    {
      universalIdentifier: OKLEYKA_SALARY_ENTRY_PERIOD_END_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'periodEnd',
      type: FieldType.DATE,
      label: 'Конец периода',
      icon: 'IconCalendar',
    },
  ],
});
