import type { CSSProperties } from 'react';

/** Cell editors must portal into the board host; `body` + `fixed` escapes onto Twenty chrome. */
export const BANNER_CREW_MODAL_PORTAL_TARGET = 'root' as const;

export const loadDatePickerSlotStyle: CSSProperties = {
  flex: '0 0 auto',
  width: 'max-content',
};

export const bannerCrewChipTriggerStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  padding: 0,
  cursor: 'pointer',
  flexShrink: 0,
  minWidth: 'max-content',
  display: 'inline-flex',
};

export const parentCellOverflow = (field: string): 'visible' | 'hidden' =>
  field === 'loadDate' ? 'visible' : 'hidden';
