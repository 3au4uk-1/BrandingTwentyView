const fs = require("fs");
const path = require("path");
const mcp = JSON.parse(
  fs.readFileSync(path.join(process.env.USERPROFILE, ".cursor", "mcp.json"), "utf8"),
);
const token = mcp.mcpServers.twentylocal.headers.Authorization;

async function main() {
  const res = await fetch("http://localhost:2020/metadata", {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query {
        objects(paging: { first: 100 }) {
          edges {
            node {
              nameSingular
              fieldsList { name label type }
            }
          }
        }
      }`,
    }),
  });
  const json = await res.json();
  if (json.errors) {
    console.log(JSON.stringify(json.errors, null, 2));
    return;
  }
  const edge = json.data.objects.edges.find((e) => e.node.nameSingular === "dealLineItem");
  const fields = edge?.node?.fieldsList || [];
  for (const f of fields.filter((x) =>
    ["tip", "stage", "name", "plenka", "kolichestvo", "amount"].includes(x.name),
  )) {
    console.log(f.name, "=>", JSON.stringify(f.label), [...f.label].map((c) => c.codePointAt(0).toString(16)).join(" "));
  }
}
main().catch(console.error);
