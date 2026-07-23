import { describe, expect, it } from 'vitest';

import { getPrintProgressState, shouldRenderPrintProgress } from './PrintProgressCell';

describe('getPrintProgressState', () => {
  it('derives the active state of each print step', () => {
    expect(getPrintProgressState(true, false)).toEqual({ vzato: true, gotovo: false });
    expect(getPrintProgressState(false, true)).toEqual({ vzato: false, gotovo: true });
  });
});

describe('shouldRenderPrintProgress', () => {
  it('renders the taken field when both print fields are visible', () => {
    expect(
      shouldRenderPrintProgress('vzatoVRabotu', ['vzatoVRabotu', 'gotovo']),
    ).toBe(true);
  });

  it('hides the done field when the taken field is also visible', () => {
    expect(shouldRenderPrintProgress('gotovo', ['vzatoVRabotu', 'gotovo'])).toBe(false);
  });

  it.each(['vzatoVRabotu', 'gotovo'] as const)(
    'renders %s when it is the only visible print field',
    (field) => {
      expect(shouldRenderPrintProgress(field, [field])).toBe(true);
    },
  );
});
