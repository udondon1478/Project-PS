"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveSandboxAgentId = resolveSandboxAgentId;exports.resolveSandboxScopeKey = resolveSandboxScopeKey;exports.resolveSandboxWorkspaceDir = resolveSandboxWorkspaceDir;exports.slugifySessionKey = slugifySessionKey;var _nodeCrypto = _interopRequireDefault(require("node:crypto"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _sessionKey = require("../../routing/session-key.js");
var _utils = require("../../utils.js");
var _agentScope = require("../agent-scope.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function slugifySessionKey(value) {
  const trimmed = value.trim() || "session";
  const hash = _nodeCrypto.default.createHash("sha1").update(trimmed).digest("hex").slice(0, 8);
  const safe = trimmed.
  toLowerCase().
  replace(/[^a-z0-9._-]+/g, "-").
  replace(/^-+|-+$/g, "");
  const base = safe.slice(0, 32) || "session";
  return `${base}-${hash}`;
}
function resolveSandboxWorkspaceDir(root, sessionKey) {
  const resolvedRoot = (0, _utils.resolveUserPath)(root);
  const slug = slugifySessionKey(sessionKey);
  return _nodePath.default.join(resolvedRoot, slug);
}
function resolveSandboxScopeKey(scope, sessionKey) {
  const trimmed = sessionKey.trim() || "main";
  if (scope === "shared") {
    return "shared";
  }
  if (scope === "session") {
    return trimmed;
  }
  const agentId = (0, _agentScope.resolveAgentIdFromSessionKey)(trimmed);
  return `agent:${agentId}`;
}
function resolveSandboxAgentId(scopeKey) {
  const trimmed = scopeKey.trim();
  if (!trimmed || trimmed === "shared") {
    return undefined;
  }
  const parts = trimmed.split(":").filter(Boolean);
  if (parts[0] === "agent" && parts[1]) {
    return (0, _sessionKey.normalizeAgentId)(parts[1]);
  }
  return (0, _agentScope.resolveAgentIdFromSessionKey)(trimmed);
} /* v9-bb8fd994be9d11fe */
