import {
  groupLineItemsByOpportunityId,
  resolveFieldTypesByName,
} from './deals-board-page-core';
import {
  buildOpportunityNodeSelection,
  CHILD_SMETA_NODE_SELECTION,
} from './deals-board-page-opportunity-selection';
import type {
  DealsBoardPageRequest,
  DealsBoardPageResponse,
  LineItemRowLike,
} from './deals-board-page-types';

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? value : []);

const normalizeOpportunityNode = (
  node: Record<string, unknown> & {
    company?: { id?: string; name?: string };
    closeDate?: string;
    loadDate?: string;
  },
): Record<string, unknown> => ({
  ...node,
  companyName: node.company?.name,
  loadDate: node.loadDate ?? node.closeDate,
});

const attachChildSmetas = (
  parents: Array<Record<string, unknown>>,
  children: Array<Record<string, unknown>>,
  lineItems: LineItemRowLike[],
): Array<Record<string, unknown>> => {
  const itemsByOpportunityId = new Map<string, LineItemRowLike[]>();
  for (const item of lineItems) {
    const bucket = itemsByOpportunityId.get(item.opportunityId);
    if (bucket) bucket.push(item);
    else itemsByOpportunityId.set(item.opportunityId, [item]);
  }

  const childrenByParentId = new Map<string, Array<Record<string, unknown>>>();
  for (const child of children) {
    const parentId =
      typeof child.parentOpportunityId === 'string' ? child.parentOpportunityId : '';
    if (!parentId) continue;
    const bucket = childrenByParentId.get(parentId);
    const withItems = {
      ...child,
      lineItems: itemsByOpportunityId.get(String(child.id)) ?? [],
    };
    if (bucket) bucket.push(withItems);
    else childrenByParentId.set(parentId, [withItems]);
  }

  return parents.map((parent) => {
    const parentId = typeof parent.id === 'string' ? parent.id : '';
    const childSmetas = childrenByParentId.get(parentId);
    if (!childSmetas?.length) return parent;
    return { ...parent, childSmetas };
  });
};

export type DealsBoardPagePipelineQueryArgs = {
  first: number;
  offset: number;
  orderBy: Array<Record<string, string>>;
  filter?: Record<string, unknown>;
  nodeSelection: Record<string, unknown>;
};

export type DealsBoardPagePipelineDeps = {
  queryOpportunities: (args: DealsBoardPagePipelineQueryArgs) => Promise<{
    opportunities?: { edges?: Array<{ node: Record<string, unknown> }>; totalCount?: number };
  }>;
  enrichWithRest: (
    rows: Array<Record<string, unknown>>,
    restFieldNames: string[],
  ) => Promise<Array<Record<string, unknown>>>;
  fetchLineItems: (opportunityIds: string[]) => Promise<LineItemRowLike[]>;
  fetchListStatus?: (ids: string[]) => Promise<Record<string, unknown> | undefined>;
};

export const runDealsBoardPagePipeline = async (
  deps: DealsBoardPagePipelineDeps,
  body: DealsBoardPageRequest,
): Promise<DealsBoardPageResponse> => {
  const t0 = Date.now();
  let gqlMs = 0;
  let enrichMs = 0;
  let lineItemsMs = 0;

  const nodeSelection = buildOpportunityNodeSelection(
    body.visibleCrmFieldNames ?? [],
    body.includeCompanyRelation ?? false,
    resolveFieldTypesByName(body.fieldTypesByName),
  );

  const gqlStart = Date.now();
  const result = await deps.queryOpportunities({
    first: body.limit,
    offset: body.offset,
    orderBy: body.orderBy,
    filter: body.opportunityFilter,
    nodeSelection,
  });
  gqlMs = Date.now() - gqlStart;

  const edges = asArray<{ node: Record<string, unknown> }>(result.opportunities?.edges);
  const rows = edges.map((edge) => normalizeOpportunityNode(edge.node));

  const opportunityIds = rows
    .map((record) => (typeof record.id === 'string' ? record.id : ''))
    .filter(Boolean);

  const restFieldNames = body.restFieldNames ?? [];

  const enrichStart = Date.now();
  const enrichPromise = restFieldNames.length
    ? deps.enrichWithRest(rows, restFieldNames).then((opportunities) => {
        enrichMs = Date.now() - enrichStart;
        return opportunities;
      })
    : Promise.resolve(rows);

  const childrenPromise =
    opportunityIds.length > 0
      ? deps
          .queryOpportunities({
            first: Math.max(opportunityIds.length * 10, 50),
            offset: 0,
            orderBy: [{ name: 'AscNullsFirst' }],
            filter: { and: [{ parentOpportunityId: { in: opportunityIds } }] },
            nodeSelection: CHILD_SMETA_NODE_SELECTION,
          })
          .then((childResult) =>
            asArray<{ node: Record<string, unknown> }>(childResult.opportunities?.edges).map(
              (edge) => normalizeOpportunityNode(edge.node),
            ),
          )
      : Promise.resolve([] as Array<Record<string, unknown>>);

  const [enrichedParents, childRows] = await Promise.all([enrichPromise, childrenPromise]);

  const childIds = childRows
    .map((record) => (typeof record.id === 'string' ? record.id : ''))
    .filter(Boolean);

  const lineItemsStart = Date.now();
  const lineItems = await deps
    .fetchLineItems([...opportunityIds, ...childIds])
    .then((items) => {
      lineItemsMs = Date.now() - lineItemsStart;
      return items;
    });

  const opportunities = attachChildSmetas(enrichedParents, childRows, lineItems);

  const response: DealsBoardPageResponse = {
    opportunities,
    totalCount: result.opportunities?.totalCount ?? 0,
    lineItemsByOppId: groupLineItemsByOpportunityId(lineItems),
  };

  if (body.debug) {
    response._timings = {
      gqlMs,
      enrichMs,
      lineItemsMs,
      totalMs: Date.now() - t0,
    };
  }

  return response;
};
