/**
 * Reseed local with 50 server deals that have line items with stage + kommentariy.
 * Soft-deletes existing local opportunities first (keeps board clean for tests).
 */
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    const json = JSON.parse(text);
    if (json.errors?.length) throw new Error(JSON.stringify(json.errors, null, 2));
    return json.data;
  } catch (err) {
    if (attempt < 4) {
      console.warn(`retry ${attempt}:`, err.message?.slice?.(0, 120) || err);
      await sleep(attempt * 1500);
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

async function wipeLocalOpps() {
  for (;;) {
    const data = await gql(
      LOCAL,
      `{ opportunities(first: 50) { edges { node { id } } } }`,
    );
    const ids = data.opportunities.edges.map((e) => e.node.id);
    if (!ids.length) break;
    console.log("deleting opps batch", ids.length);
    for (const id of ids) {
      await gql(LOCAL, `mutation($id: UUID!) { deleteOpportunity(id: $id) { id } }`, {
        id,
      });
    }
  }
  for (;;) {
    const data = await gql(
      LOCAL,
      `{ dealLineItems(first: 50) { edges { node { id } } } }`,
    );
    const ids = data.dealLineItems.edges.map((e) => e.node.id);
    if (!ids.length) break;
    console.log("deleting lines batch", ids.length);
    await gql(
      LOCAL,
      `mutation($ids: [UUID!]!) { deleteDealLineItems(filter: { id: { in: $ids } }) { id } }`,
      { ids },
    ).catch(async () => {
      for (const id of ids) {
        await gql(LOCAL, `mutation($id: UUID!) { deleteDealLineItem(id: $id) { id } }`, {
          id,
        });
      }
    });
  }
}

async function fetchCandidateOppIds() {
  // Pull recent line items that have stage + non-empty comment, collect unique opps
  const oppIds = new Set();
  let offsetCursor = null;
  let pages = 0;
  while (oppIds.size < 80 && pages < 8) {
    pages += 1;
    const data = await gql(
      SERVER,
      `query($first: Int!) {
        dealLineItems(
          filter: {
            and: [
              { stage: { is: NOT_NULL } }
              { kommentariy: { is: NOT_NULL } }
              { kommentariy: { neq: "" } }
            ]
          }
          first: $first
          orderBy: [{ updatedAt: DescNullsLast }]
        ) {
          edges { node { opportunityId } }
        }
      }`,
      { first: 100 },
    );
    for (const e of data.dealLineItems.edges) {
      if (e.node.opportunityId) oppIds.add(e.node.opportunityId);
    }
    if (data.dealLineItems.edges.length < 100) break;
    // GraphQL may not support offset; diversify by also pulling older stages
    break;
  }

  // Also pull per line-item stage for diversity
  for (const stage of ["NOVYY", "V_RABOTE", "V_PECHATI", "OKLEYKA", "GOTOVO", "OTMENA"]) {
    const data = await gql(
      SERVER,
      `query($stage: String!) {
        dealLineItems(
          filter: {
            and: [
              { stage: { eq: $stage } }
              { kommentariy: { is: NOT_NULL } }
              { kommentariy: { neq: "" } }
            ]
          }
          first: 40
          orderBy: [{ updatedAt: DescNullsLast }]
        ) {
          edges { node { opportunityId } }
        }
      }`,
      { stage },
    );
    for (const e of data.dealLineItems.edges) {
      if (e.node.opportunityId) oppIds.add(e.node.opportunityId);
    }
  }
  return [...oppIds];
}

async function fetchOpps(ids) {
  const out = [];
  for (const idsChunk of chunk(ids, 25)) {
    const data = await gql(
      SERVER,
      `query($ids: [UUID!]!) {
        opportunities(filter: { id: { in: $ids } }, first: 50) {
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
      { ids: idsChunk },
    );
    out.push(...data.opportunities.edges.map((e) => e.node));
  }
  return out;
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

function selectFifty(opps, lineItems) {
  const byOpp = new Map();
  for (const li of lineItems) {
    if (!li.opportunityId || !li.stage) continue;
    const comment = (li.kommentariy || "").trim();
    if (!comment) continue;
    (byOpp.get(li.opportunityId) || byOpp.set(li.opportunityId, []).get(li.opportunityId)).push(li);
  }

  const eligible = opps.filter((o) => byOpp.has(o.id));
  // Prefer diversity of opportunity stage + presence of varied line stages
  const quotas = {
    NOVYY: 10,
    V_RABOTE: 10,
    GOTOVO: 10,
    OTCHET_STAS: 6,
    DUBL: 4,
    OTMENA: 5,
  };
  const picked = [];
  const used = new Set();
  const stageCount = {};

  for (const st of Object.keys(quotas)) {
    for (const o of eligible) {
      if (picked.length >= 50) break;
      if (used.has(o.id)) continue;
      if (o.stage !== st) continue;
      if ((stageCount[st] || 0) >= quotas[st]) continue;
      used.add(o.id);
      picked.push(o);
      stageCount[st] = (stageCount[st] || 0) + 1;
    }
  }
  for (const o of eligible) {
    if (picked.length >= 50) break;
    if (used.has(o.id)) continue;
    used.add(o.id);
    picked.push(o);
  }
  return { picked: picked.slice(0, 50), byOpp, stageCount };
}

(async () => {
  console.log("1) wipe local opps/lines...");
  await wipeLocalOpps();
  const after = await gql(
    LOCAL,
    `{ opportunities(first:1){totalCount} dealLineItems(first:1){totalCount} }`,
  );
  console.log("local after wipe", after.opportunities.totalCount, after.dealLineItems.totalCount);

  console.log("2) collect candidate opp ids from server...");
  const candidateIds = await fetchCandidateOppIds();
  console.log("candidates", candidateIds.length);

  console.log("3) fetch opps + lines...");
  const opps = await fetchOpps(candidateIds);
  const lineItems = await fetchLineItems(candidateIds);
  console.log("fetched opps", opps.length, "lines", lineItems.length);

  const { picked, byOpp, stageCount } = selectFifty(opps, lineItems);
  console.log("selected", picked.length, "opp stages", stageCount);
  if (picked.length < 50) {
    console.warn("WARNING: only", picked.length, "eligible deals with stage+comment lines");
  }

  const companyIds = [...new Set(picked.map((o) => o.companyId).filter(Boolean))];
  const companies = await fetchCompanies(companyIds);
  console.log("companies", companies.length);

  const finalLines = lineItems.filter((l) => picked.some((o) => o.id === l.opportunityId));
  fs.mkdirSync(SEED, { recursive: true });
  fs.writeFileSync(path.join(SEED, "selected-opps.json"), JSON.stringify(picked, null, 2));
  fs.writeFileSync(path.join(SEED, "line-items.json"), JSON.stringify(finalLines, null, 2));
  fs.writeFileSync(path.join(SEED, "companies.json"), JSON.stringify(companies, null, 2));

  console.log("4) import companies...");
  const companyMap = new Map();
  const companyPayloads = companies.map((c) => {
    const newId = randomUUID();
    companyMap.set(c.id, newId);
    const rec = { id: newId, name: c.name || "Company", position: "last" };
    const domain = cleanLink(c.domainName);
    if (domain) rec.domainName = domain;
    return rec;
  });
  for (const batch of chunk(companyPayloads, 20)) {
    await gql(
      LOCAL,
      `mutation($data: [CompanyCreateInput!]!) { createCompanies(data: $data) { id } }`,
      { data: batch },
    ).catch(async (e) => {
      console.warn("createCompanies failed, falling back singular", e.message.slice(0, 120));
      for (const rec of batch) {
        await gql(
          LOCAL,
          `mutation($data: CompanyCreateInput!) { createCompany(data: $data) { id } }`,
          { data: rec },
        );
      }
    });
  }
  console.log("companies mapped", companyMap.size);

  console.log("5) import opportunities...");
  const oppMap = new Map();
  const oppPayloads = picked.map((o) => {
    const newId = randomUUID();
    oppMap.set(o.id, newId);
    const rec = {
      id: newId,
      name: o.name,
      stage: o.stage,
      position: "last",
    };
    if (o.companyId && companyMap.has(o.companyId)) rec.companyId = companyMap.get(o.companyId);
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

  for (const batch of chunk(oppPayloads, 20)) {
    await gql(
      LOCAL,
      `mutation($data: [OpportunityCreateInput!]!) {
        createOpportunities(data: $data) { id }
      }`,
      { data: batch },
    ).catch(async (e) => {
      console.warn("createOpportunities failed, singular", e.message.slice(0, 160));
      for (const rec of batch) {
        await gql(
          LOCAL,
          `mutation($data: OpportunityCreateInput!) { createOpportunity(data: $data) { id } }`,
          { data: rec },
        );
      }
    });
  }
  console.log("opps mapped", oppMap.size);

  console.log("6) import line items...");
  const linePayloads = finalLines
    .map((li) => {
      const opportunityId = oppMap.get(li.opportunityId);
      if (!opportunityId) return null;
      const rec = {
        id: randomUUID(),
        name: li.name || "Позиция",
        position: "last",
        opportunityId,
      };
      if (li.istochnik) rec.istochnik = li.istochnik;
      if (li.stage) rec.stage = li.stage;
      if (li.tip) rec.tip = li.tip;
      if (li.kolichestvo != null) rec.kolichestvo = li.kolichestvo;
      if (li.amount) rec.amount = li.amount;
      if (li.kommentariy != null) rec.kommentariy = li.kommentariy;
      const link = cleanLink(li.ssylkaNaMakety);
      if (link) rec.ssylkaNaMakety = link;
      if (li.plenka?.markdown || li.plenka?.blocknote) {
        rec.plenka = {
          markdown: li.plenka.markdown || "",
          blocknote: li.plenka.blocknote || "",
        };
      }
      return rec;
    })
    .filter(Boolean);

  let createdLines = 0;
  for (const batch of chunk(linePayloads, 20)) {
    try {
      const data = await gql(
        LOCAL,
        `mutation($data: [DealLineItemCreateInput!]!) {
          createDealLineItems(data: $data) { id }
        }`,
        { data: batch },
      );
      createdLines += data.createDealLineItems?.length || 0;
    } catch (e) {
      console.warn("batch createDealLineItems failed:", e.message.slice(0, 200));
      for (const rec of batch) {
        try {
          await gql(
            LOCAL,
            `mutation($data: DealLineItemCreateInput!) {
              createDealLineItem(data: $data) { id }
            }`,
            { data: rec },
          );
          createdLines += 1;
        } catch (e2) {
          console.warn("line fail", rec.name?.slice(0, 40), e2.message.slice(0, 180));
        }
      }
    }
  }
  console.log("created lines", createdLines, "/", linePayloads.length);

  const verify = await gql(
    LOCAL,
    `{
      opportunities(first: 100) {
        totalCount
        edges { node { id stage name } }
      }
      dealLineItems(first: 200) {
        totalCount
        edges { node { id stage tip kommentariy opportunityId } }
      }
    }`,
  );
  const lineStages = {};
  let withComment = 0;
  for (const e of verify.dealLineItems.edges) {
    lineStages[e.node.stage || "null"] = (lineStages[e.node.stage || "null"] || 0) + 1;
    if ((e.node.kommentariy || "").trim()) withComment += 1;
  }
  console.log("VERIFY opps", verify.opportunities.totalCount);
  console.log("VERIFY lines", verify.dealLineItems.totalCount, lineStages, "withComment", withComment);
  console.log("DONE");
})().catch((err) => {
  console.error("FATAL", err);
  process.exit(1);
});
