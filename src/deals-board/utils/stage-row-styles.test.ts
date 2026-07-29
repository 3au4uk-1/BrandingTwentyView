import { describe, expect, it } from 'vitest';

import { getStageRowStyles } from './stage-row-styles';

describe('getStageRowStyles', () => {
  it('uses soft wash + solid left rail for a known stage', () => {
    const styles = getStageRowStyles('GOTOVO', 'dark');

    expect(styles.backgroundColor).toContain('rgba');
    expect(styles.accentColor).toBe('#30d158');
    expect(styles.boxShadow).toBe('inset 4px 0 0 #30d158');
  });

  it('uses purple cue for V_RABOTE', () => {
    const styles = getStageRowStyles('V_RABOTE', 'dark', 'child');
    expect(styles.backgroundColor).toContain('0.1');
    expect(styles.boxShadow).toBe('inset 4px 0 0 #bf5af2');
  });

  it('keeps NOVYY without rail', () => {
    const styles = getStageRowStyles(undefined, 'dark');

    expect(styles.backgroundColor).toBeUndefined();
    expect(styles.boxShadow).toBeUndefined();
  });
});
