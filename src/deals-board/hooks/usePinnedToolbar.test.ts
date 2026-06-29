import { describe, expect, it } from 'vitest';

describe('pinned toolbar pin decision', () => {
  const shouldPin = (rootTop: number, rootBottom: number, toolbarHeight: number, pinTop = 0) =>
    rootTop < pinTop && rootBottom > toolbarHeight + pinTop;

  it('pins when the board root has scrolled above the viewport', () => {
    expect(shouldPin(-12, 900, 88)).toBe(true);
  });

  it('does not pin when the board root is still below the top edge', () => {
    expect(shouldPin(24, 900, 88)).toBe(false);
  });
});
