export const PRINT_FIELD_GROUP_ID = '6c0f96ca-7419-4400-8fa0-50461ac62550';

export const PRINT_FIELD_GROUP_MEMBER_FIELDS = [
  'ssylkaNaMakety',
  'dataGotovnostiPechati',
  'vremyaGotovnostiPechati',
  'kommentariyDlyaPechati',
  'plenka',
  'vzatoVRabotu',
  'gotovo',
] as const;

export type PrintFieldGroupMemberField = (typeof PRINT_FIELD_GROUP_MEMBER_FIELDS)[number];

const PRINT_FIELD_GROUP_MEMBER_FIELD_SET = new Set<string>(PRINT_FIELD_GROUP_MEMBER_FIELDS);

export const isPrintFieldGroupMember = (field: string): field is PrintFieldGroupMemberField =>
  PRINT_FIELD_GROUP_MEMBER_FIELD_SET.has(field);
