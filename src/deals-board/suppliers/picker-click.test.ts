import { describe, expect, it } from 'vitest';

import { createPickerClickGate, scheduleDismissCommit } from './picker-click';

describe('picker click gate', () => {
  it('skips dismiss commit when an option is chosen in the same turn', async () => {
    const gate = createPickerClickGate();
    const commits: string[] = [];

    scheduleDismissCommit(gate, () => {
      commits.push('dismiss');
    });
    gate.noteOptionChosen();
    commits.push('option');

    await Promise.resolve();

    expect(commits).toEqual(['option']);
  });

  it('applies dismiss commit when no option was chosen', async () => {
    const gate = createPickerClickGate();
    const commits: string[] = [];

    scheduleDismissCommit(gate, () => {
      commits.push('dismiss');
    });

    await Promise.resolve();

    expect(commits).toEqual(['dismiss']);
  });
});
