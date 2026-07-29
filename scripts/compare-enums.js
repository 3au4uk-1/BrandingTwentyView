const fs = require("fs");
const path = require("path");

const mcp = JSON.parse(
  fs.readFileSync(path.join(process.env.USERPROFILE, ".cursor", "mcp.json"), "utf8"),
);

const endpoints = {
  server: {
    url: "https://twenty.dosugmayak.ru/graphql",
    token: mcp.mcpServers.twentyserver.headers.Authorization,
  },
  local: {
    url: "http://localhost:2020/graphql",
    token: mcp.mcpServers.twentylocal.headers.Authorization,
  },
};

async function gql(ep, query) {
  const res = await fetch(ep.url, {
    method: "POST",
    headers: {
      Authorization: ep.token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(JSON.stringify(json.errors, null, 2));
  return json.data;
}

async function enumValues(ep, typeName) {
  const data = await gql(
    ep,
    `{ __type(name: "${typeName}") { enumValues { name } } }`,
  );
  return (data.__type?.enumValues || []).map((v) => v.name).sort();
}

(async () => {
  for (const [name, ep] of Object.entries(endpoints)) {
    const tip = await enumValues(ep, "DealLineItemTipEnum").catch((e) => e.message);
    const stage = await enumValues(ep, "DealLineItemStageEnum").catch((e) => e.message);
    const oppStage = await enumValues(ep, "OpportunityStageEnum").catch((e) => e.message);
    console.log("\n==", name);
    console.log("tip", tip);
    console.log("lineStage", stage);
    console.log("oppStage", oppStage);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
