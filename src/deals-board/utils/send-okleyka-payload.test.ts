import { describe, expect, it } from 'vitest';

import { buildClipboardText } from './send-okleyka-payload';

describe('buildClipboardText', () => {
  it('returns text only when no file urls', () => {
    expect(
      buildClipboardText({
        text: 'Заказ: x\nБронь: 1',
        fileUrls: [],
      }),
    ).toBe('Заказ: x\nБронь: 1');
  });

  it('appends photo urls', () => {
    expect(
      buildClipboardText({
        text: 'Заказ: x',
        fileUrls: ['https://a/1.jpg', 'https://a/2.jpg'],
      }),
    ).toBe('Заказ: x\n\nФото:\nhttps://a/1.jpg\nhttps://a/2.jpg');
  });
});
