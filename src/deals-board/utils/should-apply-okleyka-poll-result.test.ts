import { describe, expect, it } from 'vitest';

import { shouldApplyOkleykaPollResult } from './should-apply-okleyka-poll-result';

describe('shouldApplyOkleykaPollResult', () => {
  it('applies when generation and line item still match the send', () => {
    expect(
      shouldApplyOkleykaPollResult({
        sendGeneration: 3,
        currentGeneration: 3,
        sendLineItemId: 'li-1',
        currentLineItemId: 'li-1',
      }),
    ).toBe(true);
  });

  it('ignores a stale poll after dismiss bumps generation', () => {
    expect(
      shouldApplyOkleykaPollResult({
        sendGeneration: 3,
        currentGeneration: 4,
        sendLineItemId: 'li-1',
        currentLineItemId: null,
      }),
    ).toBe(false);
  });

  it('ignores a stale poll after another item is opened', () => {
    expect(
      shouldApplyOkleykaPollResult({
        sendGeneration: 3,
        currentGeneration: 4,
        sendLineItemId: 'li-1',
        currentLineItemId: 'li-2',
      }),
    ).toBe(false);
  });

  it('ignores a stale POST after send A, dismiss, then open B', () => {
    expect(
      shouldApplyOkleykaPollResult({
        sendGeneration: 1,
        currentGeneration: 3,
        sendLineItemId: 'li-a',
        currentLineItemId: 'li-b',
      }),
    ).toBe(false);
  });

  it('ignores when line item changed even if generation matches', () => {
    expect(
      shouldApplyOkleykaPollResult({
        sendGeneration: 3,
        currentGeneration: 3,
        sendLineItemId: 'li-1',
        currentLineItemId: 'li-2',
      }),
    ).toBe(false);
  });
});
