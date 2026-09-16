import { describe, expect, it, vi } from 'vitest';

import {
  ensureSlot,
  normalizeBannerCrewSlot,
  removeLocationSlot,
  removePersonFromOrder,
  slotDisplayName,
} from './api';
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

describe('normalizeBannerCrewSlot', () => {
  it('reads flat opportunityId and supplierId', () => {
    expect(
      normalizeBannerCrewSlot({
        id: 'slot-1',
        opportunityId: 'opp-1',
        supplierId: 'sup-1',
        location: 'SITE',
        startsAt: '2026-09-08T07:00:00.000Z',
        endsAt: null,
      }),
    ).toEqual({
      id: 'slot-1',
      opportunityId: 'opp-1',
      opportunityName: null,
      opportunityStage: null,
      supplierId: 'sup-1',
      supplierName: null,
      location: 'SITE',
      startsAt: '2026-09-08T07:00:00.000Z',
      endsAt: null,
    });
  });

  it('reads nested opportunity and supplier objects', () => {
    expect(
      normalizeBannerCrewSlot({
        id: 'slot-2',
        location: 'BASE',
        startsAt: null,
        endsAt: '2026-09-08T10:00:00.000Z',
        opportunity: { id: 'opp-2', name: 'Заказ Б', stage: 'NOVYY' },
        supplier: { id: 'sup-2', name: 'Мага' },
      }),
    ).toEqual({
      id: 'slot-2',
      opportunityId: 'opp-2',
      opportunityName: 'Заказ Б',
      opportunityStage: 'NOVYY',
      supplierId: 'sup-2',
      supplierName: 'Мага',
      location: 'BASE',
      startsAt: null,
      endsAt: '2026-09-08T10:00:00.000Z',
    });
  });

  it('returns null for invalid location', () => {
    expect(
      normalizeBannerCrewSlot({
        id: 'slot-3',
        opportunityId: 'opp-1',
        supplierId: 'sup-1',
        location: 'WAREHOUSE',
      }),
    ).toBeNull();
  });
});

describe('slotDisplayName', () => {
  it('joins supplier name with short location label', () => {
    expect(slotDisplayName('Юра', 'SITE')).toBe('Юра · объект');
    expect(slotDisplayName('Юра', 'BASE')).toBe('Юра · база');
  });
});

describe('ensureSlot', () => {
  it('updates an existing SITE slot with times and display name', async () => {
    const create = vi.fn();
    const update = vi.fn();
    const existing = slot({ id: 'site-1', location: 'SITE' });

    await ensureSlot({
      slots: [existing],
      opportunityId: 'opp-1',
      supplierId: 'sup-1',
      supplierName: 'Юра',
      location: 'SITE',
      startsAt: '2026-09-08T08:00:00.000Z',
      endsAt: '2026-09-08T12:00:00.000Z',
      create,
      update,
    });

    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith('site-1', {
      startsAt: '2026-09-08T08:00:00.000Z',
      endsAt: '2026-09-08T12:00:00.000Z',
      name: 'Юра · объект',
    });
  });

  it('creates a missing BASE slot', async () => {
    const create = vi.fn();
    const update = vi.fn();
    const existingSite = slot({ id: 'site-1', location: 'SITE' });

    await ensureSlot({
      slots: [existingSite],
      opportunityId: 'opp-1',
      supplierId: 'sup-1',
      supplierName: 'Юра',
      location: 'BASE',
      startsAt: '2026-09-08T13:00:00.000Z',
      endsAt: null,
      create,
      update,
    });

    expect(update).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      opportunityId: 'opp-1',
      supplierId: 'sup-1',
      location: 'BASE',
      startsAt: '2026-09-08T13:00:00.000Z',
      endsAt: null,
      name: 'Юра · база',
    });
  });
});

describe('removePersonFromOrder', () => {
  it('deletes every slot for that person on the order', async () => {
    const remove = vi.fn();
    const site = slot({ id: 'site-1', location: 'SITE' });
    const base = slot({ id: 'base-1', location: 'BASE' });
    const other = slot({ id: 'other-1', supplierId: 'sup-2' });

    await removePersonFromOrder({
      slots: [site, base, other],
      opportunityId: 'opp-1',
      supplierId: 'sup-1',
      remove,
    });

    expect(remove).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledWith('site-1');
    expect(remove).toHaveBeenCalledWith('base-1');
  });
});

describe('removeLocationSlot', () => {
  it('deletes only the matching location slot', async () => {
    const remove = vi.fn();
    const site = slot({ id: 'site-1', location: 'SITE' });
    const base = slot({ id: 'base-1', location: 'BASE' });

    await removeLocationSlot({
      slots: [site, base],
      opportunityId: 'opp-1',
      supplierId: 'sup-1',
      location: 'BASE',
      remove,
    });

    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith('base-1');
  });
});
