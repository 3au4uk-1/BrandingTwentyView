import { describe, expect, it } from 'vitest';
import {
  defaultWidthForFieldType,
  isEditableFieldType,
  toFieldDescriptor,
} from './field-registry';
import type { RawFieldMetadata } from './types';

describe('isEditableFieldType', () => {
  it('returns true for simple types', () => {
    expect(isEditableFieldType('TEXT')).toBe(true);
    expect(isEditableFieldType('SELECT')).toBe(true);
  });

  it('returns false for complex types', () => {
    expect(isEditableFieldType('LINKS')).toBe(false);
    expect(isEditableFieldType('RELATION')).toBe(false);
  });
});

describe('toFieldDescriptor', () => {
  it('marks UI read-only fields as not editable', () => {
    const raw: RawFieldMetadata = {
      name: 'name',
      label: 'Name',
      type: 'TEXT',
      isUIReadOnly: true,
    };
    expect(toFieldDescriptor(raw).isEditable).toBe(false);
  });

  it('parses SELECT options', () => {
    const raw: RawFieldMetadata = {
      name: 'stage',
      label: 'Stage',
      type: 'SELECT',
      options: [{ value: 'NOVYY', label: 'Новый' }],
    };
    const descriptor = toFieldDescriptor(raw);
    expect(descriptor.options).toEqual([{ value: 'NOVYY', label: 'Новый' }]);
  });
});

describe('defaultWidthForFieldType', () => {
  it('returns 80 for NUMBER', () => {
    expect(defaultWidthForFieldType('NUMBER')).toBe(80);
  });
});
