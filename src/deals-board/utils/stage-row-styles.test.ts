import { describe, expect, it } from 'vitest';

import { getStageRowStyles } from './stage-row-styles';

describe('getStageRowStyles', () => {
  it('returns soft wash + accent bar for a known stage', () => {
    const styles = getStageRowStyles('GOTOVO', 'dark');

    expect(styles.backgroundColor).toContain('rgba');
    expect(styles.accentColor).toBe('#30d158');
    expect(styles.boxShadow).toContain('#30d158');
  });

  it('falls back to NOVYY when stage is missing', () => {
    const styles = getStageRowStyles(undefined, 'light');

    expect(styles.accentColor).toBe('#3a3a3c');
    expect(styles.backgroundColor).toContain('rgba');
  });
});
