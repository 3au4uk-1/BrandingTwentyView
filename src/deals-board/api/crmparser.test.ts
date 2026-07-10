import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { buildListStatusUrl, getCrmparserConfig, isCrmparserConfigured } from './crmparser';

describe('crmparser client', () => {
  const originalProcess = globalThis.process;

  beforeEach(() => {
    globalThis.process = {
      env: {
        CRMPARSER_API_URL: 'https://parser.test/api',
        CRMPARSER_API_SECRET: 'secret',
      },
    } as NodeJS.Process;
  });

  afterEach(() => {
    globalThis.process = originalProcess;
  });

  it('getCrmparserConfig returns base url and secret', () => {
    expect(getCrmparserConfig()).toEqual({
      baseUrl: 'https://parser.test/api',
      secret: 'secret',
    });
    expect(isCrmparserConfigured()).toBe(true);
  });

  it('buildListStatusUrl', () => {
    expect(buildListStatusUrl('li-123')).toBe(
      'https://parser.test/api/twenty/line-items/li-123/list-status',
    );
  });

  it('returns null config when env missing', () => {
    globalThis.process = { env: {} } as NodeJS.Process;
    expect(getCrmparserConfig()).toBeNull();
    expect(isCrmparserConfigured()).toBe(false);
    expect(buildListStatusUrl('li-123')).toBe('');
  });
});
