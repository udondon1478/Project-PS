"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createSessionsSendTool = createSessionsSendTool;var _typebox = require("@sinclair/typebox");
var _nodeCrypto = _interopRequireDefault(require("node:crypto"));
var _config = require("../../config/config.js");
var _call = require("../../gateway/call.js");
var _sessionKey = require("../../routing/session-key.js");
var _sessionLabel = require("../../sessions/session-label.js");
var _messageChannel = require("../../utils/message-channel.js");
var _lanes = require("../lanes.js");
var _common = require("./common.js");
var _sessionsHelpers = require("./sessions-helpers.js");
var _sessionsSendHelpers = require("./sessions-send-helpers.js");
var _sessionsSendToolA2a = require("./sessions-send-tool.a2a.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const SessionsSendToolSchema = _typebox.Type.Object({
  sessionKey: _typebox.Type.Optional(_typebox.Type.String()),
  label: _typebox.Type.Optional(_typebox.Type.String({ minLength: 1, maxLength: _sessionLabel.SESSION_LABEL_MAX_LENGTH })),
  agentId: _typebox.Type.Optional(_typebox.Type.String({ minLength: 1, maxLength: 64 })),
  message: _typebox.Type.String(),
  timeoutSeconds: _typebox.Type.Optional(_typebox.Type.Number({ minimum: 0 }))
});
function createSessionsSendTool(opts) {
  return {
    label: "Session Send",
    name: "sessions_send",
    description: "Send a message into another session. Use sessionKey or label to identify the target.",
    parameters: SessionsSendToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args;
      const message = (0, _common.readStringParam)(params, "message", { required: true });
      const cfg = (0, _config.loadConfig)();
      const { mainKey, alias } = (0, _sessionsHelpers.resolveMainSessionAlias)(cfg);
      const visibility = cfg.agents?.defaults?.sandbox?.sessionToolsVisibility ?? "spawned";
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
      const a2aPolicy = (0, _sessionsHelpers.createAgentToAgentPolicy)(cfg);
      const sessionKeyParam = (0, _common.readStringParam)(params, "sessionKey");
      const labelParam = (0, _common.readStringParam)(params, "label")?.trim() || undefined;
      const labelAgentIdParam = (0, _common.readStringParam)(params, "agentId")?.trim() || undefined;
      if (sessionKeyParam && labelParam) {
        return (0, _common.jsonResult)({
          runId: _nodeCrypto.default.randomUUID(),
          status: "error",
          error: "Provide either sessionKey or label (not both)."
        });
      }
      const listSessions = async (listParams) => {
        const result = await (0, _call.callGateway)({
          method: "sessions.list",
          params: listParams,
          timeoutMs: 10_000
        });
        return Array.isArray(result?.sessions) ? result.sessions : [];
      };
      let sessionKey = sessionKeyParam;
      if (!sessionKey && labelParam) {
        const requesterAgentId = requesterInternalKey ?
        (0, _sessionKey.resolveAgentIdFromSessionKey)(requesterInternalKey) :
        undefined;
        const requestedAgentId = labelAgentIdParam ?
        (0, _sessionKey.normalizeAgentId)(labelAgentIdParam) :
        undefined;
        if (restrictToSpawned &&
        requestedAgentId &&
        requesterAgentId &&
        requestedAgentId !== requesterAgentId) {
          return (0, _common.jsonResult)({
            runId: _nodeCrypto.default.randomUUID(),
            status: "forbidden",
            error: "Sandboxed sessions_send label lookup is limited to this agent"
          });
        }
        if (requesterAgentId && requestedAgentId && requestedAgentId !== requesterAgentId) {
          if (!a2aPolicy.enabled) {
            return (0, _common.jsonResult)({
              runId: _nodeCrypto.default.randomUUID(),
              status: "forbidden",
              error: "Agent-to-agent messaging is disabled. Set tools.agentToAgent.enabled=true to allow cross-agent sends."
            });
          }
          if (!a2aPolicy.isAllowed(requesterAgentId, requestedAgentId)) {
            return (0, _common.jsonResult)({
              runId: _nodeCrypto.default.randomUUID(),
              status: "forbidden",
              error: "Agent-to-agent messaging denied by tools.agentToAgent.allow."
            });
          }
        }
        const resolveParams = {
          label: labelParam,
          ...(requestedAgentId ? { agentId: requestedAgentId } : {}),
          ...(restrictToSpawned ? { spawnedBy: requesterInternalKey } : {})
        };
        let resolvedKey = "";
        try {
          const resolved = await (0, _call.callGateway)({
            method: "sessions.resolve",
            params: resolveParams,
            timeoutMs: 10_000
          });
          resolvedKey = typeof resolved?.key === "string" ? resolved.key.trim() : "";
        }
        catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (restrictToSpawned) {
            return (0, _common.jsonResult)({
              runId: _nodeCrypto.default.randomUUID(),
              status: "forbidden",
              error: "Session not visible from this sandboxed agent session."
            });
          }
          return (0, _common.jsonResult)({
            runId: _nodeCrypto.default.randomUUID(),
            status: "error",
            error: msg || `No session found with label: ${labelParam}`
          });
        }
        if (!resolvedKey) {
          if (restrictToSpawned) {
            return (0, _common.jsonResult)({
              runId: _nodeCrypto.default.randomUUID(),
              status: "forbidden",
              error: "Session not visible from this sandboxed agent session."
            });
          }
          return (0, _common.jsonResult)({
            runId: _nodeCrypto.default.randomUUID(),
            status: "error",
            error: `No session found with label: ${labelParam}`
          });
        }
        sessionKey = resolvedKey;
      }
      if (!sessionKey) {
        return (0, _common.jsonResult)({
          runId: _nodeCrypto.default.randomUUID(),
          status: "error",
          error: "Either sessionKey or label is required"
        });
      }
      const resolvedSession = await (0, _sessionsHelpers.resolveSessionReference)({
        sessionKey,
        alias,
        mainKey,
        requesterInternalKey,
        restrictToSpawned
      });
      if (!resolvedSession.ok) {
        return (0, _common.jsonResult)({
          runId: _nodeCrypto.default.randomUUID(),
          status: resolvedSession.status,
          error: resolvedSession.error
        });
      }
      // Normalize sessionKey/sessionId input into a canonical session key.
      const resolvedKey = resolvedSession.key;
      const displayKey = resolvedSession.displayKey;
      const resolvedViaSessionId = resolvedSession.resolvedViaSessionId;
      if (restrictToSpawned && !resolvedViaSessionId) {
        const sessions = await listSessions({
          includeGlobal: false,
          includeUnknown: false,
          limit: 500,
          spawnedBy: requesterInternalKey
        });
        const ok = sessions.some((entry) => entry?.key === resolvedKey);
        if (!ok) {
          return (0, _common.jsonResult)({
            runId: _nodeCrypto.default.randomUUID(),
            status: "forbidden",
            error: `Session not visible from this sandboxed agent session: ${sessionKey}`,
            sessionKey: displayKey
          });
        }
      }
      const timeoutSeconds = typeof params.timeoutSeconds === "number" && Number.isFinite(params.timeoutSeconds) ?
      Math.max(0, Math.floor(params.timeoutSeconds)) :
      30;
      const timeoutMs = timeoutSeconds * 1000;
      const announceTimeoutMs = timeoutSeconds === 0 ? 30_000 : timeoutMs;
      const idempotencyKey = _nodeCrypto.default.randomUUID();
      let runId = idempotencyKey;
      const requesterAgentId = (0, _sessionKey.resolveAgentIdFromSessionKey)(requesterInternalKey);
      const targetAgentId = (0, _sessionKey.resolveAgentIdFromSessionKey)(resolvedKey);
      const isCrossAgent = requesterAgentId !== targetAgentId;
      if (isCrossAgent) {
        if (!a2aPolicy.enabled) {
          return (0, _common.jsonResult)({
            runId: _nodeCrypto.default.randomUUID(),
            status: "forbidden",
            error: "Agent-to-agent messaging is disabled. Set tools.agentToAgent.enabled=true to allow cross-agent sends.",
            sessionKey: displayKey
          });
        }
        if (!a2aPolicy.isAllowed(requesterAgentId, targetAgentId)) {
          return (0, _common.jsonResult)({
            runId: _nodeCrypto.default.randomUUID(),
            status: "forbidden",
            error: "Agent-to-agent messaging denied by tools.agentToAgent.allow.",
            sessionKey: displayKey
          });
        }
      }
      const agentMessageContext = (0, _sessionsSendHelpers.buildAgentToAgentMessageContext)({
        requesterSessionKey: opts?.agentSessionKey,
        requesterChannel: opts?.agentChannel,
        targetSessionKey: displayKey
      });
      const sendParams = {
        message,
        sessionKey: resolvedKey,
        idempotencyKey,
        deliver: false,
        channel: _messageChannel.INTERNAL_MESSAGE_CHANNEL,
        lane: _lanes.AGENT_LANE_NESTED,
        extraSystemPrompt: agentMessageContext
      };
      const requesterSessionKey = opts?.agentSessionKey;
      const requesterChannel = opts?.agentChannel;
      const maxPingPongTurns = (0, _sessionsSendHelpers.resolvePingPongTurns)(cfg);
      const delivery = { status: "pending", mode: "announce" };
      const startA2AFlow = (roundOneReply, waitRunId) => {
        void (0, _sessionsSendToolA2a.runSessionsSendA2AFlow)({
          targetSessionKey: resolvedKey,
          displayKey,
          message,
          announceTimeoutMs,
          maxPingPongTurns,
          requesterSessionKey,
          requesterChannel,
          roundOneReply,
          waitRunId
        });
      };
      if (timeoutSeconds === 0) {
        try {
          const response = await (0, _call.callGateway)({
            method: "agent",
            params: sendParams,
            timeoutMs: 10_000
          });
          if (typeof response?.runId === "string" && response.runId) {
            runId = response.runId;
          }
          startA2AFlow(undefined, runId);
          return (0, _common.jsonResult)({
            runId,
            status: "accepted",
            sessionKey: displayKey,
            delivery
          });
        }
        catch (err) {
          const messageText = err instanceof Error ? err.message : typeof err === "string" ? err : "error";
          return (0, _common.jsonResult)({
            runId,
            status: "error",
            error: messageText,
            sessionKey: displayKey
          });
        }
      }
      try {
        const response = await (0, _call.callGateway)({
          method: "agent",
          params: sendParams,
          timeoutMs: 10_000
        });
        if (typeof response?.runId === "string" && response.runId) {
          runId = response.runId;
        }
      }
      catch (err) {
        const messageText = err instanceof Error ? err.message : typeof err === "string" ? err : "error";
        return (0, _common.jsonResult)({
          runId,
          status: "error",
          error: messageText,
          sessionKey: displayKey
        });
      }
      let waitStatus;
      let waitError;
      try {
        const wait = await (0, _call.callGateway)({
          method: "agent.wait",
          params: {
            runId,
            timeoutMs
          },
          timeoutMs: timeoutMs + 2000
        });
        waitStatus = typeof wait?.status === "string" ? wait.status : undefined;
        waitError = typeof wait?.error === "string" ? wait.error : undefined;
      }
      catch (err) {
        const messageText = err instanceof Error ? err.message : typeof err === "string" ? err : "error";
        return (0, _common.jsonResult)({
          runId,
          status: messageText.includes("gateway timeout") ? "timeout" : "error",
          error: messageText,
          sessionKey: displayKey
        });
      }
      if (waitStatus === "timeout") {
        return (0, _common.jsonResult)({
          runId,
          status: "timeout",
          error: waitError,
          sessionKey: displayKey
        });
      }
      if (waitStatus === "error") {
        return (0, _common.jsonResult)({
          runId,
          status: "error",
          error: waitError ?? "agent error",
          sessionKey: displayKey
        });
      }
      const history = await (0, _call.callGateway)({
        method: "chat.history",
        params: { sessionKey: resolvedKey, limit: 50 }
      });
      const filtered = (0, _sessionsHelpers.stripToolMessages)(Array.isArray(history?.messages) ? history.messages : []);
      const last = filtered.length > 0 ? filtered[filtered.length - 1] : undefined;
      const reply = last ? (0, _sessionsHelpers.extractAssistantText)(last) : undefined;
      startA2AFlow(reply ?? undefined);
      return (0, _common.jsonResult)({
        runId,
        status: "ok",
        reply,
        sessionKey: displayKey,
        delivery
      });
    }
  };
} /* v9-3d8935e012ef92c6 */
