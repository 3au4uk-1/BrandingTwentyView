import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  collectImageFiles,
  isImageFile,
  mergePrevyuFileList,
  mergePrevyuFiles,
  movePrevyuFileToFront,
  removePrevyuFile,
  resolvePrevyuFileUrls,
  toPrevyuFileRef,
  uploadPrevyuFilesViaLogicFunction,
} from './files-field';

describe('mergePrevyuFiles / removePrevyuFile', () => {
  it('appends and caps at 6', () => {
    const base = Array.from({ length: 5 }, (_, i) => ({ fileId: `f${i}` }));
    const merged = mergePrevyuFiles(base, { fileId: 'f5' });
    expect(merged).toHaveLength(6);
    expect(mergePrevyuFiles(merged, { fileId: 'f6' })).toHaveLength(6);
  });

  it('merges a list and fills missing labels', () => {
    expect(
      mergePrevyuFileList([{ fileId: 'a' }], [{ fileId: 'b' }, { fileId: 'c' }]),
    ).toEqual([
      { fileId: 'a', label: 'a' },
      { fileId: 'b', label: 'b' },
      { fileId: 'c', label: 'c' },
    ]);
  });

  it('strips GET-only fields (extension/url) before PATCH shape', () => {
    expect(
      mergePrevyuFileList(
        [
          {
            fileId: 'a',
            label: 'a.png',
            extension: '.png',
            url: 'https://cdn/a',
          } as { fileId: string; label: string },
        ],
        [{ fileId: 'b', label: 'b.png' }],
      ),
    ).toEqual([
      { fileId: 'a', label: 'a.png' },
      { fileId: 'b', label: 'b.png' },
    ]);
  });

  it('removes by fileId', () => {
    expect(removePrevyuFile([{ fileId: 'a' }, { fileId: 'b' }], 'a')).toEqual([
      { fileId: 'b', label: 'b' },
    ]);
  });
});

describe('movePrevyuFileToFront', () => {
  it('moves matching file to index 0 and keeps others', () => {
    expect(
      movePrevyuFileToFront(
        [{ fileId: 'a' }, { fileId: 'b' }, { fileId: 'c' }],
        'b',
      ),
    ).toEqual([
      { fileId: 'b', label: 'b' },
      { fileId: 'a', label: 'a' },
      { fileId: 'c', label: 'c' },
    ]);
  });

  it('returns same order when fileId missing or already first', () => {
    const files = [{ fileId: 'a' }, { fileId: 'b' }];
    const normalized = [
      { fileId: 'a', label: 'a' },
      { fileId: 'b', label: 'b' },
    ];
    expect(movePrevyuFileToFront(files, 'a')).toEqual(normalized);
    expect(movePrevyuFileToFront(files, 'z')).toEqual(normalized);
    expect(movePrevyuFileToFront(null, 'a')).toEqual([]);
  });
});

describe('resolvePrevyuFileUrls', () => {
  it('uses http labels as urls', () => {
    expect(
      resolvePrevyuFileUrls([
        { fileId: 'x', label: 'https://disk.example/a.jpg' },
        { fileId: 'y', label: 'not-a-url' },
      ]),
    ).toEqual(['https://disk.example/a.jpg', expect.stringContaining('y')]);
  });

  it('returns empty for missing files', () => {
    expect(resolvePrevyuFileUrls(null)).toEqual([]);
    expect(resolvePrevyuFileUrls([])).toEqual([]);
  });
});

describe('image file helpers', () => {
  it('detects image mime and extension', () => {
    expect(isImageFile(new File([], 'a.png', { type: 'image/png' }))).toBe(true);
    expect(isImageFile(new File([], 'a.txt', { type: 'text/plain' }))).toBe(false);
    expect(isImageFile(new File([], 'shot.JPG', { type: '' }))).toBe(true);
  });

  it('treats unnamed binary blobs as images (clipboard)', () => {
    expect(isImageFile(new File([new Uint8Array([1, 2, 3])], '', { type: '' }))).toBe(true);
  });

  it('filters file lists', () => {
    const files = collectImageFiles([
      new File([], 'a.png', { type: 'image/png' }),
      new File([], 'b.txt', { type: 'text/plain' }),
    ]);
    expect(files).toHaveLength(1);
    expect(files[0]?.name).toBe('a.png');
  });

  it('reads blob bytes without arrayBuffer()', async () => {
    const { readBlobAsArrayBuffer } = await import('./files-field');
    const blob = new Blob([new Uint8Array([9, 8, 7])], { type: 'image/png' });
    Object.defineProperty(blob, 'arrayBuffer', { value: undefined });
    const buffer = await readBlobAsArrayBuffer(blob);
    expect(new Uint8Array(buffer)).toEqual(new Uint8Array([9, 8, 7]));
  });

  it('stores upload url as label when present', () => {
    expect(
      toPrevyuFileRef({ fileId: 'id-1', url: 'https://cdn/x.png' }, 'fallback.png'),
    ).toEqual({ fileId: 'id-1', label: 'https://cdn/x.png' });
  });
});

describe('uploadPrevyuFilesViaLogicFunction', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('POSTs base64 to prevyu-upload LF and returns files', async () => {
    globalThis.process = {
      env: {
        TWENTY_FUNCTIONS_URL: 'https://twenty.test/functions',
        TWENTY_APP_ACCESS_TOKEN: 'app-token',
      },
    } as NodeJS.Process;

    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, files: [{ fileId: 'f1', label: 'a.png' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const files = await uploadPrevyuFilesViaLogicFunction(
      'li-1',
      new File([new Uint8Array([1, 2, 3])], 'a.png', { type: 'image/png' }),
    );
    expect(files).toEqual([{ fileId: 'f1', label: 'a.png' }]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/prevyu-upload\/li-1$/),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
