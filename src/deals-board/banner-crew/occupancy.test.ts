import { describe, expect, it } from 'vitest';
import {
  findConflicts,
  intervalsOverlap,
  isOccupyingSlot,
} from './occupancy';
import type { BannerCrewSlot } from './types';

const slot = (patch: Partial<BannerCrewSlot>): BannerCrewSlot => ({
  id: 's1',
  opportunityId: 'opp-1',
  opportunityName: 'Заказ А',
  opportunityStage: 'NOVYY',
  supplierId: 'sup-1',
  supplierName: 'Юра',
  location: 'SITE',
  startsAt: '2026-09-08T07:00:00.000Z',
  endsAt: '2026-09-08T10:00:00.000Z',
  ...patch,
});

describe('isOccupyingSlot', () => {
  it('requires both ends, ordered interval, and non-cancelled opportunity', () => {
    expect(isOccupyingSlot(slot({}))).toBe(true);
    expect(isOccupyingSlot(slot({ startsAt: null }))).toBe(false);
    expect(isOccupyingSlot(slot({ endsAt: null }))).toBe(false);
    expect(isOccupyingSlot(slot({ startsAt: '2026-09-08T10:00:00.000Z', endsAt: '2026-09-08T07:00:00.000Z' }))).toBe(false);
    expect(isOccupyingSlot(slot({ opportunityStage: 'OTMENA' }))).toBe(false);
    expect(isOccupyingSlot(slot({ opportunityId: null }))).toBe(false);
    expect(isOccupyingSlot(slot({ supplierId: null }))).toBe(false);
  });
});

describe('intervalsOverlap', () => {
  it('detects overlap, nesting, and treats end-touch as free', () => {
    expect(
      intervalsOverlap(
        { startsAt: '2026-09-08T07:00:00.000Z', endsAt: '2026-09-08T10:00:00.000Z' },
        { startsAt: '2026-09-08T09:00:00.000Z', endsAt: '2026-09-08T12:00:00.000Z' },
      ),
    ).toBe(true);
    expect(
      intervalsOverlap(
        { startsAt: '2026-09-08T07:00:00.000Z', endsAt: '2026-09-08T10:00:00.000Z' },
        { startsAt: '2026-09-08T10:00:00.000Z', endsAt: '2026-09-08T12:00:00.000Z' },
      ),
    ).toBe(false);
    expect(
      intervalsOverlap(
        { startsAt: '2026-09-08T07:00:00.000Z', endsAt: '2026-09-08T12:00:00.000Z' },
        { startsAt: '2026-09-08T08:00:00.000Z', endsAt: '2026-09-08T09:00:00.000Z' },
      ),
    ).toBe(true);
  });
});

describe('findConflicts', () => {
  it('flags same-person overlaps across orders and SITE vs BASE; ignores other people and drafts', () => {
    const a = slot({ id: 'a', opportunityId: 'o1' });
    const b = slot({
      id: 'b',
      opportunityId: 'o2',
      opportunityName: 'Заказ Б',
      startsAt: '2026-09-08T09:00:00.000Z',
      endsAt: '2026-09-08T11:00:00.000Z',
    });
    const base = slot({
      id: 'c',
      location: 'BASE',
      startsAt: '2026-09-08T09:30:00.000Z',
      endsAt: '2026-09-08T10:30:00.000Z',
    });
    const other = slot({ id: 'd', supplierId: 'sup-2', supplierName: 'Мага' });
    const draft = slot({ id: 'e', startsAt: null });
    const map = findConflicts([a, b, base, other, draft]);
    expect(map.get('a')?.sort()).toEqual(['b', 'c']);
    expect(map.get('d')).toBeUndefined();
    expect(map.get('e')).toBeUndefined();
  });
});
