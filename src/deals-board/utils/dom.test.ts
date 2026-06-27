import { afterEach, describe, expect, it, vi } from 'vitest';

import { getModalPortalContainer, getPortalContainer } from './dom';

describe('getPortalContainer', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('falls back to document.body when anchor lacks getRootNode', () => {
    const body = { tagName: 'BODY' } as unknown as HTMLBodyElement;
    vi.stubGlobal('document', { body });

    const anchor = { parentElement: null };
    expect(getPortalContainer(anchor)).toBe(body);
  });

  it('falls back to document.body for null anchor', () => {
    const body = { tagName: 'BODY' } as unknown as HTMLBodyElement;
    vi.stubGlobal('document', { body });

    expect(getPortalContainer(null)).toBe(body);
  });
});

describe('getModalPortalContainer', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prefers the deals-board root element', () => {
    const body = { tagName: 'BODY' } as unknown as HTMLBodyElement;
    const root = { tagName: 'DIV' } as unknown as HTMLDivElement;
    vi.stubGlobal('document', {
      body,
      getElementById: (id: string) => (id === 'deals-board-root' ? root : null),
    });

    expect(getModalPortalContainer()).toBe(root);
  });
});
