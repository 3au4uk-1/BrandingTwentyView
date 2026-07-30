import { describe, expect, it } from 'vitest';

import { buildPrevyuUploadHtml } from './prevyu-upload-html';

describe('buildPrevyuUploadHtml', () => {
  it('embeds line item id, post URL, token and paste instructions', () => {
    const html = buildPrevyuUploadHtml({
      lineItemId: 'li-1',
      lineItemName: 'Фотобудка',
      files: [],
      postUrl: 'https://t.test/s/prevyu-upload/li-1',
      accessToken: 'tok-abc',
    });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('li-1');
    expect(html).toContain('Ctrl+V');
    expect(html).toContain('Фотобудка');
    expect(html).toContain('prevyu-upload');
    expect(html).toContain('https://t.test/s/prevyu-upload/li-1');
    expect(html).toContain('tok-abc');
    expect(html).toContain('Authorization');
    expect(html).toContain('pasteCatch');
    expect(html).toContain('contenteditable');
    expect(html).toContain('uploadMode');
  });

  it('uses parent upload mode for board modal', () => {
    const html = buildPrevyuUploadHtml({
      lineItemId: 'li-1',
      lineItemName: 'X',
      files: [],
      postUrl: 'https://t.test/s/prevyu-upload/li-1',
      accessToken: 'tok',
      uploadMode: 'parent',
    });
    expect(html).toContain('"parent"');
    expect(html).toContain('prevyu-upload-request');
  });
});
