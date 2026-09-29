import { describe, expect, it } from 'vitest';

import {
  placeProductionBoard,
  productionChipLabel,
  productionChipTone,
  productionColumn,
  productionDragPatch,
  sortProductionCards,
  visibleProductionCards,
  type ProductionSource,
} from './board';

const source = (patch: Partial<ProductionSource>): ProductionSource => ({
  id: 'line-1',
  name: 'Ролл-ап',
  dealName: 'Альфа',
  date: '2026-09-10',
  time: '09:00',
  comment: 'без люверсов',
  vzato: false,
  gotovo: false,
  flagged: true,
  ...patch,
});

describe('production column and chip', () => {
  it('maps checks to a column, including gotovo without vzato', () => {
    expect(productionColumn({ vzato: false, gotovo: false })).toBe('ne-vzyato');
    expect(productionColumn({ vzato: true, gotovo: false })).toBe('v-rabote');
    expect(productionColumn({ vzato: false, gotovo: true })).toBe('gotovo');
    expect(productionColumn({ vzato: true, gotovo: true })).toBe('gotovo');
  });

  it('writes the checkbox pair for a column change and nothing for the same column', () => {
    expect(productionDragPatch({ vzato: false, gotovo: false }, 'gotovo')).toEqual({
      vzatoVRabotuProizvodstva: true,
      gotovoProizvodstva: true,
    });
    expect(productionDragPatch({ vzato: true, gotovo: true }, 'v-rabote')).toEqual({
      vzatoVRabotuProizvodstva: true,
      gotovoProizvodstva: false,
    });
    expect(productionDragPatch({ vzato: true, gotovo: false }, 'ne-vzyato')).toEqual({
      vzatoVRabotuProizvodstva: false,
      gotovoProizvodstva: false,
    });
    expect(productionDragPatch({ vzato: false, gotovo: true }, 'gotovo')).toBeNull();
  });

  it('hides an unflagged line and leaves its fields on the source', () => {
    const hidden = source({ id: 'hidden', flagged: false, comment: 'оставить' });
    const shown = source({ id: 'shown' });
    expect(visibleProductionCards([hidden, shown]).map((card) => card.id)).toEqual(['shown']);
    expect(hidden.comment).toBe('оставить');
    expect(hidden.date).toBe('2026-09-10');
    expect(hidden.vzato).toBe(false);
  });

  it('sorts by date, then valid time, and puts gaps at the bottom', () => {
    const cards = sortProductionCards([
      source({ id: 'no-date', date: null, time: '08:00', name: 'Я' }),
      source({ id: 'bad-time', date: '2026-09-01', time: 'утром', name: 'Б' }),
      source({ id: 'later', date: '2026-09-01', time: '12:00', name: 'А' }),
      source({ id: 'earlier', date: '2026-09-01', time: '09:00', name: 'Г' }),
      source({ id: 'tie-b', date: '2026-09-01', time: '09:00', name: 'Бета' }),
      source({ id: 'iso', date: '2026-08-31T00:00:00.000Z', time: null, name: 'В' }),
    ]);
    expect(cards.map((card) => card.id)).toEqual([
      'iso',
      'tie-b',
      'earlier',
      'later',
      'bad-time',
      'no-date',
    ]);
  });

  it('labels the chip from the flag first', () => {
    expect(productionChipLabel({ flagged: false, vzato: true, gotovo: true })).toBe('Производство');
    expect(productionChipTone({ flagged: false, vzato: true, gotovo: true })).toBe('idle');
    expect(productionChipLabel({ flagged: true, vzato: false, gotovo: false })).toBe(
      'Производство - не взято',
    );
    expect(productionChipLabel({ flagged: true, vzato: true, gotovo: false })).toBe(
      'Производство - взято',
    );
    expect(productionChipLabel({ flagged: true, vzato: false, gotovo: true })).toBe(
      'Производство - Готово',
    );
    expect(productionChipTone({ flagged: true, vzato: false, gotovo: false })).toBe('idle');
    expect(productionChipTone({ flagged: true, vzato: true, gotovo: false })).toBe('vzato');
    expect(productionChipTone({ flagged: true, vzato: false, gotovo: true })).toBe('gotovo');
  });

  it('keeps all three columns, including an empty one', () => {
    const board = placeProductionBoard([
      source({ id: 'a', vzato: false, gotovo: false }),
      source({ id: 'b', vzato: true, gotovo: true }),
    ]);
    expect(board['ne-vzyato'].map((card) => card.id)).toEqual(['a']);
    expect(board['v-rabote']).toEqual([]);
    expect(board.gotovo.map((card) => card.id)).toEqual(['b']);
  });
});
