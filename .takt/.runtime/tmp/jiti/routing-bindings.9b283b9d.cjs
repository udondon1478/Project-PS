"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.buildChannelAccountBindings = buildChannelAccountBindings;exports.listBindings = listBindings;exports.listBoundAccountIds = listBoundAccountIds;exports.resolveDefaultAgentBoundAccountId = resolveDefaultAgentBoundAccountId;exports.resolvePreferredAccountId = resolvePreferredAccountId;var _agentScope = require("../agents/agent-scope.js");
var _registry = require("../channels/registry.js");
var _sessionKey = require("./session-key.js");
function normalizeBindingChannelId(raw) {
  const normalized = (0, _registry.normalizeChatChannelId)(raw);
  if (normalized) {
    return normalized;
  }
  const fallback = (raw ?? "").trim().toLowerCase();
  return fallback || null;
}
function listBindings(cfg) {
  return Array.isArray(cfg.bindings) ? cfg.bindings : [];
}
function listBoundAccountIds(cfg, channelId) {
  const normalizedChannel = normalizeBindingChannelId(channelId);
  if (!normalizedChannel) {
    return [];
  }
  const ids = new Set();
  for (const binding of listBindings(cfg)) {
    if (!binding || typeof binding !== "object") {
      continue;
    }
    const match = binding.match;
    if (!match || typeof match !== "object") {
      continue;
    }
    const channel = normalizeBindingChannelId(match.channel);
    if (!channel || channel !== normalizedChannel) {
      continue;
    }
    const accountId = typeof match.accountId === "string" ? match.accountId.trim() : "";
    if (!accountId || accountId === "*") {
      continue;
    }
    ids.add((0, _sessionKey.normalizeAccountId)(accountId));
  }
  return Array.from(ids).toSorted((a, b) => a.localeCompare(b));
}
function resolveDefaultAgentBoundAccountId(cfg, channelId) {
  const normalizedChannel = normalizeBindingChannelId(channelId);
  if (!normalizedChannel) {
    return null;
  }
  const defaultAgentId = (0, _sessionKey.normalizeAgentId)((0, _agentScope.resolveDefaultAgentId)(cfg));
  for (const binding of listBindings(cfg)) {
    if (!binding || typeof binding !== "object") {
      continue;
    }
    if ((0, _sessionKey.normalizeAgentId)(binding.agentId) !== defaultAgentId) {
      continue;
    }
    const match = binding.match;
    if (!match || typeof match !== "object") {
      continue;
    }
    const channel = normalizeBindingChannelId(match.channel);
    if (!channel || channel !== normalizedChannel) {
      continue;
    }
    const accountId = typeof match.accountId === "string" ? match.accountId.trim() : "";
    if (!accountId || accountId === "*") {
      continue;
    }
    return (0, _sessionKey.normalizeAccountId)(accountId);
  }
  return null;
}
function buildChannelAccountBindings(cfg) {
  const map = new Map();
  for (const binding of listBindings(cfg)) {
    if (!binding || typeof binding !== "object") {
      continue;
    }
    const match = binding.match;
    if (!match || typeof match !== "object") {
      continue;
    }
    const channelId = normalizeBindingChannelId(match.channel);
    if (!channelId) {
      continue;
    }
    const accountId = typeof match.accountId === "string" ? match.accountId.trim() : "";
    if (!accountId || accountId === "*") {
      continue;
    }
    const agentId = (0, _sessionKey.normalizeAgentId)(binding.agentId);
    const byAgent = map.get(channelId) ?? new Map();
    const list = byAgent.get(agentId) ?? [];
    const normalizedAccountId = (0, _sessionKey.normalizeAccountId)(accountId);
    if (!list.includes(normalizedAccountId)) {
      list.push(normalizedAccountId);
    }
    byAgent.set(agentId, list);
    map.set(channelId, byAgent);
  }
  return map;
}
function resolvePreferredAccountId(params) {
  if (params.boundAccounts.length > 0) {
    return params.boundAccounts[0];
  }
  return params.defaultAccountId;
} /* v9-4356d5646e77fe02 */
