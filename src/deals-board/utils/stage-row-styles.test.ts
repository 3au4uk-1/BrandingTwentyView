import { describe, expect, it } from 'vitest';

import { getStageRowStyles } from './stage-row-styles';

describe('getStageRowStyles', () => {
  it('returns saturated wash + accent for a known stage', () => {
    const styles = getStageRowStyles('GOTOVO', 'dark');

    expect(styles.backgroundColor).toContain('rgba');
    expect(styles.accentColor).toBe('#30d158');
    expect(styles.boxShadow).toContain('#30d158');
  });

  it('uses purple wash for V_RABOTE', () => {
    const styles = getStageRowStyles('V_RABOTE', 'dark', 'child');
    expect(styles.backgroundColor).toContain('rgba');
    expect(styles.accentColor).toBe('#bf5af2');
  });

  it('keeps NOVYY without wash', () => {
    const styles = getStageRowStyles(undefined, 'dark');

    expect(styles.backgroundColor).toBeUndefined();
    expect(styles.boxShadow).toBeUndefined();
  });
});
