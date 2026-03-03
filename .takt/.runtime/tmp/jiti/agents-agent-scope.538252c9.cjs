"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.listAgentIds = listAgentIds;exports.resolveAgentConfig = resolveAgentConfig;exports.resolveAgentDir = resolveAgentDir;Object.defineProperty(exports, "resolveAgentIdFromSessionKey", { enumerable: true, get: function () {return _sessionKey.resolveAgentIdFromSessionKey;} });exports.resolveAgentModelFallbacksOverride = resolveAgentModelFallbacksOverride;exports.resolveAgentModelPrimary = resolveAgentModelPrimary;exports.resolveAgentWorkspaceDir = resolveAgentWorkspaceDir;exports.resolveDefaultAgentId = resolveDefaultAgentId;exports.resolveSessionAgentId = resolveSessionAgentId;exports.resolveSessionAgentIds = resolveSessionAgentIds;var _nodeOs = _interopRequireDefault(require("node:os"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _paths = require("../config/paths.js");
var _sessionKey = require("../routing/session-key.js");
var _utils = require("../utils.js");
var _workspace = require("./workspace.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}

let defaultAgentWarned = false;
function listAgents(cfg) {
  const list = cfg.agents?.list;
  if (!Array.isArray(list)) {
    return [];
  }
  return list.filter((entry) => Boolean(entry && typeof entry === "object"));
}
function listAgentIds(cfg) {
  const agents = listAgents(cfg);
  if (agents.length === 0) {
    return [_sessionKey.DEFAULT_AGENT_ID];
  }
  const seen = new Set();
  const ids = [];
  for (const entry of agents) {
    const id = (0, _sessionKey.normalizeAgentId)(entry?.id);
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    ids.push(id);
  }
  return ids.length > 0 ? ids : [_sessionKey.DEFAULT_AGENT_ID];
}
function resolveDefaultAgentId(cfg) {
  const agents = listAgents(cfg);
  if (agents.length === 0) {
    return _sessionKey.DEFAULT_AGENT_ID;
  }
  const defaults = agents.filter((agent) => agent?.default);
  if (defaults.length > 1 && !defaultAgentWarned) {
    defaultAgentWarned = true;
    console.warn("Multiple agents marked default=true; using the first entry as default.");
  }
  const chosen = (defaults[0] ?? agents[0])?.id?.trim();
  return (0, _sessionKey.normalizeAgentId)(chosen || _sessionKey.DEFAULT_AGENT_ID);
}
function resolveSessionAgentIds(params) {
  const defaultAgentId = resolveDefaultAgentId(params.config ?? {});
  const sessionKey = params.sessionKey?.trim();
  const normalizedSessionKey = sessionKey ? sessionKey.toLowerCase() : undefined;
  const parsed = normalizedSessionKey ? (0, _sessionKey.parseAgentSessionKey)(normalizedSessionKey) : null;
  const sessionAgentId = parsed?.agentId ? (0, _sessionKey.normalizeAgentId)(parsed.agentId) : defaultAgentId;
  return { defaultAgentId, sessionAgentId };
}
function resolveSessionAgentId(params) {
  return resolveSessionAgentIds(params).sessionAgentId;
}
function resolveAgentEntry(cfg, agentId) {
  const id = (0, _sessionKey.normalizeAgentId)(agentId);
  return listAgents(cfg).find((entry) => (0, _sessionKey.normalizeAgentId)(entry.id) === id);
}
function resolveAgentConfig(cfg, agentId) {
  const id = (0, _sessionKey.normalizeAgentId)(agentId);
  const entry = resolveAgentEntry(cfg, id);
  if (!entry) {
    return undefined;
  }
  return {
    name: typeof entry.name === "string" ? entry.name : undefined,
    workspace: typeof entry.workspace === "string" ? entry.workspace : undefined,
    agentDir: typeof entry.agentDir === "string" ? entry.agentDir : undefined,
    model: typeof entry.model === "string" || entry.model && typeof entry.model === "object" ?
    entry.model :
    undefined,
    memorySearch: entry.memorySearch,
    humanDelay: entry.humanDelay,
    heartbeat: entry.heartbeat,
    identity: entry.identity,
    groupChat: entry.groupChat,
    subagents: typeof entry.subagents === "object" && entry.subagents ? entry.subagents : undefined,
    sandbox: entry.sandbox,
    tools: entry.tools
  };
}
function resolveAgentModelPrimary(cfg, agentId) {
  const raw = resolveAgentConfig(cfg, agentId)?.model;
  if (!raw) {
    return undefined;
  }
  if (typeof raw === "string") {
    return raw.trim() || undefined;
  }
  const primary = raw.primary?.trim();
  return primary || undefined;
}
function resolveAgentModelFallbacksOverride(cfg, agentId) {
  const raw = resolveAgentConfig(cfg, agentId)?.model;
  if (!raw || typeof raw === "string") {
    return undefined;
  }
  // Important: treat an explicitly provided empty array as an override to disable global fallbacks.
  if (!Object.hasOwn(raw, "fallbacks")) {
    return undefined;
  }
  return Array.isArray(raw.fallbacks) ? raw.fallbacks : undefined;
}
function resolveAgentWorkspaceDir(cfg, agentId) {
  const id = (0, _sessionKey.normalizeAgentId)(agentId);
  const configured = resolveAgentConfig(cfg, id)?.workspace?.trim();
  if (configured) {
    return (0, _utils.resolveUserPath)(configured);
  }
  const defaultAgentId = resolveDefaultAgentId(cfg);
  if (id === defaultAgentId) {
    const fallback = cfg.agents?.defaults?.workspace?.trim();
    if (fallback) {
      return (0, _utils.resolveUserPath)(fallback);
    }
    return _workspace.DEFAULT_AGENT_WORKSPACE_DIR;
  }
  return _nodePath.default.join(_nodeOs.default.homedir(), ".openclaw", `workspace-${id}`);
}
function resolveAgentDir(cfg, agentId) {
  const id = (0, _sessionKey.normalizeAgentId)(agentId);
  const configured = resolveAgentConfig(cfg, id)?.agentDir?.trim();
  if (configured) {
    return (0, _utils.resolveUserPath)(configured);
  }
  const root = (0, _paths.resolveStateDir)(process.env, _nodeOs.default.homedir);
  return _nodePath.default.join(root, "agents", id, "agent");
} /* v9-34d126d04e99c7cd */
