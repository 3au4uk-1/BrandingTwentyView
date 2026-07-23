import { describe, expect, it, vi } from 'vitest';

import type { ColumnConfig, ColumnGroupConfig } from '../types';
import { findActiveGroupMembers } from '../utils/active-group';

const groups: Array<{ group: ColumnGroupConfig; members: ColumnConfig[] }> = [
  {
    group: {
      id: '123e4567-e89b-42d3-a456-426614174010',
      name: 'Печать',
      order: 0,
    },
    members: [
      {
        field: 'vzatoVRabotu',
        label: 'Взято в работу',
        order: 0,
        visible: true,
      },
    ],
  },
  {
    group: {
      id: '123e4567-e89b-42d3-a456-426614174011',
      name: 'Монтаж',
      order: 1,
    },
    members: [
      {
        field: 'gotovo',
        label: 'Готово',
        order: 1,
        visible: true,
      },
    ],
  },
];

describe('findActiveGroupMembers', () => {
  it('returns members for the active group', () => {
    const isExpanded = vi.fn(
      (lineItemId: string, groupId: string) =>
        lineItemId === 'line-item-1' && groupId === groups[1].group.id,
    );

    expect(findActiveGroupMembers(groups, 'line-item-1', isExpanded)).toBe(
      groups[1].members,
    );
  });

  it('returns null when no group is active', () => {
    expect(findActiveGroupMembers(groups, 'line-item-1', () => false)).toBeNull();
  });
});
