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
          visibleFields: members.map(({ field }) => field),
        }),
      ),
    );

    expect(markup).toContain('Печать · готово');
    expect(markup).toContain('aria-expanded="false"');
  });
});
