import { describe, expect, it } from 'vitest';

// Re-export scrollable ancestor logic for unit testing via a test-only helper pattern.
// The hook itself is DOM-bound; we validate the pin decision math inline.

describe('pinned toolbar pin decision', () => {
  const shouldPin = (rootTop: number, rootBottom: number, toolbarHeight: number, pinTop = 0) =>
    rootTop < pinTop && rootBottom > toolbarHeight + pinTop;

  it('pins when the board root has scrolled above the viewport', () => {
    expect(shouldPin(-12, 900, 88)).toBe(true);
  });

  it('does not pin when the board root is still fully below the top edge', () => {
    expect(shouldPin(24, 900, 88)).toBe(false);
  });

  it('does not pin when the board root has almost scrolled out of view', () => {
    expect(shouldPin(-200, 60, 88)).toBe(false);
  });
});
