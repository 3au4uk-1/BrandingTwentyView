import { describe, expect, it, vi, afterEach } from 'vitest';

import { downloadBlobRemoteDomSafe, revokePendingDownload } from './download-blob';

describe('downloadBlobRemoteDomSafe', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('never uses createElement click', () => {
    const createElement = vi.fn(() => {
      throw new Error('createElement should not be used');
    });
    vi.stubGlobal('document', { createElement });
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:mock',
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal('open', () => null);

    const result = downloadBlobRemoteDomSafe(new Blob(['x']), 't.xlsx');
    expect(createElement).not.toHaveBeenCalled();
    expect(result.outcome).toBe('needs-link');
    expect(result.pending?.filename).toBe('t.xlsx');
    revokePendingDownload(result.pending);
  });

  it('returns opened when window.open succeeds', () => {
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:mock',
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal('open', () => ({ closed: false }));
    vi.stubGlobal('setTimeout', (fn: () => void) => {
      fn();
      return 0;
    });

    const result = downloadBlobRemoteDomSafe(new Blob(['x']), 't.xlsx');
    expect(result.outcome).toBe('opened');
  });
});
