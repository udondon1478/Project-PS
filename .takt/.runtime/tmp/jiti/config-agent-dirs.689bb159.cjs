"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DuplicateAgentDirError = void 0;exports.findDuplicateAgentDirs = findDuplicateAgentDirs;exports.formatDuplicateAgentDirError = formatDuplicateAgentDirError;var _nodeOs = _interopRequireDefault(require("node:os"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _sessionKey = require("../routing/session-key.js");
var _utils = require("../utils.js");
var _paths = require("./paths.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
class DuplicateAgentDirError extends Error {
  duplicates;
  constructor(duplicates) {
    super(formatDuplicateAgentDirError(duplicates));
    this.name = "DuplicateAgentDirError";
    this.duplicates = duplicates;
  }
}exports.DuplicateAgentDirError = DuplicateAgentDirError;
function canonicalizeAgentDir(agentDir) {
  const resolved = _nodePath.default.resolve(agentDir);
  if (process.platform === "darwin" || process.platform === "win32") {
    return resolved.toLowerCase();
  }
  return resolved;
}
function collectReferencedAgentIds(cfg) {
  const ids = new Set();
  const agents = Array.isArray(cfg.agents?.list) ? cfg.agents?.list : [];
  const defaultAgentId = agents.find((agent) => agent?.default)?.id ?? agents[0]?.id ?? _sessionKey.DEFAULT_AGENT_ID;
  ids.add((0, _sessionKey.normalizeAgentId)(defaultAgentId));
  for (const entry of agents) {
    if (entry?.id) {
      ids.add((0, _sessionKey.normalizeAgentId)(entry.id));
    }
  }
  const bindings = cfg.bindings;
  if (Array.isArray(bindings)) {
    for (const binding of bindings) {
      const id = binding?.agentId;
      if (typeof id === "string" && id.trim()) {
        ids.add((0, _sessionKey.normalizeAgentId)(id));
      }
    }
  }
  return [...ids];
}
function resolveEffectiveAgentDir(cfg, agentId, deps) {
  const id = (0, _sessionKey.normalizeAgentId)(agentId);
  const configured = Array.isArray(cfg.agents?.list) ?
  cfg.agents?.list.find((agent) => (0, _sessionKey.normalizeAgentId)(agent.id) === id)?.agentDir :
  undefined;
  const trimmed = configured?.trim();
  if (trimmed) {
    return (0, _utils.resolveUserPath)(trimmed);
  }
  const root = (0, _paths.resolveStateDir)(deps?.env ?? process.env, deps?.homedir ?? _nodeOs.default.homedir);
  return _nodePath.default.join(root, "agents", id, "agent");
}
function findDuplicateAgentDirs(cfg, deps) {
  const byDir = new Map();
  for (const agentId of collectReferencedAgentIds(cfg)) {
    const agentDir = resolveEffectiveAgentDir(cfg, agentId, deps);
    const key = canonicalizeAgentDir(agentDir);
    const entry = byDir.get(key);
    if (entry) {
      entry.agentIds.push(agentId);
    } else
    {
      byDir.set(key, { agentDir, agentIds: [agentId] });
    }
  }
  return [...byDir.values()].filter((v) => v.agentIds.length > 1);
}
function formatDuplicateAgentDirError(dups) {
  const lines = [
  "Duplicate agentDir detected (multi-agent config).",
  "Each agent must have a unique agentDir; sharing it causes auth/session state collisions and token invalidation.",
  "",
  "Conflicts:",
  ...dups.map((d) => `- ${d.agentDir}: ${d.agentIds.map((id) => `"${id}"`).join(", ")}`),
  "",
  "Fix: remove the shared agents.list[].agentDir override (or give each agent its own directory).",
  "If you want to share credentials, copy auth-profiles.json instead of sharing the entire agentDir."];

  return lines.join("\n");
} /* v9-5ff11d695567dfcb */
