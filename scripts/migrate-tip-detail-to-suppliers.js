/**
 * Idempotent seed of banner/contractor suppliers + backfill dealLineItem.supplierId
 * from tipDetail. Token from ~/.cursor/mcp.json (never commit secrets).
 *
 * Default: local Twenty http://localhost:2020
 * Staging/prod: TWENTY_API_URL=https://twenty-staging.dosugmayak.ru node scripts/migrate-tip-detail-to-suppliers.js
 * Does not delete or rewrite tipDetail — only fills empty supplierId.
 */
const fs = require('fs');
const path = require('path');

const LOCAL_BASE = process.env.TWENTY_API_URL || 'http://localhost:2020';
const PAGE_LIMIT = 200;

const TIP_DETAIL_TO_SUPPLIER = [
  { tipDetail: 'YURA', name: 'Юра', category: 'BANNERA' },
  { tipDetail: 'MAGA', name: 'Мага', category: 'BANNERA' },
  { tipDetail: 'TOPILSKIY', name: 'Топильский', category: 'BANNERA' },
  { tipDetail: 'GLAV_PRINT', name: 'Глав принт', category: 'PODRYAD' },
  { tipDetail: 'PASHA_VINDER', name: 'Паша виндер', category: 'PODRYAD' },
  { tipDetail: 'ZARYA', name: 'Заря', category: 'PODRYAD' },
  { tipDetail: 'LIZA_SUKNO', name: 'Лиза сукно', category: 'PODRYAD' },
  { tipDetail: 'KUVALDIN_KLISHE', name: 'Кувалдин клише', category: 'PODRYAD' },
  { tipDetail: 'SVOE', name: 'Своё', category: 'PODRYAD' },
];

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function stripBearer(raw) {
  if (!raw) return null;
  return String(raw).replace(/^Bearer\s+/i, '').trim() || null;
}

/** Local token by default. Staging/prod: same workspace API key as MCP `twenty` when TWENTY_API_URL is set. */
function getApiToken() {
  const mcp = readJson(path.join(process.env.USERPROFILE, '.cursor', 'mcp.json'));
  if (process.env.TWENTY_API_URL) {
    const remote = stripBearer(mcp?.mcpServers?.twenty?.headers?.Authorization);
    if (remote) return remote;
  }

  const mcpLocal = stripBearer(mcp?.mcpServers?.twentylocal?.headers?.Authorization);
  if (mcpLocal) return mcpLocal;

  const cfg = readJson(path.join(process.env.USERPROFILE, '.twenty', 'config.json'));
  const remote = cfg?.remotes?.localhost || cfg?.remotes?.local;
  return stripBearer(remote?.twentyCLIAccessToken || remote?.appAccessToken || remote?.apiKey);
}

const LOCAL = {
  url: `${LOCAL_BASE.replace(/\/$/, '')}/rest`,
  token: getApiToken(),
};

function normalizeSupplierName(raw) {
  return String(raw || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function supplierNamesEqual(a, b) {
  return (
    normalizeSupplierName(a).toLocaleLowerCase('ru-RU') ===
    normalizeSupplierName(b).toLocaleLowerCase('ru-RU')
  );
}

function findSupplierByNameAndCategory(list, name, category) {
  return list.find(
    (row) =>
      row.category === category && supplierNamesEqual(row.name, normalizeSupplierName(name)),
  );
}

function unwrapList(body, collectionKey) {
  if (Array.isArray(body)) return body;
  if (!body || typeof body !== 'object') return [];
  if (Array.isArray(body.data)) return body.data;
  if (body.data && typeof body.data === 'object' && Array.isArray(body.data[collectionKey])) {
    return body.data[collectionKey];
  }
  if (Array.isArray(body[collectionKey])) return body[collectionKey];
  return [];
}

function extractPageInfo(body) {
  if (!body || typeof body !== 'object') return {};
  const pageInfo = body.pageInfo;
  if (!pageInfo || typeof pageInfo !== 'object') return {};
  return pageInfo;
}

function resolveNextCursor(previousCursor, pageInfo) {
  if (!pageInfo.hasNextPage || pageInfo.endCursor == null || pageInfo.endCursor === '') {
    return undefined;
  }
  const next = String(pageInfo.endCursor);
  if (previousCursor !== undefined && next === previousCursor) return undefined;
  return next;
}

function mapSupplier(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || typeof raw.name !== 'string') {
    return null;
  }
  return {
    id: raw.id,
    name: raw.name,
    category: typeof raw.category === 'string' ? raw.category : null,
    isActive: raw.isActive !== false,
  };
}

function resolveSupplierId(item) {
  if (typeof item.supplierId === 'string' && item.supplierId) return item.supplierId;
  const nested = item.supplier;
  if (nested && typeof nested === 'object' && typeof nested.id === 'string' && nested.id) {
    return nested.id;
  }
  return null;
}

async function rest(method, pathname, { query, body } = {}) {
  const url = new URL(`${LOCAL.url}${pathname.startsWith('/') ? pathname : `/${pathname}`}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${LOCAL.token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Non-JSON ${res.status} ${method} ${url.pathname}: ${text.slice(0, 400)}`);
    }
  }
  if (!res.ok) {
    throw new Error(`${res.status} ${method} ${url.pathname}: ${text.slice(0, 600)}`);
  }
  return json;
}

