import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { GroupChipModeProvider } from '../hooks/useGroupChipMode';
import type { ColumnConfig, ColumnGroupConfig, LineItemRow } from '../types';
import { GroupColumnCell } from './GroupColumnCell';

vi.mock('../theme/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      accent: '#3b6fd9',
      accentMuted: 'rgba(59, 111, 217, 0.1)',
      accentText: '#2f5fc4',
      borderStrong: '#cacad4',
    },
    font: {
      weightNormal: 400,
      weightSemibold: 600,
    },
    spacing: {
      xs: '4px',
    },
  }),
}));

const { renderToStaticMarkup } = require('react-dom/server') as {
  renderToStaticMarkup: (node: ReactNode) => string;
};

const group: ColumnGroupConfig = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  name: 'Печать',
  order: 0,
};

const members: ColumnConfig[] = [
  { field: 'vzatoVRabotu', label: 'Взято в работу', order: 0, visible: true, groupId: group.id },
  { field: 'gotovo', label: 'Готово', order: 1, visible: true, groupId: group.id },
];

const item: LineItemRow = {
  id: '123e4567-e89b-42d3-a456-426614174001',
  opportunityId: '123e4567-e89b-42d3-a456-426614174002',
  name: 'Баннер',
  gotovo: true,
};

describe('GroupColumnCell', () => {
  it('renders the collapsed group chip with its row status', () => {
    const markup = renderToStaticMarkup(
      createElement(
        GroupChipModeProvider,
        null,
        createElement(GroupColumnCell, {
          group,
          members,
          item,
          descriptorByField: new Map(),
        }),
      ),
    );

    expect(markup).toContain('Печать · готово');
    expect(markup).toContain('aria-expanded="false"');
  });

  it('keeps expanded group members out of the legacy vertical cell', () => {
    const originalLocalStorage = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) =>
          key === 'deals-board-line-item-group-expand'
            ? JSON.stringify({ [`${item.id}:${group.id}`]: true })
            : null,
      },
    });

    try {
      const markup = renderToStaticMarkup(
        createElement(
          GroupChipModeProvider,
          null,
          createElement(GroupColumnCell, {
            group,
            members,
            item,
            descriptorByField: new Map(),
          }),
        ),
      );

      expect(markup).toContain('aria-expanded="true"');
      expect(markup).not.toContain('Взято в работу');
      expect(markup).not.toContain('Готово');
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: originalLocalStorage,
      });
    }
  });
});
