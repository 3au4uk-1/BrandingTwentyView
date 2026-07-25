/**
 * Saves MCP execute_tool JSON dump (agent-tools/*.txt) into seed-data/*.json
 * Usage: node scripts/seed-data/extract-mcp-records.js <agent-tools-file> <out-json>
 */
const fs = require("fs");
const path = require("path");

const [,, inFile, outFile] = process.argv;
if (!inFile || !outFile) {
  console.error("Usage: node extract-mcp-records.js <in> <out>");
  process.exit(1);
}
const raw = fs.readFileSync(inFile, "utf8");
const j = JSON.parse(raw);
const records = j.result?.records || j.records || [];
fs.writeFileSync(outFile, JSON.stringify(records, null, 2));
console.log("wrote", records.length, "->", outFile);
