import { describe, expect, it, vi } from 'vitest';
import { runDealsBoardPagePipeline } from './deals-board-page-pipeline';

describe('runDealsBoardPagePipeline', () => {
  it('loads child smetas, enriches parents in parallel, then fetches line items for parents+children', async () => {
    const order: string[] = [];
    let enrichStarted = false;
    let childrenStarted = false;
    let bothStartedBeforeEitherFinished = false;

    const deps = {
      queryOpportunities: vi.fn(async (args: {
        filter?: Record<string, unknown>;
        nodeSelection?: Record<string, unknown>;
      }) => {
        const isChildQuery = Boolean(
          args.filter &&
            typeof args.filter === 'object' &&
            Array.isArray((args.filter as { and?: unknown[] }).and) &&
            (args.filter as { and: Array<Record<string, unknown>> }).and.some(
              (clause) => clause.parentOpportunityId,
            ),
        );

        if (isChildQuery) {
          childrenStarted = true;
          if (enrichStarted) bothStartedBeforeEitherFinished = true;
          await new Promise((r) => setTimeout(r, 30));
          order.push('children');
          return {
            opportunities: {
              edges: [
                {
                  node: {
                    id: 'child-1',
                    name: 'Смета 1',
                    parentOpportunityId: 'o1',
                  },
                },
              ],
              totalCount: 1,
            },
          };
        }

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
        if (childrenStarted) bothStartedBeforeEitherFinished = true;
        await new Promise((r) => setTimeout(r, 30));
        order.push('enrich');
        return rows;
      }),
      fetchLineItems: vi.fn(async (opportunityIds: string[]) => {
        order.push('lineItems');
        expect(opportunityIds).toEqual(['o1', 'child-1']);
        return [
          { id: 'li1', opportunityId: 'o1' },
          { id: 'li-child', opportunityId: 'child-1' },
        ];
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
    expect(order.indexOf('lineItems')).toBeGreaterThan(order.indexOf('children'));
    expect(deps.fetchListStatus).not.toHaveBeenCalled();
    expect(result.listStatusByLineItemId).toBeUndefined();
    expect(result.opportunities).toHaveLength(1);
    expect(result.opportunities[0].childSmetas).toEqual([
      expect.objectContaining({
        id: 'child-1',
        lineItems: [{ id: 'li-child', opportunityId: 'child-1' }],
      }),
    ]);
    expect(result.lineItemsByOppId['child-1']).toHaveLength(1);
  });

  it('skips enrich when restFieldNames empty and no children', async () => {
    const enrichWithRest = vi.fn(async (rows: Array<Record<string, unknown>>) => rows);
    const result = await runDealsBoardPagePipeline(
      {
        queryOpportunities: async (args) => {
          const isChildQuery = Boolean(
            args.filter &&
              typeof args.filter === 'object' &&
              Array.isArray((args.filter as { and?: unknown[] }).and) &&
              (args.filter as { and: Array<Record<string, unknown>> }).and.some(
                (clause) => clause.parentOpportunityId,
              ),
          );
          if (isChildQuery) {
            return { opportunities: { edges: [], totalCount: 0 } };
          }
          return {
            opportunities: { edges: [{ node: { id: 'o1' } }], totalCount: 1 },
          };
        },
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

  it('enriches child smetas via REST for tony/bitrix links, not GraphQL', async () => {
    const enrichWithRest = vi.fn(async (rows: Array<Record<string, unknown>>) =>
      rows.map((row) =>
        row.id === 'child-1'
          ? { ...row, tonyLink: { primaryLinkUrl: 'https://tony.example/1' } }
          : row,
      ),
    );

    const result = await runDealsBoardPagePipeline(
      {
        queryOpportunities: async (args) => {
          const isChildQuery = Boolean(
            args.filter &&
              typeof args.filter === 'object' &&
              Array.isArray((args.filter as { and?: unknown[] }).and) &&
              (args.filter as { and: Array<Record<string, unknown>> }).and.some(
                (clause) => clause.parentOpportunityId,
              ),
          );
          if (isChildQuery) {
            expect(args.nodeSelection).toEqual({
              id: true,
              name: true,
              parentOpportunityId: true,
            });
            expect(args.nodeSelection).not.toHaveProperty('tonyLink');
            expect(args.nodeSelection).not.toHaveProperty('bitrixLink');
            return {
              opportunities: {
                edges: [
                  {
                    node: {
                      id: 'child-1',
                      name: 'Смета 1',
                      parentOpportunityId: 'o1',
                    },
                  },
                ],
                totalCount: 1,
              },
            };
          }
          return {
            opportunities: {
              edges: [{ node: { id: 'o1', name: 'Deal' } }],
              totalCount: 1,
            },
          };
        },
        enrichWithRest,
        fetchLineItems: async () => [],
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

    expect(enrichWithRest).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 'child-1' })],
      ['tonyLink', 'bitrixLink'],
    );
    expect(result.opportunities[0].childSmetas?.[0]).toEqual(
      expect.objectContaining({
        id: 'child-1',
        tonyLink: { primaryLinkUrl: 'https://tony.example/1' },
      }),
    );
  });
});
