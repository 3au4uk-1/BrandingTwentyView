const fs = require("fs");
const path = require("path");

const dir = __dirname;
const recent = JSON.parse(
  fs.readFileSync(path.join(dir, "opps-recent.json"), "utf8"),
);
const otchet = JSON.parse(
  fs.readFileSync(path.join(dir, "opps-otchet-stas.json"), "utf8"),
);
const dubl = JSON.parse(fs.readFileSync(path.join(dir, "opps-dubl.json"), "utf8"));
const vRaboteExtra = fs.existsSync(path.join(dir, "opps-v-rabote.json"))
  ? JSON.parse(fs.readFileSync(path.join(dir, "opps-v-rabote.json"), "utf8"))
  : [];

const pool = [...recent, ...otchet, ...dubl, ...vRaboteExtra];
const byId = new Map();
for (const o of pool) {
  if (o?.id) byId.set(o.id, o);
}
const all = [...byId.values()];

function prefix(name) {
  const n = (name || "").trim();
  if (n.startsWith("ПРО/")) return "ПРО";
  if (n.startsWith("АРЕНДА/")) return "АРЕНДА";
  if (n.startsWith("АРТ/")) return "АРТ";
  if (n.startsWith("БС/") || n.startsWith("БС ")) return "БС";
  if (n.startsWith("Биржа")) return "Биржа";
  return "OTHER";
}

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

function tryAdd(o) {
  if (!o || used.has(o.id)) return false;
  const st = o.stage || "UNKNOWN";
  const need = quotas[st] ?? 0;
  if ((stageCount[st] || 0) >= need) return false;
  const p = prefix(o.name);
  // soft cap per prefix to keep diversity
  if ((prefixCount[p] || 0) >= 14 && p !== "OTHER") return false;
  used.add(o.id);
  picked.push(o);
  stageCount[st] = (stageCount[st] || 0) + 1;
  prefixCount[p] = (prefixCount[p] || 0) + 1;
  return true;
}

// Prefer OTCHET/DUBL/V_RABOTE first (scarcer), then others
const order = ["OTCHET_STAS", "DUBL", "V_RABOTE", "OTMENA", "GOTOVO", "NOVYY"];
for (const st of order) {
  const candidates = all.filter((o) => o.stage === st);
  // diversify by prefix within stage
  const byPref = {};
  for (const o of candidates) {
    const p = prefix(o.name);
    (byPref[p] ||= []).push(o);
  }
  const prefs = Object.keys(byPref);
  let i = 0;
  while ((stageCount[st] || 0) < (quotas[st] || 0) && candidates.length) {
    let added = false;
    for (const p of prefs) {
      const arr = byPref[p];
      if (!arr?.length) continue;
      if (tryAdd(arr.shift())) {
        added = true;
        if ((stageCount[st] || 0) >= quotas[st]) break;
      }
    }
    if (!added) {
      // fill remaining without prefix soft-cap
      for (const o of candidates) {
        if ((stageCount[st] || 0) >= quotas[st]) break;
        if (used.has(o.id)) continue;
        used.add(o.id);
        picked.push(o);
        stageCount[st] = (stageCount[st] || 0) + 1;
        prefixCount[prefix(o.name)] = (prefixCount[prefix(o.name)] || 0) + 1;
      }
      break;
    }
    i++;
    if (i > 200) break;
  }
}

// Top up to 50 from remaining with any stage
for (const o of all) {
  if (picked.length >= 50) break;
  if (used.has(o.id)) continue;
  used.add(o.id);
  picked.push(o);
  stageCount[o.stage] = (stageCount[o.stage] || 0) + 1;
  prefixCount[prefix(o.name)] = (prefixCount[prefix(o.name)] || 0) + 1;
}

const final = picked.slice(0, 50);
fs.writeFileSync(
  path.join(dir, "selected-opps.json"),
  JSON.stringify(final, null, 2),
);
console.log("picked", final.length);
console.log("stages", stageCount);
console.log("prefixes", prefixCount);
console.log(
  "companyIds",
  new Set(final.map((o) => o.companyId).filter(Boolean)).size,
);
