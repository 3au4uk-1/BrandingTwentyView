import { describe, expect, it } from 'vitest';
import {
  parseChildColumnsPayload,
  serializeChildColumnsPayload,
} from './columns';

const fallback = [{ field: 'name', label: 'Позиция', order: 0, visible: true }];

describe('parseChildColumnsPayload', () => {
  it('parses legacy ColumnConfig[] as groups: []', () => {
    const result = parseChildColumnsPayload(
      [{ field: 'stage', label: 'Стадия', order: 0, visible: true }],
      fallback,
    );
    expect(result.groups).toEqual([]);
    expect(result.columns[0]?.field).toBe('stage');
  });

  it('parses v2 payload with groupId', () => {
    const result = parseChildColumnsPayload(
      {
        version: 2,
        groups: [{ id: 'g1', name: 'Печать', order: 0 }],
        columns: [
          { field: 'plenka', label: 'Плёнка', order: 0, visible: true, groupId: 'g1' },
        ],
      },
      fallback,
    );
    expect(result.groups).toEqual([{ id: 'g1', name: 'Печать', order: 0 }]);
    expect(result.columns[0]?.groupId).toBe('g1');
  });

  it('returns fallback when raw is invalid', () => {
    expect(parseChildColumnsPayload(null, fallback).columns).toEqual(fallback);
  });

  it('clears orphan groupId when group is missing', () => {
    const result = parseChildColumnsPayload(
      {
        version: 2,
        groups: [{ id: 'g1', name: 'Печать', order: 0 }],
        columns: [
          { field: 'plenka', label: 'Плёнка', order: 0, visible: true, groupId: 'g1' },
          { field: 'stage', label: 'Стадия', order: 1, visible: true, groupId: 'missing' },
        ],
      },
      fallback,
    );

    expect(result.columns[0]?.groupId).toBe('g1');
    expect(result.columns[1]?.groupId).toBeUndefined();
  });
});

describe('serializeChildColumnsPayload', () => {
  it('always writes version 2', () => {
    const payload = serializeChildColumnsPayload(
      [{ field: 'name', label: 'Позиция', order: 0, visible: true }],
      [],
    );
    expect(payload.version).toBe(2);
    expect(payload.groups).toEqual([]);
  });
});
