import { RestApiClient } from 'twenty-client-sdk/rest';

import type { RestorationMaketCatalogEntry } from 'src/constants/standard-restoration-makets';

import { normalizeRestListResponse } from './rest-list';

const PAGE_LIMIT = 200;

let restClient: RestApiClient | null = null;

const getRestClient = (): RestApiClient => {
  if (!restClient) restClient = new RestApiClient();
  return restClient;
};

const readMaketUrl = (maketUrl: unknown): string | null => {
  if (!maketUrl || typeof maketUrl !== 'object') return null;
  const url = (maketUrl as { primaryLinkUrl?: unknown }).primaryLinkUrl;
  return typeof url === 'string' && url.trim() ? url.trim() : null;
};

export const mapRestorationTemplateRow = (
  raw: unknown,
): RestorationMaketCatalogEntry | null => {
  if (!raw || typeof raw !== 'object') return null;

  const row = raw as Record<string, unknown>;
  if (typeof row.id !== 'string') return null;
  if (row.isActive === false) return null;

  const url = readMaketUrl(row.maketUrl);
  if (!url) return null;

  const name = typeof row.name === 'string' ? row.name.trim() : '';
  if (!name) return null;

  return {
    id: row.id,
    label: name,
    url,
    matchKeywords:
      typeof row.matchKeywords === 'string' ? row.matchKeywords : undefined,
    priority: typeof row.priority === 'number' ? row.priority : undefined,
    isDefault: row.isDefault === true,
    isActive: row.isActive !== false,
  };
};

export const mapRestorationTemplateRows = (
  items: unknown[],
): RestorationMaketCatalogEntry[] =>
  items
    .map(mapRestorationTemplateRow)
    .filter((entry): entry is RestorationMaketCatalogEntry => entry !== null);

type RestorationTemplatesRestClient = Pick<RestApiClient, 'get'>;

export const fetchRestorationTemplatesCatalogWithClient = async (
  client: RestorationTemplatesRestClient,
): Promise<RestorationMaketCatalogEntry[]> => {
  const response = await client.get<unknown>('/rest/restorationTemplates', {
    query: { limit: PAGE_LIMIT },
  });

  return mapRestorationTemplateRows(
    normalizeRestListResponse<unknown>(response, 'restorationTemplates'),
  );
};

export const fetchRestorationTemplatesCatalog = async (): Promise<
  RestorationMaketCatalogEntry[]
> => fetchRestorationTemplatesCatalogWithClient(getRestClient());
