/**
 * Apply tip-from-name rules to all local dealLineItems (one-shot after reseed).
 */
const fs = require('fs');
const path = require('path');

const mcp = JSON.parse(
  fs.readFileSync(path.join(process.env.USERPROFILE, '.cursor', 'mcp.json'), 'utf8'),
);

const LOCAL = {
  url: 'http://localhost:2020/graphql',
  token: mcp.mcpServers.twentylocal.headers.Authorization.replace(/^Bearer\s+/i, ''),
};

const RULES = [
  { tip: 'RESTAVRACIYA', needles: ['реставрац'] },
  { tip: 'PODRYAD', needles: ['подряд'] },
  { tip: 'PROIZVODSTVO', needles: ['производств'] },
  { tip: 'BANNERA', needles: ['баннер'] },
  { tip: 'PLENKA', needles: ['брендинг', 'оклейк', 'плёнк', 'пленк'] },
];

const infer = (name) => {
  const n = (name || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!n) return null;
  for (const rule of RULES) {
    if (rule.needles.some((needle) => n.includes(needle))) return rule.tip;
  }
  return null;
};

async function gql(query, variables = {}) {
  const res = await fetch(LOCAL.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOCAL.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(JSON.stringify(json.errors, null, 2));
  return json.data;
}

async function fetchAllLines() {
  const all = [];
  let after;
  for (;;) {
    const data = await gql(
      `query ($after: String) {
        dealLineItems(first: 100, after: $after) {
          pageInfo { hasNextPage endCursor }
          edges { node { id name tip } }
        }
      }`,
      { after },
    );
    for (const edge of data.dealLineItems.edges) all.push(edge.node);
    if (!data.dealLineItems.pageInfo.hasNextPage) break;
    after = data.dealLineItems.pageInfo.endCursor;
  }
  return all;
}

(async () => {
  const lines = await fetchAllLines();
  const patches = [];
  for (const line of lines) {
    const tip = infer(line.name);
    if (tip && tip !== line.tip) patches.push({ id: line.id, tip });
  }
  console.log('lines', lines.length, 'toFix', patches.length);

  let ok = 0;
  let fail = 0;
  for (const patch of patches) {
    try {
      await gql(
        `mutation ($id: UUID!, $data: DealLineItemUpdateInput!) {
          updateDealLineItem(id: $id, data: $data) { id tip }
        }`,
        { id: patch.id, data: { tip: patch.tip } },
      );
      ok += 1;
    } catch (error) {
      fail += 1;
      if (fail <= 3) console.warn('fail', String(error.message).slice(0, 200));
    }
  }
  console.log('updated', ok, 'failed', fail);

  const after = await fetchAllLines();
  const dist = {};
  for (const line of after) {
    const tip = line.tip || 'null';
    dist[tip] = (dist[tip] || 0) + 1;
  }
  console.log('tipDist', dist);
})().catch((error) => {
  console.error('FATAL', error);
  process.exit(1);
});
