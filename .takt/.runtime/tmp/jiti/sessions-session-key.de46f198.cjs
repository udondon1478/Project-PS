"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.deriveSessionKey = deriveSessionKey;exports.resolveSessionKey = resolveSessionKey;var _sessionKey = require("../../routing/session-key.js");
var _utils = require("../../utils.js");
var _group = require("./group.js");
// Decide which session bucket to use (per-sender vs global).
function deriveSessionKey(scope, ctx) {
  if (scope === "global") {
    return "global";
  }
  const resolvedGroup = (0, _group.resolveGroupSessionKey)(ctx);
  if (resolvedGroup) {
    return resolvedGroup.key;
  }
  const from = ctx.From ? (0, _utils.normalizeE164)(ctx.From) : "";
  return from || "unknown";
}
/**
 * Resolve the session key with a canonical direct-chat bucket (default: "main").
 * All non-group direct chats collapse to this bucket; groups stay isolated.
 */
function resolveSessionKey(scope, ctx, mainKey) {
  const explicit = ctx.SessionKey?.trim();
  if (explicit) {
    return explicit.toLowerCase();
  }
  const raw = deriveSessionKey(scope, ctx);
  if (scope === "global") {
    return raw;
  }
  const canonicalMainKey = (0, _sessionKey.normalizeMainKey)(mainKey);
  const canonical = (0, _sessionKey.buildAgentMainSessionKey)({
    agentId: _sessionKey.DEFAULT_AGENT_ID,
    mainKey: canonicalMainKey
  });
  const isGroup = raw.includes(":group:") || raw.includes(":channel:");
  if (!isGroup) {
    return canonical;
  }
  return `agent:${_sessionKey.DEFAULT_AGENT_ID}:${raw}`;
} /* v9-6c404473e8aad248 */
