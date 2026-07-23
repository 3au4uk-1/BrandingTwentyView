import { createElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { GroupChipModeProvider } from '../hooks/useGroupChipMode';
import type { ColumnConfig, ColumnGroupConfig, LineItemRow } from '../types';
import { GroupColumnCell } from './GroupColumnCell';

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

  it('uses the supplied member renderer for expanded group fields', () => {
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
            renderMember: (member) =>
              createElement('section', { 'data-mobile-field': member.field }, member.label),
          }),
        ),
      );

      expect(markup).toContain('data-mobile-field="vzatoVRabotu"');
      expect(markup).toContain('data-mobile-field="gotovo"');
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: originalLocalStorage,
      });
    }
  });
});
