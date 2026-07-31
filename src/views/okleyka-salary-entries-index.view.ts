import { defineView, ViewKey } from 'twenty-sdk/define';
import {
  OKLEYKA_SALARY_ENTRIES_INDEX_VIEW_UNIVERSAL_IDENTIFIER,
  OKLEYKA_SALARY_ENTRY_HOURS_FIELD_UNIVERSAL_IDENTIFIER,
  OKLEYKA_SALARY_ENTRY_OBJECT_UNIVERSAL_IDENTIFIER,
  OKLEYKA_SALARY_ENTRY_PERIOD_END_FIELD_UNIVERSAL_IDENTIFIER,
  OKLEYKA_SALARY_ENTRY_PERIOD_START_FIELD_UNIVERSAL_IDENTIFIER,
  OKLEYKA_SALARY_ENTRY_RATE_RUB_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: OKLEYKA_SALARY_ENTRIES_INDEX_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'Все записи ЗП',
  objectUniversalIdentifier: OKLEYKA_SALARY_ENTRY_OBJECT_UNIVERSAL_IDENTIFIER,
  icon: 'IconList',
  key: ViewKey.INDEX,
  position: 0,
  fields: [
    {
      universalIdentifier: 'b73e66b5-5e47-4a82-9830-f576a921afee',
      fieldMetadataUniversalIdentifier: OKLEYKA_SALARY_ENTRY_HOURS_FIELD_UNIVERSAL_IDENTIFIER,
      position: 0,
      isVisible: true,
      size: 100,
    },
    {
      universalIdentifier: 'a6d3085d-c9bb-43ad-93ee-cafd2e5ef40f',
      fieldMetadataUniversalIdentifier: OKLEYKA_SALARY_ENTRY_RATE_RUB_FIELD_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
      size: 120,
    },
    {
      universalIdentifier: 'c33b720c-0516-49ec-9cab-974603541c7e',
      fieldMetadataUniversalIdentifier: OKLEYKA_SALARY_ENTRY_PERIOD_START_FIELD_UNIVERSAL_IDENTIFIER,
      position: 2,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: '148edbe1-c637-4477-9376-ebebb4082975',
      fieldMetadataUniversalIdentifier: OKLEYKA_SALARY_ENTRY_PERIOD_END_FIELD_UNIVERSAL_IDENTIFIER,
      position: 3,
      isVisible: true,
      size: 140,
    },
  ],
});
