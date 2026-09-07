import { describe, expect, it } from 'vitest';
import { buildBannerCrewChipModel, dealHasBannerLineItem } from './chip-model';
import type { BannerCrewSlot } from './types';

const yuraSite: BannerCrewSlot = {
  id: '1',
  opportunityId: 'opp',
  opportunityName: 'А',
  opportunityStage: 'NOVYY',
  supplierId: 'yura',
  supplierName: 'Юра',
  location: 'SITE',
  startsAt: '2026-09-08T07:00:00.000Z',
  endsAt: '2026-09-08T10:00:00.000Z',
};

describe('dealHasBannerLineItem', () => {
  it('is true for any BANNERA tip including cancelled positions', () => {
    expect(dealHasBannerLineItem([{ tip: 'PODRYAD' }])).toBe(false);
    expect(dealHasBannerLineItem([{ tip: 'BANNERA' }])).toBe(true);
  });
});

describe('buildBannerCrewChipModel', () => {
  it('hides when the deal has no banner line', () => {
    expect(buildBannerCrewChipModel({ lineItems: [{ tip: 'PLENKA' }], slots: [yuraSite], allSlotsForConflicts: [yuraSite] })).toBeNull();
  });

  it('shows placeholder, draft, scheduled, and conflict colors', () => {
    const empty = buildBannerCrewChipModel({ lineItems: [{ tip: 'BANNERA' }], slots: [], allSlotsForConflicts: [] });
    expect(empty).toMatchObject({ text: 'Баннерщики', color: 'gray' });

    const draft = buildBannerCrewChipModel({
      lineItems: [{ tip: 'BANNERA' }],
      slots: [{ ...yuraSite, startsAt: null, endsAt: null }],
      allSlotsForConflicts: [],
    });
    expect(draft?.text).toContain('без времени');
    expect(draft?.color).toBe('gray');

    const ok = buildBannerCrewChipModel({
      lineItems: [{ tip: 'BANNERA' }],
      slots: [yuraSite],
      allSlotsForConflicts: [yuraSite],
    });
    expect(ok?.color).toBe('green');
    expect(ok?.text).toContain('Юра');

    const other: BannerCrewSlot = {
      ...yuraSite,
      id: '2',
      opportunityId: 'opp-2',
      startsAt: '2026-09-08T09:00:00.000Z',
      endsAt: '2026-09-08T11:00:00.000Z',
    };
    const conflict = buildBannerCrewChipModel({
      lineItems: [{ tip: 'BANNERA' }],
      slots: [yuraSite],
      allSlotsForConflicts: [yuraSite, other],
    });
    expect(conflict?.color).toBe('yellow');
  });
});
