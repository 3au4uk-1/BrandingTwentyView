/**
 * Resolve local Twenty GraphQL token (prefers fresh CLI OAuth over stale MCP app token).
 */
const fs = require('fs');
const path = require('path');

const readJson = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
};

const readMcpLocalToken = () => {
  const mcp = readJson(path.join(process.env.USERPROFILE, '.cursor', 'mcp.json'));
  const raw = mcp?.mcpServers?.twentylocal?.headers?.Authorization;
  if (!raw) return null;
  return String(raw).replace(/^Bearer\s+/i, '');
};

const readConfigLocalToken = () => {
  const cfg = readJson(path.join(process.env.USERPROFILE, '.twenty', 'config.json'));
  const remote = cfg?.remotes?.localhost;
  return remote?.twentyCLIAccessToken || remote?.appAccessToken || null;
};

const readMcpServerToken = () => {
  const mcp = readJson(path.join(process.env.USERPROFILE, '.cursor', 'mcp.json'));
  const raw = mcp?.mcpServers?.twentyserver?.headers?.Authorization;
  if (!raw) return null;
  return String(raw).replace(/^Bearer\s+/i, '');
};

module.exports = {
  LOCAL_GRAPHQL: 'http://localhost:2020/graphql',
  SERVER_GRAPHQL: 'https://twenty.dosugmayak.ru/graphql',
  getLocalToken: () => readConfigLocalToken() || readMcpLocalToken(),
  getServerToken: () => readMcpServerToken(),
};
