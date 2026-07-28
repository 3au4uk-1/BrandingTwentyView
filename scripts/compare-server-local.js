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

async function gql(ep, query, variables) {
  const res = await fetch(ep.url, {
    method: "POST",
    headers: {
      Authorization: ep.token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(JSON.stringify(json.errors, null, 2));
  }
  return json.data;
}

async function fieldOptions(ep, objectName, fieldNames) {
  const data = await gql(
    ep,
    `query($name: String!) {
      object(filter: { nameSingular: { eq: $name } }) {
        nameSingular
        fieldsList {
          name
          type
          options
        }
      }
    }`,
    { name: objectName },
  ).catch(async () => {
    // fallback: metadata via objects
    return null;
  });
  if (!data?.object) return null;
  const fields = data.object.fieldsList || [];
  const out = {};
  for (const name of fieldNames) {
    const f = fields.find((x) => x.name === name);
    out[name] = f
      ? {
          type: f.type,
          options: (f.options || []).map((o) => o.value ?? o),
        }
      : null;
  }
  return out;
}

(async () => {
  for (const [name, ep] of Object.entries(endpoints)) {
    const counts = await gql(
      ep,
      `{
        opportunities(first: 1) { totalCount }
        dealLineItems(first: 1) { totalCount }
      }`,
    );
    console.log(
      name,
      "opps=",
      counts.opportunities.totalCount,
      "lines=",
      counts.dealLineItems.totalCount,
    );

    // Sample stages/tips distribution
    const lines = await gql(
      ep,
      `{
        dealLineItems(first: 50) {
          edges { node { stage tip } }
        }
        opportunities(first: 50) {
          edges { node { stage } }
        }
      }`,
    );
    const tip = {};
    const lineStage = {};
    const oppStage = {};
    for (const e of lines.dealLineItems.edges) {
      tip[e.node.tip || "null"] = (tip[e.node.tip || "null"] || 0) + 1;
      lineStage[e.node.stage || "null"] = (lineStage[e.node.stage || "null"] || 0) + 1;
    }
    for (const e of lines.opportunities.edges) {
      oppStage[e.node.stage || "null"] = (oppStage[e.node.stage || "null"] || 0) + 1;
    }
    console.log(name, "sample tip", tip);
    console.log(name, "sample lineStage", lineStage);
    console.log(name, "sample oppStage", oppStage);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
