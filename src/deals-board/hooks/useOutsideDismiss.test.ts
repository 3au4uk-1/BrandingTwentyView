import { describe, expect, it } from 'vitest';

import { eventTargetsContainer, OUTSIDE_DISMISS_ATTR } from './useOutsideDismiss';

const makeEvent = (path: unknown[], target?: unknown): Event =>
  ({
    target: target ?? path[0] ?? null,
    composedPath: () => path as EventTarget[],
  }) as Event;

describe('eventTargetsContainer', () => {
  it('returns true when composedPath includes the container', () => {
    const container = { id: 'wrap' };
    const target = { id: 'btn' };
    expect(eventTargetsContainer(container as HTMLElement, makeEvent([target, container]))).toBe(
      true,
    );
  });

  it('returns false when composedPath does not include the container', () => {
    const container = { id: 'wrap' };
    const outside = { id: 'cell' };
    expect(eventTargetsContainer(container as HTMLElement, makeEvent([outside]))).toBe(false);
  });

  it('matches dismiss id on path entries when container identity differs', () => {
    const container = {
      id: 'wrap',
      getAttribute: (name: string) => (name === OUTSIDE_DISMISS_ATTR ? 'id-1' : null),
    };
    const nested = {
      id: 'item',
      getAttribute: (name: string) => (name === OUTSIDE_DISMISS_ATTR ? 'id-1' : null),
    };
    // Path has a proxy node with the same dismiss id, not the same object as container.
    expect(
      eventTargetsContainer(container as HTMLElement, makeEvent([nested]), 'id-1'),
    ).toBe(true);
  });

  it('falls back to contains when composedPath is empty', () => {
    const target = { id: 'btn' };
    const container = {
      contains: (node: unknown) => node === target,
    };
    const event = { target, composedPath: () => [] } as unknown as Event;
    expect(eventTargetsContainer(container as HTMLElement, event)).toBe(true);
  });
});
