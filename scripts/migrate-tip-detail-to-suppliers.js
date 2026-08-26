/**
 * Idempotent seed of suppliers for banner/contractor/film/production/restoration
 * + backfill dealLineItem.supplierId from tipDetail.
 * Token from ~/.cursor/mcp.json (never commit secrets).
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
  { tipDetail: 'NASHI', name: 'Наши', category: 'PLENKA' },
  { tipDetail: 'NE_NASHI', name: 'Не наши', category: 'PLENKA' },
  { tipDetail: 'NASHI', name: 'Наши', category: 'RESTAVRACIYA' },
  { tipDetail: 'NE_NASHI', name: 'Не наши', category: 'RESTAVRACIYA' },
  { tipDetail: 'ROLL_UP', name: 'Ролл-ап', category: 'PROIZVODSTVO' },
  { tipDetail: 'POP_UP', name: 'Поп-ап', category: 'PROIZVODSTVO' },
  { tipDetail: 'PROMO_STOYKA', name: 'Промо-стойка', category: 'PROIZVODSTVO' },
  { tipDetail: 'PROIZVODSTVO_DRUGOE', name: 'Другое', category: 'PROIZVODSTVO' },
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

  for (let attempt = 0; attempt < 8; attempt += 1) {
    let res;
    let text;
    try {
      res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${LOCAL.token}`,
          'Content-Type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      text = await res.text();
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
      if (attempt === 7) throw error;
      continue;
    }
    let json = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        if (res.status === 502 || res.status === 503) {
          await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
          continue;
        }
        throw new Error(`Non-JSON ${res.status} ${method} ${url.pathname}: ${text.slice(0, 400)}`);
      }
    }
    if (res.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 65000));
      continue;
    }
    if (res.status === 502 || res.status === 503) {
      await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
      continue;
    }
    if (!res.ok) {
      throw new Error(`${res.status} ${method} ${url.pathname}: ${text.slice(0, 600)}`);
    }
    return json;
  }
  throw new Error(`Exhausted retries ${method} ${url.pathname}`);
}

async function fetchAllPages(pathname, collectionKey, extraQuery) {
  const all = [];
  let after;
  for (;;) {
    const body = await rest('GET', pathname, {
      query: { limit: PAGE_LIMIT, ...extraQuery, ...(after ? { after } : {}) },
    });
    const page = unwrapList(body, collectionKey);
    if (page.length === 0) break;
    all.push(...page);
    const pageInfo = extractPageInfo(body);
    const next = resolveNextCursor(after, pageInfo);
    if (next) {
      after = next;
      continue;
    }
    // Some Twenty REST responses omit hasNextPage while more rows remain.
    if (page.length >= PAGE_LIMIT && pageInfo.endCursor && String(pageInfo.endCursor) !== after) {
      after = String(pageInfo.endCursor);
      continue;
    }
    break;
  }
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

  const groups = new Map();
  for (const supplier of suppliers) {
    const key = `${supplier.category}::${normalizeSupplierName(supplier.name).toLocaleLowerCase('ru-RU')}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(supplier);
  }
  let collapsed = 0;
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const keep =
      group.find((row) => row.isActive) ??
      group[0];
    for (const dup of group) {
      if (dup.id === keep.id || !dup.isActive) continue;
      await rest('PATCH', `/suppliers/${dup.id}`, { body: { isActive: false } });
      dup.isActive = false;
      collapsed += 1;
    }
  }

  const byTipDetail = new Map();
  for (const row of TIP_DETAIL_TO_SUPPLIER) {
    const match = findSupplierByNameAndCategory(suppliers, row.name, row.category);
    if (!match) {
      throw new Error(`Supplier missing after upsert: ${row.name} / ${row.category}`);
    }
    byTipDetail.set(`${row.category}::${row.tipDetail}`, match.id);
  }

  // Cursor pagination over tip filters can loop; drain NULL supplierId pages instead.
  let patched = 0;
  let skipped = 0;
  let scanned = 0;

  for (const row of TIP_DETAIL_TO_SUPPLIER) {
    const supplierId = byTipDetail.get(`${row.category}::${row.tipDetail}`);
    if (!supplierId) {
      throw new Error(`Missing supplier map for ${row.category}::${row.tipDetail}`);
    }
    for (;;) {
      const body = await rest('GET', '/dealLineItems', {
        query: {
          limit: 50,
          depth: 0,
          filter: `and(tip[eq]:"${row.category}",tipDetail[eq]:"${row.tipDetail}",supplierId[is]:NULL)`,
        },
      });
      const page = unwrapList(body, 'dealLineItems');
      if (page.length === 0) break;
      scanned += page.length;
      let progressed = 0;
      for (const item of page) {
        if (!item || typeof item.id !== 'string') {
          skipped += 1;
          continue;
        }
        if (resolveSupplierId(item)) {
          skipped += 1;
          continue;
        }
        await rest('PATCH', `/dealLineItems/${item.id}`, { body: { supplierId } });
        patched += 1;
        progressed += 1;
        await new Promise((resolve) => setTimeout(resolve, 650));
      }
      if (progressed === 0) {
        // Avoid infinite loops if API keeps returning unpatchable rows.
        skipped += page.length;
        break;
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        created,
        reused,
        collapsed,
        patched,
        skipped,
        scanned,
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
