"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createSessionsHistoryTool = createSessionsHistoryTool;var _typebox = require("@sinclair/typebox");
var _config = require("../../config/config.js");
var _call = require("../../gateway/call.js");
var _sessionKey = require("../../routing/session-key.js");
var _common = require("./common.js");
var _sessionsHelpers = require("./sessions-helpers.js");
const SessionsHistoryToolSchema = _typebox.Type.Object({
  sessionKey: _typebox.Type.String(),
  limit: _typebox.Type.Optional(_typebox.Type.Number({ minimum: 1 })),
  includeTools: _typebox.Type.Optional(_typebox.Type.Boolean())
});
function resolveSandboxSessionToolsVisibility(cfg) {
  return cfg.agents?.defaults?.sandbox?.sessionToolsVisibility ?? "spawned";
}
async function isSpawnedSessionAllowed(params) {
  try {
    const list = await (0, _call.callGateway)({
      method: "sessions.list",
      params: {
        includeGlobal: false,
        includeUnknown: false,
        limit: 500,
        spawnedBy: params.requesterSessionKey
      }
    });
    const sessions = Array.isArray(list?.sessions) ? list.sessions : [];
    return sessions.some((entry) => entry?.key === params.targetSessionKey);
  }
  catch {
    return false;
  }
}
function createSessionsHistoryTool(opts) {
  return {
    label: "Session History",
    name: "sessions_history",
    description: "Fetch message history for a session.",
    parameters: SessionsHistoryToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args;
      const sessionKeyParam = (0, _common.readStringParam)(params, "sessionKey", {
        required: true
      });
      const cfg = (0, _config.loadConfig)();
      const { mainKey, alias } = (0, _sessionsHelpers.resolveMainSessionAlias)(cfg);
      const visibility = resolveSandboxSessionToolsVisibility(cfg);
      const requesterInternalKey = typeof opts?.agentSessionKey === "string" && opts.agentSessionKey.trim() ?
      (0, _sessionsHelpers.resolveInternalSessionKey)({
        key: opts.agentSessionKey,
        alias,
        mainKey
      }) :
      undefined;
      const restrictToSpawned = opts?.sandboxed === true &&
      visibility === "spawned" &&
      !!requesterInternalKey &&
      !(0, _sessionKey.isSubagentSessionKey)(requesterInternalKey);
      const resolvedSession = await (0, _sessionsHelpers.resolveSessionReference)({
        sessionKey: sessionKeyParam,
        alias,
        mainKey,
        requesterInternalKey,
        restrictToSpawned
      });
      if (!resolvedSession.ok) {
        return (0, _common.jsonResult)({ status: resolvedSession.status, error: resolvedSession.error });
      }
      // From here on, use the canonical key (sessionId inputs already resolved).
      const resolvedKey = resolvedSession.key;
      const displayKey = resolvedSession.displayKey;
      const resolvedViaSessionId = resolvedSession.resolvedViaSessionId;
      if (restrictToSpawned && !resolvedViaSessionId) {
        const ok = await isSpawnedSessionAllowed({
          requesterSessionKey: requesterInternalKey,
          targetSessionKey: resolvedKey
        });
        if (!ok) {
          return (0, _common.jsonResult)({
            status: "forbidden",
            error: `Session not visible from this sandboxed agent session: ${sessionKeyParam}`
          });
        }
      }
      const a2aPolicy = (0, _sessionsHelpers.createAgentToAgentPolicy)(cfg);
      const requesterAgentId = (0, _sessionKey.resolveAgentIdFromSessionKey)(requesterInternalKey);
      const targetAgentId = (0, _sessionKey.resolveAgentIdFromSessionKey)(resolvedKey);
      const isCrossAgent = requesterAgentId !== targetAgentId;
      if (isCrossAgent) {
        if (!a2aPolicy.enabled) {
          return (0, _common.jsonResult)({
            status: "forbidden",
            error: "Agent-to-agent history is disabled. Set tools.agentToAgent.enabled=true to allow cross-agent access."
          });
        }
        if (!a2aPolicy.isAllowed(requesterAgentId, targetAgentId)) {
          return (0, _common.jsonResult)({
            status: "forbidden",
            error: "Agent-to-agent history denied by tools.agentToAgent.allow."
          });
        }
      }
      const limit = typeof params.limit === "number" && Number.isFinite(params.limit) ?
      Math.max(1, Math.floor(params.limit)) :
      undefined;
      const includeTools = Boolean(params.includeTools);
      const result = await (0, _call.callGateway)({
        method: "chat.history",
        params: { sessionKey: resolvedKey, limit }
      });
      const rawMessages = Array.isArray(result?.messages) ? result.messages : [];
      const messages = includeTools ? rawMessages : (0, _sessionsHelpers.stripToolMessages)(rawMessages);
      return (0, _common.jsonResult)({
        sessionKey: displayKey,
        messages
      });
    }
  };
} /* v9-05be0580889a7cf2 */
