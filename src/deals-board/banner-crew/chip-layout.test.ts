import { describe, expect, it } from 'vitest';

import {
  BANNER_CREW_MODAL_PORTAL_TARGET,
  bannerCrewChipTriggerStyle,
  loadDatePickerSlotStyle,
  parentCellOverflow,
} from './chip-layout';

describe('banner crew chip layout', () => {
  it('opens the assignment modal in the board portal host, not document.body', () => {
    expect(BANNER_CREW_MODAL_PORTAL_TARGET).toBe('root');
  });

  it('does not shrink the chip or date trigger inside the loadDate cell', () => {
    expect(bannerCrewChipTriggerStyle.flexShrink).toBe(0);
    expect(bannerCrewChipTriggerStyle.minWidth).toBe('max-content');
    expect(loadDatePickerSlotStyle.flex).toBe('0 0 auto');
    expect(loadDatePickerSlotStyle.width).toBe('max-content');
  });

  it('lets the loadDate cell paint the full chip instead of clipping it', () => {
    expect(parentCellOverflow('loadDate')).toBe('visible');
    expect(parentCellOverflow('name')).toBe('hidden');
  });
});
