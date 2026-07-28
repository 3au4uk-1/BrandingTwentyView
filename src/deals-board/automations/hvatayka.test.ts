import { describe, expect, it } from 'vitest';

import {
  appendBrandingComment,
  isHvataykaBrandingSiblingName,
  isHvataykaEquipmentName,
  planHvataykaAutomation,
} from './hvatayka';

describe('hvatayka matchers', () => {
  it('detects equipment vs branding', () => {
    expect(isHvataykaEquipmentName('Автомат Хватайка')).toBe(true);
    expect(isHvataykaEquipmentName('Брендинг Хватайка')).toBe(false);
    expect(isHvataykaBrandingSiblingName('Брендинг Хватайка')).toBe(true);
    expect(isHvataykaBrandingSiblingName('Оклейка корпуса хватайки')).toBe(true);
    expect(isHvataykaBrandingSiblingName('Автомат Хватайка')).toBe(false);
  });

  it('plans GOTOVO + comment when branding sibling exists', () => {
    const patches = planHvataykaAutomation([
      {
        id: 'eq',
        opportunityId: 'd1',
        name: 'Автомат Хватайка',
        stage: 'NOVYY',
        kommentariy: '',
      },
      {
        id: 'br',
        opportunityId: 'd1',
        name: 'Брендинг Хватайка',
        stage: 'NOVYY',
      },
    ]);
    expect(patches).toEqual([
      {
        id: 'eq',
        data: { stage: 'GOTOVO', kommentariy: 'будет Брендинг' },
      },
    ]);
  });

  it('does not re-append comment mark', () => {
    expect(appendBrandingComment('будет Брендинг')).toBe('будет Брендинг');
    expect(appendBrandingComment('note')).toBe('note\nбудет Брендинг');
  });

  it('returns empty when no branding sibling', () => {
    expect(
      planHvataykaAutomation([
        { id: 'eq', opportunityId: 'd1', name: 'Автомат Хватайка', stage: 'NOVYY' },
      ]),
    ).toEqual([]);
  });
});
