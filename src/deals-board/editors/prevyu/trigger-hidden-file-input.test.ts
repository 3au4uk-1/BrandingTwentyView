import { describe, expect, it, vi } from 'vitest';

import { triggerHiddenFileInput } from './trigger-hidden-file-input';

describe('triggerHiddenFileInput', () => {
  it('falls back when click is missing on a truthy proxy', () => {
    const fallback = vi.fn();
    const proxy = { click: undefined };

    expect(triggerHiddenFileInput(proxy, fallback)).toBe('fallback');
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it('calls click when it is a function', () => {
    const fallback = vi.fn();
    const click = vi.fn();

    expect(triggerHiddenFileInput({ click }, fallback)).toBe('opened');
    expect(click).toHaveBeenCalledTimes(1);
    expect(fallback).not.toHaveBeenCalled();
  });

  it('prefers showPicker when available', () => {
    const fallback = vi.fn();
    const showPicker = vi.fn();
    const click = vi.fn();

    expect(triggerHiddenFileInput({ showPicker, click }, fallback)).toBe('opened');
    expect(showPicker).toHaveBeenCalledTimes(1);
    expect(click).not.toHaveBeenCalled();
    expect(fallback).not.toHaveBeenCalled();
  });

  it('falls back when click throws', () => {
    const fallback = vi.fn();
    const click = vi.fn(() => {
      throw new Error('blocked');
    });

    expect(triggerHiddenFileInput({ click }, fallback)).toBe('fallback');
    expect(fallback).toHaveBeenCalledTimes(1);
  });
});
