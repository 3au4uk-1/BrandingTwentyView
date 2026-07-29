import { describe, expect, it, vi } from 'vitest';

import {
  fetchRestorationTemplatesCatalogWithClient,
  mapRestorationTemplateRows,
} from './restoration-templates';

describe('mapRestorationTemplateRows', () => {
  it('maps active rows with urls', () => {
    expect(
      mapRestorationTemplateRows([
        {
          id: 't1',
          name: 'Hvatayka',
          matchKeywords: 'хватайка',
          priority: 10,
          isDefault: false,
          isActive: true,
          maketUrl: { primaryLinkUrl: 'https://disk/h' },
        },
        {
          id: 't2',
          name: 'No url',
          isActive: true,
          maketUrl: null,
        },
      ]),
    ).toEqual([
      {
        id: 't1',
        label: 'Hvatayka',
        url: 'https://disk/h',
        matchKeywords: 'хватайка',
        priority: 10,
        isDefault: false,
        isActive: true,
      },
    ]);
  });

  it('skips inactive templates', () => {
    expect(
      mapRestorationTemplateRows([
        {
          id: 't-inactive',
          name: 'Inactive',
          isActive: false,
          maketUrl: { primaryLinkUrl: 'https://disk/x' },
        },
      ]),
    ).toEqual([]);
  });
});

describe('fetchRestorationTemplatesCatalogWithClient', () => {
  it('unwraps REST list response and maps catalog entries', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        restorationTemplates: [
          {
            id: 't1',
            name: 'Hvatayka',
            matchKeywords: 'хватайка',
            priority: 10,
            isDefault: false,
            isActive: true,
            maketUrl: { primaryLinkUrl: 'https://disk/h' },
          },
          {
            id: 't2',
            name: 'No url',
            isActive: true,
            maketUrl: null,
          },
        ],
      },
    });

    const rows = await fetchRestorationTemplatesCatalogWithClient({ get } as never);

    expect(get).toHaveBeenCalledWith('/rest/restorationTemplates', {
      query: { limit: 200 },
    });
    expect(rows).toEqual([
      {
        id: 't1',
        label: 'Hvatayka',
        url: 'https://disk/h',
        matchKeywords: 'хватайка',
        priority: 10,
        isDefault: false,
        isActive: true,
      },
    ]);
  });
});
