import { describe, expect, it } from 'vitest';
import { findSlotForTriple } from './upsert';
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

describe('findSlotForTriple', () => {
  it('returns the slot matching opportunity, supplier, and location when same person has SITE and BASE', () => {
    const site = slot({ id: 'site', location: 'SITE' });
    const base = slot({ id: 'base', location: 'BASE' });
    const slots = [site, base];

    expect(findSlotForTriple(slots, 'opp-1', 'sup-1', 'SITE')).toBe(site);
    expect(findSlotForTriple(slots, 'opp-1', 'sup-1', 'BASE')).toBe(base);
  });
});
