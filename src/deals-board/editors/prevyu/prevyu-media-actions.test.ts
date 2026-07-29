import { describe, expect, it } from 'vitest';

import {
  isPrevyuRemoteDomUploadError,
  remainingPrevyuSlots,
} from './prevyu-media-actions';

describe('remainingPrevyuSlots', () => {
  it('caps at 6', () => {
    expect(remainingPrevyuSlots(0)).toBe(6);
    expect(remainingPrevyuSlots(4)).toBe(2);
    expect(remainingPrevyuSlots(6)).toBe(0);
    expect(remainingPrevyuSlots(9)).toBe(0);
  });
});

describe('isPrevyuRemoteDomUploadError', () => {
  it('detects known Remote DOM messages', () => {
    expect(
      isPrevyuRemoteDomUploadError(
        new Error('Файл пустой — в песочнице приложения байты картинки недоступны.'),
      ),
    ).toBe(true);
    expect(
      isPrevyuRemoteDomUploadError(
        new Error('Виджет Twenty обрезал файл. Нажмите «Открыть карточку»'),
      ),
    ).toBe(true);
    expect(isPrevyuRemoteDomUploadError(new Error('network'))).toBe(false);
  });
});
