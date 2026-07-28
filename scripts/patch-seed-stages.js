/**
 * Restore opportunity.stage from scripts/seed-data/selected-opps.json (by name).
 */
const fs = require('fs');
const path = require('path');
const { LOCAL_GRAPHQL, getLocalToken } = require('./lib/tokens');

const LOCAL = { url: LOCAL_GRAPHQL, token: getLocalToken() };
const picked = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'seed-data', 'selected-opps.json'), 'utf8'),
);
const stageByName = new Map(picked.map((o) => [o.name, o.stage]));

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

(async () => {
  const data = await gql(`{
    opportunities(first: 100) {
      edges { node { id name stage } }
    }
  }`);

  let updated = 0;
  const summary = {};
  for (const edge of data.opportunities.edges) {
    const opp = edge.node;
    const targetStage = stageByName.get(opp.name);
    if (!targetStage || opp.stage === targetStage) continue;
    await gql(
      `mutation($id: UUID!, $stage: String!) {
        updateOpportunity(id: $id, data: { stage: $stage }) { id stage }
      }`,
      { id: opp.id, stage: targetStage },
    );
    updated += 1;
    summary[targetStage] = (summary[targetStage] || 0) + 1;
  }

  console.log('restored opportunity stages:', updated, summary);
})().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});
