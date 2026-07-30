import { describe, expect, it, vi, afterEach } from 'vitest';

import {
  buildDataUrl,
  buildDownloadSrcDoc,
  downloadBlobRemoteDomSafe,
  revokePendingDownload,
} from './download-blob';

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

describe('buildDownloadSrcDoc', () => {
  it('embeds data url and filename for main-thread click', async () => {
    const dataUrl = await buildDataUrl(
      new Blob([new Uint8Array([1, 2, 3])], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    );
    const html = buildDownloadSrcDoc(dataUrl, 'okleyka-salary-2026-07-30.xlsx');
    expect(html).toContain('data:application/vnd.openxmlformats');
    expect(html).toContain('okleyka-salary-2026-07-30.xlsx');
    expect(html).toContain('a.click()');
    expect(html).toContain('okleyka-download-done');
  });
});
