import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolvePortalContainer } from '../ui/PortalHostContext';
import { getPortalContainer, isMeasurableElement } from './dom';

describe('isMeasurableElement', () => {
  it('accepts elements with getBoundingClientRect', () => {
    expect(isMeasurableElement({ getBoundingClientRect: () => ({}) })).toBe(true);
  });

  it('rejects proxies without measurable DOM methods', () => {
    expect(isMeasurableElement({})).toBe(false);
  });
});

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

describe('resolvePortalContainer', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the portal host ref for root targets', () => {
    const host = { tagName: 'DIV' } as unknown as HTMLDivElement;
    const hostRef = { current: host };

    expect(resolvePortalContainer('root', hostRef)).toBe(host);
  });

  it('falls back to null when root host ref is empty', () => {
    expect(resolvePortalContainer('root', { current: null })).toBeNull();
  });

  it('uses document.body for body targets when available', () => {
    const body = { tagName: 'BODY' } as unknown as HTMLBodyElement;
    vi.stubGlobal('document', { body });

    expect(resolvePortalContainer('body', null)).toBe(body);
  });
});
