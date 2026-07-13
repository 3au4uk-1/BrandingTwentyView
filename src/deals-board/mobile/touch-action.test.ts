import { describe, expect, it, vi } from 'vitest';

import { createTapHandler } from './touch-action';

describe('createTapHandler', () => {
  it('runs the action on pointer up', () => {
    const action = vi.fn();
    const handler = createTapHandler(action);

    handler({
      pointerType: 'touch',
      button: 0,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as never);

    expect(action).toHaveBeenCalledTimes(1);
  });

  it('ignores non-primary mouse buttons', () => {
    const action = vi.fn();
    const handler = createTapHandler(action);

    handler({
      pointerType: 'mouse',
      button: 1,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as never);

    expect(action).not.toHaveBeenCalled();
  });
});
