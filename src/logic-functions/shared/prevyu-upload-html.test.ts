import { describe, expect, it } from 'vitest';

import { buildPrevyuUploadHtml } from './prevyu-upload-html';

describe('buildPrevyuUploadHtml', () => {
  it('embeds line item id and paste instructions', () => {
    const html = buildPrevyuUploadHtml({
      lineItemId: 'li-1',
      lineItemName: 'Фотобудка',
      files: [],
    });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('li-1');
    expect(html).toContain('Ctrl+V');
    expect(html).toContain('Фотобудка');
    expect(html).toContain('prevyu-upload');
  });
});
