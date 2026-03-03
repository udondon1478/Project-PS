"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.canonicalizeMainSessionAlias = canonicalizeMainSessionAlias;Object.defineProperty(exports, "resolveAgentIdFromSessionKey", { enumerable: true, get: function () {return _sessionKey.resolveAgentIdFromSessionKey;} });exports.resolveAgentMainSessionKey = resolveAgentMainSessionKey;exports.resolveExplicitAgentSessionKey = resolveExplicitAgentSessionKey;exports.resolveMainSessionKey = resolveMainSessionKey;exports.resolveMainSessionKeyFromConfig = resolveMainSessionKeyFromConfig;var _sessionKey = require("../../routing/session-key.js");
var _config = require("../config.js");
function resolveMainSessionKey(cfg) {
  if (cfg?.session?.scope === "global") {
    return "global";
  }
  const agents = cfg?.agents?.list ?? [];
  const defaultAgentId = agents.find((agent) => agent?.default)?.id ?? agents[0]?.id ?? _sessionKey.DEFAULT_AGENT_ID;
  const agentId = (0, _sessionKey.normalizeAgentId)(defaultAgentId);
  const mainKey = (0, _sessionKey.normalizeMainKey)(cfg?.session?.mainKey);
  return (0, _sessionKey.buildAgentMainSessionKey)({ agentId, mainKey });
}
function resolveMainSessionKeyFromConfig() {
  return resolveMainSessionKey((0, _config.loadConfig)());
}

function resolveAgentMainSessionKey(params) {
  const mainKey = (0, _sessionKey.normalizeMainKey)(params.cfg?.session?.mainKey);
  return (0, _sessionKey.buildAgentMainSessionKey)({ agentId: params.agentId, mainKey });
}
function resolveExplicitAgentSessionKey(params) {
  const agentId = params.agentId?.trim();
  if (!agentId) {
    return undefined;
  }
  return resolveAgentMainSessionKey({ cfg: params.cfg, agentId });
}
function canonicalizeMainSessionAlias(params) {
  const raw = params.sessionKey.trim();
  if (!raw) {
    return raw;
  }
  const agentId = (0, _sessionKey.normalizeAgentId)(params.agentId);
  const mainKey = (0, _sessionKey.normalizeMainKey)(params.cfg?.session?.mainKey);
  const agentMainSessionKey = (0, _sessionKey.buildAgentMainSessionKey)({ agentId, mainKey });
  const agentMainAliasKey = (0, _sessionKey.buildAgentMainSessionKey)({
    agentId,
    mainKey: "main"
  });
  const isMainAlias = raw === "main" || raw === mainKey || raw === agentMainSessionKey || raw === agentMainAliasKey;
  if (params.cfg?.session?.scope === "global" && isMainAlias) {
    return "global";
  }
  if (isMainAlias) {
    return agentMainSessionKey;
  }
  return raw;
} /* v9-28d5d60341f6b3c6 */
