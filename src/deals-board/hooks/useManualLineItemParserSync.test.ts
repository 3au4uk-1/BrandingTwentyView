import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LINE_ITEM_ORIGIN, DEFAULT_MANUAL_LINE_ITEM_NAME } from 'src/constants/line-item-origin';

import { syncManualLineItem } from '../api/crmparser';
import type { LineItemRow } from '../types';
import * as manualSyncNotify from '../utils/manual-sync-notify';
import {
  defaultManualLineItemBaseline,
  setManualLineItemBaseline,
} from '../utils/manual-line-item-baselines';
import {
  isManualLineItemOrigin,
  isManualLineItemSyncedToParser,
  maybeSyncManualLineItemToParser,
  setManualLineItemSyncedToParser,
  syncManualLineItemAfterUpdate,
  syncNewManualLineItemToParser,
  toSyncSnapshot,
} from './useManualLineItemParserSync';

vi.mock('../api/crmparser', () => ({
  syncManualLineItem: vi.fn(),
}));

const manualLineItem = (overrides: Partial<LineItemRow> = {}): LineItemRow => ({
  id: 'li-1',
  opportunityId: 'opp-1',
  name: DEFAULT_MANUAL_LINE_ITEM_NAME,
  kolichestvo: 1,
  amount: { amountMicros: 0, currencyCode: 'RUB' },
  istochnik: LINE_ITEM_ORIGIN.TWENTY_MANUAL,
  ...overrides,
});

describe('toSyncSnapshot', () => {
  it('maps line item fields to sync snapshot', () => {
    expect(
      toSyncSnapshot({
        id: 'li-1',
        opportunityId: 'opp-1',
        name: 'Баннер',
        kolichestvo: 3,
        amount: { amountMicros: 100, currencyCode: 'RUB' },
      }),
    ).toEqual({
      name: 'Баннер',
      kolichestvo: 3,
      amountMicros: 100,
    });
  });
});

describe('isManualLineItemOrigin', () => {
  it('returns true for TWENTY_MANUAL origin', () => {
    expect(isManualLineItemOrigin(manualLineItem(), false)).toBe(true);
  });

  it('returns false for PARSER origin', () => {
    expect(
      isManualLineItemOrigin(manualLineItem({ istochnik: LINE_ITEM_ORIGIN.PARSER }), true),
    ).toBe(false);
  });

  it('treats undefined origin as manual when baseline exists', () => {
    expect(isManualLineItemOrigin(manualLineItem({ istochnik: undefined }), true)).toBe(true);
  });

  it('treats undefined origin as non-manual without baseline', () => {
    expect(isManualLineItemOrigin(manualLineItem({ istochnik: undefined }), false)).toBe(false);
  });
});

describe('maybeSyncManualLineItemToParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(syncManualLineItem).mockResolvedValue({ success: true });
  });

  it('skips sync for unchanged draft defaults', async () => {
    const baseline = defaultManualLineItemBaseline();
    const lineItem = manualLineItem();

    const didSync = await maybeSyncManualLineItemToParser({
      lineItem,
      patch: {},
      baseline,
      syncedToParser: false,
    });

    expect(didSync).toBe(false);
    expect(syncManualLineItem).not.toHaveBeenCalled();
  });

  it('syncs on first meaningful name change', async () => {
    const baseline = defaultManualLineItemBaseline();
    const lineItem = manualLineItem();

    const didSync = await maybeSyncManualLineItemToParser({
      lineItem,
      patch: { name: 'Баннер' },
      baseline,
      syncedToParser: false,
    });

    expect(didSync).toBe(true);
    expect(syncManualLineItem).toHaveBeenCalledWith('li-1', {
      opportunityId: 'opp-1',
      name: 'Баннер',
      kolichestvo: 1,
      amountMicros: 0,
      currencyCode: 'RUB',
    });
  });

  it('syncs ongoing edits after first successful sync', async () => {
    const baseline = defaultManualLineItemBaseline();
    const lineItem = manualLineItem({ name: 'Баннер' });

    const didSync = await maybeSyncManualLineItemToParser({
      lineItem,
      patch: { kommentariy: 'note only' },
      baseline,
      syncedToParser: true,
    });

    expect(didSync).toBe(true);
    expect(syncManualLineItem).toHaveBeenCalledWith('li-1', {
      opportunityId: 'opp-1',
      name: 'Баннер',
      kolichestvo: 1,
      amountMicros: 0,
      currencyCode: 'RUB',
    });
  });
});

