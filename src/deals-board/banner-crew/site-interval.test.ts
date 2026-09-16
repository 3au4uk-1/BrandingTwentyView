import { describe, expect, it } from 'vitest';

import type { BannerCrewSlot } from './types';
import {
  parseClockInput,
  siteDraftFromSlots,
  siteDraftToIso,
  siteIntervalError,
  type SiteIntervalDraft,
} from './site-interval';

const empty = (patch: Partial<SiteIntervalDraft> = {}): SiteIntervalDraft => ({
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  ...patch,
});

describe('parseClockInput', () => {
  it('accepts HH:mm including 23:50', () => {
    expect(parseClockInput('23:50')).toBe('23:50');
    expect(parseClockInput('9:05')).toBe('09:05');
    expect(parseClockInput(' 08:00 ')).toBe('08:00');
    expect(parseClockInput('24:00')).toBeNull();
    expect(parseClockInput('12')).toBeNull();
  });
});

describe('siteDraftToIso / siteIntervalError', () => {
  it('allows overnight: 23:50 one calendar day, 08:00 the next', () => {
    const draft = empty({
      startDate: '2026-09-08',
      startTime: '23:50',
      endDate: '2026-09-09',
      endTime: '08:00',
    });
    expect(siteIntervalError(draft)).toBeNull();
    expect(siteDraftToIso(draft)).toEqual({
      startsAt: '2026-09-08T20:50:00.000Z',
      endsAt: '2026-09-09T05:00:00.000Z',
    });
  });

  it('rejects same-day end before start', () => {
    expect(
      siteIntervalError(
        empty({
          startDate: '2026-09-08',
          startTime: '10:00',
          endDate: '2026-09-08',
          endTime: '09:00',
        }),
      ),
    ).toBe('конец должен быть позже начала');
  });

  it('treats fully empty as a draft', () => {
    expect(siteIntervalError(empty())).toBeNull();
    expect(siteDraftToIso(empty())).toEqual({ startsAt: null, endsAt: null });
  });
});

describe('siteDraftFromSlots', () => {
  it('reads the shared SITE interval and ignores BASE', () => {
    const site: BannerCrewSlot = {
      id: '1',
      opportunityId: 'opp',
      opportunityName: 'А',
      opportunityStage: 'NOVYY',
      supplierId: 'yura',
      supplierName: 'Юра',
      location: 'SITE',
      startsAt: '2026-09-08T20:50:00.000Z',
      endsAt: '2026-09-09T05:00:00.000Z',
    };
    const base: BannerCrewSlot = {
      ...site,
      id: '2',
      location: 'BASE',
      startsAt: '2026-09-08T07:00:00.000Z',
      endsAt: '2026-09-08T10:00:00.000Z',
    };
    expect(siteDraftFromSlots([base, site], '2026-09-01')).toEqual({
      startDate: '2026-09-08',
      startTime: '23:50',
      endDate: '2026-09-09',
      endTime: '08:00',
    });
  });
});
