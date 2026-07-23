import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { GroupChipModeProvider } from '../hooks/useGroupChipMode';
import type { ColumnConfig, ColumnGroupConfig, LineItemRow } from '../types';
import { MobileLineItemRow } from './MobileLineItemRow';

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();

  return {
    ...actual,
    useState: <T,>(initial: T | (() => T)) => {
      if (initial === false) return [true, vi.fn()];

      const value = typeof initial === 'function' ? (initial as () => T)() : initial;
      return [value, vi.fn()];
    },
  };
});

vi.mock('../cells/DynamicFieldCell', () => ({
  DynamicFieldCell: ({
    field,
    listMenuPresentation,
    touchFriendly,
  }: {
    field: string;
    listMenuPresentation?: string;
    touchFriendly?: boolean;
  }) =>
    createElement('span', {
      'data-field': field,
      'data-menu': listMenuPresentation,
      'data-touch-friendly': touchFriendly ? 'true' : 'false',
    }),
}));

vi.mock('../theme/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      accent: '#3b6fd9',
      accentMuted: '#eef3ff',
      accentText: '#2f5fc4',
      borderStrong: '#cacad4',
      borderSubtle: '#ececf0',
      text: '#1f1f23',
      textMuted: '#777780',
    },
    font: {
      sizeSm: '12px',
      weightMedium: 500,
      weightNormal: 400,
      weightSemibold: 600,
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '16px',
    },
  }),
}));

const { renderToStaticMarkup } = require('react-dom/server') as {
  renderToStaticMarkup: (node: ReactNode) => string;
};

const group: ColumnGroupConfig = {
  id: '8f132e69-6158-41e8-95a9-22e19ecccd73',
  name: 'Печать',
  order: 0,
};

const columns: ColumnConfig[] = [
  { field: 'name', label: 'Позиция', order: 0, visible: true },
  { field: 'price', label: 'Цена', order: 1, visible: true },
  {
    field: 'vzatoVRabotu',
    label: 'Взято в работу',
    order: 2,
    visible: true,
    groupId: group.id,
  },
  {
    field: 'gotovo',
    label: 'Готово',
    order: 3,
    visible: true,
    groupId: group.id,
  },
];

const item: LineItemRow = {
  id: 'ca4a7e98-f631-4a56-a78c-0e59e572eb16',
  opportunityId: '52814e76-4fe8-4486-b8d5-fccc63ee7e9f',
  name: 'Баннер',
  price: 100,
};

describe('MobileLineItemRow', () => {
  it('renders the active group in a touch-friendly horizontal field strip', () => {
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
          createElement(MobileLineItemRow, {
            item,
            columns,
            groups: [group],
            descriptorByField: new Map(),
            isLast: false,
          }),
        ),
      );

      expect(markup).toContain('aria-expanded="true"');
      expect(markup).toContain('data-field="price"');
      expect(markup).toContain('data-field="vzatoVRabotu"');
      expect(markup).toContain('data-field="gotovo"');
      expect(markup).toContain('data-menu="sheet"');
      expect(markup).toContain('data-touch-friendly="true"');
      expect(markup).toContain('overflow-x:auto');
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: originalLocalStorage,
      });
    }
  });
});
