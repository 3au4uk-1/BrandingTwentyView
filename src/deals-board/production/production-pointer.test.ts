import { describe, expect, it } from 'vitest';

import { isProductionInteractiveTarget, readProductionColumnId, type PointerNode } from './production-pointer';

const node = (partial: PointerNode): PointerNode => partial;

describe('production pointer targets', () => {
  it('finds a column without calling closest', () => {
    const column = node({
      tagName: 'SECTION',
      getAttribute: (name) => (name === 'data-production-column' ? 'v-rabote' : null),
    });
    const card = node({ tagName: 'ARTICLE', parentElement: column });
    const text = node({ nodeType: 3, parentElement: card });

    expect(readProductionColumnId(text)).toBe('v-rabote');
    expect(isProductionInteractiveTarget(text)).toBe(false);
  });

  it('treats a button inside the card as interactive', () => {
    const button = node({ tagName: 'BUTTON' });
    const label = node({ nodeType: 3, parentElement: button });

    expect(isProductionInteractiveTarget(label)).toBe(true);
    expect(readProductionColumnId(button)).toBeNull();
  });
});
