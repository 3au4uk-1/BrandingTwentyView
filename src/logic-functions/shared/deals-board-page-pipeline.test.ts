import { describe, expect, it, vi } from 'vitest';
import { runDealsBoardPagePipeline } from './deals-board-page-pipeline';

describe('runDealsBoardPagePipeline', () => {
  it('runs enrich and line-items in parallel after GQL and never fetches list-status', async () => {
    const order: string[] = [];
    let enrichStarted = false;
    let lineItemsStarted = false;
    let bothStartedBeforeEitherFinished = false;

    const deps = {
      queryOpportunities: vi.fn(async () => {
        order.push('gql');
        return {
          opportunities: {
            edges: [{ node: { id: 'o1', name: 'Deal' } }],
            totalCount: 1,
          },
        };
      }),
      enrichWithRest: vi.fn(async (rows: Array<Record<string, unknown>>) => {
        enrichStarted = true;
        if (lineItemsStarted) bothStartedBeforeEitherFinished = true;
        await new Promise((r) => setTimeout(r, 30));
        order.push('enrich');
        return rows;
      }),
      fetchLineItems: vi.fn(async () => {
        lineItemsStarted = true;
        if (enrichStarted) bothStartedBeforeEitherFinished = true;
        await new Promise((r) => setTimeout(r, 30));
        order.push('lineItems');
        return [{ id: 'li1', opportunityId: 'o1' }];
      }),
      fetchListStatus: vi.fn(async () => ({ li1: { blacklisted: true } })),
    };

    const result = await runDealsBoardPagePipeline(deps, {
      limit: 50,
      offset: 0,
      orderBy: [{ loadDate: 'AscNullsLast' }],
      visibleCrmFieldNames: ['name'],
      includeCompanyRelation: false,
      restFieldNames: ['someLink'],
      includeListStatus: true,
    });

    expect(order[0]).toBe('gql');
    expect(bothStartedBeforeEitherFinished).toBe(true);
    expect(deps.fetchListStatus).not.toHaveBeenCalled();
    expect(result.listStatusByLineItemId).toBeUndefined();
    expect(result.opportunities).toHaveLength(1);
    expect(result.lineItemsByOppId.o1).toHaveLength(1);
  });

  it('skips enrich when restFieldNames empty', async () => {
    const enrichWithRest = vi.fn(async (rows: Array<Record<string, unknown>>) => rows);
    const result = await runDealsBoardPagePipeline(
      {
        queryOpportunities: async () => ({
          opportunities: { edges: [{ node: { id: 'o1' } }], totalCount: 1 },
        }),
        enrichWithRest,
        fetchLineItems: async () => [],
        fetchListStatus: vi.fn(),
      },
      {
        limit: 10,
        offset: 0,
        orderBy: [],
        visibleCrmFieldNames: ['name'],
        includeCompanyRelation: false,
        restFieldNames: [],
        includeListStatus: false,
      },
    );
    expect(enrichWithRest).not.toHaveBeenCalled();
    expect(result.totalCount).toBe(1);
  });
});
