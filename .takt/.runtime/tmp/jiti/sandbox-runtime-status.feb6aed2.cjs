"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.formatSandboxToolPolicyBlockedMessage = formatSandboxToolPolicyBlockedMessage;exports.resolveSandboxRuntimeStatus = resolveSandboxRuntimeStatus;var _commandFormat = require("../../cli/command-format.js");
var _sessions = require("../../config/sessions.js");
var _agentScope = require("../agent-scope.js");
var _toolPolicy = require("../tool-policy.js");
var _config = require("./config.js");
var _toolPolicy2 = require("./tool-policy.js");
function shouldSandboxSession(cfg, sessionKey, mainSessionKey) {
  if (cfg.mode === "off") {
    return false;
  }
  if (cfg.mode === "all") {
    return true;
  }
  return sessionKey.trim() !== mainSessionKey.trim();
}
function resolveMainSessionKeyForSandbox(params) {
  if (params.cfg?.session?.scope === "global") {
    return "global";
  }
  return (0, _sessions.resolveAgentMainSessionKey)({
    cfg: params.cfg,
    agentId: params.agentId
  });
}
function resolveComparableSessionKeyForSandbox(params) {
  return (0, _sessions.canonicalizeMainSessionAlias)({
    cfg: params.cfg,
    agentId: params.agentId,
    sessionKey: params.sessionKey
  });
}
function resolveSandboxRuntimeStatus(params) {
  const sessionKey = params.sessionKey?.trim() ?? "";
  const agentId = (0, _agentScope.resolveSessionAgentId)({
    sessionKey,
    config: params.cfg
  });
  const cfg = params.cfg;
  const sandboxCfg = (0, _config.resolveSandboxConfigForAgent)(cfg, agentId);
  const mainSessionKey = resolveMainSessionKeyForSandbox({ cfg, agentId });
  const sandboxed = sessionKey ?
  shouldSandboxSession(sandboxCfg, resolveComparableSessionKeyForSandbox({ cfg, agentId, sessionKey }), mainSessionKey) :
  false;
  return {
    agentId,
    sessionKey,
    mainSessionKey,
    mode: sandboxCfg.mode,
    sandboxed,
    toolPolicy: (0, _toolPolicy2.resolveSandboxToolPolicyForAgent)(cfg, agentId)
  };
}
function formatSandboxToolPolicyBlockedMessage(params) {
  const tool = params.toolName.trim().toLowerCase();
  if (!tool) {
    return undefined;
  }
  const runtime = resolveSandboxRuntimeStatus({
    cfg: params.cfg,
    sessionKey: params.sessionKey
  });
  if (!runtime.sandboxed) {
    return undefined;
  }
  const deny = new Set((0, _toolPolicy.expandToolGroups)(runtime.toolPolicy.deny));
  const allow = (0, _toolPolicy.expandToolGroups)(runtime.toolPolicy.allow);
  const allowSet = allow.length > 0 ? new Set(allow) : null;
  const blockedByDeny = deny.has(tool);
  const blockedByAllow = allowSet ? !allowSet.has(tool) : false;
  if (!blockedByDeny && !blockedByAllow) {
    return undefined;
  }
  const reasons = [];
  const fixes = [];
  if (blockedByDeny) {
    reasons.push("deny list");
    fixes.push(`Remove "${tool}" from ${runtime.toolPolicy.sources.deny.key}.`);
  }
  if (blockedByAllow) {
    reasons.push("allow list");
    fixes.push(`Add "${tool}" to ${runtime.toolPolicy.sources.allow.key} (or set it to [] to allow all).`);
  }
  const lines = [];
  lines.push(`Tool "${tool}" blocked by sandbox tool policy (mode=${runtime.mode}).`);
  lines.push(`Session: ${runtime.sessionKey || "(unknown)"}`);
  lines.push(`Reason: ${reasons.join(" + ")}`);
  lines.push("Fix:");
  lines.push(`- agents.defaults.sandbox.mode=off (disable sandbox)`);
  for (const fix of fixes) {
    lines.push(`- ${fix}`);
  }
  if (runtime.mode === "non-main") {
    lines.push(`- Use main session key (direct): ${runtime.mainSessionKey}`);
  }
  lines.push(`- See: ${(0, _commandFormat.formatCliCommand)(`openclaw sandbox explain --session ${runtime.sessionKey}`)}`);
  return lines.join("\n");
} /* v9-0817e3e08a8f7628 */
