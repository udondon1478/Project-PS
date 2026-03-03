"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveAckReaction = resolveAckReaction;exports.resolveAgentIdentity = resolveAgentIdentity;exports.resolveEffectiveMessagesConfig = resolveEffectiveMessagesConfig;exports.resolveHumanDelayConfig = resolveHumanDelayConfig;exports.resolveIdentityName = resolveIdentityName;exports.resolveIdentityNamePrefix = resolveIdentityNamePrefix;exports.resolveMessagePrefix = resolveMessagePrefix;exports.resolveResponsePrefix = resolveResponsePrefix;var _agentScope = require("./agent-scope.js");
const DEFAULT_ACK_REACTION = "👀";
function resolveAgentIdentity(cfg, agentId) {
  return (0, _agentScope.resolveAgentConfig)(cfg, agentId)?.identity;
}
function resolveAckReaction(cfg, agentId) {
  const configured = cfg.messages?.ackReaction;
  if (configured !== undefined) {
    return configured.trim();
  }
  const emoji = resolveAgentIdentity(cfg, agentId)?.emoji?.trim();
  return emoji || DEFAULT_ACK_REACTION;
}
function resolveIdentityNamePrefix(cfg, agentId) {
  const name = resolveAgentIdentity(cfg, agentId)?.name?.trim();
  if (!name) {
    return undefined;
  }
  return `[${name}]`;
}
/** Returns just the identity name (without brackets) for template context. */
function resolveIdentityName(cfg, agentId) {
  return resolveAgentIdentity(cfg, agentId)?.name?.trim() || undefined;
}
function resolveMessagePrefix(cfg, agentId, opts) {
  const configured = opts?.configured ?? cfg.messages?.messagePrefix;
  if (configured !== undefined) {
    return configured;
  }
  const hasAllowFrom = opts?.hasAllowFrom === true;
  if (hasAllowFrom) {
    return "";
  }
  return resolveIdentityNamePrefix(cfg, agentId) ?? opts?.fallback ?? "[openclaw]";
}
function resolveResponsePrefix(cfg, agentId) {
  const configured = cfg.messages?.responsePrefix;
  if (configured !== undefined) {
    if (configured === "auto") {
      return resolveIdentityNamePrefix(cfg, agentId);
    }
    return configured;
  }
  return undefined;
}
function resolveEffectiveMessagesConfig(cfg, agentId, opts) {
  return {
    messagePrefix: resolveMessagePrefix(cfg, agentId, {
      hasAllowFrom: opts?.hasAllowFrom,
      fallback: opts?.fallbackMessagePrefix
    }),
    responsePrefix: resolveResponsePrefix(cfg, agentId)
  };
}
function resolveHumanDelayConfig(cfg, agentId) {
  const defaults = cfg.agents?.defaults?.humanDelay;
  const overrides = (0, _agentScope.resolveAgentConfig)(cfg, agentId)?.humanDelay;
  if (!defaults && !overrides) {
    return undefined;
  }
  return {
    mode: overrides?.mode ?? defaults?.mode,
    minMs: overrides?.minMs ?? defaults?.minMs,
    maxMs: overrides?.maxMs ?? defaults?.maxMs
  };
} /* v9-90f9a1794a6f760a */
