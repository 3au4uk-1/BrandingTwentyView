export const FREZA_FIELD_GROUP_ID = 'a2950996-c3d7-4df5-a43b-0ce90f945ff4';

/** Operator-facing freza queue fields (sheet push wired on twentyserver). */
export const FREZA_FIELD_GROUP_MEMBER_FIELDS = [
  'dataGotovnostiFrezy',
  'vremyaGotovnostiFrezy',
  'kommentariyDlyaFrezy',
  'vzatoVRabotuFrezy',
  'gotovoFrezy',
] as const;

export type FrezaFieldGroupMemberField = (typeof FREZA_FIELD_GROUP_MEMBER_FIELDS)[number];

const FREZA_FIELD_GROUP_MEMBER_FIELD_SET = new Set<string>(FREZA_FIELD_GROUP_MEMBER_FIELDS);

export const isFrezaFieldGroupMember = (field: string): field is FrezaFieldGroupMemberField =>
  FREZA_FIELD_GROUP_MEMBER_FIELD_SET.has(field);
