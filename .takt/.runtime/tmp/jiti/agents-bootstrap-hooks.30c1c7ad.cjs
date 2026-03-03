"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.applyBootstrapHookOverrides = applyBootstrapHookOverrides;var _internalHooks = require("../hooks/internal-hooks.js");
var _sessionKey = require("../routing/session-key.js");
async function applyBootstrapHookOverrides(params) {
  const sessionKey = params.sessionKey ?? params.sessionId ?? "unknown";
  const agentId = params.agentId ?? (
  params.sessionKey ? (0, _sessionKey.resolveAgentIdFromSessionKey)(params.sessionKey) : undefined);
  const context = {
    workspaceDir: params.workspaceDir,
    bootstrapFiles: params.files,
    cfg: params.config,
    sessionKey: params.sessionKey,
    sessionId: params.sessionId,
    agentId
  };
  const event = (0, _internalHooks.createInternalHookEvent)("agent", "bootstrap", sessionKey, context);
  await (0, _internalHooks.triggerInternalHook)(event);
  const updated = event.context.bootstrapFiles;
  return Array.isArray(updated) ? updated : params.files;
} /* v9-3d464652c41867b9 */
