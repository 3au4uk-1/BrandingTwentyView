import { describe, expect, it } from 'vitest';

import {
  collectImageFiles,
  isImageFile,
  mergePrevyuFileList,
  mergePrevyuFiles,
  movePrevyuFileToFront,
  removePrevyuFile,
  resolvePrevyuFileUrls,
  toPrevyuFileRef,
} from './files-field';

describe('mergePrevyuFiles / removePrevyuFile', () => {
  it('appends and caps at 6', () => {
    const base = Array.from({ length: 5 }, (_, i) => ({ fileId: `f${i}` }));
    const merged = mergePrevyuFiles(base, { fileId: 'f5' });
    expect(merged).toHaveLength(6);
    expect(mergePrevyuFiles(merged, { fileId: 'f6' })).toHaveLength(6);
  });

  it('merges a list', () => {
    expect(
      mergePrevyuFileList([{ fileId: 'a' }], [{ fileId: 'b' }, { fileId: 'c' }]),
    ).toEqual([{ fileId: 'a' }, { fileId: 'b' }, { fileId: 'c' }]);
  });

  it('removes by fileId', () => {
    expect(removePrevyuFile([{ fileId: 'a' }, { fileId: 'b' }], 'a')).toEqual([
      { fileId: 'b' },
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
    ).toEqual([{ fileId: 'b' }, { fileId: 'a' }, { fileId: 'c' }]);
  });

  it('returns same order when fileId missing or already first', () => {
    const files = [{ fileId: 'a' }, { fileId: 'b' }];
    expect(movePrevyuFileToFront(files, 'a')).toEqual(files);
    expect(movePrevyuFileToFront(files, 'z')).toEqual(files);
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
