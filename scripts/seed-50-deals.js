/**
 * Seed 50 diverse deals from twentyserver -> twentylocal via GraphQL REST.
 * Reads API keys from ~/.cursor/mcp.json
 */
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

const ROOT = path.join(__dirname, "..");
const SEED = path.join(__dirname, "seed-data");
const mcp = JSON.parse(
  fs.readFileSync(path.join(process.env.USERPROFILE, ".cursor", "mcp.json"), "utf8"),
);

const SERVER = {
  url: "https://twenty.dosugmayak.ru/graphql",
  token: mcp.mcpServers.twentyserver.headers.Authorization.replace(/^Bearer\s+/i, ""),
};
const LOCAL = {
  url: "http://localhost:2020/graphql",
  token: mcp.mcpServers.twentylocal.headers.Authorization.replace(/^Bearer\s+/i, ""),
};

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function gql(endpoint, query, variables = {}, attempt = 1) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${endpoint.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Non-JSON ${res.status}: ${text.slice(0, 500)}`);
    }
    if (json.errors?.length) {
      throw new Error(JSON.stringify(json.errors, null, 2));
    }
    return json.data;
  } catch (err) {
    if (attempt < 4) {
      const wait = attempt * 2000;
      console.warn(`gql retry ${attempt} after error:`, err.cause?.code || err.message);
      await sleep(wait);
      return gql(endpoint, query, variables, attempt + 1);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function prefix(name) {
  const n = (name || "").trim();
  if (n.startsWith("ПРО/")) return "ПРО";
  if (n.startsWith("АРЕНДА/")) return "АРЕНДА";
  if (n.startsWith("АРТ/")) return "АРТ";
  if (n.startsWith("БС/") || n.startsWith("БС ")) return "БС";
  if (n.startsWith("Биржа")) return "Биржа";
  return "OTHER";
}

function cleanLink(link) {
  if (!link || typeof link !== "object") return undefined;
  const url = (link.primaryLinkUrl || "").trim();
  if (!url || !/^https?:\/\//i.test(url)) return undefined;
  return {
    primaryLinkLabel: link.primaryLinkLabel || "",
    primaryLinkUrl: url,
    secondaryLinks: Array.isArray(link.secondaryLinks) ? link.secondaryLinks : [],
  };
}

function cleanLinksField(link) {
  // deal line item ssylkaNaMakety is LINKS type
  return cleanLink(link) || undefined;
}

async function fetchOppsByStage(stage, limit) {
  const data = await gql(
    SERVER,
    `query($stage: String!, $limit: Int!) {
      opportunities(
        filter: { stage: { eq: $stage } }
        orderBy: [{ createdAt: DescNullsLast }]
        first: $limit
      ) {
        edges {
          node {
            id name stage companyId loadDate closeDate stageZakreplen
            statusOplaty arrivalTime readyTime workTime dismantleTime
            ssylkaNaMakety oplata
            amount { amountMicros currencyCode }
            tonyLink { primaryLinkLabel primaryLinkUrl secondaryLinks { url label } }
            bitrixLink { primaryLinkLabel primaryLinkUrl secondaryLinks { url label } }
          }
        }
      }
    }`,
    { stage, limit },
  );
  return data.opportunities.edges.map((e) => e.node);
}

async function fetchRecentOpps(limit) {
  const data = await gql(
    SERVER,
    `query($limit: Int!) {
      opportunities(orderBy: [{ createdAt: DescNullsLast }], first: $limit) {
        edges {
          node {
            id name stage companyId loadDate closeDate stageZakreplen
            statusOplaty arrivalTime readyTime workTime dismantleTime
            ssylkaNaMakety oplata
            amount { amountMicros currencyCode }
            tonyLink { primaryLinkLabel primaryLinkUrl secondaryLinks { url label } }
            bitrixLink { primaryLinkLabel primaryLinkUrl secondaryLinks { url label } }
          }
        }
      }
    }`,
    { limit },
  );
  return data.opportunities.edges.map((e) => e.node);
}

function selectDiverse(all) {
  const quotas = {
    NOVYY: 12,
    V_RABOTE: 10,
    GOTOVO: 10,
    OTCHET_STAS: 8,
    DUBL: 4,
    OTMENA: 6,
  };
  const picked = [];
  const used = new Set();
  const stageCount = {};
  const prefixCount = {};

  function tryAdd(o, ignorePrefixCap = false) {
    if (!o?.id || used.has(o.id)) return false;
    const st = o.stage || "UNKNOWN";
    if ((stageCount[st] || 0) >= (quotas[st] || 0)) return false;
    const p = prefix(o.name);
    if (!ignorePrefixCap && (prefixCount[p] || 0) >= 14 && p !== "OTHER") return false;
    used.add(o.id);
    picked.push(o);
    stageCount[st] = (stageCount[st] || 0) + 1;
    prefixCount[p] = (prefixCount[p] || 0) + 1;
    return true;
  }

  const order = ["OTCHET_STAS", "DUBL", "V_RABOTE", "OTMENA", "GOTOVO", "NOVYY"];
  for (const st of order) {
    const candidates = all.filter((o) => o.stage === st);
    const byPref = {};
    for (const o of candidates) (byPref[prefix(o.name)] ||= []).push(o);
    const prefs = Object.keys(byPref);
    let guard = 0;
    while ((stageCount[st] || 0) < quotas[st] && guard++ < 300) {
      let added = false;
      for (const p of prefs) {
        const arr = byPref[p];
        while (arr?.length) {
          if (tryAdd(arr.shift())) {
            added = true;
            break;
          }
        }
        if ((stageCount[st] || 0) >= quotas[st]) break;
      }
      if (!added) {
        for (const o of candidates) {
          if ((stageCount[st] || 0) >= quotas[st]) break;
          tryAdd(o, true);
        }
        break;
      }
    }
  }
  for (const o of all) {
    if (picked.length >= 50) break;
    if (used.has(o.id)) continue;
    used.add(o.id);
    picked.push(o);
    stageCount[o.stage] = (stageCount[o.stage] || 0) + 1;
    prefixCount[prefix(o.name)] = (prefixCount[prefix(o.name)] || 0) + 1;
  }
  return { picked: picked.slice(0, 50), stageCount, prefixCount };
}

async function fetchCompanies(ids) {
  const out = [];
  for (const idsChunk of chunk(ids, 50)) {
    const data = await gql(
      SERVER,
      `query($ids: [UUID!]!) {
        companies(filter: { id: { in: $ids } }, first: 100) {
          edges {
            node {
              id name
              domainName { primaryLinkLabel primaryLinkUrl secondaryLinks { url label } }
              address {
                addressStreet1 addressStreet2 addressCity addressPostcode
                addressState addressCountry addressLat addressLng
              }
              linkedinLink { primaryLinkLabel primaryLinkUrl secondaryLinks { url label } }
              annualRevenue { amountMicros currencyCode }
            }
          }
        }
      }`,
      { ids: idsChunk },
    );
    out.push(...data.companies.edges.map((e) => e.node));
  }
  return out;
}

async function fetchLineItems(oppIds) {
  const out = [];
  for (const idsChunk of chunk(oppIds, 20)) {
    const data = await gql(
      SERVER,
      `query($ids: [UUID!]!) {
        dealLineItems(filter: { opportunityId: { in: $ids } }, first: 200) {
          edges {
            node {
              id name istochnik stage tip kolichestvo kommentariy opportunityId
              amount { amountMicros currencyCode }
              ssylkaNaMakety { primaryLinkLabel primaryLinkUrl secondaryLinks { url label } }
              plenka { markdown blocknote }
            }
          }
        }
      }`,
      { ids: idsChunk },
    );
    out.push(...data.dealLineItems.edges.map((e) => e.node));
  }
  return out;
}

async function createMany(endpoint, mutationName, records, returnFields) {
  const created = [];
  for (const batch of chunk(records, 20)) {
    const data = await gql(
      endpoint,
      `mutation($data: [${mutationName}CreateInput!]!) {
        ${mutationName}CreateMany(data: $data) {
          ${returnFields}
        }
      }`,
      { data: batch },
    );
    const key = Object.keys(data)[0];
    created.push(...(data[key] || []));
  }
  return created;
}

async function introspectCreateInput(endpoint, typeName) {
  const data = await gql(
    endpoint,
    `query {
      __type(name: "${typeName}") {
        inputFields { name type { kind name ofType { name kind ofType { name } } } }
      }
    }`,
  );
  return (data.__type?.inputFields || []).map((f) => f.name);
}

(async () => {
  const mode = process.argv[2] || "all";

  console.log("Testing GraphQL endpoints...");
  const ping = await gql(SERVER, `{ companies(first: 1) { edges { node { id } } } }`);
  console.log("server ok", ping.companies.edges[0]?.node?.id);
  const pingL = await gql(LOCAL, `{ companies(first: 1) { edges { node { id } } } }`);
  console.log("local ok", pingL.companies.edges[0]?.node?.id);

  if (mode === "ping") return;

  console.log("Fetching stage pools (sequential)...");
  const recent = await fetchRecentOpps(120);
  console.log(" recent", recent.length);
  const otchet = await fetchOppsByStage("OTCHET_STAS", 20);
  console.log(" OTCHET_STAS", otchet.length);
  const dubl = await fetchOppsByStage("DUBL", 10);
  console.log(" DUBL", dubl.length);
  const vRabote = await fetchOppsByStage("V_RABOTE", 40);
  console.log(" V_RABOTE", vRabote.length);
  const otmena = await fetchOppsByStage("OTMENA", 20);
  console.log(" OTMENA", otmena.length);
  const gotovo = await fetchOppsByStage("GOTOVO", 30);
  console.log(" GOTOVO", gotovo.length);

  const byId = new Map();
  for (const o of [...recent, ...otchet, ...dubl, ...vRabote, ...otmena, ...gotovo]) {
    byId.set(o.id, o);
  }
  const { picked, stageCount, prefixCount } = selectDiverse([...byId.values()]);
  fs.writeFileSync(path.join(SEED, "selected-opps.json"), JSON.stringify(picked, null, 2));
  console.log("selected", picked.length, stageCount, prefixCount);

  const companyIds = [...new Set(picked.map((o) => o.companyId).filter(Boolean))];
  console.log("fetching companies", companyIds.length);
  const companies = await fetchCompanies(companyIds);
  fs.writeFileSync(path.join(SEED, "companies.json"), JSON.stringify(companies, null, 2));
  console.log("companies", companies.length);

  console.log("fetching line items...");
  const lineItems = await fetchLineItems(picked.map((o) => o.id));
  fs.writeFileSync(path.join(SEED, "line-items.json"), JSON.stringify(lineItems, null, 2));
  const withItems = new Set(lineItems.map((l) => l.opportunityId));
  const missing = picked.filter((o) => !withItems.has(o.id));
  console.log("line items", lineItems.length, "opps without items", missing.length);
  if (missing.length) {
    console.log(
      "without items sample:",
      missing.slice(0, 5).map((o) => o.name),
    );
  }

  // Prefer deals that have at least one line item; top up if needed
  let finalOpps = picked.filter((o) => withItems.has(o.id));
  if (finalOpps.length < 50) {
    console.log("only", finalOpps.length, "with line items; keeping them + filling from picked");
    const extra = picked.filter((o) => !withItems.has(o.id));
    finalOpps = [...finalOpps, ...extra].slice(0, 50);
  } else {
    finalOpps = finalOpps.slice(0, 50);
  }
  // rebalance note
  const finalStages = {};
  for (const o of finalOpps) finalStages[o.stage] = (finalStages[o.stage] || 0) + 1;
  console.log("final stages", finalStages);
  fs.writeFileSync(path.join(SEED, "selected-opps.json"), JSON.stringify(finalOpps, null, 2));

  const finalLineItems = lineItems.filter((l) =>
    finalOpps.some((o) => o.id === l.opportunityId),
  );
  const finalCompanyIds = new Set(finalOpps.map((o) => o.companyId).filter(Boolean));
  const finalCompanies = companies.filter((c) => finalCompanyIds.has(c.id));

  if (mode === "fetch") {
    console.log("fetch-only done");
    return;
  }

  // --- IMPORT ---
  console.log("Importing to local...");

  // Check create input names
  const companyFields = await introspectCreateInput(LOCAL, "CompanyCreateInput");
  console.log("CompanyCreateInput fields sample", companyFields.slice(0, 15));

  const companyMap = new Map(); // old -> new
  const companyPayloads = finalCompanies.map((c) => {
    const newId = randomUUID();
    companyMap.set(c.id, newId);
    const rec = {
      id: newId,
      name: c.name || "Company",
      position: "last",
    };
    const domain = cleanLink(c.domainName);
    if (domain) rec.domainName = domain;
    if (c.address) rec.address = c.address;
    const linkedin = cleanLink(c.linkedinLink);
    if (linkedin) rec.linkedinLink = linkedin;
    if (c.annualRevenue?.amountMicros != null) rec.annualRevenue = c.annualRevenue;
    return rec;
  });

  // Also map missing company ids to null
  for (const id of finalCompanyIds) {
    if (!companyMap.has(id)) {
      console.warn("company missing on server, will skip link", id);
    }
  }

  try {
    const createdCompanies = await createMany(
      LOCAL,
      "CreateCompany",
      companyPayloads,
      "id name",
    );
    console.log("created companies", createdCompanies.length);
  } catch (e) {
    // Try alternate mutation shape used by Twenty
    console.log("createMany Company failed, trying companiesCreateMany...", e.message.slice(0, 200));
    const created = [];
    for (const batch of chunk(companyPayloads, 20)) {
      const data = await gql(
        LOCAL,
        `mutation CreateCompanies($data: [CompanyCreateInput!]!) {
          createCompanies(data: $data) { id name }
        }`,
        { data: batch },
      );
      created.push(...(data.createCompanies || []));
    }
    console.log("created companies via createCompanies", created.length);
  }

  const oppMap = new Map();
  const oppPayloads = finalOpps.map((o) => {
    const newId = randomUUID();
    oppMap.set(o.id, newId);
    const rec = {
      id: newId,
      name: o.name,
      stage: o.stage,
      position: "last",
    };
    if (o.companyId && companyMap.has(o.companyId)) {
      rec.companyId = companyMap.get(o.companyId);
    }
    if (o.amount) rec.amount = o.amount;
    if (o.closeDate) rec.closeDate = o.closeDate;
    if (o.loadDate) rec.loadDate = o.loadDate;
    if (typeof o.stageZakreplen === "boolean") rec.stageZakreplen = o.stageZakreplen;
    if (o.statusOplaty) rec.statusOplaty = o.statusOplaty;
    if (o.arrivalTime != null) rec.arrivalTime = o.arrivalTime;
    if (o.readyTime != null) rec.readyTime = o.readyTime;
    if (o.workTime != null) rec.workTime = o.workTime;
    if (o.dismantleTime != null) rec.dismantleTime = o.dismantleTime;
    if (o.ssylkaNaMakety != null) rec.ssylkaNaMakety = o.ssylkaNaMakety;
    if (o.oplata) rec.oplata = o.oplata;
    const tony = cleanLink(o.tonyLink);
    if (tony) rec.tonyLink = tony;
    const bitrix = cleanLink(o.bitrixLink);
    if (bitrix) rec.bitrixLink = bitrix;
    return rec;
  });

  async function createOpps(payloads) {
    try {
      return await createMany(LOCAL, "CreateOpportunity", payloads, "id name stage");
    } catch (e1) {
      console.log("CreateOpportunity failed:", e1.message.slice(0, 300));
      const created = [];
      for (const batch of chunk(payloads, 20)) {
        const data = await gql(
          LOCAL,
          `mutation($data: [OpportunityCreateInput!]!) {
            createOpportunities(data: $data) { id name stage }
          }`,
          { data: batch },
        );
        created.push(...(data.createOpportunities || []));
      }
      return created;
    }
  }

  const createdOpps = await createOpps(oppPayloads);
  console.log("created opportunities", createdOpps.length);

  const linePayloads = finalLineItems.map((li) => {
    const rec = {
      id: randomUUID(),
      name: li.name || "Позиция",
      position: "last",
      opportunityId: oppMap.get(li.opportunityId),
    };
    if (!rec.opportunityId) return null;
    if (li.istochnik) rec.istochnik = li.istochnik;
    if (li.stage) rec.stage = li.stage;
    if (li.tip) rec.tip = li.tip;
    if (li.kolichestvo != null) rec.kolichestvo = li.kolichestvo;
    if (li.amount) rec.amount = li.amount;
    if (li.kommentariy != null) rec.kommentariy = li.kommentariy;
    const link = cleanLinksField(li.ssylkaNaMakety);
    if (link) rec.ssylkaNaMakety = link;
    if (li.plenka?.markdown || li.plenka?.blocknote) {
      rec.plenka = {
        markdown: li.plenka.markdown || "",
        blocknote: li.plenka.blocknote || "",
      };
    }
    return rec;
  }).filter(Boolean);

  async function createLines(payloads) {
    try {
      return await createMany(LOCAL, "CreateDealLineItem", payloads, "id name");
    } catch (e1) {
      console.log("CreateDealLineItem failed:", e1.message.slice(0, 300));
      const created = [];
      for (const batch of chunk(payloads, 20)) {
        const data = await gql(
          LOCAL,
          `mutation($data: [DealLineItemCreateInput!]!) {
            createDealLineItems(data: $data) { id name }
          }`,
          { data: batch },
        );
        created.push(...(data.createDealLineItems || []));
      }
      return created;
    }
  }

  const createdLines = await createLines(linePayloads);
  console.log("created line items", createdLines.length);

  fs.writeFileSync(
    path.join(SEED, "id-map.json"),
    JSON.stringify(
      {
        companies: Object.fromEntries(companyMap),
        opportunities: Object.fromEntries(oppMap),
      },
      null,
      2,
    ),
  );

  // Verify
  const verify = await gql(
    LOCAL,
    `{
      opportunities(first: 100) { edges { node { id stage name } } }
      dealLineItems(first: 200) { edges { node { id opportunityId } } }
    }`,
  );
  const stages = {};
  for (const e of verify.opportunities.edges) {
    stages[e.node.stage] = (stages[e.node.stage] || 0) + 1;
  }
  console.log("VERIFY local opps", verify.opportunities.edges.length, stages);
  console.log("VERIFY local line items", verify.dealLineItems.edges.length);
  console.log("DONE");
})().catch((err) => {
  console.error("FATAL", err);
  process.exit(1);
});
