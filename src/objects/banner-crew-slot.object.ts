import { defineObject, FieldType } from 'twenty-sdk/define';
import {
  BANNER_CREW_SLOT_ENDS_AT_FIELD_UNIVERSAL_IDENTIFIER,
  BANNER_CREW_SLOT_LOCATION_FIELD_UNIVERSAL_IDENTIFIER,
  BANNER_CREW_SLOT_OBJECT_UNIVERSAL_IDENTIFIER,
  BANNER_CREW_SLOT_STARTS_AT_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineObject({
  universalIdentifier: BANNER_CREW_SLOT_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'bannerCrewSlot',
  namePlural: 'bannerCrewSlots',
  labelSingular: 'Слот баннерщика',
  labelPlural: 'Слоты баннерщиков',
  icon: 'IconCalendarEvent',
  description: 'Интервалы работы баннерщиков на объекте и на базе',
  fields: [
    {
      universalIdentifier: BANNER_CREW_SLOT_LOCATION_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'location',
      type: FieldType.SELECT,
      label: 'Место',
      icon: 'IconMapPin',
      defaultValue: `'SITE'`,
      options: [
        { value: 'SITE', label: 'На объекте', position: 0, color: 'green' },
        { value: 'BASE', label: 'На базе', position: 1, color: 'gray' },
      ],
    },
    {
      universalIdentifier: BANNER_CREW_SLOT_STARTS_AT_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'startsAt',
      type: FieldType.DATE_TIME,
      label: 'Начало',
      icon: 'IconCalendar',
      isNullable: true,
    },
    {
      universalIdentifier: BANNER_CREW_SLOT_ENDS_AT_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'endsAt',
      type: FieldType.DATE_TIME,
      label: 'Конец',
      icon: 'IconCalendar',
      isNullable: true,
    },
  ],
});