async function fetchAllPages(pathname, collectionKey, extraQuery) {
  const all = [];
  let after;
  do {
    const body = await rest('GET', pathname, {
      query: { limit: PAGE_LIMIT, ...extraQuery, ...(after ? { after } : {}) },
    });
    all.push(...unwrapList(body, collectionKey));
    after = resolveNextCursor(after, extractPageInfo(body));
  } while (after);
  return all;
}

async function main() {
  if (!LOCAL.token) {
    console.error('Missing local token (mcp twentylocal or ~/.twenty remotes.localhost)');
    process.exit(1);
  }

  const existingRaw = await fetchAllPages('/suppliers', 'suppliers', { depth: 0 });
  const suppliers = existingRaw.map(mapSupplier).filter(Boolean);
  let created = 0;
  let reused = 0;

  for (const row of TIP_DETAIL_TO_SUPPLIER) {
    const match = findSupplierByNameAndCategory(suppliers, row.name, row.category);
    if (match) {
      reused += 1;
      continue;
    }
    const createdBody = await rest('POST', '/suppliers', {
      body: { name: row.name, category: row.category, isActive: true },
    });
    const record =
      createdBody?.data?.supplier ??
      createdBody?.data?.createSupplier ??
      createdBody?.supplier ??
      createdBody?.createSupplier ??
      createdBody?.data ??
      createdBody;
    const mapped = mapSupplier(record);
    if (!mapped) {
      throw new Error(`Create supplier failed for ${row.name} / ${row.category}: ${JSON.stringify(createdBody)}`);
    }
    suppliers.push(mapped);
    created += 1;
  }

  const byTipDetail = new Map();
  for (const row of TIP_DETAIL_TO_SUPPLIER) {
    const match = findSupplierByNameAndCategory(suppliers, row.name, row.category);
    if (!match) {
      throw new Error(`Supplier missing after upsert: ${row.name} / ${row.category}`);
    }
    byTipDetail.set(row.tipDetail, match.id);
  }

  const lineItems = await fetchAllPages('/dealLineItems', 'dealLineItems', {
    depth: 1,
    filter: 'tip[in]:["BANNERA","PODRYAD"]',
  });

  let patched = 0;
  let skipped = 0;

  for (const item of lineItems) {
    if (!item || typeof item.id !== 'string') {
      skipped += 1;
      continue;
    }
    if (resolveSupplierId(item)) {
      skipped += 1;
      continue;
    }
    if (item.tipDetail === 'KTO_EDET') {
      skipped += 1;
      continue;
    }
    const supplierId =
      typeof item.tipDetail === 'string'
        ? byTipDetail.get(item.tipDetail) ??
          findSupplierByNameAndCategory(
            suppliers,
            TIP_DETAIL_TO_SUPPLIER.find((row) => row.tipDetail === item.tipDetail)?.name ??
              item.tipDetail,
            typeof item.tip === 'string' ? item.tip : '',
          )?.id
        : undefined;
    if (!supplierId) {
      skipped += 1;
      continue;
    }
    await rest('PATCH', `/dealLineItems/${item.id}`, { body: { supplierId } });
    patched += 1;
  }

  console.log(
    JSON.stringify(
      {
        created,
        reused,
        patched,
        skipped,
        lineItems: lineItems.length,
        suppliers: suppliers.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error('FATAL', error);
  process.exit(1);
});
