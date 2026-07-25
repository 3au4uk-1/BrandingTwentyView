import { describe, expect, it } from 'vitest';

import {
  computeCategoryCardMetrics,
  computeProductionScoreboard,
  computeTipStageBreakdown,
} from './compute';

describe('computeProductionScoreboard', () => {
  it('counts positions and distinct deals per tip and stage', () => {
    const stats = computeProductionScoreboard([
      {
        id: '1',
        opportunityId: 'a',
        name: 'x',
        tip: 'BANNERA',
        stage: 'V_RABOTE',
      },
      {
        id: '2',
        opportunityId: 'a',
        name: 'y',
        tip: 'BANNERA',
        stage: 'V_PECHATI',
      },
      {
        id: '3',
        opportunityId: 'b',
        name: 'z',
        tip: 'PLENKA',
        stage: 'V_RABOTE',
      },
      {
        id: '4',
        opportunityId: 'c',
        name: 'w',
        tip: 'PODRYAD',
        stage: 'NOVYY',
      },
    ]);

    expect(stats.totalPositions).toBe(4);
    expect(stats.totalDeals).toBe(3);
    expect(stats.byTip.BANNERA).toEqual({ positions: 2, deals: 1 });
    expect(stats.byTip.PLENKA).toEqual({ positions: 1, deals: 1 });
    expect(stats.byTip.PODRYAD).toEqual({ positions: 1, deals: 1 });
    expect(stats.byStage.V_RABOTE).toEqual({ positions: 2, deals: 2 });
    expect(stats.byStage.V_PECHATI).toEqual({ positions: 1, deals: 1 });
  });

  it('ignores unknown tip/stage for typed buckets', () => {
    const stats = computeProductionScoreboard([
      { id: '1', opportunityId: 'a', name: 'x' },
    ]);
    expect(stats.byTip.BANNERA.positions).toBe(0);
    expect(stats.byStage.NOVYY.positions).toBe(0);
    expect(stats.totalPositions).toBe(1);
    expect(stats.totalDeals).toBe(1);
  });
});

describe('computeTipStageBreakdown', () => {
  it('counts stages only for the selected tip', () => {
    const breakdown = computeTipStageBreakdown(
      [
        { id: '1', opportunityId: 'a', name: 'x', tip: 'PODRYAD', stage: 'NOVYY' },
        { id: '2', opportunityId: 'a', name: 'y', tip: 'PODRYAD', stage: 'V_RABOTE' },
        { id: '3', opportunityId: 'b', name: 'z', tip: 'BANNERA', stage: 'NOVYY' },
      ],
      'PODRYAD',
    );

    expect(breakdown.NOVYY).toEqual({ positions: 1, deals: 1 });
    expect(breakdown.V_RABOTE).toEqual({ positions: 1, deals: 1 });
    expect(breakdown.V_PECHATI.positions).toBe(0);
  });
});

describe('computeCategoryCardMetrics', () => {
  it('totals positions and splits print / work / ready per tip', () => {
    const cards = computeCategoryCardMetrics([
      { id: '1', opportunityId: 'a', name: 'a', tip: 'BANNERA', stage: 'V_PECHATI' },
      { id: '2', opportunityId: 'a', name: 'b', tip: 'BANNERA', stage: 'V_RABOTE' },
      { id: '3', opportunityId: 'b', name: 'c', tip: 'BANNERA', stage: 'GOTOVO' },
      { id: '4', opportunityId: 'c', name: 'd', tip: 'BANNERA', stage: 'NOVYY' },
      { id: '5', opportunityId: 'd', name: 'e', tip: 'PLENKA', stage: 'V_RABOTE' },
    ]);

    expect(cards.BANNERA).toEqual({
      total: 4,
      inPrint: 1,
      inWork: 1,
      ready: 1,
    });
    expect(cards.PLENKA).toEqual({
      total: 1,
      inPrint: 0,
      inWork: 1,
      ready: 0,
    });
    expect(cards.PODRYAD.total).toBe(0);
  });
});
