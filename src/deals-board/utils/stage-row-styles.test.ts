import { describe, expect, it } from 'vitest';

import { getStageRowStyles } from './stage-row-styles';

describe('getStageRowStyles', () => {
  it('returns palette-based background and accent for a known stage', () => {
    const styles = getStageRowStyles('GOTOVO', 'dark');

    expect(styles.backgroundColor).toContain('rgba');
    expect(styles.accentColor).toBe('#86efac');
    expect(styles.boxShadow).toContain('#86efac');
  });

  it('falls back to NOVYY when stage is missing', () => {
    const styles = getStageRowStyles(undefined, 'light');

    expect(styles.accentColor).toBe('#2563eb');
  });
});
