import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { DealGroupSuggestions } from './api/crmparser';
import { LinkDealsModal } from './LinkDealsModal';
import type { OpportunityRow } from './types';

vi.mock('./theme/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      text: '#111',
      textMuted: '#666',
      textSecondary: '#444',
      textInverse: '#fff',
      border: '#ddd',
      borderSubtle: '#eee',
      bgElevated: '#fff',
      bgSecondary: '#f7f7f8',
      accent: '#3b6fd9',
      accentMuted: 'rgba(59,111,217,0.1)',
      accentText: '#2f5fc4',
      overlay: 'rgba(0,0,0,0.4)',
      shadowLg: 'none',
      danger: '#c0392b',
      dangerMuted: '#fdecea',
    },
    font: {
      family: 'system-ui',
      sizeXs: '11px',
      sizeSm: '13px',
      weightNormal: 400,
      weightSemibold: 600,
    },
    spacing: { xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px' },
    radius: { sm: '4px', md: '8px', lg: '12px', pill: '999px' },
    zIndex: { modal: 1000 },
  }),
}));

vi.mock('./ui/PortalHostContext', () => ({
  usePortalHost: () => ({ current: null }),
  resolvePortalContainer: () => null,
}));

const { renderToStaticMarkup } = require('react-dom/server') as {
  renderToStaticMarkup: (node: ReactNode) => string;
};

const opportunities: OpportunityRow[] = [
  { id: 'opp-hard-a', name: 'Hard A' },
  { id: 'opp-hard-b', name: 'Hard B' },
  { id: 'opp-soft-a', name: 'Soft A' },
  { id: 'opp-soft-b', name: 'Soft B' },
  { id: 'opp-seed', name: 'Seed deal' },
];

const suggestions: DealGroupSuggestions = {
  hard: [
    {
      dealIds: [1, 2],
      twentyOppIds: ['opp-hard-a', 'opp-hard-b'],
      reason: 'shared_booking',
    },
  ],
  soft: [
    {
      dealIds: [3, 4],
      twentyOppIds: ['opp-soft-a', 'opp-soft-b'],
      reason: 'soft_marker',
    },
  ],
};

describe('LinkDealsModal', () => {
  it('renders hard candidates above soft candidates', () => {
    const markup = renderToStaticMarkup(
      createElement(LinkDealsModal, {
        seedOpportunityId: 'opp-seed',
        suggestions,
        opportunities,
        onClose: () => undefined,
        onSaved: () => undefined,
      }),
    );

    const hardIdx = markup.indexOf('data-candidate-tier="hard"');
    const softIdx = markup.indexOf('data-candidate-tier="soft"');
    expect(hardIdx).toBeGreaterThan(-1);
    expect(softIdx).toBeGreaterThan(-1);
    expect(hardIdx).toBeLessThan(softIdx);
    expect(markup).toContain('Hard A');
    expect(markup).toContain('Soft A');
  });

  it('confirm POST body includes selected twentyOppIds and nameLocked when name edited', async () => {
    const confirmDealGroup = vi.fn().mockResolvedValue({
      group: { id: 7 },
      parentTwentyId: 'parent-7',
    });

    const markup = renderToStaticMarkup(
      createElement(LinkDealsModal, {
        seedOpportunityId: 'opp-seed',
        suggestions,
        opportunities,
        confirmDealGroup,
        onClose: () => undefined,
        onSaved: () => undefined,
      }),
    );

    // Static markup cannot click; assert the confirm helper builds the expected body.
    const { buildConfirmDealGroupBody } = await import('./LinkDealsModal');
    const body = buildConfirmDealGroupBody({
      selectedOppIds: ['opp-seed', 'opp-hard-a', 'opp-hard-b'],
      name: 'Custom parent',
      nameEdited: true,
      canonicalTwentyOppId: 'opp-hard-a',
      canonicalBitrixId: '2049067',
      canonicalSelectedManually: true,
    });

    expect(body).toEqual({
      twentyOppIds: ['opp-seed', 'opp-hard-a', 'opp-hard-b'],
      name: 'Custom parent',
      nameLocked: true,
      canonicalTwentyOppId: 'opp-hard-a',
      canonicalBitrixId: '2049067',
      canonicalLocked: true,
    });

    expect(markup).toContain('Связать');
    expect(confirmDealGroup).not.toHaveBeenCalled();
  });
});
