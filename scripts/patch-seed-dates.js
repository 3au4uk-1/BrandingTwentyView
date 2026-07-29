/**
 * Spread loadDate on seeded opportunities for date-preset testing
 * (today / tomorrow / day after / rest of week).
 */
const { LOCAL_GRAPHQL, getLocalToken } = require('./lib/tokens');

const LOCAL = {
  url: LOCAL_GRAPHQL,
  token: getLocalToken(),
};

if (!LOCAL.token) {
  console.error('Missing local token');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gql(query, variables = {}, attempt = 1) {
  const res = await fetch(LOCAL.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOCAL.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) {
    if (attempt < 3) {
      await sleep(attempt * 1000);
      return gql(query, variables, attempt + 1);
    }
    throw new Error(JSON.stringify(json.errors, null, 2));
  }
  return json.data;
}

const localMidnightIso = (dayOffset) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString();
};

const buildDatePlan = (count) => {
  const buckets = [
  { offset: 0, quota: Math.min(15, count) },
  { offset: 1, quota: Math.min(12, count) },
  { offset: 2, quota: Math.min(10, count) },
  { offset: 3, quota: Math.min(6, count) },
  { offset: 4, quota: Math.min(4, count) },
  { offset: 5, quota: Math.min(3, count) },
  ];
  const offsets = [];
  for (const bucket of buckets) {
    for (let i = 0; i < bucket.quota; i += 1) offsets.push(bucket.offset);
  }
  while (offsets.length < count) offsets.push(6);
  return offsets.slice(0, count);
};

(async () => {
  const data = await gql(`{
    opportunities(first: 100, orderBy: [{ createdAt: AscNullsLast }]) {
      edges { node { id name loadDate } }
    }
  }`);
  const opps = data.opportunities.edges.map((e) => e.node);
  if (!opps.length) {
    console.log('No opportunities to patch');
    return;
  }

  const offsets = buildDatePlan(opps.length);
  const summary = { today: 0, tomorrow: 0, dayAfter: 0, week: 0 };

  for (let i = 0; i < opps.length; i += 1) {
    const offset = offsets[i];
    const loadDate = localMidnightIso(offset);
    await gql(
      `mutation($id: UUID!, $loadDate: DateTime!) {
        updateOpportunity(id: $id, data: { loadDate: $loadDate }) { id loadDate }
      }`,
      { id: opps[i].id, loadDate },
    );
    if (offset === 0) summary.today += 1;
    else if (offset === 1) summary.tomorrow += 1;
    else if (offset === 2) summary.dayAfter += 1;
    else summary.week += 1;
  }

  console.log('Patched loadDate for', opps.length, 'opportunities', summary);
})().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});
