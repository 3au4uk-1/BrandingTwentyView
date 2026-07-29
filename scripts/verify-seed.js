const fs = require("fs");
const path = require("path");

const mcp = JSON.parse(
  fs.readFileSync(path.join(process.env.USERPROFILE, ".cursor", "mcp.json"), "utf8"),
);
const token = mcp.mcpServers.twentylocal.headers.Authorization;
const map = JSON.parse(
  fs.readFileSync(path.join(__dirname, "seed-data", "id-map.json"), "utf8"),
);
const oppIds = Object.values(map.opportunities);

async function gql(query, variables) {
  const res = await fetch("http://localhost:2020/graphql", {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors, null, 2));
  return json.data;
}

function prefix(name) {
  const n = name || "";
  if (n.startsWith("ПРО/")) return "ПРО";
  if (n.startsWith("АРЕНДА/")) return "АРЕНДА";
  if (n.startsWith("АРТ/")) return "АРТ";
  if (n.startsWith("БС")) return "БС";
  if (n.startsWith("Биржа")) return "Биржа";
  return "OTHER";
}

(async () => {
  const data = await gql(
    `query($ids: [UUID!]!) {
      opportunities(filter: { id: { in: $ids } }, first: 100) {
        edges { node { id name stage companyId loadDate statusOplaty } }
      }
      dealLineItems(filter: { opportunityId: { in: $ids } }, first: 200) {
        edges { node { id opportunityId name stage tip amount { amountMicros } } }
      }
    }`,
    { ids: oppIds },
  );

  const opps = data.opportunities.edges.map((e) => e.node);
  const lines = data.dealLineItems.edges.map((e) => e.node);
  const stages = {};
  const prefs = {};
  for (const o of opps) {
    stages[o.stage] = (stages[o.stage] || 0) + 1;
    prefs[prefix(o.name)] = (prefs[prefix(o.name)] || 0) + 1;
  }
  const byOpp = {};
  for (const l of lines) byOpp[l.opportunityId] = (byOpp[l.opportunityId] || 0) + 1;

  console.log(
    JSON.stringify(
      {
        seededOpps: opps.length,
        expected: oppIds.length,
        stages,
        prefixes: prefs,
        withCompany: opps.filter((o) => o.companyId).length,
        lineItems: lines.length,
        oppsWithLines: Object.keys(byOpp).length,
        sample: opps.slice(0, 5).map((o) => ({
          stage: o.stage,
          name: o.name.slice(0, 60),
          loadDate: o.loadDate,
          statusOplaty: o.statusOplaty,
        })),
      },
      null,
      2,
    ),
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
