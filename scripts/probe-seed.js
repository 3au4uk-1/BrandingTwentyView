const fs = require("fs");
const path = require("path");

const mcp = JSON.parse(
  fs.readFileSync(path.join(process.env.USERPROFILE, ".cursor", "mcp.json"), "utf8"),
);
const LOCAL = {
  url: "http://localhost:2020/graphql",
  token: mcp.mcpServers.twentylocal.headers.Authorization.replace(/^Bearer\s+/i, ""),
};
const SERVER = {
  url: "https://twenty.dosugmayak.ru/graphql",
  token: mcp.mcpServers.twentyserver.headers.Authorization.replace(/^Bearer\s+/i, ""),
};

async function gql(ep, query, variables = {}) {
  const res = await fetch(ep.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ep.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(JSON.stringify(json.errors, null, 2));
  return json.data;
}

(async () => {
  const t = await gql(
    LOCAL,
    `{ __type(name: "Mutation") { fields { name } } }`,
  );
  console.log(
    "mutations:",
    t.__type.fields
      .map((f) => f.name)
      .filter((n) => /dealLine|DealLine|opportunity|Opportunity|company|Company/i.test(n))
      .join("\n"),
  );
  const inp = await gql(LOCAL, `{ __type(name: "DealLineItemCreateInput") { inputFields { name } } }`);
  console.log(
    "CREATE_INPUT",
    (inp.__type?.inputFields || []).map((f) => f.name).join(","),
  );

  // Count local
  const local = await gql(
    LOCAL,
    `{
      opportunities(first: 1) { totalCount }
      dealLineItems(first: 1) { totalCount }
    }`,
  );
  console.log("local totals", {
    opps: local.opportunities.totalCount,
    lines: local.dealLineItems.totalCount,
  });

  // Sample server deals that have line items with stage+comment
  const sample = await gql(
    SERVER,
    `{
      dealLineItems(
        filter: {
          and: [
            { stage: { is: NOT_NULL } }
            { kommentariy: { is: NOT_NULL } }
            { kommentariy: { neq: "" } }
          ]
        }
        first: 80
        orderBy: [{ createdAt: DescNullsLast }]
      ) {
        edges {
          node {
            id name stage tip kommentariy opportunityId
            opportunity { id name stage loadDate }
          }
        }
      }
    }`,
  );
  const edges = sample.dealLineItems.edges.map((e) => e.node);
  const byOpp = new Map();
  for (const li of edges) {
    if (!li.opportunityId) continue;
    const arr = byOpp.get(li.opportunityId) || [];
    arr.push(li);
    byOpp.set(li.opportunityId, arr);
  }
  console.log("server sample line items", edges.length, "unique opps", byOpp.size);
  console.log(
    "sample opp",
    [...byOpp.entries()].slice(0, 3).map(([id, items]) => ({
      id,
      name: items[0].opportunity?.name,
      items: items.length,
      stages: [...new Set(items.map((i) => i.stage))],
    })),
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
