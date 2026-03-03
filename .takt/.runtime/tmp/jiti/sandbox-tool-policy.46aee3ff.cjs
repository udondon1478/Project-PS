"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.isToolAllowed = isToolAllowed;exports.resolveSandboxToolPolicyForAgent = resolveSandboxToolPolicyForAgent;var _agentScope = require("../agent-scope.js");
var _toolPolicy = require("../tool-policy.js");
var _constants = require("./constants.js");
function compilePattern(pattern) {
  const normalized = pattern.trim().toLowerCase();
  if (!normalized) {
    return { kind: "exact", value: "" };
  }
  if (normalized === "*") {
    return { kind: "all" };
  }
  if (!normalized.includes("*")) {
    return { kind: "exact", value: normalized };
  }
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return {
    kind: "regex",
    value: new RegExp(`^${escaped.replaceAll("\\*", ".*")}$`)
  };
}
function compilePatterns(patterns) {
  if (!Array.isArray(patterns)) {
    return [];
  }
  return (0, _toolPolicy.expandToolGroups)(patterns).
  map(compilePattern).
  filter((pattern) => pattern.kind !== "exact" || pattern.value);
}
function matchesAny(name, patterns) {
  for (const pattern of patterns) {
    if (pattern.kind === "all") {
      return true;
    }
    if (pattern.kind === "exact" && name === pattern.value) {
      return true;
    }
    if (pattern.kind === "regex" && pattern.value.test(name)) {
      return true;
    }
  }
  return false;
}
function isToolAllowed(policy, name) {
  const normalized = name.trim().toLowerCase();
  const deny = compilePatterns(policy.deny);
  if (matchesAny(normalized, deny)) {
    return false;
  }
  const allow = compilePatterns(policy.allow);
  if (allow.length === 0) {
    return true;
  }
  return matchesAny(normalized, allow);
}
function resolveSandboxToolPolicyForAgent(cfg, agentId) {
  const agentConfig = cfg && agentId ? (0, _agentScope.resolveAgentConfig)(cfg, agentId) : undefined;
  const agentAllow = agentConfig?.tools?.sandbox?.tools?.allow;
  const agentDeny = agentConfig?.tools?.sandbox?.tools?.deny;
  const globalAllow = cfg?.tools?.sandbox?.tools?.allow;
  const globalDeny = cfg?.tools?.sandbox?.tools?.deny;
  const allowSource = Array.isArray(agentAllow) ?
  {
    source: "agent",
    key: "agents.list[].tools.sandbox.tools.allow"
  } :
  Array.isArray(globalAllow) ?
  {
    source: "global",
    key: "tools.sandbox.tools.allow"
  } :
  {
    source: "default",
    key: "tools.sandbox.tools.allow"
  };
  const denySource = Array.isArray(agentDeny) ?
  {
    source: "agent",
    key: "agents.list[].tools.sandbox.tools.deny"
  } :
  Array.isArray(globalDeny) ?
  {
    source: "global",
    key: "tools.sandbox.tools.deny"
  } :
  {
    source: "default",
    key: "tools.sandbox.tools.deny"
  };
  const deny = Array.isArray(agentDeny) ?
  agentDeny :
  Array.isArray(globalDeny) ?
  globalDeny :
  [..._constants.DEFAULT_TOOL_DENY];
  const allow = Array.isArray(agentAllow) ?
  agentAllow :
  Array.isArray(globalAllow) ?
  globalAllow :
  [..._constants.DEFAULT_TOOL_ALLOW];
  const expandedDeny = (0, _toolPolicy.expandToolGroups)(deny);
  let expandedAllow = (0, _toolPolicy.expandToolGroups)(allow);
  // `image` is essential for multimodal workflows; always include it in sandboxed
  // sessions unless explicitly denied.
  if (!expandedDeny.map((v) => v.toLowerCase()).includes("image") &&
  !expandedAllow.map((v) => v.toLowerCase()).includes("image")) {
    expandedAllow = [...expandedAllow, "image"];
  }
  return {
    allow: expandedAllow,
    deny: expandedDeny,
    sources: {
      allow: allowSource,
      deny: denySource
    }
  };
} /* v9-11abed14916c02a0 */