describe('syncNewManualLineItemToParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(syncManualLineItem).mockResolvedValue({ success: true, dealItemId: 42 });
  });

  it('syncs draft line item immediately after create', async () => {
    const queryClient = new QueryClient();

    await syncNewManualLineItemToParser(queryClient, 'li-new', 'opp-1');

    expect(syncManualLineItem).toHaveBeenCalledWith('li-new', {
      opportunityId: 'opp-1',
      name: DEFAULT_MANUAL_LINE_ITEM_NAME,
      kolichestvo: 1,
      amountMicros: 0,
      currencyCode: 'RUB',
    });
    expect(isManualLineItemSyncedToParser(queryClient, 'li-new')).toBe(true);
  });

  it('notifies when syncNewManualLineItemToParser fails', async () => {
    const queryClient = new QueryClient();
    const notify = vi.spyOn(manualSyncNotify, 'notifyManualSyncError');
    vi.mocked(syncManualLineItem).mockRejectedValueOnce(new Error('network'));

    await syncNewManualLineItemToParser(queryClient, 'li-1', 'opp-1');

    expect(notify).toHaveBeenCalled();
    expect(isManualLineItemSyncedToParser(queryClient, 'li-1')).toBe(false);
  });
});

describe('syncManualLineItemAfterUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(syncManualLineItem).mockResolvedValue({ success: true });
  });

  it('skips parser-origin line items', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['lineItems', ['opp-1'], undefined], [
      manualLineItem({ id: 'li-parser', istochnik: LINE_ITEM_ORIGIN.PARSER }),
    ]);

    await syncManualLineItemAfterUpdate(queryClient, 'li-parser', { name: 'Баннер' });

    expect(syncManualLineItem).not.toHaveBeenCalled();
  });

  it('syncs manual line items and marks them synced', async () => {
    const queryClient = new QueryClient();
    const lineItem = manualLineItem();
    queryClient.setQueryData(['lineItems', ['opp-1'], undefined], [lineItem]);
    setManualLineItemBaseline(queryClient, 'li-1', defaultManualLineItemBaseline());

    await syncManualLineItemAfterUpdate(queryClient, 'li-1', { name: 'Баннер' });

    expect(syncManualLineItem).toHaveBeenCalled();
    expect(isManualLineItemSyncedToParser(queryClient, 'li-1')).toBe(true);
  });

  it('logs sync errors without throwing', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['lineItems', ['opp-1'], undefined], [manualLineItem()]);
    setManualLineItemBaseline(queryClient, 'li-1', defaultManualLineItemBaseline());
    vi.mocked(syncManualLineItem).mockRejectedValue(new Error('parser down'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(
      syncManualLineItemAfterUpdate(queryClient, 'li-1', { name: 'Баннер' }),
    ).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalled();
    expect(isManualLineItemSyncedToParser(queryClient, 'li-1')).toBe(false);
    consoleError.mockRestore();
  });

  it('notifies when syncManualLineItemAfterUpdate fails', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['lineItems', ['opp-1'], undefined], [manualLineItem()]);
    setManualLineItemBaseline(queryClient, 'li-1', defaultManualLineItemBaseline());
    vi.mocked(syncManualLineItem).mockRejectedValueOnce(new Error('network'));
    const notify = vi.spyOn(manualSyncNotify, 'notifyManualSyncError');

    await syncManualLineItemAfterUpdate(queryClient, 'li-1', { name: 'Баннер' });

    expect(notify).toHaveBeenCalled();
    expect(isManualLineItemSyncedToParser(queryClient, 'li-1')).toBe(false);
  });
});

describe('manualLineItemsSynced query meta', () => {
  it('tracks synced state per line item id', () => {
    const queryClient = new QueryClient();
    expect(isManualLineItemSyncedToParser(queryClient, 'li-1')).toBe(false);

    setManualLineItemSyncedToParser(queryClient, 'li-1');
    expect(isManualLineItemSyncedToParser(queryClient, 'li-1')).toBe(true);
    expect(isManualLineItemSyncedToParser(queryClient, 'li-2')).toBe(false);
  });
});
